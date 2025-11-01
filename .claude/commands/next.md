---
argument-hint: [numbers... | all]
description: Execute next steps from previous response
---

# Execute Next Steps

Execute specific next steps or all next steps from the previous response's "Next Steps & Considerations" section.

## Quick Reference

```bash
# Execute specific next steps
/next 2 4

# Execute all next steps
/next all

# Execute multiple next steps
/next 1 3 5 7
```

## Examples

If I previously provided:
```
## Next Steps & Considerations:
1. ⭐90 Add unit tests for game engine
2. 🟣55 Optimize portrait caching
3. 🔵40 Document AI integration setup
4. 🔵30 Add sound effects to combat
5. 🟣65 Implement achievement system
```

**You can run:**

```bash
# Execute specific steps
/next 2 3
# → Executes items 2 and 3 from next steps section

# Execute all steps
/next all
# → Executes all 5 items from next steps section

# Execute high-priority items
/next 1 5
# → Executes the highest priority items
```

## Your Task (Implementation)

Parse the arguments `$ARGUMENTS` to extract:
1. Item numbers to execute (e.g., "2 4 6")
2. Keyword `all` to execute all next steps

**Implementation Steps:**

1. **Parse the arguments:**
   - If `all` keyword found, execute all next steps
   - Otherwise, extract numbers from arguments

2. **Retrieve previous response section:**
   - Find the "Next Steps & Considerations" section
   - Extract all numbered items from the section

3. **Clean and parse item descriptions:**
   - Strip emoji + priority prefix from each item: ⚪XX 🔵XX 🟣XX ⭐XX
   - Extract clean description after removing emoji and rating
   - Example: "1. ⭐90 Add unit tests" → "Add unit tests"
   - Preserve the numeric item number for reference

4. **Build task list using TodoWrite:**
   - For each selected number, create: "Execute: [clean description]"
   - If `all` specified, add all items from next steps section
   - Use the todo list to track progress

5. **Execute in order:**
   - Complete each next step item sequentially
   - Mark each item as completed in the todo list as you finish it
   - Document what was accomplished for each item

**Important Guidelines:**

- ✅ Complete each item fully before moving to the next
- ✅ Document what was accomplished for each item
- ✅ If you can't fully complete a step, explain why and provide partial progress
- ✅ Always provide final confidence level after completion
- ✅ Suggest new next steps if appropriate

**Argument Parsing Examples:**

```
Input: "2 4 6"
→ Execute items 2, 4, and 6

Input: "all"
→ Execute all items from next steps section

Input: "1 3 5 7 9"
→ Execute items 1, 3, 5, 7, and 9
```

## Why Use `/next`?

- **🎯 Focused** - Execute only next steps without mixing with debt or docs
- **📋 Simple** - Clear, single-purpose command
- **⚡ Efficient** - Quickly execute planned improvements
- **🔄 Trackable** - See exactly what next steps are being completed
