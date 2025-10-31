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

# Add mandatory task requirements
CONTEXT+="## 🎯 Task Completion Requirements (MANDATORY)"$'\n\n'
CONTEXT+="For EVERY task you perform, you MUST:"$'\n\n'
CONTEXT+="1. **State Initial Confidence (0-100%)**"$'\n'
CONTEXT+="   - Before starting any task, state your confidence level"$'\n'
CONTEXT+="   - If confidence < 80%, STOP and use Zen MCP tools for consultation"$'\n'
CONTEXT+="   - Available Zen tools: chat, thinkdeep, debug, analyze, consensus"$'\n'
CONTEXT+="   - Example: \"Initial confidence: 65% - will consult Zen MCP first\""$'\n\n'
CONTEXT+="2. **State Final Confidence (0-100%)**"$'\n'
CONTEXT+="   - After completing the task, state your confidence in the solution"$'\n'
CONTEXT+="   - If final confidence < 80%, recommend further validation"$'\n'
CONTEXT+="   - Example: \"Final confidence: 95% - solution tested and validated\""$'\n\n'
CONTEXT+="3. **Always Provide Next Steps**"$'\n'
CONTEXT+="   - NEVER end a response without suggesting next steps"$'\n'
CONTEXT+="   - Include considerations, potential improvements, or follow-up tasks"$'\n'
CONTEXT+="   - Format: \"## Next Steps & Considerations:\" followed by numbered list"$'\n\n'
CONTEXT+="**Confidence Level Guidelines:**"$'\n'
CONTEXT+="- 90-100%: High certainty, tested and validated"$'\n'
CONTEXT+="- 80-89%: Good confidence, standard approach"$'\n'
CONTEXT+="- 70-79%: Some uncertainty, may need review"$'\n'
CONTEXT+="- Below 70%: Low confidence, MUST use Zen MCP"$'\n\n'
CONTEXT+="---"$'\n\n'

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
