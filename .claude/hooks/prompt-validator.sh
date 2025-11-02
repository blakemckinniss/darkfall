#!/bin/bash
set -euo pipefail

# Graceful degradation: Check dependencies
command -v jq >/dev/null 2>&1 || exit 0

# Set CLAUDE_PROJECT_DIR default if not provided
: "${CLAUDE_PROJECT_DIR:=$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

# Source shared libraries
SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
source "$SCRIPT_DIR/lib/validation-common.sh"
source "$SCRIPT_DIR/lib/pattern-detection.sh"
source "$SCRIPT_DIR/lib/typescript-checks.sh"

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

# ============================================================================
# TASK TYPE DETECTION & VALIDATION
# ============================================================================
TASK_TYPE=$(detect_task_type "$PROMPT")

# Check for blocked patterns
if check_blocked_patterns "$PROMPT"; then
  OUTPUT=$(jq -n \
    --arg reason "$(get_block_reason)" \
    '{
      decision: "block",
      reason: $reason
    }')
  echo "$OUTPUT"
  exit 0
fi

# Add helpful context about uncommitted changes and project state
CONTEXT=""

# ============================================================================
# CRITICAL WARNINGS (Highest Priority)
# ============================================================================

# OUTDATED KNOWLEDGE warnings FIRST (highest priority)
OUTDATED_KNOWLEDGE_WARNINGS=$(detect_outdated_knowledge_risk "$PROMPT")
if [ -n "$OUTDATED_KNOWLEDGE_WARNINGS" ]; then
  CONTEXT+="$OUTDATED_KNOWLEDGE_WARNINGS"$'\n'
fi

# Version mismatch warnings
check_package_version_mismatch() {
  local prompt="$1"
  local warnings=""

  if [ -f "$CLAUDE_PROJECT_DIR/package.json" ] && [ "$(wc -c < "$CLAUDE_PROJECT_DIR/package.json")" -lt 50000 ]; then
    # Check for Tailwind version mismatch
    if echo "$prompt" | grep -qiE 'tailwind'; then
      TAILWIND_VERSION=$(grep -oP '"tailwindcss":\s*"\^?([0-9]+)' "$CLAUDE_PROJECT_DIR/package.json" | grep -oP '[0-9]+' | head -1 || echo "")
      if [ -n "$TAILWIND_VERSION" ] && [ "$TAILWIND_VERSION" -ge 4 ]; then
        if echo "$prompt" | grep -qiE 'tailwind.*(v3|version 3|@3\.)'; then
          warnings+="⚠️  **Version Mismatch**: Your package.json has Tailwind v$TAILWIND_VERSION but prompt mentions v3"$'\n'
        fi
      fi
    fi

    # Check for React version mismatch
    if echo "$prompt" | grep -qiE 'react'; then
      REACT_VERSION=$(grep -oP '"react":\s*"\^?([0-9]+)' "$CLAUDE_PROJECT_DIR/package.json" | grep -oP '[0-9]+' | head -1 || echo "")
      if [ -n "$REACT_VERSION" ] && [ "$REACT_VERSION" -ge 19 ]; then
        if echo "$prompt" | grep -qiE 'react.*(v18|version 18|@18\.)'; then
          warnings+="⚠️  **Version Mismatch**: Your package.json has React v$REACT_VERSION but prompt mentions v18"$'\n'
        fi
      fi
    fi
  fi

  echo "$warnings"
}

VERSION_MISMATCH_WARNINGS=$(check_package_version_mismatch "$PROMPT")
if [ -n "$VERSION_MISMATCH_WARNINGS" ]; then
  CONTEXT+="$VERSION_MISMATCH_WARNINGS"$'\n'
fi

# Prompt quality warnings
PROMPT_QUALITY_WARNINGS=$(check_prompt_quality "$PROMPT")
if [ -n "$PROMPT_QUALITY_WARNINGS" ]; then
  CONTEXT+="$PROMPT_QUALITY_WARNINGS"$'\n'
