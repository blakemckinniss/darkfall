---
description: Fix all linting errors and warnings in the codebase
---

# Fix Linting Issues

Automatically fix all linting errors and warnings in the codebase.

## Your Task

1. Run `pnpm lint` to identify all linting issues
2. For each error/warning:
   - Analyze the specific linting rule violation
   - Apply the appropriate fix following project patterns
   - Ensure TypeScript strict mode compliance
3. Run `pnpm lint` again to verify all issues are resolved
4. Report summary of what was fixed

**Important:**
- Follow the project's existing code style and patterns
- For `react/no-array-index-key` warnings, only fix if a stable unique key is available
- For unused variables, remove them completely (don't prefix with `_`)
- Ensure all fixes maintain functionality and don't introduce bugs
- Run type checking after fixes to ensure no new errors were introduced

**Common Fixes:**
- **Unused variables:** Remove the variable declaration entirely
- **Array index keys:** Replace with unique stable identifiers when available
- **Missing dependencies:** Add to useEffect/useCallback dependency arrays
- **Type errors:** Add proper type annotations or type guards
