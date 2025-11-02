---
argument-hint: [numbers... | all]
description: Complete documentation updates from previous response
---

# Complete Documentation Updates

Complete specific documentation updates or all updates from the previous response's "📚 Documentation Updates Required" section.

## Quick Reference

```bash
# Update specific documentation items
/doc 1 3

# Update all documentation
/doc all

# Update multiple documentation items
/doc 1 2 3
```

## Examples

If I previously provided:
```
## 📚 Documentation Updates Required:
1. 🟠60 Update ADR.md with state management decision
2. 🟡35 Add AI endpoint configuration to CLAUDE.md
3. 🟢20 Document error boundary pattern in code comments
```

**You can run:**

```bash
# Update specific docs
/doc 1 3
# → Updates documentation items 1 and 3

# Update all docs
/doc all
# → Updates all 3 documentation items

# Update critical documentation
/doc 1
# → Updates the most important documentation item
```

## Your Task (Implementation)

Parse the arguments `$ARGUMENTS` to extract:
1. Item numbers to complete (e.g., "1 3")
2. Keyword `all` to complete all documentation updates

**Implementation Steps:**

1. **Parse the arguments:**
   - If `all` keyword found, complete all documentation updates
   - Otherwise, extract numbers from arguments

2. **Retrieve previous response section:**
   - Find the "📚 Documentation Updates Required" section
   - Extract all numbered items from the section

3. **Clean and parse item descriptions:**
   - Strip emoji + severity prefix from each item: 🟢XX 🟡XX 🟠XX 🔴XX
   - Extract clean description after removing emoji and rating
   - Example: "1. 🟠60 Update ADR.md" → "Update ADR.md with state management decision"
   - Preserve the numeric item number for reference

4. **Build task list using TodoWrite:**
   - For each selected number, create: "Update docs: [clean description]"
   - If `all` specified, add all items from documentation section
   - Use the todo list to track progress

5. **Execute in order:**
   - Complete each documentation item sequentially
   - Mark each item as completed in the todo list as you finish it
   - Document what was accomplished for each item

**Important Guidelines:**

- ✅ Complete each item fully before moving to the next
- ✅ Ensure documentation is accurate, clear, and comprehensive
- ✅ Update all relevant files (ADR.md, CLAUDE.md, NOTES.md, code comments, etc.)
- ✅ Follow existing documentation style and formatting
- ✅ Cross-reference related documentation sections
- ✅ Always provide final confidence level after completion

**Argument Parsing Examples:**

```
Input: "1 3"
→ Complete documentation items 1 and 3

Input: "all"
→ Complete all items from documentation section

Input: "2"
→ Complete documentation item 2
```

## Documentation Files Reference

Common documentation files in this project:
- **docs/ADR.md** - Architectural Decision Records
- **CLAUDE.md** - Claude Code development guidelines
- **docs/NOTES.md** - Running log of critical items and notes
- **Code comments** - Inline documentation for complex logic
- **README.md** - Project overview and setup instructions

## Why Use `/doc`?

- **📚 Focused** - Complete only documentation updates without mixing with debt or next steps
- **📝 Quality** - Ensure documentation stays current and accurate
- **🎯 Accountability** - Track exactly what documentation is being updated
- **🔍 Discoverability** - Help future developers understand the codebase