fi

# Documentation update reminders
DOC_UPDATE_REMINDERS=$(check_doc_update_triggers "$PROMPT")
if [ -n "$DOC_UPDATE_REMINDERS" ]; then
  CONTEXT+="$DOC_UPDATE_REMINDERS"$'\n'
fi

# Extract mentioned files for smart filtering
MENTIONED_FILES=$(extract_mentioned_files "$PROMPT")

# ============================================================================
# TASK-SPECIFIC CHECKLISTS
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

# Add mandatory task requirements (kept inline for simplicity)
CONTEXT+="## 🎯 Task Completion Requirements (MANDATORY)"$'\n\n'
CONTEXT+="For EVERY task you perform, you MUST:"$'\n\n'
CONTEXT+="1. **State Initial Confidence (0-100%) - MANDATORY**"$'\n'
CONTEXT+="   - Before starting ANY task, you MUST state your initial confidence level"$'\n'
CONTEXT+="   - 🚨 **CRITICAL**: If confidence < 90%, you MUST STOP IMMEDIATELY and use Zen MCP with websearch enabled"$'\n'
CONTEXT+="   - This is NOT optional - low confidence without Zen MCP consultation is FORBIDDEN"$'\n'
CONTEXT+="   - Available Zen tools: chat, thinkdeep, debug, analyze, consensus, codereview, secaudit"$'\n'
CONTEXT+="   - ALL Zen tools support websearch - ALWAYS enable it for research and validation"$'\n'
CONTEXT+="   - Example: \"Initial confidence: 65% - STOPPING to consult Zen MCP with websearch before proceeding\""$'\n'
CONTEXT+="   - Example: \"Initial confidence: 95% - high confidence, proceeding without consultation\""$'\n\n'
CONTEXT+="2. **State Final Confidence (0-100%) - MANDATORY**"$'\n'
CONTEXT+="   - After completing the task, you MUST state your final confidence in the solution"$'\n'
CONTEXT+="   - If final confidence < 90%, you MUST consult Zen MCP for validation"$'\n'
CONTEXT+="   - Example: \"Final confidence: 95% - solution tested and validated\""$'\n'
CONTEXT+="   - Example: \"Final confidence: 75% - will consult Zen MCP for validation\""$'\n\n'
CONTEXT+="3. **Track Documentation Updates (MANDATORY)**"$'\n'
CONTEXT+="   - ALWAYS add a \"Documentation Updates Required\" section first (after completing work)"$'\n'
CONTEXT+="   - Check if changes affect: **docs/ADR.md**, **CLAUDE.md**, **docs/NOTES.md**, ENTITY_REGISTRY.md, README.md"$'\n'
CONTEXT+="   - **ADR.md triggers:** New architectural patterns, state management changes, API design, build/deploy changes"$'\n'
CONTEXT+="   - **CLAUDE.md triggers:** New dev commands, workflow changes, TypeScript rules, project guidelines"$'\n'
CONTEXT+="   - **NOTES.md usage:** Auto-log for critical items (🔴76-100, ⭐76-100); manual cleanup via \`/notes:cleanup\`"$'\n'
CONTEXT+="   - Format: \"## 📚 Documentation Updates Required:\" followed by numbered list"$'\n'
CONTEXT+="   - Each item: \"1. 🟢20 Update...\" (emoji + number, no brackets or labels)"$'\n'
CONTEXT+="   - Severity scale: 🟢1-25 🟡26-50 🟠51-75 🔴76-100"$'\n'
CONTEXT+="   - 🔴 CRITICAL (76-100): Auto-log to docs/NOTES.md with timestamp"$'\n'
CONTEXT+="   - If no documentation needs updating, state: \"None - no architectural or entity changes\""$'\n'
CONTEXT+="   - Use \`/doc all\` to execute all documentation updates"$'\n\n'
CONTEXT+="4. **Document Technical Debt & Risks (MANDATORY)**"$'\n'
CONTEXT+="   - ALWAYS add a \"Technical Debt & Risks\" section second (after Documentation Updates)"$'\n'
CONTEXT+="   - List any compromises, shortcuts, or future concerns"$'\n'
CONTEXT+="   - Note potential conflicts or integration risks"$'\n'
CONTEXT+="   - Format: \"## ⚠️ Technical Debt & Risks:\" followed by numbered list"$'\n'
CONTEXT+="   - Each item: \"1. 🟠65 Hook parsing...\" (emoji + number, no brackets or labels)"$'\n'
CONTEXT+="   - Severity scale: 🟢1-25 🟡26-50 🟠51-75 🔴76-100"$'\n'
CONTEXT+="   - 🔴 CRITICAL (76-100): Auto-log to docs/NOTES.md with timestamp"$'\n\n'
CONTEXT+="5. **Always Provide Next Steps (MANDATORY)**"$'\n'
CONTEXT+="   - ALWAYS add a \"Next Steps & Considerations\" section last"$'\n'
CONTEXT+="   - NEVER end a response without suggesting next steps"$'\n'
CONTEXT+="   - Include considerations, potential improvements, or follow-up tasks"$'\n'
CONTEXT+="   - Format: \"## Next Steps & Considerations:\" followed by numbered list"$'\n'
CONTEXT+="   - Each item: \"1. ⭐90 Test...\" (emoji + number, no brackets or labels)"$'\n'
CONTEXT+="   - Priority scale: ⚪1-25 🔵26-50 🟣51-75 ⭐76-100"$'\n'
CONTEXT+="   - ⭐ ESSENTIAL (76-100): Auto-log to docs/NOTES.md with timestamp"$'\n\n'
CONTEXT+="6. **Auto-Log Critical Items (76-100) to NOTES.md (MANDATORY)**"$'\n'
CONTEXT+="   - After completing your response, check all three sections for 🔴/⭐ items"$'\n'
CONTEXT+="   - Append critical items to docs/NOTES.md with format:"$'\n'
CONTEXT+="     \`## YYYY-MM-DD HH:MM - [DOCS|DEBT|NEXT]\`"$'\n'
CONTEXT+="     \`- 🔴XX Description\` or \`- ⭐XX Description\`"$'\n'
CONTEXT+="   - Keep NOTES.md as running log (newest at bottom)"$'\n'
CONTEXT+="   - Use Write tool in append mode for logging"$'\n\n'
CONTEXT+="7. **Optimize Task Execution (PERFORMANCE)**"$'\n'
CONTEXT+="   - Use parallel tool calls when tasks are independent (single message, multiple tools)"$'\n'
CONTEXT+="   - Batch similar operations together (read multiple files, run tests + lint in sequence)"$'\n'
CONTEXT+="   - Create helper bash scripts for repetitive multi-step operations"$'\n'
CONTEXT+="   - Use Task tool with parallel agents when appropriate"$'\n'
CONTEXT+="   - Example: \"Reading 5 files in parallel\" or \"Creating script for test+build workflow\""$'\n\n'
CONTEXT+="**Confidence Level Guidelines (STRICTLY ENFORCED):**"$'\n'
CONTEXT+="- 90-100%: High certainty - proceed without consultation"$'\n'
CONTEXT+="- 80-89%: 🚨 MUST consult Zen MCP with websearch - proceeding without consultation is FORBIDDEN"$'\n'
CONTEXT+="- 70-79%: 🚨 MUST consult Zen MCP with websearch - proceeding without consultation is FORBIDDEN"$'\n'
CONTEXT+="- Below 70%: 🚨 MUST consult Zen MCP with websearch - proceeding without consultation is FORBIDDEN"$'\n'
CONTEXT+="- **RULE**: Confidence < 90% = MANDATORY Zen MCP consultation with websearch enabled (use_websearch=true)"$'\n\n'
CONTEXT+="📚 **Architecture Reference**: See [docs/ADR.md](docs/ADR.md) for architectural decisions and design rationale."$'\n\n'
CONTEXT+="---"$'\n\n'
CONTEXT+="## 💭 Critical Reflection Questions (MANDATORY)"$'\n\n'
CONTEXT+="Before proceeding, consider these questions:"$'\n\n'

