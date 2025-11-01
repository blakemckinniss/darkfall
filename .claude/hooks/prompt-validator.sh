#!/bin/bash
set -euo pipefail

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# ============================================================================
# TASK TYPE DETECTION (Phase 1a)
# ============================================================================
detect_task_type() {
  local prompt="$1"

  # Priority order: most specific first
  if echo "$prompt" | grep -qiE '\b(fix|bug|error|issue|crash|broken|failing|fails)\b'; then
    echo "bugfix"
  elif echo "$prompt" | grep -qiE '\b(refactor|clean|improve structure|reorganize|simplify)\b'; then
    echo "refactor"
  elif echo "$prompt" | grep -qiE '\b(performance|optimize|speed|slow|faster|memory|efficient)\b'; then
    echo "performance"
  elif echo "$prompt" | grep -qiE '\b(add|implement|create|new feature|build)\b'; then
    echo "feature"
  else
    echo "general"
  fi
}

TASK_TYPE=$(detect_task_type "$PROMPT")

# ============================================================================
# PROMPT QUALITY ANALYSIS (Phase 1c - Highest ROI)
# ============================================================================
check_prompt_quality() {
  local prompt="$1"
  local quality_warnings=""

  # Detect extremely vague prompts
  if echo "$prompt" | grep -qiE '^\s*(fix it|make it better|handle this|do it|help)\s*$'; then
    quality_warnings+="⚠️  **Vague Prompt Detected** - Consider specifying: What's wrong? What should happen? Which files?"$'\n'
  fi

  # Suggest file paths if component/function mentioned but no path
  if echo "$prompt" | grep -qiE '\b(component|function|class|file|module)\b' && ! echo "$prompt" | grep -qE '\.(ts|tsx|js|jsx|css|json)'; then
    quality_warnings+="💡 **Tip**: Include file paths (e.g., \`components/foo.tsx\`) for faster assistance."$'\n'
  fi

  echo "$quality_warnings"
}

PROMPT_QUALITY_WARNINGS=$(check_prompt_quality "$PROMPT")

# ============================================================================
# SMART CONTEXT FILTERING (Phase 1d)
# Extract files mentioned in prompt for intelligent error filtering
# ============================================================================
extract_mentioned_files() {
  local prompt="$1"

  # Extract explicit file paths from prompt
  echo "$prompt" | grep -oE '[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx|css|json)' || echo ""
}

MENTIONED_FILES=$(extract_mentioned_files "$PROMPT")

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

# Add prompt quality warnings if any
if [ -n "$PROMPT_QUALITY_WARNINGS" ]; then
  CONTEXT+="$PROMPT_QUALITY_WARNINGS"$'\n'
fi

# ============================================================================
# TASK-SPECIFIC CHECKLISTS (Phase 1b - excluding security)
# ============================================================================
add_task_checklist() {
  local task_type="$1"

  case "$task_type" in
    bugfix)
      CONTEXT+="### 🐛 Bug Fix Checklist"$'\n'
      CONTEXT+="- [ ] Can you reproduce the bug reliably?"$'\n'
      CONTEXT+="- [ ] Do you understand the root cause?"$'\n'
      CONTEXT+="- [ ] Will you add a test that fails without the fix?"$'\n'
      CONTEXT+="- [ ] Are there similar bugs elsewhere in the codebase?"$'\n\n'
      ;;
    feature)
      CONTEXT+="### ✨ Feature Development Checklist"$'\n'
      CONTEXT+="- [ ] Does this fit existing architecture patterns?"$'\n'
      CONTEXT+="- [ ] Are you following the project's UI/UX standards?"$'\n'
      CONTEXT+="- [ ] Will you add tests for the new functionality?"$'\n'
      CONTEXT+="- [ ] Is the feature scope clearly defined?"$'\n\n'
      ;;
    refactor)
      CONTEXT+="### 🔧 Refactoring Checklist"$'\n'
      CONTEXT+="- [ ] Are you maintaining backward compatibility?"$'\n'
      CONTEXT+="- [ ] Do existing tests cover this code?"$'\n'
      CONTEXT+="- [ ] Have you checked all usages/references?"$'\n'
      CONTEXT+="- [ ] Is the refactor necessary or over-engineering?"$'\n\n'
      ;;
    performance)
      CONTEXT+="### ⚡ Performance Optimization Checklist"$'\n'
      CONTEXT+="- [ ] What are you measuring? (baseline metrics)"$'\n'
      CONTEXT+="- [ ] Have you profiled to find the actual bottleneck?"$'\n'
      CONTEXT+="- [ ] Will you verify the improvement with benchmarks?"$'\n'
      CONTEXT+="- [ ] Could this optimization harm readability?"$'\n\n'
      ;;
  esac
}

