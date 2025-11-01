---
description: View NOTES.md cleanup status and logs
---

# NOTES.md Cleanup Status

Check the status of the background NOTES.md cleanup task.

## Your Task

1. **Check if cleanup task is running:**
   ```bash
   ps aux | grep notes-cleanup | grep -v grep
   ```

2. **View recent cleanup activity:**
   ```bash
   tail -30 .claude/logs/notes-cleanup.log
   ```

3. **Check for lock file (indicates running task):**
   ```bash
   ls -la .claude/tasks/.notes-cleanup.lock 2>/dev/null || echo "No cleanup task currently running"
   ```

4. **Provide summary:**
   - Is the task currently running? (Yes/No)
   - When was the last cleanup attempt?
   - How many items were analyzed?
   - Were any items removed?
   - Any errors or timeouts?

Present the findings in a clear, concise format.
