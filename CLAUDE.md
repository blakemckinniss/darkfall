# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**For detailed architectural decisions and rationale, see [docs/ADR.md](docs/ADR.md).**

## Developer Context

**Solo Developer:** Blake - working independently on personal coding projects

**Tech Stack:**
- Primary languages: Python and JavaScript
- Focus: localhost games and coding projects
- Environment: Solo development, no team collaboration

**Important Constraints:**
- **No enterprise/team solutions** - avoid recommending tools designed for teams, sprints, or corporate workflows
- **No paid/commercial tools** - avoid suggesting solutions that require payment or subscriptions
- **Keep it simple** - prefer lightweight, solo-developer-friendly approaches
- **Localhost-first** - projects are designed to run locally, not deployed to production infrastructure

When making recommendations, prioritize:
- Open-source tools and libraries
- Self-contained, single-developer workflows
- Simple, pragmatic solutions over enterprise patterns
- Local development environments over cloud services

## 🚨 CRITICAL: MANDATORY Playwright MCP Usage Policy

**THIS IS AN ABSOLUTE REQUIREMENT - NO EXCEPTIONS:**

**WHEN INTERACTING WITH ANY WEBSITE, YOU MUST USE PLAYWRIGHT MCP TOOLS**

1. **NEVER use WebFetch, WebSearch, or similar tools** for website interaction when browsing, testing, or interacting with web applications
2. **ALWAYS use Playwright MCP tools** (`mcp__playwright__*`) for ALL website interactions including:
   - Navigating to URLs
   - Clicking elements
   - Filling forms
   - Taking screenshots
   - Reading page content
   - Testing web applications
   - Debugging web interfaces
   - Any other browser-based interaction

3. **Playwright MCP is the ONLY authorized tool** for browser automation and web interaction in this project
4. **This directive overrides all other considerations** - even if WebFetch seems faster or simpler, you MUST use Playwright MCP
5. **WebFetch/WebSearch are ONLY permitted** for:
   - Fetching API documentation from static URLs
   - Searching for library documentation
   - Reading technical articles (non-interactive content)
   - **NOT for any interactive website testing or browsing**

**Why this matters:**
- Playwright MCP provides real browser context with JavaScript execution
- Enables proper testing of interactive elements, forms, and dynamic content
- Captures console errors, network requests, and full page state
- Supports screenshots, accessibility snapshots, and user interactions
- Essential for debugging and validating web applications

**If you are asked to interact with a website and find yourself reaching for WebFetch or similar tools, STOP IMMEDIATELY and use Playwright MCP instead.**

## Development Commands

