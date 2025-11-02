---
description: Fix all TypeScript type errors in the codebase
---

# Fix TypeScript Type Errors

Automatically resolve all TypeScript type errors while maintaining strict mode compliance.

## Your Task

1. Run TypeScript type checking to identify all errors
2. For each type error:
   - Analyze the root cause of the type violation
   - Apply the correct fix following strict TypeScript guidelines
   - Ensure the fix doesn't introduce runtime issues
3. Run type checking again to verify all errors are resolved
4. Report summary of fixes applied

**Important:**
- Maintain all strict TypeScript settings (noUncheckedIndexedAccess, noUnusedLocals, etc.)
- Never use `any` or `@ts-ignore` to suppress errors
- For array access, add proper undefined checks
- For unused variables/parameters, remove them completely
- Use proper type guards and narrowing where needed
- Ensure fixes follow the project's type safety patterns

**Common Type Error Patterns:**
- **Unused variables (TS6133):** Remove the variable declaration
- **Unchecked index access:** Add undefined checks or use optional chaining
- **Type mismatches:** Add proper type annotations or fix the type
- **Strict null checks:** Add null/undefined guards where needed
