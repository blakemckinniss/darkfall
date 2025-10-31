---
argument-hint: [step-numbers...]
description: Execute specific next steps from previous response
---

# Execute Selected Next Steps

Execute only the next steps you want from my previous "Next Steps & Considerations" section.

## Usage

If I previously provided:
```
## Next Steps & Considerations:
1. Add error boundaries to game component
2. Implement save game backup system
3. Add unit tests for game engine
4. Consider adding sound effects
5. Optimize portrait caching
6. Document AI integration setup
```

You can run:
- `/next 1 3` - Execute only steps 1 and 3
- `/next 2 4 6` - Execute steps 2, 4, and 6
- `/next 1` - Execute only step 1

## Selected Steps to Execute

**You requested steps: $ARGUMENTS**

## Your Task

1. Look at the previous message in our conversation
2. Find the "Next Steps & Considerations" section
3. Extract the numbered items that match: $ARGUMENTS
4. Execute ONLY those selected steps
5. Treat each selected step as a discrete task to complete

**Important**:
- Only work on the steps the user specified
- Don't add or modify other steps
- Complete each selected step fully before moving to the next
- Use TodoWrite to track the selected steps