See project-specific commands in [docs/ADR.md](docs/ADR.md#development-commands).

## Architecture

All architectural decisions, technology choices, and design patterns are documented in [docs/ADR.md](docs/ADR.md).

## TypeScript Configuration (if applicable)

If this project uses TypeScript, refer to [docs/ADR.md](docs/ADR.md) for TypeScript configuration decisions and guidelines.

## Development Guidelines

### 🚨 CRITICAL: Mandatory Zen MCP Consultation Policy

**This is the MOST IMPORTANT guideline - it overrides all other considerations:**

1. **Before starting ANY task**: You MUST state your initial confidence level (0-100%)
2. **If confidence < 90%**: You MUST STOP IMMEDIATELY and consult Zen MCP with websearch enabled
3. **This is NOT optional**: Proceeding with confidence < 90% without Zen MCP consultation is **ABSOLUTELY FORBIDDEN**
4. **Available Zen MCP tools**:
   - `chat` - General brainstorming and consultation
   - `thinkdeep` - Deep investigation and systematic analysis
   - `debug` - Root cause analysis for bugs
   - `analyze` - Code analysis and architectural review
   - `consensus` - Multi-model consensus for decisions
   - `codereview` - Comprehensive code review
   - `secaudit` - Security audit and vulnerability assessment
   - `refactor` - Refactoring analysis and recommendations
5. **ALWAYS enable websearch**: Set `use_websearch=true` for ALL Zen MCP consultations to access current documentation and best practices
6. **After completing a task**: State your final confidence and consult Zen MCP if < 90%

**Confidence Level Guidelines (STRICTLY ENFORCED):**
- **90-100%**: High certainty - proceed without consultation
- **80-89%**: 🚨 MUST consult Zen MCP with websearch - proceeding is FORBIDDEN
- **70-79%**: 🚨 MUST consult Zen MCP with websearch - proceeding is FORBIDDEN
- **Below 70%**: 🚨 MUST consult Zen MCP with websearch - proceeding is FORBIDDEN

**Examples:**
- ✅ "Initial confidence: 95% - high certainty, proceeding without consultation"
- ✅ "Initial confidence: 75% - STOPPING to consult Zen MCP (thinkdeep with websearch enabled)"
- ❌ "Initial confidence: 85% - proceeding anyway" ← **ABSOLUTELY FORBIDDEN!**

### General Development Guidelines

- **Never write documentation** unless explicitly requested by the user
- **Check for existing functionality** before creating new files - avoid duplication
- **UI/UX is critical** - always consider visual design, user experience, and aesthetics in all changes
- **Be assertive and opinionated** - question the user if requirements are unclear or if you see potential issues
- **Utilize MCP tools** - leverage available MCP servers (serena, tavily, etc.) whenever possible
- **Provide next steps** - after completing a task, always suggest follow-up considerations or improvements
  - **Format Next Steps as actionable tasks**, not questions (e.g., "Refactor X" not "Should I refactor X?")
  - This ensures compatibility with `/do next` command for automated execution
- **Avoid migrations** - prefer incremental changes over large-scale refactors
- **No demos or examples** - build production-ready features, not throwaway code
- **Prevent technical debt** - write clean, maintainable code from the start
- **Never version files** - overwrite the previous version instead of creating file.v2.ts; git handles version control
- **Commit after major changes** - create git commits when significant work is complete

## Custom Slash Commands

This project may include custom slash commands for streamlined workflows. Check `.claude/commands/README.md` if it exists for full documentation.

**Common command patterns:**
- `/do` - Universal task executor for debt items, next steps, and custom tasks
- `/audit:*` - Code quality and security audits
- `/maintenance:*` - Type checks, dependency updates, cleanup

**Quick examples:**
```bash
/do debt 1 3           # Fix specific technical debt items
/do next 2 4           # Execute specific next steps
/do task "add tests"   # Custom task
/do all                # Execute all debt + next steps
```

## Custom Hooks System

This project includes **project-agnostic** Claude Code hooks that enhance the development workflow. All hooks are portable and can be copied to any project. See `.claude/hooks/README.md` for full documentation.

### Available Hooks

**1. Session Start Hook** (`session-start.sh`)
- **Auto-detects project type**: Node.js, Python, Go, Rust, Ruby, Java
- **Smart package manager detection**: npm/yarn/pnpm, pip/poetry/pipenv, cargo, bundle, maven/gradle
- **Dependency validation**: Warns about missing dependencies (node_modules, venv, vendor, etc.)
- **Guidelines integration**: Reads CLAUDE.md for project-specific rules (falls back to generic guidelines)
- **Optional health checks**: Runs `.claude/tests/health-check.sh` if present

**2. Prompt Validation Hook** (`prompt-validator.sh`)
- **Dynamic reflection questions**: Generates 3 contextually relevant questions before each task
- **Documentation tracking**: Reminds about ADR.md, CLAUDE.md, NOTES.md updates
- **Task completion requirements**: Enforces confidence levels, documentation, technical debt tracking
- **Smart type/lint checking**: Runs TypeScript and ESLint checks with intelligent caching
- **Performance optimized**: Parallel execution, 60s cache, smart file filtering

**3. Directory Creation Hook** (`validate-directory-creation.py`)
- **Requires justification**: Asks user to approve directory creation with AI explanation
- **Prevents duplication**: Ensures Claude explains WHY the directory is needed
- **Universal**: Works in any project without modification

### Hook Portability

All hooks are **100% project-agnostic** and work across:
- All programming languages (Node.js, Python, Go, Rust, Ruby, Java, PHP, C++, etc.)
- All frameworks and tech stacks
- Any project structure
- With or without CLAUDE.md

**To use in a different project:**
```bash
# Copy hooks to new project
cp -r .claude/hooks /path/to/other/project/.claude/

# Ensure executable
chmod +x /path/to/other/project/.claude/hooks/*.sh

# Restart Claude Code - hooks activate automatically
```

### Hook Configuration

Hooks are configured in `.claude/settings.json`:
- **SessionStart**: `session-start.sh` - Runs when Claude Code starts
- **UserPromptSubmit**: `prompt-validator.sh` - Runs before each user prompt
- **PreToolUse**: `validate-directory-creation.py` - Runs before directory creation

No manual configuration needed - hooks auto-detect project characteristics and adapt.

## Important Notes

**NOTES.md requires periodic manual cleanup** - Use `/notes:cleanup` to review and remove completed critical items from `docs/NOTES.md`. Automated cleanup was disabled due to performance constraints.

Project-specific notes and configuration details are documented in [docs/ADR.md](docs/ADR.md).
