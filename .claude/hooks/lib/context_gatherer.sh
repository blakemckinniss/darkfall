#!/bin/bash
#
# Context Gatherer for Zen MCP Tool Planner (Phase 2)
#
# Lightweight project detection (< 500ms target)
# Gathers essential context for Zen MCP planner without expensive operations
#
# Output: JSON object with project metadata

set -euo pipefail

# Determine project directory
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    PROJECT_DIR="$CLAUDE_PROJECT_DIR"
else
    PROJECT_DIR="$(pwd)"
fi

# Initialize context object
PROJECT_TYPE="unknown"
PACKAGE_MANAGER="unknown"
FILE_COUNTS="{}"
GIT_INFO="{}"
UNCOMMITTED_COUNT=0

# Detect project type by checking for indicator files
detect_project_type() {
    if [ -f "$PROJECT_DIR/package.json" ]; then
        PROJECT_TYPE="nodejs"

        # Detect package manager
        if [ -f "$PROJECT_DIR/pnpm-lock.yaml" ]; then
            PACKAGE_MANAGER="pnpm"
        elif [ -f "$PROJECT_DIR/yarn.lock" ]; then
            PACKAGE_MANAGER="yarn"
        else
            PACKAGE_MANAGER="npm"
        fi
    elif [ -f "$PROJECT_DIR/pyproject.toml" ] || [ -f "$PROJECT_DIR/setup.py" ]; then
        PROJECT_TYPE="python"

        if [ -f "$PROJECT_DIR/poetry.lock" ]; then
            PACKAGE_MANAGER="poetry"
        elif [ -f "$PROJECT_DIR/Pipfile" ]; then
            PACKAGE_MANAGER="pipenv"
        else
            PACKAGE_MANAGER="pip"
        fi
    elif [ -f "$PROJECT_DIR/go.mod" ]; then
        PROJECT_TYPE="go"
        PACKAGE_MANAGER="go"
    elif [ -f "$PROJECT_DIR/Cargo.toml" ]; then
        PROJECT_TYPE="rust"
        PACKAGE_MANAGER="cargo"
    elif [ -f "$PROJECT_DIR/Gemfile" ]; then
        PROJECT_TYPE="ruby"
        PACKAGE_MANAGER="bundle"
    elif [ -f "$PROJECT_DIR/pom.xml" ]; then
        PROJECT_TYPE="java"
        PACKAGE_MANAGER="maven"
    elif [ -f "$PROJECT_DIR/build.gradle" ] || [ -f "$PROJECT_DIR/build.gradle.kts" ]; then
        PROJECT_TYPE="java"
        PACKAGE_MANAGER="gradle"
    fi
}

# Get file counts by extension (lightweight)
get_file_counts() {
    # Only count common extensions to keep it fast
    local ts_count=0
    local js_count=0
    local py_count=0
    local go_count=0
    local rs_count=0

    # Use find with maxdepth to avoid deep recursion (faster)
    if command -v find >/dev/null 2>&1; then
        ts_count=$(find "$PROJECT_DIR" -maxdepth 3 -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l || echo 0)
        js_count=$(find "$PROJECT_DIR" -maxdepth 3 -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l || echo 0)
        py_count=$(find "$PROJECT_DIR" -maxdepth 3 -name "*.py" 2>/dev/null | wc -l || echo 0)
        go_count=$(find "$PROJECT_DIR" -maxdepth 3 -name "*.go" 2>/dev/null | wc -l || echo 0)
        rs_count=$(find "$PROJECT_DIR" -maxdepth 3 -name "*.rs" 2>/dev/null | wc -l || echo 0)
    fi

    FILE_COUNTS=$(cat <<EOF
{
  "typescript": $ts_count,
  "javascript": $js_count,
  "python": $py_count,
  "go": $go_count,
  "rust": $rs_count
}
EOF
)
}

# Get git information (if available)
get_git_info() {
    if ! command -v git >/dev/null 2>&1; then
        GIT_INFO='{"is_repo": false}'
        return
    fi

    cd "$PROJECT_DIR" || return

    # Check if git repo
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        GIT_INFO='{"is_repo": false}'
        return
    fi

    # Get branch name
    local branch
    branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

    # Count uncommitted changes (fast - just status)
    UNCOMMITTED_COUNT=$(git status --porcelain 2>/dev/null | wc -l || echo 0)

    GIT_INFO=$(cat <<EOF
{
  "is_repo": true,
  "branch": "$branch",
  "uncommitted_files": $UNCOMMITTED_COUNT
}
EOF
)
}

# Main execution
detect_project_type
get_file_counts &  # Run in background
get_git_info &     # Run in background

# Wait for background jobs
wait

# Output complete context as JSON
cat <<EOF
{
  "project_type": "$PROJECT_TYPE",
  "package_manager": "$PACKAGE_MANAGER",
  "file_counts": $FILE_COUNTS,
  "git": $GIT_INFO,
  "project_dir": "$PROJECT_DIR"
}
EOF
