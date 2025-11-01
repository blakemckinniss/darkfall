# Slash Commands Reference

This directory contains custom slash commands for the Blackfell game project.

## Quick Command Reference

### 🚀 Task Execution Commands

#### `/next [numbers... | all]` - Execute Next Steps
Execute specific next steps or all next steps from previous response.

```bash
# Execute specific next steps
/next 2 4

# Execute all next steps
/next all
```

#### `/debt [numbers... | all]` - Fix Technical Debt
Fix specific technical debt items or all debt items from previous response.

```bash
# Fix specific debt items
/debt 1 3 5

# Fix all debt items
/debt all
```

#### `/doc [numbers... | all]` - Complete Documentation
Complete specific documentation updates or all documentation from previous response.

```bash
# Update specific documentation
/doc 1 3

# Update all documentation
/doc all
```

#### `/all [next | debt | doc]...` - Execute All or Specific Sections
Execute all items from all sections, or specific combinations of sections.

```bash
# Execute everything (all sections)
/all

# Execute specific sections
/all next          # Only next steps
/all debt doc      # Debt + documentation
/all next debt doc # All three (same as /all)
```

**When to use each:**
- Use `/next`, `/debt`, `/doc` for executing specific items or all items in a single section
- Use `/all` for bulk operations across multiple complete sections

---

### 🎮 Game Development Commands

#### `/game:new-entity [type] [name] [rarity]`
Create a new game entity (enemy, treasure, consumable, etc.)

```bash
/game:new-entity enemy "Shadow Wraith" legendary
/game:new-entity treasure "Ancient Amulet" rare
/game:new-entity consumable "Health Potion" common
```

#### `/game:test-ai`
Test AI integration endpoints (portrait and item generation)

#### `/game:validate-state`
Validate game state schema and localStorage structure

#### `/game:add-location [location-name] [required-level]`
Add a new location to the game

```bash
/game:add-location "Cursed Catacombs" 5
```

---

### 🔍 Audit Commands

#### `/audit:game-balance`
Audit game balance and entity statistics

#### `/audit:security`
Perform security audit on the codebase

#### `/audit:performance`
Analyze application performance and suggest optimizations

---

### 🛠️ Maintenance Commands

#### `/maintenance:type-check`
Run TypeScript type checking across the codebase

#### `/maintenance:clean`
Clean build artifacts and temporary files

#### `/maintenance:deps-check`
Check for outdated dependencies and potential updates

---

### 🔄 Workflow Commands

#### `/workflow:fix-lint`
Automatically fix all linting errors and warnings in the codebase

#### `/workflow:fix-types`
Resolve all TypeScript type errors while maintaining strict mode compliance

#### `/workflow:clean-build`
Remove build artifacts and rebuild from scratch (useful for cache issues)

#### `/workflow:pre-commit`
Run comprehensive pre-commit checks (types, lint, build, git status)

```bash
/workflow:pre-commit
# Runs: TypeScript check → Linting → Build → Git status review
```

#### `/workflow:analyze-bundle`
Analyze production bundle size and identify optimization opportunities

#### `/workflow:commit-game`
Create a game-focused git commit

#### `/workflow:deploy-check`
Pre-deployment checklist and validation

#### `/workflow:review-next`
Review the next steps from previous response

#### `/workflow:quick-test`
Quick sanity test suite for rapid development

---

## Common Workflows

Here are some useful command combinations for common scenarios:

### 🚀 Before Committing
```bash
# Fix all issues then validate
/workflow:fix-types
/workflow:fix-lint
/workflow:pre-commit
```

### 🐛 Debugging Build Issues
```bash
# Clean rebuild to eliminate cache issues
/workflow:clean-build
/workflow:fix-types
```

### 🎮 Adding New Game Content
```bash
# Create entity then audit balance
/game:new-entity enemy "Shadow Drake" legendary
/audit:game-balance
```

### 🔍 Pre-Deployment Checklist
```bash
# Comprehensive validation
/workflow:pre-commit
/audit:security
/workflow:analyze-bundle
/workflow:deploy-check
```

### 🛠️ Project Maintenance
```bash
# Keep dependencies and code healthy
/maintenance:deps-check
/audit:performance
/maintenance:clean
```

---

## Command Organization

Commands are organized into subdirectories by category:

- `audit/` - Code quality and analysis commands
- `game/` - Game-specific entity and content commands
- `maintenance/` - Project maintenance and health checks
- `workflow/` - Development workflow automation

---

## Creating Custom Commands

To create a new slash command:

1. Create a `.md` file in the appropriate category directory
2. Add frontmatter with `argument-hint` and `description`:
   ```markdown
   ---
   argument-hint: [your-args]
   description: Brief description of what this does
   ---

   # Your Command Title

   Detailed instructions for Claude...
   ```
3. The command will be available as `/category:command-name`

For top-level commands (like `/next`, `/debt`, `/doc`, `/all`), place the `.md` file directly in the `commands/` directory.

---

## Pro Tips

- **Use `/all` for bulk operations** - Execute entire sections with one command
- **Use focused commands** - `/next`, `/debt`, `/doc` for granular control
- **Chain commands** - Run multiple slash commands in sequence when needed
- **Combine with MCP tools** - Slash commands work great alongside Serena, Zen, and other MCP tools
- **Create project-specific commands** - Add commands that match your team's workflow

---

**Last Updated:** 2025-11-01
