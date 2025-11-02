---
argument-hint: [numbers... | all]
description: Fix technical debt items from previous response
---

# Fix Technical Debt

Address specific technical debt items or all debt items from the previous response's "⚠️ Technical Debt & Risks" section.

## Quick Reference

```bash
# Fix specific debt items
/debt 1 3 5

# Fix all debt items
/debt all

# Fix multiple debt items
/debt 1 2 3 4
```

## Examples

If I previously provided:
```
## ⚠️ Technical Debt & Risks:
1. 🟠75 Missing error boundaries on game component
2. 🟡50 No backup mechanism for save game state
3. 🔴85 AI endpoints lack rate limiting
4. 🟡30 Hard-coded configuration values
5. 🟢25 No logging for state transitions
```

**You can run:**

```bash
# Fix specific debt items
/debt 1 3
# → Fixes items 1 and 3 from debt section

# Fix all debt items
/debt all
# → Fixes all 5 items from debt section

# Fix critical items
/debt 3
# → Fixes the highest severity item (AI rate limiting)
```

## Your Task (Implementation)

Parse the arguments `$ARGUMENTS` to extract:
1. Item numbers to address (e.g., "1 3 5")
2. Keyword `all` to fix all debt items

**Implementation Steps:**

1. **Parse the arguments:**
   - If `all` keyword found, fix all debt items
   - Otherwise, extract numbers from arguments

2. **Retrieve previous response section:**
   - Find the "⚠️ Technical Debt & Risks" section
   - Extract all numbered items from the section

3. **Clean and parse item descriptions:**
   - Strip emoji + severity prefix from each item: 🟢XX 🟡XX 🟠XX 🔴XX
   - Extract clean description after removing emoji and rating
   - Example: "1. 🟠75 Missing error boundaries" → "Missing error boundaries"
   - Preserve the numeric item number for reference

4. **Build task list using TodoWrite:**
   - For each selected number, create: "Fix debt: [clean description]"
   - If `all` specified, add all items from debt section
   - Use the todo list to track progress

5. **Execute in order:**
   - Complete each debt item sequentially
   - Mark each item as completed in the todo list as you finish it
   - Document what was accomplished for each item

**Important Guidelines:**

- ✅ Complete each item fully before moving to the next
- ✅ Document what was accomplished for each item
- ✅ If you can't fully resolve a debt item, explain why and provide partial mitigation
- ✅ Test changes after fixing debt items
- ✅ Always provide final confidence level after completion
- ✅ Identify any new technical debt introduced

**Argument Parsing Examples:**

```
Input: "1 3 5"
→ Fix debt items 1, 3, and 5

Input: "all"
→ Fix all items from debt section

Input: "2 4"
→ Fix debt items 2 and 4
```

## Why Use `/debt`?

- **🎯 Focused** - Address only technical debt without mixing with next steps or docs
- **⚠️ Risk Mitigation** - Systematically reduce technical debt and risks
- **📋 Clear Tracking** - See exactly what debt is being addressed
- **🔧 Maintainability** - Keep codebase healthy and sustainable