add_task_checklist "$TASK_TYPE"

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
CONTEXT+="5. **Document Technical Debt & Risks (MANDATORY)**"$'\n'
CONTEXT+="   - ALWAYS add a \"Technical Debt & Risks\" section at the end"$'\n'
CONTEXT+="   - List any compromises, shortcuts, or future concerns"$'\n'
CONTEXT+="   - Note potential conflicts or integration risks"$'\n'
CONTEXT+="   - Format: \"## ⚠️ Technical Debt & Risks:\" followed by numbered list"$'\n\n'
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

# ============================================================================
# SMART TYPE/LINT CHECKING (Phase 1d - Intelligent Filtering)
# Only check files relevant to the prompt or recently modified
# ============================================================================
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

    # Get list of modified TypeScript/JavaScript files from git
    GIT_MODIFIED_FILES=""
    if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
      GIT_MODIFIED_FILES=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
    fi

    # Combine mentioned files from prompt + git modified files for relevance
    RELEVANT_FILES="$MENTIONED_FILES"$'\n'"$GIT_MODIFIED_FILES"
    RELEVANT_FILES=$(echo "$RELEVANT_FILES" | grep -v '^$' | sort -u || echo "")

    # Determine check mode: smart (relevant files only) or full (no relevant files identified)
    if [ -n "$RELEVANT_FILES" ]; then
      CHECK_MODE="smart"
      FILE_COUNT=$(echo "$RELEVANT_FILES" | wc -l | tr -d ' ')
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
    # Always run full typecheck (filtering happens after)
    cd "$CLAUDE_PROJECT_DIR" && pnpm tsc --noEmit 2>&1 || true
  ) > "$TSC_OUTPUT_FILE" &
  TSC_PID=$!

  # Start ESLint check in background
  (
    if [ "$CHECK_MODE" = "smart" ] && [ -n "$RELEVANT_FILES" ]; then
      # Targeted lint check on relevant files only
      LINT_FILES=$(echo "$RELEVANT_FILES" | tr '\n' ' ')
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

  # Process TypeScript results with smart filtering
  TYPECHECK_OUTPUT=$(cat "$TSC_OUTPUT_FILE")
  if [ "$CHECK_MODE" = "smart" ] && [ -n "$RELEVANT_FILES" ]; then
    # Filter output to relevant files only
    FILTERED_OUTPUT=""
    while IFS= read -r file; do
      if [ -n "$file" ]; then
        FILE_ERRORS=$(echo "$TYPECHECK_OUTPUT" | grep "^$file(" || true)
        if [ -n "$FILE_ERRORS" ]; then
          FILTERED_OUTPUT+="$FILE_ERRORS"$'\n'
        fi
      fi
    done <<< "$RELEVANT_FILES"
    TYPECHECK_ERRORS=$(echo "$FILTERED_OUTPUT" | grep -c "error TS" || true)
    DISPLAY_OUTPUT="$FILTERED_OUTPUT"
  else
    TYPECHECK_ERRORS=$(echo "$TYPECHECK_OUTPUT" | grep -c "error TS" || true)
    DISPLAY_OUTPUT="$TYPECHECK_OUTPUT"
  fi

  if [ "$TYPECHECK_ERRORS" -gt 0 ]; then
    CONTEXT+="### 🔴 TypeScript Status (MANDATORY CHECK)"$'\n'
    if [ "$CHECK_MODE" = "smart" ]; then
      CONTEXT+="❌ $TYPECHECK_ERRORS type error(s) in $FILE_COUNT relevant file(s)"$'\n\n'
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
    if [ "$CHECK_MODE" = "smart" ]; then
      CONTEXT+="No type errors in $FILE_COUNT relevant file(s)."$'\n\n'
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
    if [ "$CHECK_MODE" = "smart" ]; then
      CONTEXT+="❌ Issues found in $FILE_COUNT relevant file(s)"$'\n'
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
    if [ "$CHECK_MODE" = "smart" ]; then
      CONTEXT+="$LINT_WARNINGS warning(s) in relevant files. Run \`pnpm lint\` to review."$'\n\n'
    else
      CONTEXT+="$LINT_WARNINGS warning(s) detected. Run \`pnpm lint\` to review."$'\n\n'
    fi
  else
    CONTEXT+="### ✅ Linting Status"$'\n'
    if [ "$CHECK_MODE" = "smart" ]; then
      CONTEXT+="No linting issues in $FILE_COUNT relevant file(s)."$'\n\n'
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
