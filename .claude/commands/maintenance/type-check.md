---
allowed-tools: Bash(pnpm:*)
description: Run TypeScript type checking across the codebase
---

# Type Check

Run a full TypeScript type check to identify type errors.

## Tasks

1. Run `pnpm tsc --noEmit` to check for type errors
2. Summarize the errors by category (type mismatches, missing properties, etc.)
3. Prioritize errors by severity and impact
4. Suggest fixes for the most critical issues

**Note**: This project has `ignoreBuildErrors: true` in production, but we should still fix type errors for code quality.
