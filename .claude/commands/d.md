---
argument-hint: [debt-numbers...]
description: Address specific technical debt/risks from previous response
---

# Address Selected Technical Debt & Risks

Address only the technical debt items or risks you want to tackle from my previous "Technical Debt & Risks" section.

## Usage

If I previously provided:
```
## ⚠️ Technical Debt & Risks:
1. Missing error boundaries on game component - could crash entire UI
2. No backup mechanism for save game state - risk of data loss
3. AI generation endpoints lack rate limiting - vulnerable to abuse
4. Drag-and-drop state not cleaned up properly - memory leak risk
5. Hard-coded configuration values - difficult to modify per environment
6. No logging for critical game state transitions - debugging issues is hard
```

You can run:
- `/d 1 3` - Address only items 1 and 3
- `/d 2 5 6` - Address items 2, 5, and 6
- `/d 1` - Address only item 1

## Selected Debt/Risks to Address

**You requested items: $ARGUMENTS**

## Your Task

1. Look at the previous message in our conversation
2. Find the "Technical Debt & Risks" section (marked with ⚠️)
3. Extract the numbered items that match: $ARGUMENTS
4. Address ONLY those selected items
5. For each item, either:
   - Fix the technical debt completely
   - Mitigate the risk with proper safeguards
   - Create a concrete plan with tracking if immediate fix isn't feasible

**Important**:
- Only work on the debt/risk items the user specified
- Don't add or modify other items
- Complete each selected item fully before moving to the next
- Use TodoWrite to track the selected items
- Document what was fixed and any remaining concerns
- If you can't fully resolve an item, explain why and what partial mitigation was done
