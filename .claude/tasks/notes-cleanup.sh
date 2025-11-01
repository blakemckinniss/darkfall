#!/bin/bash
# Background task to analyze NOTES.md and remove completed items
# This runs asynchronously on session start with a 120-second timeout

set -euo pipefail

NOTES_FILE="$CLAUDE_PROJECT_DIR/docs/NOTES.md"
TIMEOUT=30  # 30 seconds - quick check only
LOCK_FILE="$CLAUDE_PROJECT_DIR/.claude/tasks/.notes-cleanup.lock"
LOG_FILE="$CLAUDE_PROJECT_DIR/.claude/logs/notes-cleanup.log"

# Function to log messages
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Single-instance lock - exit if already running
if [ -f "$LOCK_FILE" ]; then
  # Check if lock is stale (older than timeout)
  if [ $(($(date +%s) - $(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0))) -lt $TIMEOUT ]; then
    log "Another instance is running, exiting"
    exit 0
  else
    log "Removing stale lock file"
    rm -f "$LOCK_FILE"
  fi
fi

# Create lock file
touch "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

log "Starting NOTES.md cleanup analysis"

# TEMPORARY: Disable automated cleanup - Codex too slow, needs manual review
log "⚠️  Automated cleanup disabled - please use /notes:cleanup manually"
exit 0

# Exit if NOTES.md doesn't exist or is empty
if [ ! -f "$NOTES_FILE" ]; then
  log "NOTES.md not found, exiting"
  exit 0
fi

if [ ! -s "$NOTES_FILE" ]; then
  log "NOTES.md is empty, exiting"
  exit 0
fi

# Count items in NOTES.md
ITEM_COUNT=$(grep -c "^- [⭐🔴]" "$NOTES_FILE" 2>/dev/null || echo "0")
if [ "$ITEM_COUNT" -eq 0 ]; then
  log "No critical items found in NOTES.md, exiting"
  exit 0
fi

log "Found $ITEM_COUNT critical items to analyze"

# Create temporary output file for Claude's response
TEMP_OUTPUT=$(mktemp)
TEMP_RESULT=$(mktemp)
trap 'rm -f "$LOCK_FILE" "$TEMP_OUTPUT" "$TEMP_RESULT"' EXIT

# Build the analysis prompt for Codex - KEEP IT BRIEF for 30s timeout
PROMPT="Quick check: Read docs/NOTES.md. For each item, do a QUICK file/code search to see if obviously completed. Output ONLY valid JSON array (no markdown, no text):
[{\"item\":\"⭐95 Test...\",\"status\":\"COMPLETED\"},{\"item\":\"⭐85 Update...\",\"status\":\"PENDING\"}]"

log "Calling Codex CLI for analysis (timeout: ${TIMEOUT}s)"

# Run Codex CLI in non-interactive mode with timeout
# Codex doesn't have the same tool restriction options, so we rely on the prompt
if timeout "$TIMEOUT" codex exec "$PROMPT" > "$TEMP_OUTPUT" 2>&1; then
  log "Codex CLI completed successfully"

  # Codex exec outputs directly, no need to extract .result field
  # Just copy the output to the result file
  cp "$TEMP_OUTPUT" "$TEMP_RESULT"
  log "Successfully captured Codex response"
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    log "Codex CLI timed out after ${TIMEOUT}s"
  else
    log "Codex CLI failed with exit code $EXIT_CODE"
    log "Error output: $(head -5 "$TEMP_OUTPUT" 2>/dev/null || echo 'no output')"
  fi
  exit 0
fi

# Parse JSON array and extract completed items
COMPLETED_ITEMS=$(jq -r '.[] | select(.status == "COMPLETED") | .item' "$TEMP_RESULT" 2>/dev/null || echo "")

# If no completed items, exit
if [ -z "$COMPLETED_ITEMS" ]; then
  log "No completed items found, NOTES.md unchanged"
  exit 0
fi

COMPLETED_COUNT=$(echo "$COMPLETED_ITEMS" | wc -l)
log "Found $COMPLETED_COUNT completed items to remove"

# Create temporary file for updated NOTES.md
TEMP_NOTES=$(mktemp)
trap 'rm -f "$LOCK_FILE" "$TEMP_OUTPUT" "$TEMP_RESULT" "$TEMP_NOTES"' EXIT

# Remove completed items from NOTES.md
while IFS= read -r line; do
  # Check if this line matches any completed item
  MATCHED=false
  while IFS= read -r completed_item; do
    if echo "$line" | grep -qF "$completed_item"; then
      MATCHED=true
      log "Removing: $line"
      break
    fi
  done <<< "$COMPLETED_ITEMS"

  # If not matched, keep the line
  if [ "$MATCHED" = false ]; then
    echo "$line" >> "$TEMP_NOTES"
  fi
done < "$NOTES_FILE"

# Only update NOTES.md if we actually removed items
if ! diff -q "$NOTES_FILE" "$TEMP_NOTES" > /dev/null 2>&1; then
  mv "$TEMP_NOTES" "$NOTES_FILE"
  log "✅ Successfully removed $COMPLETED_COUNT completed items from NOTES.md"
else
  log "No changes needed to NOTES.md"
fi

exit 0
