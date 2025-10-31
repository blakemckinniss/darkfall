---
allowed-tools: Bash(pnpm:*), Bash(npm:*)
description: Check for outdated dependencies and potential updates
---

# Dependencies Check

Analyze project dependencies for updates and potential issues.

## Tasks

1. Run `pnpm outdated` to check for outdated packages
2. Identify any major version updates available
3. Highlight security-related updates if any
4. Suggest which updates are safe to apply immediately vs. which need testing

Current dependencies: !`cat package.json | grep -A 50 '"dependencies"'`
