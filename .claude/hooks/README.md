# Claude Code Hooks

This directory contains hook scripts for Claude Code automation.

## Installed Hooks

### SessionStart Hook (`session-start.sh`)

**When it runs**: At the start of every Claude Code session (startup, resume, clear, compact)

**What it does**:
- Loads environment variables from `.env` into the session environment
- Reports current git branch and uncommitted changes
- Warns if `node_modules` is missing
- **🎮 Validates AI endpoint health** (fal.ai portraits + Groq items/narrative)
- **Enforces critical CLAUDE.md development guidelines** in context
- Reminds Claude of mandatory rules (no docs, no demos, use MCP, etc.)

**Environment variables**: Uses `CLAUDE_ENV_FILE` to persist .env variables for the session

**AI endpoint validation** (NEW):
- Checks if dev server is running (localhost:3000)
- Validates fal.ai portrait generation API
- Validates Groq item generation API
- Validates Groq narrative generation API
- Runs in background to avoid blocking session start
- Logs results to `/tmp/ai-health-check.log`

**Guidelines enforced**:
- Never write documentation unless requested
- Check for duplicates before creating files
- Always consider UI/UX
- Be assertive and question unclear requirements
- Utilize MCP tools
- Provide next steps
- No demos or examples
- Prevent technical debt
- Never version files manually
- Commit after major changes

### UserPromptSubmit Hook (`prompt-validator.sh`)

**When it runs**: Every time you submit a prompt to Claude

**What it does**:
- **Validates prompts** against project guidelines
- **Blocks** attempts to create documentation, demos, or examples (per CLAUDE.md guidelines)
- **🎯 Task type detection** - Automatically identifies bug fixes, features, refactoring, or performance work
- **📋 Task-specific checklists** - Shows relevant checklist based on detected task type
- **💡 Prompt quality analysis** - Warns about vague prompts and suggests improvements
- **🎨 Smart context filtering** - Only shows errors in files mentioned in prompt or recently modified
- **Enforces task completion requirements** (confidence levels, next steps, technical debt documentation)
- **Adds context** about uncommitted changes before processing
- **⚡ PERFORMANCE OPTIMIZED**: Runs TypeScript + ESLint checks in parallel (2x speedup)
- **Smart caching** with 60-second TTL and file modification detection

**Blocked patterns**:
- "create README" / "write documentation"
- "generate example" / "create demo"

**Task requirements enforced**:
- **Initial confidence (0-100%)** - Must state before starting tasks
- **Final confidence (0-100%)** - Must state after completing tasks
- **Zen MCP consultation** - Required when confidence < 80%
- **Next steps** - Must always provide after task completion
- **Technical Debt & Risks** - Must document any compromises or future concerns
- **Confidence guidelines** - 90-100% high, 80-89% good, 70-79% uncertain, <70% low

**Intelligent features** (Phase 1 - NEW):
- **Task detection**: Identifies bugfix, feature, refactor, or performance tasks from prompt keywords
- **Dynamic checklists**: Bug fixes get testing reminders, features get architecture questions, etc.
- **Prompt quality warnings**: Detects vague prompts ("fix it", "make it better") and suggests specifics
- **Smart filtering**: Only shows TypeScript/ESLint errors for files mentioned in prompt or recently modified
- **Reduced noise**: "smart" mode shows "X relevant file(s)" instead of full project scan

**Performance features**:
- **Parallel execution**: TypeScript and ESLint run simultaneously for 2x speedup
- **Extended cache**: 60-second TTL for better performance with low-activity sessions
- **Intelligent targeting**: Only validates files relevant to your current task

### PostToolUse Hook (`post-edit-format.sh`)

**When it runs**: After every Edit or Write tool call

**What it does**:
- **Auto-formats** JavaScript/TypeScript files with Prettier
- **Auto-fixes** ESLint errors where possible with `eslint --fix`
- **Auto-formats** CSS/SCSS/SASS/LESS files with Prettier
- **Auto-fixes** style issues with `stylelint --fix`
- **Silently applies** formatting without blocking or requiring user action
- **Reports** when formatting is applied

**File types formatted**:
- JavaScript: .js, .jsx, .mjs, .cjs
- TypeScript: .ts, .tsx
- Styles: .css, .scss, .sass, .less

## Configuration

Hooks are configured in `.claude/settings.local.json` (gitignored).

To modify hook behavior:
1. Edit the shell scripts in this directory
2. Test manually: `./session-start.sh` or `echo '{"prompt":"test"}' | ./prompt-validator.sh`
3. Restart Claude Code to pick up changes

## Testing Hooks

```bash
# Test SessionStart hook
CLAUDE_PROJECT_DIR=$(pwd) CLAUDE_ENV_FILE=/tmp/test.env ./.claude/hooks/session-start.sh

# Test UserPromptSubmit hook
echo '{"prompt":"write documentation for the API"}' | ./.claude/hooks/prompt-validator.sh
echo '{"prompt":"fix the authentication bug"}' | ./.claude/hooks/prompt-validator.sh
```

## Debugging

Run Claude Code with `--debug` to see detailed hook execution:
```bash
claude --debug
```

View hook output in transcript mode: Press `Ctrl-R` during execution.
