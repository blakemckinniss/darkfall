#!/bin/bash
set -euo pipefail

# Pre-tool pattern prevention hook
# Analyzes recent conversation to prevent problematic tool usage before execution
# Performance: ~3-5ms overhead per tool call

INPUT=$(cat)
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name')
TOOL_INPUT=$(echo "$INPUT" | jq -r '.tool_input')

# Graceful degradation: Check dependencies
command -v jq >/dev/null 2>&1 || exit 0

# Exit gracefully if no transcript
if [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# Metrics logging (optional)
METRICS_LOG="${CLAUDE_PROJECT_DIR:-.}/.claude/hook-metrics.log"

log_pattern() {
  local pattern="$1"
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | PreToolUse | $TOOL_NAME | $pattern" >> "$METRICS_LOG" 2>/dev/null || true
  fi
}

# ============================================================================
# Pattern 1: WEBFETCH FOR BROWSER INTERACTION (Policy violation - DENY)
# ============================================================================
if [ "$TOOL_NAME" = "WebFetch" ]; then
  RECENT_CONTEXT=$(tail -n 5 "$TRANSCRIPT_PATH" | jq -r '.message.content // ""' 2>/dev/null || echo "")
  if echo "$RECENT_CONTEXT" | grep -qiE '\b(click|navigate|form|button|browser|webpage|login|submit|element|selector|interact|automation)\b'; then
    log_pattern "webfetch_misuse_denied"
    jq -n \
      --arg reason "🚨 CRITICAL POLICY VIOLATION

You're trying to use WebFetch for browser interaction.

Per CLAUDE.md mandate:
- WebFetch is ONLY for static documentation/API docs
- ALL browser interactions MUST use Playwright MCP (mcp__playwright__*)

Please use mcp__playwright__browser_navigate and related tools instead." \
      '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: $reason
        }
      }'
    exit 0
  fi
fi

# ============================================================================
# Pattern 2: TYPESCRIPT VIOLATIONS (Repeated escape hatches - ASK for approval)
# ============================================================================
if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$TOOL_INPUT" | jq -r '.content // .new_string // ""' 2>/dev/null || echo "")
  if echo "$CONTENT" | grep -qE '@ts-ignore|as any\b'; then
    LAST_MESSAGES=$(tail -n 20 "$TRANSCRIPT_PATH" | jq -r '.message.content // ""' 2>/dev/null || echo "")
    TS_VIOLATIONS=$(echo "$LAST_MESSAGES" | grep -ciE '@ts-ignore|as any' 2>/dev/null || echo "0")
    if [ "$TS_VIOLATIONS" -ge 1 ]; then
      log_pattern "typescript_violation_ask (count: $TS_VIOLATIONS)"
      jq -n \
        --arg reason "📘 TypeScript Strict Mode Violation Detected

You're about to add @ts-ignore or 'as any', and you've already done this ${TS_VIOLATIONS} time(s) recently.

Project Policy: Avoid TypeScript escape hatches.

Please:
1. Fix the underlying type issue properly
2. Add proper type definitions
3. Only use escape hatches as a last resort with clear justification

Approve to proceed anyway, or Deny to fix it properly." \
        '{
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "ask",
            permissionDecisionReason: $reason
          }
        }'
      exit 0
    fi
  fi
fi

# ============================================================================
# Pattern 3: BASH COMMAND SAFETY (Optional - Uncomment to enable)
# Prevents potentially destructive commands
# ============================================================================
# if [ "$TOOL_NAME" = "Bash" ]; then
#   COMMAND=$(echo "$TOOL_INPUT" | jq -r '.command // ""')
#   if echo "$COMMAND" | grep -qE '\brm\s+-rf\s+/|>\s*/dev/|mkfs|dd\s+if='; then
#     log_pattern "dangerous_bash_command_denied"
#     jq -n \
#       --arg reason "🚨 DANGEROUS COMMAND DETECTED
#
# The command you're about to run could be destructive.
#
# Command: $COMMAND
#
# Please verify this is intentional and safe." \
#       '{
#         hookSpecificOutput: {
#           hookEventName: "PreToolUse",
#           permissionDecision: "ask",
#           permissionDecisionReason: $reason
#         }
#       }'
#     exit 0
#   fi
# fi

# No blocking patterns - allow tool to proceed
exit 0
