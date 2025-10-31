# Claude Code Hooks

This directory contains hook scripts for Claude Code automation.

## Installed Hooks

### SessionStart Hook (`session-start.sh`)

**When it runs**: At the start of every Claude Code session (startup, resume, clear, compact)

**What it does**:
- Loads environment variables from `.env` into the session environment
- Reports current git branch and uncommitted changes
- Warns if `node_modules` is missing
- Provides project status context to Claude

**Environment variables**: Uses `CLAUDE_ENV_FILE` to persist .env variables for the session

### UserPromptSubmit Hook (`prompt-validator.sh`)

**When it runs**: Every time you submit a prompt to Claude

**What it does**:
- **Validates prompts** against project guidelines
- **Blocks** attempts to create documentation, demos, or examples (per CLAUDE.md guidelines)
- **Adds context** about uncommitted changes before processing
- **Reports** linting status to help maintain code quality

**Blocked patterns**:
- "create README" / "write documentation"
- "generate example" / "create demo"

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
