---
description: Clean build artifacts and rebuild the project from scratch
---

# Clean Build

Remove all build artifacts and rebuild the project from scratch to ensure a clean state.

## Your Task

1. **Clean Phase:**
   - Remove `.next/` directory
   - Remove `node_modules/.cache/` if it exists
   - Clear any other build artifacts

2. **Rebuild Phase:**
   - Run `pnpm build` to create a fresh production build
   - Verify the build completes successfully
   - Report any build errors or warnings

3. **Verification:**
   - Check for any unexpected issues in the clean build
   - Confirm all pages compile correctly
   - Report build time and any notable changes

**When to use this:**
- After major dependency updates
- When experiencing weird build caching issues
- Before deploying to production
- After significant file structure changes
- When build output seems stale or corrupted

**Important:**
- This does NOT remove node_modules (use `pnpm install` separately if needed)
- TypeScript errors are ignored in production builds (ignoreBuildErrors: true)
- Focus on identifying genuine build issues vs. type errors
