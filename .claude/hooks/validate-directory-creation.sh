#!/bin/bash
# PreToolUse hook that requires user confirmation and AI justification
# before creating new directories.

set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract tool name and input using jq
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input // {}')

# Handle MCP filesystem create_directory tool
if [ "$TOOL_NAME" = "mcp__filesystem__create_directory" ]; then
  PATH_VALUE=$(echo "$INPUT" | jq -r '.tool_input.path // ""')

  # Return permission decision as JSON
  jq -n \
    --arg path "$PATH_VALUE" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: "Directory Creation Requires Approval\n\nPath: \($path)\n\n⚠️  Before approving, verify that Claude has:\n1. Explained WHY this directory is needed\n2. Described what will be stored in it\n3. Confirmed it doesn'\''t duplicate existing structure\n\nIf Claude hasn'\''t provided justification, deny this request and ask Claude to explain first."
      }
    }'
  exit 0
fi

# Handle Bash commands with mkdir
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

  # Check if command contains mkdir
  if echo "$COMMAND" | grep -q "mkdir"; then
    # Return permission decision as JSON
    jq -n \
      --arg cmd "$COMMAND" \
      '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: "Directory Creation via Bash Requires Approval\n\nCommand: \($cmd)\n\n⚠️  Before approving, verify that Claude has:\n1. Explained WHY this directory is needed\n2. Described what will be stored in it\n3. Confirmed it doesn'\''t duplicate existing structure\n\nIf Claude hasn'\''t provided justification, deny this request and ask Claude to explain first."
        }
      }'
    exit 0
  fi
fi

# For other tools, allow normal flow (exit 0 with no output)
exit 0
