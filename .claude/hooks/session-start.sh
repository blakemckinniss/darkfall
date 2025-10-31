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

# Check for package.json and node_modules
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
    CONTEXT+="⚠️  Warning: node_modules not found. Run 'pnpm install' to install dependencies"$'\n'
  fi
fi

# Output context for Claude
if [ -n "$CONTEXT" ]; then
  echo "## Project Status"
  echo "$CONTEXT"
fi

exit 0
