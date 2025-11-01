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
# OUTDATED KNOWLEDGE RISK DETECTION (Phase 1b - CRITICAL)
# Detects when AI knowledge may be outdated (e.g., Tailwind v4, React 19, etc.)
# ============================================================================

# Technology Risk Database (inline for performance)
# Format: "tech_name|release_date|risk_level|version_info"
declare -a TECH_RISK_DB=(
  "tailwindcss|2024-10|HIGH|v4.0 (breaking changes from v3)"
  "tailwind|2024-10|HIGH|v4.0 (breaking changes from v3)"
  "react|2024-12|HIGH|v19 (new features, some deprecations)"
  "next.js|2024-10|MEDIUM|v15 (app router changes)"
  "nextjs|2024-10|MEDIUM|v15 (app router changes)"
  "vite|2024-11|MEDIUM|v5.x (config changes)"
  "typescript|2023-11|MEDIUM|v5.x (new features)"
  "node.js|2024-10|MEDIUM|v22 LTS"
  "nodejs|2024-10|MEDIUM|v22 LTS"
  "pnpm|2024-09|LOW|v9.x"
  "bun|2024-09|MEDIUM|v1.x (rapidly evolving)"
  "astro|2024-12|MEDIUM|v4.x (breaking changes)"
  "svelte|2024-12|HIGH|v5 (runes, breaking changes)"
  "vue|2024-05|MEDIUM|v3.4+ (new features)"
)

detect_outdated_knowledge_risk() {
  local prompt="$1"
  local risk_warnings=""
  local detected_risks=()

  # Fast path: Check if prompt contains technical keywords
  if ! echo "$prompt" | grep -qiE '\b(install|add|upgrade|migrate|config|package|import|from|use|setup)\b'; then
    echo ""
    return
  fi

  # HIGH PRIORITY: Package installation commands with versions
  if echo "$prompt" | grep -qiE '(npm|pnpm|yarn|bun) (install|add).*@[0-9]+'; then
    detected_risks+=("PACKAGE_INSTALL_VERSIONED")
  fi

  if echo "$prompt" | grep -qiE 'pip install.*==[0-9]+'; then
    detected_risks+=("PYTHON_INSTALL_VERSIONED")
  fi

  # HIGH PRIORITY: Config file modifications
  if echo "$prompt" | grep -qiE '(tailwind|vite|next|astro|svelte|vue)\.config\.(js|ts|mjs|cjs)'; then
    detected_risks+=("CONFIG_FILE_MODIFICATION")
  fi

  # HIGH PRIORITY: Migration/upgrade keywords
  if echo "$prompt" | grep -qiE '\b(upgrade|migrate|migration|update.*to|from.*to).*\b(v?[0-9]+|version)'; then
    detected_risks+=("MIGRATION_DETECTED")
  fi

  # Check against technology risk database
  for tech_entry in "${TECH_RISK_DB[@]}"; do
    IFS='|' read -r tech_name release_date risk_level version_info <<< "$tech_entry"

    # Check if technology is mentioned in prompt
    if echo "$prompt" | grep -qiE "\b$tech_name\b"; then
      # Additional context checks for high-risk scenarios
      if echo "$prompt" | grep -qiE "\b$tech_name\b.*(install|config|setup|migrate|upgrade|v?[0-9]+)"; then
        risk_warnings+="🚨 **OUTDATED KNOWLEDGE RISK DETECTED** 🚨"$'\n\n'
        risk_warnings+="**Technology**: $(echo "$tech_name" | tr '[:lower:]' '[:upper:]')"$'\n'
        risk_warnings+="**Risk Level**: $risk_level - $version_info"$'\n'
        risk_warnings+="**Released**: $release_date (may be beyond knowledge cutoff)"$'\n\n'
        risk_warnings+="**MANDATORY ACTION REQUIRED**:"$'\n'
        risk_warnings+="1. 🔍 Search web for \"$tech_name latest version documentation\" or \"$tech_name $version_info\""$'\n'
        risk_warnings+="2. 🤖 OR use Zen MCP with websearch: \`mcp__zen__chat\` with \`use_websearch=true\`"$'\n'
        risk_warnings+="3. ✅ Verify current best practices before proceeding"$'\n\n'
        risk_warnings+="**Why this matters**: Recent major versions often have breaking changes that"$'\n'
        risk_warnings+="could cause project errors if you use outdated syntax or configuration."$'\n\n'
        risk_warnings+="⚠️  **This is NOT optional** - proceeding without websearch may result in broken code."$'\n\n'
        break  # Only show one risk warning per prompt to avoid spam
      fi
    fi
  done

  echo "$risk_warnings"
}

# Optional: Check package.json for version mismatches (if exists and reasonable size)
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

OUTDATED_KNOWLEDGE_WARNINGS=$(detect_outdated_knowledge_risk "$PROMPT")
VERSION_MISMATCH_WARNINGS=$(check_package_version_mismatch "$PROMPT")

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

# ============================================================================
# DOCUMENTATION UPDATE DETECTION (Phase 1e)
# Detect changes that likely require ADR.md, CLAUDE.md, or NOTES.md updates
# ============================================================================
check_doc_update_triggers() {
  local prompt="$1"
  local doc_reminders=""

  # ADR.md triggers: architectural decisions
  if echo "$prompt" | grep -qiE '\b(architecture|state management|api design|database|deployment|build system|integration pattern|design pattern)\b'; then
    doc_reminders+="📋 **Reminder**: Changes to architecture/design patterns may require **docs/ADR.md** update"$'\n'
  fi

  # CLAUDE.md triggers: development workflow changes
  if echo "$prompt" | grep -qiE '\b(typescript config|dev command|workflow|slash command|hook|build process|lint rule|prettier|tsconfig)\b'; then
    doc_reminders+="📋 **Reminder**: Workflow/config changes may require **CLAUDE.md** update"$'\n'
  fi

  # NOTES.md triggers: critical items tracking
  if echo "$prompt" | grep -qiE '\b(critical|urgent|blocker|high priority|must fix|breaking change)\b'; then
    doc_reminders+="📋 **Reminder**: Critical items should be logged to **docs/NOTES.md** (auto-logged if 🔴/⭐76-100)"$'\n'
  fi

  echo "$doc_reminders"
}

PROMPT_QUALITY_WARNINGS=$(check_prompt_quality "$PROMPT")
DOC_UPDATE_REMINDERS=$(check_doc_update_triggers "$PROMPT")

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

# Add OUTDATED KNOWLEDGE warnings FIRST (highest priority)
if [ -n "$OUTDATED_KNOWLEDGE_WARNINGS" ]; then
  CONTEXT+="$OUTDATED_KNOWLEDGE_WARNINGS"$'\n'
fi

# Add version mismatch warnings
if [ -n "$VERSION_MISMATCH_WARNINGS" ]; then
  CONTEXT+="$VERSION_MISMATCH_WARNINGS"$'\n'
fi

# Add prompt quality warnings if any
if [ -n "$PROMPT_QUALITY_WARNINGS" ]; then
  CONTEXT+="$PROMPT_QUALITY_WARNINGS"$'\n'
fi

# Add documentation update reminders if any
if [ -n "$DOC_UPDATE_REMINDERS" ]; then
  CONTEXT+="$DOC_UPDATE_REMINDERS"$'\n'
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
