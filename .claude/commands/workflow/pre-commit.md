---
description: Run comprehensive pre-commit checks (types, lint, build)
---

# Pre-Commit Validation

Run all quality checks before committing code to ensure everything is in good shape.

## Your Task

Run the following checks in sequence and report results:

1. **TypeScript Type Check**
   - Run type checking across the codebase
   - Report any type errors
   - Fix critical errors if found

2. **Linting**
   - Run `pnpm lint`
   - Report errors and warnings
   - Fix errors (warnings can be addressed separately)

3. **Build Verification**
   - Run `pnpm build` to ensure production build works
   - Report any build failures
   - Verify all pages compile

4. **Git Status**
   - Show current git status
   - List files that will be committed
   - Confirm no sensitive files are staged (.env, secrets, etc.)

**Success Criteria:**
- ✅ No TypeScript errors (strict mode)
- ✅ No linting errors (warnings are acceptable)
- ✅ Production build completes successfully
- ✅ No sensitive files in staging area

**Report Format:**
```
## Pre-Commit Check Results

### TypeScript: ✅ PASS / ❌ FAIL
[Details]

### Linting: ✅ PASS / ❌ FAIL
[Details]

### Build: ✅ PASS / ❌ FAIL
[Details]

### Git Status: ✅ CLEAN / ⚠️ REVIEW
[Files to be committed]

## Summary
[Overall assessment and recommendations]
```

**Important:**
- Stop at first failure and fix before proceeding
- Don't commit if any check fails
- Report estimated commit size and impact
