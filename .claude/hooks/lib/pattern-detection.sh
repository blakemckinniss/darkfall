#!/bin/bash
# Pattern detection functions for Claude Code hooks
# Used by: prompt-validator.sh

# Detect task type from prompt
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

# Technology Risk Database (inline for performance)
# Format: "tech_name|release_date|risk_level|version_info"
get_tech_risk_database() {
  cat <<'EOF'
tailwindcss|2024-10|HIGH|v4.0 (breaking changes from v3)
tailwind|2024-10|HIGH|v4.0 (breaking changes from v3)
react|2024-12|HIGH|v19 (new features, some deprecations)
next.js|2024-10|MEDIUM|v15 (app router changes)
nextjs|2024-10|MEDIUM|v15 (app router changes)
vite|2024-11|MEDIUM|v5.x (config changes)
typescript|2023-11|MEDIUM|v5.x (new features)
node.js|2024-10|MEDIUM|v22 LTS
nodejs|2024-10|MEDIUM|v22 LTS
pnpm|2024-09|LOW|v9.x
bun|2024-09|MEDIUM|v1.x (rapidly evolving)
astro|2024-12|MEDIUM|v4.x (breaking changes)
svelte|2024-12|HIGH|v5 (runes, breaking changes)
vue|2024-05|MEDIUM|v3.4+ (new features)
EOF
}

# Detect outdated knowledge risk
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
  while IFS='|' read -r tech_name release_date risk_level version_info; do
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
  done < <(get_tech_risk_database)

  echo "$risk_warnings"
}

# Check for documentation update triggers
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
