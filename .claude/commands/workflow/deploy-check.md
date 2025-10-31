---
allowed-tools: Bash(pnpm:*), Bash(git:*)
description: Pre-deployment checklist and validation
---

# Pre-Deployment Checklist

Comprehensive check before deploying to production.

## Checklist

### 1. Code Quality
- [ ] Run `pnpm lint` - no errors
- [ ] TypeScript builds without critical errors
- [ ] No console.log statements in production code
- [ ] No commented-out code blocks

### 2. Environment
- [ ] .env.example is up to date with required variables
- [ ] FAL_KEY and GROQ_API_KEY are documented
- [ ] No secrets in codebase
- [ ] .gitignore properly excludes .env

### 3. Build
- [ ] `pnpm build` completes successfully
- [ ] Build output size is reasonable
- [ ] No build warnings about missing dependencies

### 4. Game State
- [ ] localStorage key is properly namespaced
- [ ] Game state schema is stable (no breaking changes)
- [ ] Default game state is properly initialized

### 5. AI Integration
- [ ] API routes are protected/rate-limited if needed
- [ ] Error handling for AI failures is in place
- [ ] Fallback behavior for missing API keys

### 6. Git
- [ ] All changes committed
- [ ] Branch is up to date with main
- [ ] Meaningful commit messages

Run each check and report results with ✅ or ❌