# ============================================================================
# DYNAMIC QUESTION GENERATION based on task type, project state, and context
# ============================================================================

# Question 1: Task-specific or general health check
if [ "$TASK_TYPE" = "bugfix" ]; then
  CONTEXT+="1. **Root Cause Analysis**: Have you traced this bug to its source, or are you treating symptoms?"$'\n'
elif [ "$TASK_TYPE" = "feature" ]; then
  CONTEXT+="1. **Feature Scope**: Does this feature align with core project goals, or does it expand scope unnecessarily?"$'\n'
elif [ "$TASK_TYPE" = "refactor" ]; then
  CONTEXT+="1. **Value vs Effort**: Will this refactor meaningfully improve maintainability, or is it premature optimization?"$'\n'
elif [ "$TASK_TYPE" = "performance" ]; then
  CONTEXT+="1. **Measurement First**: Have you profiled to identify the actual bottleneck, or are you guessing?"$'\n'
else
  CONTEXT+="1. **Clarity Check**: Is the task clearly defined, or should you ask clarifying questions before proceeding?"$'\n'
fi

# Question 2: Project health and technical debt awareness
if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
  UNCOMMITTED=$(git -C "$CLAUDE_PROJECT_DIR" status --porcelain 2>/dev/null | wc -l)
  if [ "$UNCOMMITTED" -gt 15 ]; then
    CONTEXT+="2. **Uncommitted Work**: With $UNCOMMITTED uncommitted files, should you commit existing work before adding more changes?"$'\n'
  else
    # Check for pending NOTES.md items
    if [ -f "$CLAUDE_PROJECT_DIR/docs/NOTES.md" ]; then
      CRITICAL_ITEMS=$(grep -c "🔴\|⭐" "$CLAUDE_PROJECT_DIR/docs/NOTES.md" 2>/dev/null || echo "0")
      if [ "$CRITICAL_ITEMS" -gt 5 ]; then
        CONTEXT+="2. **Critical Backlog**: There are $CRITICAL_ITEMS critical items in NOTES.md - should any be addressed before new work?"$'\n'
      else
        CONTEXT+="2. **Side Effects**: Could this change break existing functionality or dependent systems?"$'\n'
      fi
    else
      CONTEXT+="2. **Testing Strategy**: How will you verify this works without breaking existing functionality?"$'\n'
    fi
  fi
