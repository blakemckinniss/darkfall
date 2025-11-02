---
allowed-tools: Bash(rm:*), Bash(find:*)
description: Clean build artifacts and temporary files
---

# Clean Project

Remove all build artifacts, cache files, and temporary data to give the project a fresh start.

## Tasks

1. Remove Next.js build directories (.next)
2. Remove node_modules/.cache if it exists
3. Clear any .turbo cache
4. List what was removed

**Important**: Do NOT remove node_modules itself or package-lock files.
