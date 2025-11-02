# Continue Conversation

**Purpose**: Continue from the previous conversation with minimal context loss by loading the compressed session summary.

---

## Instructions

1. **Read the compressed session file**: `@.claude/logs/last_conversation.txt`

2. **Understand the compression format**:
   - `[CTX:session_comp]` - Session compression header
   - `[U1]`, `[U2]`, etc. - User messages (last 5)
   - `[R1]`, `[R2]`, etc. - Assistant responses (last 5)
   - `[T1]`, `[T2]`, etc. - Thinking blocks (last 3, heavily compressed)
   - `[FILES]` - File modifications (path:status format, separated by |)
   - `[DONE]` - Completed todos (separated by |)
   - `[TODO]` - Pending todos (separated by |)
   - `[TECH]` - Tech stack detected (comma-separated)
   - `[DEC:type]` - Decisions made using Zen MCP tools

3. **Review the session context**:
   - What were we working on?
   - What was the last task or discussion?
   - What files were modified?
   - What todos were completed or pending?
   - Were there any unresolved issues or next steps?

4. **Continue the conversation naturally**:
   - Acknowledge you've reviewed the previous session
   - Provide a brief summary of what was being worked on
   - Ask the user how they'd like to proceed or continue from where we left off
   - Be ready to dive right back into the work

5. **Important notes**:
   - The compression is token-optimized (60-70% reduction)
   - Some details are abbreviated (e.g., "impl" for "implementation", "config" for "configuration")
   - Context is preserved but condensed for efficiency
   - If anything is unclear, ask the user for clarification

---

## Example Response Format

"I've reviewed the compressed session from our last conversation. We were working on [brief summary of what was being done].

Key context:
- Modified files: [list key files]
- Completed tasks: [major accomplishments]
- Pending items: [what was left to do]

How would you like to proceed? I'm ready to continue where we left off."

---

**Goal**: Seamlessly pick up the previous conversation with full context awareness.
