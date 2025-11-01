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

# AI Endpoint Health Check (game-specific validation)
AI_HEALTH_SCRIPT="$CLAUDE_PROJECT_DIR/.claude/tests/validate-ai-endpoints.sh"
if [ -f "$AI_HEALTH_SCRIPT" ] && [ -x "$AI_HEALTH_SCRIPT" ]; then
  # Check if dev server is running before validating endpoints
  if curl -s "http://localhost:3000" > /dev/null 2>&1; then
    CONTEXT+=$'\n## 🎮 AI Endpoint Health Check\n'
    CONTEXT+="Running validation for fal.ai (portraits) and Groq (items/narrative)..."$'\n'
    # Run validation in background to avoid blocking session start
    ("$AI_HEALTH_SCRIPT" > /tmp/ai-health-check.log 2>&1 && \
      CONTEXT+="✅ AI endpoints validated successfully"$'\n' || \
      CONTEXT+="⚠️  AI endpoint validation failed (check /tmp/ai-health-check.log)"$'\n') &
  fi
fi

# Add critical development guidelines from CLAUDE.md
CONTEXT+=$'\n## Critical Development Guidelines (CLAUDE.md)\n\n'
CONTEXT+="**These rules are MANDATORY and enforced:**"$'\n'
CONTEXT+="- ❌ **NEVER write documentation** unless explicitly requested"$'\n'
CONTEXT+="- 🔍 **Check for existing functionality** before creating new files"$'\n'
CONTEXT+="- 🎨 **UI/UX is critical** - always consider visual design and user experience"$'\n'
CONTEXT+="- 💬 **Be assertive** - question unclear requirements or potential issues"$'\n'
CONTEXT+="- 🔧 **Utilize MCP tools** (serena, tavily) whenever possible"$'\n'
CONTEXT+="- ➡️  **Provide next steps** after completing tasks"$'\n'
CONTEXT+="- 🚫 **No demos or examples** - build production-ready code only"$'\n'
CONTEXT+="- 🏗️  **Prevent technical debt** - write clean, maintainable code from the start"$'\n'
CONTEXT+="- 📝 **Never version files** - overwrite existing files; git handles versioning"$'\n'
CONTEXT+="- 💾 **Commit after major changes** - use git to track significant work"$'\n'
CONTEXT+="- ⚡ **Optimize for speed** - batch/parallelize tasks and create helper scripts when beneficial"$'\n'

# Output context for Claude
if [ -n "$CONTEXT" ]; then
  echo "## Project Status"
  echo "$CONTEXT"
fi

exit 0
