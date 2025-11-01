#!/bin/bash
set -euo pipefail

# Load environment variables from .env if CLAUDE_ENV_FILE is available
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -f "$CLAUDE_PROJECT_DIR/.env" ]; then
  # Read .env and export each non-comment, non-empty line
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    # Remove any surrounding quotes from value
    value="${value%\"}"
    value="${value#\"}"
    echo "export $key='$value'" >> "$CLAUDE_ENV_FILE"
  done < "$CLAUDE_PROJECT_DIR/.env"
fi

# Build context about the project state
CONTEXT=""

# Check git status
if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
  BRANCH=$(git -C "$CLAUDE_PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
  UNCOMMITTED=$(git -C "$CLAUDE_PROJECT_DIR" status --porcelain 2>/dev/null | wc -l)
  CONTEXT+="Git: On branch '$BRANCH'"

  if [ "$UNCOMMITTED" -gt 0 ]; then
    CONTEXT+=" with $UNCOMMITTED uncommitted change(s)"
  fi
  CONTEXT+=$'\n'
fi

# ============================================================================
# PROJECT TYPE DETECTION & DEPENDENCY CHECKING
# Automatically detects project type and shows appropriate warnings
# ============================================================================

detect_and_check_dependencies() {
  local dep_warnings=""

  # Node.js / JavaScript / TypeScript
  if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
    if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
      # Detect package manager
      if [ -f "$CLAUDE_PROJECT_DIR/pnpm-lock.yaml" ]; then
        dep_warnings+="⚠️  Node.js project: node_modules not found. Run 'pnpm install'"$'\n'
      elif [ -f "$CLAUDE_PROJECT_DIR/yarn.lock" ]; then
        dep_warnings+="⚠️  Node.js project: node_modules not found. Run 'yarn install'"$'\n'
      elif [ -f "$CLAUDE_PROJECT_DIR/package-lock.json" ]; then
        dep_warnings+="⚠️  Node.js project: node_modules not found. Run 'npm install'"$'\n'
      else
        dep_warnings+="⚠️  Node.js project: node_modules not found. Run 'npm install' (or yarn/pnpm)"$'\n'
      fi
    fi
  fi

  # Python
  if [ -f "$CLAUDE_PROJECT_DIR/requirements.txt" ] || [ -f "$CLAUDE_PROJECT_DIR/pyproject.toml" ] || [ -f "$CLAUDE_PROJECT_DIR/Pipfile" ]; then
    if [ ! -d "$CLAUDE_PROJECT_DIR/venv" ] && [ ! -d "$CLAUDE_PROJECT_DIR/.venv" ] && [ -z "$VIRTUAL_ENV" ]; then
      if [ -f "$CLAUDE_PROJECT_DIR/Pipfile" ]; then
        dep_warnings+="⚠️  Python project: No virtual environment detected. Run 'pipenv install'"$'\n'
      elif [ -f "$CLAUDE_PROJECT_DIR/pyproject.toml" ] && command -v poetry &> /dev/null; then
        dep_warnings+="⚠️  Python project: No virtual environment detected. Run 'poetry install'"$'\n'
      else
        dep_warnings+="⚠️  Python project: No virtual environment detected. Run 'python -m venv venv && source venv/bin/activate && pip install -r requirements.txt'"$'\n'
      fi
    fi
  fi

  # Go
  if [ -f "$CLAUDE_PROJECT_DIR/go.mod" ]; then
    if [ ! -d "$CLAUDE_PROJECT_DIR/vendor" ] && ! command -v go &> /dev/null; then
      dep_warnings+="⚠️  Go project: 'go' command not found in PATH"$'\n'
    fi
  fi

  # Rust
  if [ -f "$CLAUDE_PROJECT_DIR/Cargo.toml" ]; then
    if ! command -v cargo &> /dev/null; then
      dep_warnings+="⚠️  Rust project: 'cargo' command not found in PATH"$'\n'
    fi
  fi

  # Ruby
  if [ -f "$CLAUDE_PROJECT_DIR/Gemfile" ]; then
    if [ ! -d "$CLAUDE_PROJECT_DIR/vendor/bundle" ] && ! bundle check &> /dev/null; then
      dep_warnings+="⚠️  Ruby project: Dependencies not installed. Run 'bundle install'"$'\n'
    fi
  fi

  # Java / Maven
  if [ -f "$CLAUDE_PROJECT_DIR/pom.xml" ]; then
    if [ ! -d "$CLAUDE_PROJECT_DIR/target" ] && ! command -v mvn &> /dev/null; then
      dep_warnings+="⚠️  Maven project: 'mvn' command not found in PATH"$'\n'
    fi
  fi

  # Java / Gradle
  if [ -f "$CLAUDE_PROJECT_DIR/build.gradle" ] || [ -f "$CLAUDE_PROJECT_DIR/build.gradle.kts" ]; then
    if ! command -v gradle &> /dev/null && [ ! -f "$CLAUDE_PROJECT_DIR/gradlew" ]; then
      dep_warnings+="⚠️  Gradle project: 'gradle' command not found and no gradlew wrapper"$'\n'
    fi
  fi

  echo "$dep_warnings"
}

DEPENDENCY_WARNINGS=$(detect_and_check_dependencies)
if [ -n "$DEPENDENCY_WARNINGS" ]; then
  CONTEXT+="$DEPENDENCY_WARNINGS"$'\n'
fi

# ============================================================================
# OPTIONAL PROJECT-SPECIFIC HEALTH CHECKS
# Runs custom validation scripts if they exist
# ============================================================================

# Look for custom health check script
HEALTH_SCRIPT="$CLAUDE_PROJECT_DIR/.claude/tests/health-check.sh"
if [ -f "$HEALTH_SCRIPT" ] && [ -x "$HEALTH_SCRIPT" ]; then
  CONTEXT+=$'\n## 🔍 Project Health Check\n'
  CONTEXT+="Running custom health validation..."$'\n'
  # Run validation in background to avoid blocking session start
  ("$HEALTH_SCRIPT" > /tmp/health-check.log 2>&1 && \
    CONTEXT+="✅ Health check passed"$'\n' || \
    CONTEXT+="⚠️  Health check failed (check /tmp/health-check.log)"$'\n') &
fi

# ============================================================================
# DEVELOPMENT GUIDELINES FROM CLAUDE.md
# Reads actual CLAUDE.md file if it exists, otherwise shows generic guidelines
# ============================================================================

if [ -f "$CLAUDE_PROJECT_DIR/CLAUDE.md" ]; then
  CONTEXT+=$'\n## Critical Development Guidelines (CLAUDE.md)\n\n'
  CONTEXT+="**Review project guidelines in CLAUDE.md for mandatory rules and workflows**"$'\n'
  CONTEXT+=$'\n'
  CONTEXT+="📚 **Architecture Reference**: See [docs/ADR.md](docs/ADR.md) for architectural decisions (if available)."$'\n'
else
  # Generic fallback guidelines for projects without CLAUDE.md
  CONTEXT+=$'\n## Development Guidelines\n\n'
  CONTEXT+="**Best Practices:**"$'\n'
  CONTEXT+="- 🔍 Check for existing functionality before creating new files"$'\n'
  CONTEXT+="- 💬 Ask clarifying questions when requirements are unclear"$'\n'
  CONTEXT+="- 🏗️  Write clean, maintainable code with proper error handling"$'\n'
  CONTEXT+="- 📝 Use git for versioning - don't create .v2/.backup files"$'\n'
  CONTEXT+="- 💾 Commit logical units of work with clear messages"$'\n'
  CONTEXT+="- ⚡ Optimize for performance - batch operations when possible"$'\n'
  CONTEXT+=$'\n'
fi

# ============================================================================
# CRITICAL: ZEN MCP CONSULTATION REQUIREMENTS (UNIVERSAL DIRECTIVE)
# ============================================================================
CONTEXT+=$'\n🚨 **MANDATORY ZEN MCP CONSULTATION POLICY** 🚨\n\n'
CONTEXT+="**This directive applies to ALL tasks, regardless of project type:**"$'\n\n'
CONTEXT+="1. **Before starting ANY task**: State your initial confidence (0-100%)"$'\n'
CONTEXT+="2. **If confidence < 90%**: You MUST STOP and consult Zen MCP with websearch enabled"$'\n'
CONTEXT+="3. **This is NOT optional**: Proceeding with confidence < 90% without Zen MCP is FORBIDDEN"$'\n'
CONTEXT+="4. **Available Zen tools**: chat, thinkdeep, debug, analyze, consensus, codereview, secaudit, refactor"$'\n'
CONTEXT+="5. **Always enable websearch**: Set use_websearch=true for all Zen MCP consultations"$'\n'
CONTEXT+="6. **After task completion**: State final confidence and consult Zen MCP if < 90%"$'\n\n'
CONTEXT+="**Examples:**"$'\n'
CONTEXT+="- ✅ \"Initial confidence: 95% - proceeding without consultation\""$'\n'
CONTEXT+="- ✅ \"Initial confidence: 75% - STOPPING to consult Zen MCP (thinkdeep with websearch)\""$'\n'
CONTEXT+="- ❌ \"Initial confidence: 80% - proceeding anyway\" ← FORBIDDEN!"$'\n\n'

# ============================================================================
# CRITICAL: PLAYWRIGHT MCP MANDATORY USAGE POLICY (UNIVERSAL DIRECTIVE)
# ============================================================================
CONTEXT+=$'🚨 **MANDATORY PLAYWRIGHT MCP USAGE POLICY** 🚨\n\n'
CONTEXT+="**WHEN INTERACTING WITH ANY WEBSITE, YOU MUST USE PLAYWRIGHT MCP TOOLS**"$'\n\n'
CONTEXT+="1. **NEVER use WebFetch/WebSearch** for website interaction (browsing, testing, forms, buttons)"$'\n'
CONTEXT+="2. **ALWAYS use Playwright MCP** (mcp__playwright__*) for ALL browser-based interactions"$'\n'
CONTEXT+="3. **This directive overrides all other considerations** - even if WebFetch seems simpler"$'\n'
CONTEXT+="4. **WebFetch ONLY for**: API docs, technical articles, library documentation (non-interactive)"$'\n\n'
CONTEXT+="**Why**: Playwright provides real browser context, JavaScript execution, console logs, screenshots, and proper interaction testing."$'\n\n'

# Output context for Claude
if [ -n "$CONTEXT" ]; then
  echo "## Project Status"
  echo "$CONTEXT"
fi

exit 0
