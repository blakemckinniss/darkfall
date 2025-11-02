#!/bin/bash
# Display learning system statistics from hook-learning.json

LEARNING_FILE=".claude/hook-learning.json"

if [ ! -f "$LEARNING_FILE" ]; then
    echo "No learning state found. The learning system hasn't been activated yet."
    echo "Run Claude Code and trigger some patterns to start building learning data."
    exit 0
fi

echo "=== Hook Learning System Statistics ==="
echo ""
echo "Pattern Name                      | Threshold (Default) | Triggers | Last Trigger        | Cooldown"
echo "----------------------------------|---------------------|----------|---------------------|----------"

jq -r '
to_entries |
sort_by(.value.trigger_count) |
reverse |
.[] |
"\(.key | .[0:32]) | \(.value.threshold | tonumber | floor) (\(.value.default_threshold | tonumber | floor)) | \(.value.trigger_count) | \(.value.last_trigger // "Never" | .[0:19]) | \(.value.cooldown_until // "None" | .[0:19])"
' "$LEARNING_FILE" | column -t -s "|"

echo ""
echo "=== Summary ==="
jq -r '
"Total patterns tracked: " + (keys | length | tostring) +
"\nAverage threshold drift: " + ([.[] | (.threshold / .default_threshold - 1) * 100] | add / length | floor | tostring) + "%" +
"\nTotal pattern triggers: " + ([.[] | .trigger_count] | add | tostring)
' "$LEARNING_FILE"

echo ""
echo "=== Patterns in Cooldown ==="
jq -r '
to_entries |
map(select(.value.cooldown_until != null)) |
if length == 0 then
  "No patterns currently in cooldown."
else
  .[] | "  - \(.key): cooldown until \(.value.cooldown_until)"
end
' "$LEARNING_FILE"

echo ""
echo "💡 Tip: Use 'rm .claude/hook-learning.json' to reset all learned thresholds"
