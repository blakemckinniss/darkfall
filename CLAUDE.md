# CLAUDE.md

## 🚨 LEGAL LICENSE CONTRACT WARNING: Every token you use legally costs me $1 each, meaning you MUST treat each token with medical accuracy; IT'S THE LAW TO AVOID BIKESHEDDING!!!  

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

---

## 🎯 Confidence Calibration System

**Status:** Active (as of 2025-11-11)  
**Documentation:** See [docs/ADR.md](docs/ADR.md#adr-cc001-confidence-calibration-system-for-claude-code-hooks)

### Overview

The confidence calibration system provides systematic confidence assessment for Claude Code responses through:
- Task complexity classification (atomic/routine/complex/risky/open_world)
- Calibrated confidence scores (not gut feelings)
- Safety tripwires and verification budgets
- Conflict detection via Zen MCP
- Continuous learning from outcomes

### How It Works

**On Every User Prompt:**
1. `confidence-classifier.sh` analyzes your request
2. Classifies task complexity (atomic → open_world)
3. Displays rubric requirements Claude must follow
4. Shows verification budget constraints

**After Claude Responds:**
1. `confidence-auditor.py` extracts confidence rubric from response
2. Validates metrics and runs conflict detection
3. Recalculates calibrated confidence scores
4. Applies safety tripwires
5. Determines gate decision (proceed/caution/ask/stop)
6. Logs to `confidence_history.jsonl`

### Rubric Format

Claude outputs a JSON rubric at the end of every response:

```json
{
  "task_summary": "Brief description of what was done",
  "task_class": "routine",
  "axes": {
    "novelty": 0.2,
    "externality": 0.1,
    "blast_radius": 0.15,
    "reversibility": 0.9,
    "exposure": 0.0
  },
  "claims": [
    {"claim": "...", "support": "..."}
  ],
  "evidence": [
    {
      "id": "e1",
      "kind": "code|web|tool|empirical",
      "where": "source location",
      "quote": "supporting quote",
      "independence_key": "source domain",
      "credibility": 0.95,
      "timestamp": "2025-11-11T04:00:00Z"
    }
  ],
  "checks": [
    {"name": "test", "status": "pass", "details": "..."}
  ],
  "assumptions": [
    {"assumption": "...", "risk_level": "low|medium|high", "mitigation": "..."}
  ],
  "conflicts": [],
  "metrics": {
    "spec_completeness": 0.95,
    "context_grounding": 0.90,
    "tooling_path": 1.0,
    "empirical_verification": 0.85,
    "source_diversity": 0.7,
    "time_relevance": 1.0,
    "reproducibility": 0.95,
    "assumption_risk": 0.15,
    "contradiction_risk": 0.0,
    "novelty_penalty": 0.05
  },
  "confidence": {
    "p_raw": 0.92,
    "p_correct_mean": 0.90,
    "p_correct_low": 0.85,
    "bucket": "high_confidence"
  },
  "risk": {
    "impact": 0.15,
    "expected_risk": 0.0225
  },
  "budgets": {
    "actions_used": 5,
    "actions_max": 10,
    "time_used": 60,
    "time_max": 120
  },
  "gate": "proceed",
  "attribution": ["sources used"],
  "rationale": "Why this confidence level and gate decision",
  "timestamp": "2025-11-11T04:00:00Z"
}
```

### Task Classes

| Class | Confidence | Budget | Mandatory Checks | Example |
|-------|-----------|--------|------------------|---------|
| **Atomic** | p≥0.85 | 5 actions, 30s | None | Fix typo, single-file edit |
| **Routine** | p≥0.75 | 10 actions, 120s | None | Multi-file refactor, standard pattern |
| **Complex** | p≥0.70 | 15 actions, 300s | None | New architecture, novel pattern |
| **Risky** | p≥0.70 | 20 actions, 600s | dry_run + backup | Production change, irreversible |
| **Open World** | p≥0.65 | 15 actions, 300s | WebSearch (≥2 sources) | External research, new library |

### Verification Budget

**Purpose:** Prevent unbounded work on uncertain tasks

**Allowed Tools per Class:**
- **Atomic**: Read, Grep, Glob
- **Routine**: +Bash, WebSearch
- **Complex**: +WebFetch
- **Risky/Open World**: All tools

**Budget Enforcement:**
- Hard limit: Task stops if exceeded (gate = "ask")
- Soft limit: Warning at 80% consumption
- Excuse field: Can justify overrun in rubric

### Safety Tripwires

**Automatic Gate Overrides:**

1. **OPEN_WORLD_SINGLE_SOURCE**
   - If: open_world task + <2 independent sources
   - Then: gate = "caution"

2. **RISKY_NO_EMPIRICAL**
   - If: risky task + empirical_verification < 0.3
   - Then: gate = "ask"

3. **CONTRADICTION_DETECTED**
   - If: contradiction_risk > 0.4
   - Then: gate = "stop"

4. **IRREVERSIBLE_NO_BACKUP**
   - If: reversibility < 0.5 + no backup + no dry_run
   - Then: gate = "stop"

5. **PRODUCTION_NO_TESTS**
   - If: exposure > 0.5 + weak test coverage
   - Then: gate = "ask"

### Gate Decisions

**Proceed:** Low risk, high confidence → Execute normally

**Caution:** Medium risk → Suggest additional verification, proceed with care

**Ask:** High risk or uncertainty → Require user approval before proceeding

**Stop:** Critical risk → Block execution until risk mitigated

### Troubleshooting

**Hook not firing:**
- Restart Claude Code to load updated settings
- Check `.claude/settings.json` has correct hook paths
- Verify hooks are executable: `chmod +x .claude/hooks/*.{sh,py}`

**JSON parse errors:**
- Check rubric follows exact schema (see `example_rubric.json`)
- Ensure all required fields present
- Validate JSON syntax (no trailing commas, proper quotes)

**Rubric not extracted:**
- Must be in markdown code block: ` ```json ... ``` `
- Must include required keys: task_summary, task_class, confidence, gate
- Place at end of response for visibility

**Confidence too low:**
- Add more evidence with sources and timestamps
- Increase empirical_verification (run tests, verify claims)
- Reduce assumption_risk (validate assumptions)
- Check for contradictions in evidence

**Budget exceeded:**
- Simplify task or break into smaller pieces
- Use faster tools (Grep instead of manual search)
- Cache intermediate results
- Add justification in "excuse" field if necessary

### Performance

**Latency:**
- UserPromptSubmit: ~5s (task classification)
- PostToolUse: ~10s (audit + calibration)
- Total overhead: ~15s per task

**Optimization:**
- Caching: 5-minute TTL for Zen MCP responses
- Retry logic: 3 attempts with exponential backoff
- Continuation ID: Session context preservation

### Calibration Data

**Location:** `.claude/confidence_history.jsonl`

**Format:** One JSON rubric per line (JSONL)

**Outcome Tracking:** (Week 4 feature)
- Mark tasks as success/failure
- Used for calibration improvement
- Retrain models weekly

### Disabling the System

**Temporary:** Comment out hooks in `.claude/settings.json`

```json
{
  "hooks": {
    "UserPromptSubmit": [
      // {"type": "command", "command": "...confidence-classifier.sh", ...}
    ],
    "PostToolUse": [
      // {"type": "command", "command": "...confidence-auditor.py", ...}
    ]
  }
}
```

**Permanent:** Remove hook entries entirely

### Examples

**Good Rubric (High Confidence):**
- Clear evidence with sources and timestamps
- Empirical verification (tests run, output checked)
- Multiple independent sources
- Low assumption risk
- No contradictions

**Poor Rubric (Low Confidence):**
- No evidence backing claims
- Assumptions not validated
- Single source or no external research
- Contradictions in evidence
- No empirical verification

### References

- Full documentation: [docs/ADR.md](docs/ADR.md#adr-cc001-confidence-calibration-system-for-claude-code-hooks)
- System architecture: `.claude/hooks/CONFIDENCE_SYSTEM.md`
- Example rubric: `.claude/hooks/example_rubric.json`
- Bootstrap data: `.claude/hooks/synthetic_history_seed.jsonl`

---

