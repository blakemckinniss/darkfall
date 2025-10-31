---
allowed-tools: Bash(pnpm:*)
description: Quick sanity test suite for rapid development
---

# Quick Test

Fast validation checks during development.

## Quick Checks

1. **Syntax & Type Check**
   - Run fast TypeScript check
   - Verify no syntax errors

2. **Lint Critical Issues**
   - Run eslint focusing on errors only
   - Ignore warnings for speed

3. **Build Dry Run**
   - Test if build would succeed
   - Check for import errors

4. **Game Engine Validation**
   - Verify `lib/game-engine.ts` has no obvious issues
   - Check entity arrays are valid
   - Validate event generation logic

This is a faster alternative to full `/deploy-check` for iterative development.

Report results concisely with pass/fail status.
