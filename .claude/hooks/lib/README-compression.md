# Session Log Compression

## Overview

The session logger now automatically compresses conversation transcripts for efficient session bootstrapping. This reduces token count by **~90%** while preserving all critical information needed to continue work.

## How It Works

### 1. Original Transcript Saved
- Full JSONL file preserved: `.claude/logs/{timestamp}_{session_id}.jsonl`
- Used for debugging and reference

### 2. Compressed Version Created
- Compressed JSON file: `.claude/logs/{timestamp}_{session_id}.compressed.json`
- Contains only essential information for bootstrapping

## Compression Strategy

Based on Zen MCP recommendations, the compressor extracts:

### Critical Information Preserved
1. **User Goals** - Last 5 unique goals (what user wanted to accomplish)
2. **File States** - Last 20 modified files with metadata (not full content)
3. **Task Status** - Last 10 completed and 10 pending tasks
4. **Tech Stack** - Detected package managers and tools
5. **Last Exchange** - Final user/assistant messages (300 chars each)

### Information Discarded
- Verbose tool call parameters
- Intermediate code states
- Repeated error messages
- Claude's thinking process (unless critical)
- Conversational transitions

## Compression Results

**Typical Compression:**
- Original: 50-500 KB (full conversation)
- Compressed: 5-50 KB (essential state)
- Ratio: **85-95% reduction**

## Bootstrap Usage

To continue a previous session:

```bash
# Read compressed session
cat .claude/logs/20251102_152406_*.compressed.json | jq .

# Key fields for context:
# - session.goals: What user was trying to accomplish
# - state.files: Which files were modified
# - state.pending: What's left to do
# - session.last_exchange: Most recent conversation
```

## Architecture

**Differential State Tracking:**
- Only final file states stored (not intermediate edits)
- File metadata tracked (path, size) not full content

**Semantic Deduplication:**
- Duplicate goals/tasks removed
- Only unique, meaningful information retained

**Intent-Based Summarization:**
- Focus on "what" and "why", not "how"
- Preserve decisions and rationale, not implementation details

## Performance

- **Compression time:** < 500ms for 100+ message sessions
- **Memory usage:** < 10 MB for large sessions
- **Zero impact:** Runs after session ends, non-blocking

## Configuration

Edit `compress-session.py` to adjust:

```python
# Line 67: Number of goals to keep
self.user_goals[-5:]  # Change to -10 for more context

# Line 83: Number of files to track
list(self.file_states.items())[-20:]  # Increase for more files

# Line 84-85: Task history depth
self.completed_tasks[-10:]  # Increase to track more history
self.pending_tasks[-10:]
```

## Testing

Test compression manually:

```bash
# Compress a session log
./.claude/hooks/compress-session.py \
  .claude/logs/original.jsonl \
  .claude/logs/compressed.json

# View results
jq . .claude/logs/compressed.json
```

## Future Enhancements

Potential improvements:
- Add importance scoring (keep critical decisions, discard minor edits)
- Extract architectural decisions automatically
- Detect and preserve error resolution patterns
- Add progressive detail reduction (tier-based compression)
