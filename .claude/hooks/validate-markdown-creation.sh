#!/bin/bash
# PreToolUse hook that restricts markdown file creation
# Allows .md files in:
# - /docs directory
# - Any hidden directories (starting with .)
# - CLAUDE.md anywhere
# Blocks all other .md file creation

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')

# Function to check if a path should be restricted
is_markdown_restricted() {
  local file_path="$1"
  local filename=$(basename "$file_path")
  local dirpath=$(dirname "$file_path")

  # Allow CLAUDE.md anywhere
  if [ "$filename" = "CLAUDE.md" ]; then
    return 1  # Not restricted
  fi

  # Allow markdown in /docs directory
  if echo "$dirpath" | grep -qE '(^|/)docs($|/)'; then
    return 1  # Not restricted
  fi

  # Allow markdown in hidden directories (starting with .)
  if echo "$dirpath" | grep -qE '(^|/)\.[^/]+'; then
    return 1  # Not restricted
  fi

  # Restrict all other markdown files
  return 0  # Restricted
}

# Handle Write tool
if [ "$TOOL_NAME" = "Write" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

  # Check if it's a markdown file
  if [[ "$FILE_PATH" =~ \.md$ ]]; then
    if is_markdown_restricted "$FILE_PATH"; then
      # Extract directory and filename
      DIR_PATH=$(dirname "$FILE_PATH")
      FILENAME=$(basename "$FILE_PATH")

      # Special message for README.md
      if [ "$FILENAME" = "README.md" ]; then
        jq -n \
          --arg path "$FILE_PATH" \
          --arg dir "$DIR_PATH" \
          '{
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "ask",
              permissionDecisionReason: "⛔ README.md Creation Blocked\n\nPath: \($path)\n\n🚫 README.md files are not allowed in this project.\n\n💡 Use CLAUDE.md instead:\n  • CLAUDE.md is the standard for Claude Code projects\n  • Create \($dir)/CLAUDE.md for this directory'\''s guidance\n  • Hierarchical: Root CLAUDE.md = baseline, subdirs add specifics\n  • Auto-discovered by Claude when working in this area\n\n✅ Alternative locations if you need general documentation:\n  • /docs directory for user-facing documentation\n  • Hidden directories (.claude, .github) for tooling\n\n📚 Why CLAUDE.md over README.md?\n  • Directly read by Claude Code for context and guidelines\n  • Supports inheritance (root + subdirectory combined)\n  • Better separation: CLAUDE.md = AI guidance, docs/ = human docs"
            }
          }'
      else
        # General markdown restriction message
        jq -n \
          --arg path "$FILE_PATH" \
          --arg dir "$DIR_PATH" \
          '{
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "ask",
              permissionDecisionReason: "⛔ Markdown File Creation Restricted\n\nPath: \($path)\n\n🚫 Policy: Markdown files are restricted outside of:\n  • /docs directory\n  • Hidden directories (starting with .)\n  • CLAUDE.md (allowed anywhere)\n\n❌ This markdown file cannot be created in this location.\n\n💡 Consider these alternatives:\n  • Use /docs directory for project documentation\n  • Create CLAUDE.md in this directory (\($dir)/CLAUDE.md)\n    → Provides scoped guidance for this area\n    → Won'\''t conflict with root CLAUDE.md (works like inheritance)\n    → Picked up automatically when working in this directory\n  • Use hidden directories (.claude, .github, etc.) for tooling"
            }
          }'
      fi
      exit 0
    fi
  fi
fi

# Handle Bash commands that create markdown files
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

  # Skip git commands (commit messages often reference .md files)
  if echo "$COMMAND" | grep -qE '^\s*git\s'; then
    exit 0
  fi

  # Check for common file creation patterns with .md extension
  # Matches: touch *.md, echo > *.md, cat > *.md, cp *.md, mv *.md, etc.
  if echo "$COMMAND" | grep -qE '\.md(\s|$|;|\||&)'; then
    # Try to extract the markdown file path from the command
    # This is a best-effort extraction - matches paths ending in .md
    MD_FILES=$(echo "$COMMAND" | grep -oE '(/[^\s]+|[^\s/]+/[^\s]+|[a-zA-Z0-9_.-]+)\.md' || echo "")

    if [ -n "$MD_FILES" ]; then
      # Check each potential markdown file
      while IFS= read -r md_file; do
        # Convert to absolute path if relative
        if [[ ! "$md_file" =~ ^/ ]]; then
          md_file="${CLAUDE_PROJECT_DIR:-.}/$md_file"
        fi

        if is_markdown_restricted "$md_file"; then
          # Extract directory and filename
          md_dir=$(dirname "$md_file")
          md_filename=$(basename "$md_file")

          # Special message for README.md
          if [ "$md_filename" = "README.md" ]; then
            jq -n \
              --arg cmd "$COMMAND" \
              --arg file "$md_file" \
              --arg dir "$md_dir" \
              '{
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  permissionDecision: "ask",
                  permissionDecisionReason: "⛔ README.md Creation Blocked\n\nCommand: \($cmd)\nDetected file: \($file)\n\n🚫 README.md files are not allowed in this project.\n\n💡 Use CLAUDE.md instead:\n  • CLAUDE.md is the standard for Claude Code projects\n  • Create \($dir)/CLAUDE.md for this directory'\''s guidance\n  • Hierarchical: Root CLAUDE.md = baseline, subdirs add specifics\n  • Auto-discovered by Claude when working in this area\n\n✅ Alternative locations if you need general documentation:\n  • /docs directory for user-facing documentation\n  • Hidden directories (.claude, .github) for tooling\n\n📚 Why CLAUDE.md over README.md?\n  • Directly read by Claude Code for context and guidelines\n  • Supports inheritance (root + subdirectory combined)\n  • Better separation: CLAUDE.md = AI guidance, docs/ = human docs"
                }
              }'
          else
            # General markdown restriction message
            jq -n \
              --arg cmd "$COMMAND" \
              --arg file "$md_file" \
              --arg dir "$md_dir" \
              '{
                hookSpecificOutput: {
                  hookEventName: "PreToolUse",
                  permissionDecision: "ask",
                  permissionDecisionReason: "⛔ Markdown File Creation Restricted\n\nCommand: \($cmd)\nDetected file: \($file)\n\n🚫 Policy: Markdown files are restricted outside of:\n  • /docs directory\n  • Hidden directories (starting with .)\n  • CLAUDE.md (allowed anywhere)\n\n❌ This command would create a restricted markdown file.\n\n💡 Consider these alternatives:\n  • Use /docs directory for project documentation\n  • Create CLAUDE.md in this directory (\($dir)/CLAUDE.md)\n    → Provides scoped guidance for this area\n    → Won'\''t conflict with root CLAUDE.md (works like inheritance)\n    → Picked up automatically when working in this directory\n  • Use hidden directories (.claude, .github, etc.) for tooling"
                }
              }'
          fi
          exit 0
        fi
      done <<< "$MD_FILES"
    fi
  fi
fi

# For other tools or non-restricted files, allow normal flow
exit 0
