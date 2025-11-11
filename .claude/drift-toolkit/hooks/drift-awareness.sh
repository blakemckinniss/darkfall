#!/bin/bash
# Drift Awareness Hook - PORTABLE VERSION
# Pre-execution warning system for architectural drift

# Triggers: UserPromptSubmit
# Purpose: Warn about potential drift before code execution

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt from JSON (handle both "prompt" and "message" fields)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // .message // ""')

if [ -z "$PROMPT" ]; then
    # No prompt - skip silently
    echo '{"hookSpecificOutput": {"additionalContext": ""}}'
    exit 0
fi

# Find project root
if [ -n "$CLAUDE_PROJECT_DIR" ]; then
    PROJECT_ROOT="$CLAUDE_PROJECT_DIR"
else
    PROJECT_ROOT="$(pwd)"
    while [ "$PROJECT_ROOT" != "/" ]; do
        if [ -d "$PROJECT_ROOT/.claude" ]; then
            break
        fi
        PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
    done
fi

REJECTED_PATTERNS="$PROJECT_ROOT/.claude/drift/rejected.yaml"
ADR_FILE="$PROJECT_ROOT/docs/ADR.md"

# Check if drift config exists
if [ ! -f "$REJECTED_PATTERNS" ] && [ ! -f "$ADR_FILE" ]; then
    # No drift config - skip silently
    echo '{"hookSpecificOutput": {"additionalContext": ""}}'
    exit 0
fi

WARNING=""

# Check for common drift risk patterns in prompt
check_pattern() {
    local pattern="$1"
    local message="$2"

    if echo "$PROMPT" | grep -qiE "$pattern"; then
        WARNING+="$message"$'\n\n'
    fi
}

# Backend framework mentions
check_pattern '\b(express|flask|django|fastapi|backend api|server|database)\b' \
"⚠️ **Drift Risk**: Prompt mentions backend/database concepts.

📖 **Check**: Does your architecture allow backend code?
   - Review: $ADR_FILE (if exists)
   - Review: $REJECTED_PATTERNS"

# State management mentions
check_pattern '\b(redux|mobx|recoil|state management|global state)\b' \
"⚠️ **Drift Risk**: Prompt mentions state management library.

📖 **Check**: Have you standardized on a state management approach?
   - Review: $ADR_FILE for state management decisions"

# CSS framework mentions
check_pattern '\b(styled-components|emotion|css-in-js|sass|less)\b' \
"⚠️ **Drift Risk**: Prompt mentions styling library.

📖 **Check**: Have you standardized on a styling approach?
   - Review: $ADR_FILE for styling decisions"

# If warnings generated, output them
if [ -n "$WARNING" ]; then
    # Escape for JSON
    WARNING_JSON=$(echo "$WARNING" | jq -Rs .)

    echo "{
        \"hookSpecificOutput\": {
            \"hookEventName\": \"UserPromptSubmit\",
            \"additionalContext\": $WARNING_JSON
        }
    }"
else
    echo '{"hookSpecificOutput": {"additionalContext": ""}}'
fi
