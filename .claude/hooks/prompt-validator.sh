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
CONTEXT+="4. **Optimize Task Execution (PERFORMANCE)**"$'\n'
CONTEXT+="   - Use parallel tool calls when tasks are independent (single message, multiple tools)"$'\n'
CONTEXT+="   - Batch similar operations together (read multiple files, run tests + lint in sequence)"$'\n'
CONTEXT+="   - Create helper bash scripts for repetitive multi-step operations"$'\n'
CONTEXT+="   - Use Task tool with parallel agents when appropriate"$'\n'
CONTEXT+="   - Example: \"Reading 5 files in parallel\" or \"Creating script for test+build workflow\""$'\n\n'
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

# Check for TypeScript and linting errors (smart mode: only check modified files if uncommitted changes exist)
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ] && command -v pnpm &> /dev/null; then
  # Cache management (skip checks if run within last 60 seconds and no file changes)
  CACHE_DIR="/tmp/claude-hook-cache"
  CACHE_FILE="$CACHE_DIR/last-check-${SESSION_ID:-$$}"
  CACHE_MAX_AGE=60  # seconds (optimized for performance)
  SKIP_CHECKS=false

  mkdir -p "$CACHE_DIR"

  if [ -f "$CACHE_FILE" ]; then
    LAST_CHECK=$(cat "$CACHE_FILE" 2>/dev/null || echo "0")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_CHECK))

    if [ "$TIME_DIFF" -lt "$CACHE_MAX_AGE" ]; then
      # Check if any files were modified since last check
      MODIFIED_SINCE_CHECK=$(find "$CLAUDE_PROJECT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -newer "$CACHE_FILE" 2>/dev/null | wc -l)

      if [ "$MODIFIED_SINCE_CHECK" -eq 0 ]; then
        SKIP_CHECKS=true
        CONTEXT+="### ⚡ TypeScript & Linting Status"$'\n'
        CONTEXT+="Using cached results from ${TIME_DIFF}s ago (no file changes detected)."$'\n\n'
      fi
    fi
  fi

  if [ "$SKIP_CHECKS" = false ]; then
    # Update cache timestamp
    date +%s > "$CACHE_FILE"

    # Get list of modified TypeScript/JavaScript files
    MODIFIED_FILES=""
    if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
      MODIFIED_FILES=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
    fi

    # Determine check mode
    if [ -n "$MODIFIED_FILES" ]; then
      CHECK_MODE="modified"
      FILE_COUNT=$(echo "$MODIFIED_FILES" | wc -l | tr -d ' ')
    else
      CHECK_MODE="full"
    fi

  # ============================================================================
  # PARALLEL EXECUTION: Run TypeScript + ESLint checks simultaneously (2x speedup)
  # ============================================================================

  # Setup temporary files for parallel execution
  TSC_OUTPUT_FILE="$CACHE_DIR/tsc-output-${SESSION_ID:-$$}"
  LINT_OUTPUT_FILE="$CACHE_DIR/lint-output-${SESSION_ID:-$$}"

  # Start TypeScript check in background
  (
    if [ "$CHECK_MODE" = "modified" ]; then
      # Run full typecheck but we'll filter output later
      cd "$CLAUDE_PROJECT_DIR" && pnpm tsc --noEmit 2>&1 || true
    else
      # Full project typecheck
      cd "$CLAUDE_PROJECT_DIR" && pnpm tsc --noEmit 2>&1 || true
    fi
  ) > "$TSC_OUTPUT_FILE" &
  TSC_PID=$!

  # Start ESLint check in background
  (
    if [ "$CHECK_MODE" = "modified" ] && [ -n "$MODIFIED_FILES" ]; then
      # Targeted lint check on modified files only
      LINT_FILES=$(echo "$MODIFIED_FILES" | tr '\n' ' ')
      cd "$CLAUDE_PROJECT_DIR" && pnpm eslint $LINT_FILES 2>&1 || true
    else
      # Full project lint
      cd "$CLAUDE_PROJECT_DIR" && pnpm lint 2>&1 || true
    fi
  ) > "$LINT_OUTPUT_FILE" &
  LINT_PID=$!

  # Wait for both checks to complete
  wait $TSC_PID
  wait $LINT_PID

  # Process TypeScript results
  TYPECHECK_OUTPUT=$(cat "$TSC_OUTPUT_FILE")
  if [ "$CHECK_MODE" = "modified" ]; then
    # Filter output to modified files only
    FILTERED_OUTPUT=""
    while IFS= read -r file; do
      FILE_ERRORS=$(echo "$TYPECHECK_OUTPUT" | grep "^$file(" || true)
      if [ -n "$FILE_ERRORS" ]; then
        FILTERED_OUTPUT+="$FILE_ERRORS"$'\n'
      fi
    done <<< "$MODIFIED_FILES"
    TYPECHECK_ERRORS=$(echo "$FILTERED_OUTPUT" | grep -c "error TS" || true)
    DISPLAY_OUTPUT="$FILTERED_OUTPUT"
  else
    TYPECHECK_ERRORS=$(echo "$TYPECHECK_OUTPUT" | grep -c "error TS" || true)
    DISPLAY_OUTPUT="$TYPECHECK_OUTPUT"
  fi

  if [ "$TYPECHECK_ERRORS" -gt 0 ]; then
    CONTEXT+="### 🔴 TypeScript Status (MANDATORY CHECK)"$'\n'
    if [ "$CHECK_MODE" = "modified" ]; then
      CONTEXT+="❌ $TYPECHECK_ERRORS type error(s) in $FILE_COUNT modified file(s)"$'\n\n'
    else
      CONTEXT+="❌ $TYPECHECK_ERRORS type error(s) detected (full project check)"$'\n\n'
    fi
    CONTEXT+="**Errors:**"$'\n'
    CONTEXT+='```'$'\n'
    CONTEXT+="$(echo "$DISPLAY_OUTPUT" | grep "error TS" | head -5)"$'\n'
    CONTEXT+='```'$'\n\n'
    CONTEXT+="**Action required:** These MUST be fixed before committing per strict TypeScript policy."$'\n\n'
  else
    CONTEXT+="### ✅ TypeScript Status"$'\n'
    if [ "$CHECK_MODE" = "modified" ]; then
      CONTEXT+="No type errors in $FILE_COUNT modified file(s)."$'\n\n'
    else
      CONTEXT+="No type errors detected."$'\n\n'
    fi
  fi

  # Process ESLint results
  LINT_OUTPUT=$(cat "$LINT_OUTPUT_FILE")
  LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -c "✖" | head -1 || echo "0")
  LINT_WARNINGS=$(echo "$LINT_OUTPUT" | grep -oP '\d+(?= warning)' | head -1 || echo "0")

  if [ "$LINT_ERRORS" != "0" ] && [ "$LINT_ERRORS" != "" ]; then
    CONTEXT+="### 🔴 Linting Status (MANDATORY CHECK)"$'\n'
    if [ "$CHECK_MODE" = "modified" ]; then
      CONTEXT+="❌ Issues found in $FILE_COUNT modified file(s)"$'\n'
    else
      CONTEXT+="❌ Linting issues found (full project check)"$'\n'
    fi
    if [ "$LINT_WARNINGS" != "0" ] && [ "$LINT_WARNINGS" != "" ]; then
      CONTEXT+="⚠️  $LINT_WARNINGS warning(s) detected."$'\n'
    fi
    CONTEXT+='```'$'\n'
    CONTEXT+="$(echo "$LINT_OUTPUT" | tail -15)"$'\n'
    CONTEXT+='```'$'\n\n'
    CONTEXT+="**Action required:** Fix linting errors before committing."$'\n\n'
  elif [ "$LINT_WARNINGS" != "0" ] && [ "$LINT_WARNINGS" != "" ]; then
    CONTEXT+="### ⚠️  Linting Status"$'\n'
    if [ "$CHECK_MODE" = "modified" ]; then
      CONTEXT+="$LINT_WARNINGS warning(s) in modified files. Run \`pnpm lint\` to review."$'\n\n'
    else
      CONTEXT+="$LINT_WARNINGS warning(s) detected. Run \`pnpm lint\` to review."$'\n\n'
    fi
  else
    CONTEXT+="### ✅ Linting Status"$'\n'
    if [ "$CHECK_MODE" = "modified" ]; then
      CONTEXT+="No linting issues in $FILE_COUNT modified file(s)."$'\n\n'
    else
      CONTEXT+="No linting errors or warnings detected."$'\n\n'
    fi
  fi

  # Cleanup temporary files
  rm -f "$TSC_OUTPUT_FILE" "$LINT_OUTPUT_FILE"
  fi  # Close SKIP_CHECKS=false block
fi  # Close main checks block

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
