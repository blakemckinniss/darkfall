---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*)
description: Create a game-focused git commit
---

# Create Game-Focused Commit

Create a commit with context about game changes.

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`
- Recent commits: !`git log --oneline -5`

## Commit Guidelines

1. Review changes focusing on game impact:
   - New entities, locations, or mechanics
   - Balance changes
   - AI integration updates
   - UI/UX improvements
   - Bug fixes

2. Create commit message following this format:
   ```
   <type>: <summary>

   - Detail 1
   - Detail 2

   🎮 Game Impact: <brief description>
   ```

3. Types: feat, fix, balance, content, ui, ai, refactor, chore

4. Include game impact when relevant (new entities, balance changes, etc.)

**Note**: Follow project guideline to commit after major changes.
