#!/bin/bash
set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Track if any formatting was done
FORMATTED=false

# Determine file type and format accordingly
if [[ "$FILE_PATH" =~ \.(js|jsx|ts|tsx|mjs|cjs)$ ]]; then
  # JavaScript/TypeScript files

  # Run prettier if available
  if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    if pnpm exec prettier --check "$FILE_PATH" &> /dev/null; then
      : # File already formatted
    else
      pnpm exec prettier --write "$FILE_PATH" &> /dev/null || true
      FORMATTED=true
    fi
  fi

  # Run eslint --fix if available
  if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    # Run eslint fix, capture if any fixes were applied
    if pnpm lint --fix "$FILE_PATH" &> /dev/null; then
      : # No lint errors
    else
      FORMATTED=true
    fi
  fi

elif [[ "$FILE_PATH" =~ \.(css|scss|sass|less)$ ]]; then
  # CSS/SCSS files

  # Run prettier for CSS
  if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    if pnpm exec prettier --check "$FILE_PATH" &> /dev/null; then
      : # File already formatted
    else
      pnpm exec prettier --write "$FILE_PATH" &> /dev/null || true
      FORMATTED=true
    fi
  fi

  # Run stylelint --fix if available
  if command -v pnpm &> /dev/null && [ -f "package.json" ]; then
    if pnpm exec stylelint --fix "$FILE_PATH" &> /dev/null; then
      : # No style errors
    else
      FORMATTED=true
    fi
  fi

else
  # Not a file type we format
  exit 0
fi

# Report to user if formatting was applied
if [ "$FORMATTED" = true ]; then
  echo "✓ Auto-formatted: $(basename "$FILE_PATH")"
fi

exit 0
