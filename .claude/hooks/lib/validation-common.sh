#!/bin/bash
# Shared validation functions for Claude Code hooks
# Used by: prompt-validator.sh, pre-tool-pattern-prevention.sh

# Check prompt quality and provide suggestions
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

# Extract mentioned files from prompt for smart filtering
extract_mentioned_files() {
  local prompt="$1"

  # Extract explicit file paths from prompt
  echo "$prompt" | grep -oE '[a-zA-Z0-9/_.-]+\.(ts|tsx|js|jsx|css|json)' || echo ""
}

# Check for blocked patterns (demos, examples, etc.)
check_blocked_patterns() {
  local prompt="$1"

  local blocked_patterns=(
    "create.*README"
    "write.*documentation"
    "generate.*example"
    "create.*demo"
  )

  for pattern in "${blocked_patterns[@]}"; do
    if echo "$prompt" | grep -qiE "$pattern"; then
      return 0  # Pattern matched (blocked)
    fi
  done

  return 1  # No blocked patterns
}

# Get block reason for blocked patterns
get_block_reason() {
  echo "Per project guidelines: Avoid creating documentation, demos, or examples unless explicitly requested. Focus on production code."
}
