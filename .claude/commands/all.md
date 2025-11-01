---
argument-hint: [next | debt | doc]...
description: Execute all items or specific sections (next, debt, doc)
---

# Execute All Items

Execute all items from previous response, or specific combinations of sections (next steps, technical debt, documentation).

## Quick Reference

```bash
# Execute everything (all sections)
/all

# Execute specific sections
/all next          # Only next steps
/all debt          # Only technical debt
/all doc           # Only documentation

# Execute multiple sections
/all next debt     # Next steps + technical debt
/all doc next      # Documentation + next steps
/all debt doc      # Technical debt + documentation
/all next debt doc # All three sections (same as /all)
```

## Examples

If I previously provided:
```
## 📚 Documentation Updates Required:
1. 🟠60 Update ADR.md with state management decision
2. 🟡35 Add AI endpoint configuration to CLAUDE.md
3. 🟢20 Document error boundary pattern in code comments

## ⚠️ Technical Debt & Risks:
1. 🟠75 Missing error boundaries on game component
2. 🟡50 No backup mechanism for save game state
3. 🔴85 AI endpoints lack rate limiting

## Next Steps & Considerations:
1. ⭐90 Add unit tests for game engine
2. 🟣55 Optimize portrait caching
3. 🔵40 Document AI integration setup
```

**You can run:**

```bash
# Execute everything
/all
# → Completes all 3 docs, all 3 debt items, and all 3 next steps (9 total items)

# Execute only next steps
/all next
# → Executes all 3 next steps

# Execute debt and next steps (skip docs)
/all debt next
# → Fixes all 3 debt items and executes all 3 next steps

# Execute docs and next steps (skip debt)
/all doc next
# → Completes all 3 docs and executes all 3 next steps
```

## Your Task (Implementation)

Parse the arguments `$ARGUMENTS` to determine which sections to execute:
1. No arguments → Execute all sections (doc, debt, next)
2. Contains keywords → Execute only specified sections

**Implementation Steps:**

1. **Parse the arguments:**
   - If no arguments provided, set sections = ["doc", "debt", "next"]
   - If arguments provided, look for keywords: `next`, `debt`, `doc`
   - Build list of sections to execute based on keywords found

2. **Retrieve previous response sections:**
   - If "doc" in sections: Find "📚 Documentation Updates Required" section
   - If "debt" in sections: Find "⚠️ Technical Debt & Risks" section
   - If "next" in sections: Find "Next Steps & Considerations" section
   - Extract all numbered items from each relevant section

3. **Clean and parse item descriptions:**
   - Strip emoji + rating prefix from each item
   - Documentation: 🟢XX 🟡XX 🟠XX 🔴XX
   - Technical Debt: 🟢XX 🟡XX 🟠XX 🔴XX
   - Next Steps: ⚪XX 🔵XX 🟣XX ⭐XX
   - Extract clean description after removing emoji and rating
   - Preserve the numeric item number and section for reference

4. **Build task list using TodoWrite:**
   - For each doc item (if "doc" in sections): "Update docs: [description]"
   - For each debt item (if "debt" in sections): "Fix debt: [description]"
   - For each next item (if "next" in sections): "Execute: [description]"
   - Use the todo list to track progress

5. **Execute in order:**
   - Complete all documentation updates first (if "doc" in sections)
   - Then complete all debt items (if "debt" in sections)
   - Then execute all next step items (if "next" in sections)
   - Mark each item as completed in the todo list as you finish it

**Important Guidelines:**

- ✅ Complete each item fully before moving to the next
- ✅ Document what was accomplished for each item
- ✅ If you can't fully complete an item, explain why and provide partial progress
- ✅ Execute in priority order: docs → debt → next
- ✅ Always provide final confidence level after completion
- ✅ Suggest new next steps if appropriate

**Argument Parsing Examples:**

```
Input: "" (no arguments)
→ sections = ["doc", "debt", "next"]
→ Execute all documentation, all debt, and all next steps

Input: "next"
→ sections = ["next"]
→ Execute only next steps

Input: "debt doc"
→ sections = ["debt", "doc"]
→ Fix all debt items and complete all documentation

Input: "next debt doc"
→ sections = ["next", "debt", "doc"]
→ Execute all three sections (same as no arguments)

Input: "doc"
→ sections = ["doc"]
→ Complete only documentation updates
```

## Section Keywords

- **`next`** - Next Steps & Considerations section
- **`debt`** - Technical Debt & Risks section
- **`doc`** - Documentation Updates Required section

## Execution Order

When multiple sections are specified, they execute in this order:
1. Documentation updates (ensures tracking is current)
2. Technical debt fixes (reduces risk before new work)
3. Next steps (implements new improvements)

## Why Use `/all`?

- **🚀 Comprehensive** - Execute everything or specific combinations
- **⚡ Efficient** - Complete multiple work types in one command
- **🎯 Flexible** - Choose which sections to execute
- **📋 Organized** - Clear execution order and tracking
- **💪 Powerful** - Handles bulk operations across all work types

## Related Commands

- `/next` - Execute only specific next step items (e.g., `/next 1 3 5`)
- `/debt` - Fix only specific debt items (e.g., `/debt 2 4`)
- `/doc` - Complete only specific documentation items (e.g., `/doc 1 2`)

**When to use each:**
- Use `/all` when you want to execute entire sections
- Use `/next`, `/debt`, `/doc` when you want to pick specific items within a section