else
  CONTEXT+="2. **Integration Risk**: How does this interact with existing systems and data flows?"$'\n'
fi

# Question 3: Future-focused or user experience question
if echo "$PROMPT" | grep -qiE '\b(website|browser|webpage|web app|navigate|click|form|button|playwright|screenshot|scrape|crawl|dom|element|selector|input field|submit|login page|headless|automation)\b'; then
  CONTEXT+="3. **Browser Interaction Tool**: Are you using Playwright MCP (mcp__playwright__*) instead of WebFetch for website interactions?"$'\n'
elif echo "$PROMPT" | grep -qiE '\b(ui|ux|interface|design|visual|layout)\b'; then
  CONTEXT+="3. **User Experience**: Does this enhance usability and consistency with existing design patterns?"$'\n'
elif echo "$PROMPT" | grep -qiE '\b(api|service|integration|external|third-party)\b'; then
  CONTEXT+="3. **External Dependencies**: Are you considering rate limits, costs, and fallback behavior if external services fail?"$'\n'
elif echo "$PROMPT" | grep -qiE '\b(state|persist|save|load|database|storage)\b'; then
  CONTEXT+="3. **Data Migration**: If you change the data schema, how will existing data handle it?"$'\n'
elif echo "$PROMPT" | grep -qiE '\b(typescript|type|interface|config)\b'; then
  CONTEXT+="3. **Type Safety**: Are you maintaining strict type compliance, or introducing any escape hatches?"$'\n'
