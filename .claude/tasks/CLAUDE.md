# Background Task Scripts

This directory contains scripts that run asynchronously during Claude Code CLI sessions.

## notes-cleanup.sh

**Purpose:** Automatically analyze and remove completed items from `docs/NOTES.md`

**Trigger:** Runs in background on every session start (via `session-start.sh` hook)

**Behavior:**
- Launches asynchronously with 120-second timeout
- Uses Claude Code CLI in non-interactive mode (`--print`)
- Analyzes each critical item (76-100) in NOTES.md
- Searches codebase to verify completion status
- Removes completed items from NOTES.md (does not mark as completed)
- Logs cleanup actions to `.claude/logs/notes-cleanup.log`

**Permissions:**
- **Read access:** Any file in the project
- **Write access:** `docs/NOTES.md` ONLY
- **Allowed tools:** Read, Grep, Glob, serena MCP tools
- **Disallowed tools:** Write, Edit, Bash, filesystem write/edit

**Output:**
- Silent operation (runs in background)
- No user-visible output during session start
- Activity logged to `.claude/logs/notes-cleanup.log`

**Error Handling:**
- Gracefully exits on timeout (120s)
- Exits silently if NOTES.md doesn't exist or is empty
- Exits silently on any CLI errors
- Never blocks session start

**Implementation Details:**
- Uses `claude --print --output-format json` for structured responses
- Parses JSON to identify completed vs pending items
- Uses `diff` to only update NOTES.md if changes detected
- Atomic file updates (temp file + mv)
- Cleanup log includes timestamp of each operation

## Adding New Background Tasks

To add a new background task:

1. Create executable script in `.claude/tasks/`
2. Add launch logic to `.claude/hooks/session-start.sh`
3. Use background execution: `("$SCRIPT" > /dev/null 2>&1) &`
4. Include timeout for long-running operations
5. Ensure graceful failure (never block session start)
6. Log activity to `.claude/logs/` if needed
7. Document in this README

**Best Practices:**
- Always use timeout for long-running tasks
- Redirect output to avoid blocking session start
- Exit gracefully on errors (exit 0)
- Use restrictive permissions for Claude CLI calls
- Log important actions for debugging
- Test both success and failure scenarios
