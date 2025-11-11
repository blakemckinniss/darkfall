#!/bin/bash
#
# Tool Planning Hook (UserPromptSubmit)
#
# Triggered: After confidence-classifier.sh, before Claude receives prompt
# Purpose: Generate strategic tool usage recommendations based on task complexity
#
# Phase 1 MVP: Fast pattern matching for routine/complex tasks
# Future: Zen MCP integration for risky/open_world tasks
#
# Performance targets:
# - Atomic: 0s (skip)
# - Routine: < 3s
# - Complex: < 7s
# - Risky/Open_world: < 15s (with Zen MCP)

set -euo pipefail

# Performance: Start timing
START_TIME=$(date +%s 2>/dev/null || echo 0)

# Read stdin (hook receives JSON with prompt, etc.)
INPUT=$(cat)

# Extract prompt from JSON
if command -v jq >/dev/null 2>&1; then
    PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')
else
    # Fallback: basic parsing (fragile but works)
    PROMPT=$(echo "$INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/"prompt"[[:space:]]*:[[:space:]]*"\(.*\)"/\1/')
fi

# If no prompt extracted, exit gracefully
if [ -z "$PROMPT" ]; then
    echo '{"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ""}}'
    exit 0
fi

# Determine hook directory
if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    HOOK_DIR="$CLAUDE_PROJECT_DIR/.claude/hooks"
else
    # Fallback: derive from script location
    HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
fi

# Classify task using task_classifier.py
TASK_CLASS=$(python3 "$HOOK_DIR/lib/task_classifier.py" "$PROMPT" 2>/dev/null || echo "routine")

# Skip planning for atomic tasks (0s overhead)
if [ "$TASK_CLASS" = "atomic" ]; then
    echo '{"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ""}}'
    exit 0
fi

# Cache key for tool plans (5-minute TTL)
CACHE_DIR="/tmp/claude-tool-plans"
mkdir -p "$CACHE_DIR"
CACHE_KEY=$(echo "$PROMPT" | md5sum 2>/dev/null | cut -d' ' -f1 || echo "nocache")
CACHE_FILE="$CACHE_DIR/$CACHE_KEY.txt"
CACHE_AGE_LIMIT=300  # 5 minutes in seconds

# Check cache
if [ -f "$CACHE_FILE" ]; then
    CACHE_AGE=$(($(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || echo 0)))
    if [ "$CACHE_AGE" -lt "$CACHE_AGE_LIMIT" ]; then
        # Cache hit - return cached plan
        CACHED_PLAN=$(cat "$CACHE_FILE")
        cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $(echo "$CACHED_PLAN" | jq -Rs .)
  }
}
EOF
        exit 0
    fi
fi

# Helper function: Determine if Zen MCP should be used
should_use_zen_mcp() {
    local task_class="$1"
    local prompt="$2"

    # Always use for open_world (research tasks)
    if [ "$task_class" = "open_world" ]; then
        return 0
    fi

    # Use for high-risk risky tasks (production keywords)
    if [ "$task_class" = "risky" ]; then
        # Check for high-severity keywords
        if echo "$prompt" | grep -qiE '\b(production|prod|deploy|migration|database.*drop|irreversible|payment)\b'; then
            return 0  # High risk
        fi
        return 1  # Low risk - use Tier-1.5
    fi

    return 1  # routine, complex use local patterns
}

# Generate tool plan based on task class
case "$TASK_CLASS" in
    routine|complex)
        # Tier-1/1.5: Fast pattern matching (2-7s)
        TOOL_PLAN=$(python3 "$HOOK_DIR/lib/quick_tool_planner.py" "$TASK_CLASS" "$PROMPT" 2>/dev/null || echo "")
        ;;

    risky|open_world)
        # Phase 2: Determine escalation to Zen MCP
        if should_use_zen_mcp "$TASK_CLASS" "$PROMPT"; then
            # Tier-2: Zen MCP deep planning (< 15s with fallback)

            # Gather project context (lightweight, < 500ms)
            CONTEXT=$("$HOOK_DIR/lib/context_gatherer.sh" 2>/dev/null || echo '{}')

            # Try Zen MCP with 12s timeout
            TOOL_PLAN=$(timeout 12s python3 "$HOOK_DIR/lib/zen_tool_planner.py" "$TASK_CLASS" "$PROMPT" <<< "$CONTEXT" 2>/dev/null || echo "")

            # Fallback to Tier-1.5 if Zen failed or timed out
            if [ -z "$TOOL_PLAN" ]; then
                TOOL_PLAN=$(python3 "$HOOK_DIR/lib/quick_tool_planner.py" "$TASK_CLASS" "$PROMPT" 2>/dev/null || echo "")
            fi
        else
            # Tier-1.5: Enhanced patterns (no Zen MCP needed)
            TOOL_PLAN=$(python3 "$HOOK_DIR/lib/quick_tool_planner.py" "$TASK_CLASS" "$PROMPT" 2>/dev/null || echo "")
        fi

        # Add warning for risky tasks
        if [ "$TASK_CLASS" = "risky" ]; then
            TOOL_PLAN+=$'\n\n⚠️ **RISKY TASK**: Consider creating backup or dry-run strategy before proceeding.\n'
        fi
        ;;

    *)
        # Unknown task class - skip planning
        TOOL_PLAN=""
        ;;
esac

# If no plan generated, exit gracefully
if [ -z "$TOOL_PLAN" ]; then
    echo '{"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": ""}}'
    exit 0
fi

# Cache the plan
echo "$TOOL_PLAN" > "$CACHE_FILE"

# Calculate elapsed time (for performance monitoring)
END_TIME=$(date +%s 2>/dev/null || echo 0)
ELAPSED=$((END_TIME - START_TIME))

# Add performance footer (only if timing available)
if [ "$ELAPSED" -gt 0 ]; then
    TOOL_PLAN+=$'\n'"---"$'\n'"_Tool planning: ${ELAPSED}s_"$'\n'
fi

# Output hook response
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": $(echo "$TOOL_PLAN" | jq -Rs .)
  }
}
EOF
