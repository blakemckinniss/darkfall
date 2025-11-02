#!/bin/bash
# session-logger.sh - Copy conversation transcript to logs directory on Stop
# Now with automatic compression for efficient session bootstrapping

# Read JSON input from stdin
INPUT=$(cat)

# Extract transcript path and cwd from input
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path')
CWD=$(echo "$INPUT" | jq -r '.cwd')

# Use CLAUDE_PROJECT_DIR if available, otherwise use cwd from input
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$CWD}"

# Ensure logs directory exists
LOGS_DIR="$PROJECT_DIR/.claude/logs"
mkdir -p "$LOGS_DIR"

# Extract session ID for filename
SESSION_ID=$(basename "$TRANSCRIPT_PATH" .jsonl)

# Generate timestamp for unique filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Copy original transcript (for debugging/reference)
DEST_FILE="$LOGS_DIR/${TIMESTAMP}_${SESSION_ID}.jsonl"
cp "$TRANSCRIPT_PATH" "$DEST_FILE"

# Compress transcript using token-optimized format
# Use PROJECT_DIR to find hooks directory (dirname $0 doesn't work in hook context)
HOOK_DIR="$PROJECT_DIR/.claude/hooks"
COMPRESS_SCRIPT="$HOOK_DIR/compress-session-v2.py"

# Token-optimized format (Claude-only, maximum efficiency)
# Uses fixed filename: last_conversation.txt (auto-cleanup of old files)
if [ -f "$COMPRESS_SCRIPT" ] && [ -x "$COMPRESS_SCRIPT" ]; then
    COMPRESS_OUTPUT=$("$COMPRESS_SCRIPT" "$DEST_FILE" 2>&1)
    COMPRESS_SUCCESS=$?
else
    COMPRESS_SUCCESS=1
fi

# Report results
echo "✓ Session transcript saved to .claude/logs/${TIMESTAMP}_${SESSION_ID}.jsonl"

if [ $COMPRESS_SUCCESS -eq 0 ]; then
    echo "✓ Token-optimized compression:"
    echo "$COMPRESS_OUTPUT" | sed 's/^/  /'
else
    echo "⚠ Compression skipped (compress-session-v2.py not found or not executable)"
fi

exit 0
