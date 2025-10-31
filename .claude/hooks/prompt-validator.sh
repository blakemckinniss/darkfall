#!/bin/bash
set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# Validation rules
BLOCKED_PATTERNS=(
  "create.*README"
  "write.*documentation"
  "generate.*example"
  "create.*demo"
)

# Check for blocked patterns
for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$PROMPT" | grep -qiE "$pattern"; then
    # Block and explain
    OUTPUT=$(jq -n \
      --arg reason "Per project guidelines: Avoid creating documentation, demos, or examples unless explicitly requested. Focus on production code." \
      '{
        decision: "block",
        reason: $reason
      }')
    echo "$OUTPUT"
    exit 0
  fi
done

# Add helpful context about uncommitted changes and project state
CONTEXT=""

# Check for uncommitted changes
if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
  UNCOMMITTED=$(git -C "$CLAUDE_PROJECT_DIR" status --porcelain 2>/dev/null | wc -l)

  if [ "$UNCOMMITTED" -gt 0 ]; then
    MODIFIED_FILES=$(git -C "$CLAUDE_PROJECT_DIR" status --porcelain 2>/dev/null | head -5)
    CONTEXT+="### Uncommitted Changes ($UNCOMMITTED files)"$'\n'
    CONTEXT+='```'$'\n'
    CONTEXT+="$MODIFIED_FILES"$'\n'
    CONTEXT+='```'$'\n\n'
    CONTEXT+="Consider: Should these changes be committed before starting new work?"$'\n\n'
  fi
fi

# Check for lint errors
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  if command -v pnpm &> /dev/null; then
    LINT_OUTPUT=$(cd "$CLAUDE_PROJECT_DIR" && pnpm lint 2>&1 || true)
    LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "error" || true)

    if [ "$LINT_ERRORS" -gt 0 ]; then
      CONTEXT+="### Linting Status"$'\n'
      CONTEXT+="⚠️  $LINT_ERRORS linting errors detected. Run \`pnpm lint\` to see details."$'\n\n'
    fi
  fi
fi

# Output context if available
if [ -n "$CONTEXT" ]; then
  OUTPUT=$(jq -n \
    --arg context "$CONTEXT" \
    '{
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: $context
      }
    }')
  echo "$OUTPUT"
fi

exit 0