else
  # Default rotating questions based on current time (ensures variety)
  HOUR=$(date +%H)
  QUESTION_INDEX=$((HOUR % 4))

  case $QUESTION_INDEX in
    0)
      CONTEXT+="3. **Maintainability**: Will the next developer (or future you) understand this code in 6 months?"$'\n'
      ;;
    1)
      CONTEXT+="3. **Scalability**: Could this approach cause issues as data volume or user load increases?"$'\n'
      ;;
    2)
      CONTEXT+="3. **Cross-Platform**: Does this work across different environments, browsers, or devices?"$'\n'
      ;;
    3)
      CONTEXT+="3. **Performance Impact**: Could this cause performance degradation under realistic load conditions?"$'\n'
      ;;
  esac
fi

# ============================================================================
# PRACTICAL DEVELOPMENT HYGIENE REMINDERS
# Context-aware warnings for common quality/portability issues
# ============================================================================

# Configuration/Portability check
if echo "$PROMPT" | grep -qiE '\b(hardcoded|localhost|127\.0\.0\.1|absolute path|/Users/|C:\\|api.*url.*http|endpoint.*=.*http|\.env|API_KEY|SECRET)\b'; then
  CONTEXT+=$'\n'
  CONTEXT+="⚙️ **Configuration Check**: Hardcoded values detected. Use environment variables or config files for portability across environments."$'\n'
fi

# Testing discipline reminder
if echo "$PROMPT" | grep -qiE '\b(add.*(function|method|component|service|endpoint|route|handler|controller)|new.*(function|component|service|endpoint|class|route)|create.*(function|component|service|endpoint|class|api)|implement.*(function|method|component|service|feature|endpoint)|build.*(feature|service|endpoint|component))\b'; then
  CONTEXT+=$'\n'
  CONTEXT+="🧪 **Testing Discipline**: New code detected. Consider test cases, edge cases, and validation strategy."$'\n'
fi

# Error handling awareness
if echo "$PROMPT" | grep -qiE '\b(fetch|axios|api.*call|http.*request|database.*query|file.*read|file.*write|async|await|promise|external.*service|network.*request|third.*party)\b'; then
  CONTEXT+=$'\n'
  CONTEXT+="🛡️ **Error Handling**: External operations can fail. Plan for network errors, timeouts, and unexpected responses."$'\n'
fi

# Breaking change warning
if echo "$PROMPT" | grep -qiE '\b(change.*(type|interface|schema|api|contract)|modify.*(api|interface|schema|signature)|rename.*(field|prop|property|column|method|function)|remove.*(field|prop|property|column|endpoint)|update.*(interface|type|schema|api)|deprecate|breaking)\b'; then
  CONTEXT+=$'\n'
  CONTEXT+="⚠️ **Breaking Change**: API/interface modification detected. Consider versioning, migration path, and backwards compatibility."$'\n'
fi

# Performance consciousness
if echo "$PROMPT" | grep -qiE '\b(map.*map|nested.*loop|loop.*loop|forEach.*forEach|\.map.*\.filter|\.filter.*\.map|recursive.*call|n\+1|query.*all|fetch.*all.*records|load.*entire)\b'; then
  CONTEXT+=$'\n'
  CONTEXT+="⚡ **Performance**: Nested iterations or bulk operations detected. Consider data structure optimization, pagination, or lazy loading."$'\n'
fi

CONTEXT+=$'\n'
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
# SMART TYPE/LINT CHECKING (Using shared library)
# ============================================================================
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ] && command -v pnpm &> /dev/null; then
  TYPESCRIPT_ESLINT_CONTEXT=$(run_typescript_eslint_checks "$MENTIONED_FILES")
  if [ -n "$TYPESCRIPT_ESLINT_CONTEXT" ]; then
    CONTEXT+="$TYPESCRIPT_ESLINT_CONTEXT"
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
