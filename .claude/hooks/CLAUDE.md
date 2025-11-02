# Claude Code Hooks

This directory contains custom hooks for Claude Code that enforce project-specific policies and enhance the development workflow.

## Hooks Overview

### 1. Directory Creation Validation
**File**: `validate-directory-creation.sh`
**Triggers**: PreToolUse (directory creation)
**Purpose**: Requires AI justification and user approval before creating new directories

### 2. Markdown File Creation Restriction
**File**: `validate-markdown-creation.sh`
**Triggers**: PreToolUse (Write tool, Bash commands)
**Purpose**: Restricts markdown file creation to specific whitelisted locations, with special handling for README.md
**Policy**:
- ✅ Allows: `/docs` directory, hidden directories (`.claude`, `.github`, etc.), `CLAUDE.md` anywhere
- ❌ Blocks: All other `.md` files outside whitelisted locations
- ⛔ **README.md**: Specifically blocked with educational message suggesting CLAUDE.md instead

### 3. Session Start Context
**File**: `session-start.sh`
**Triggers**: SessionStart
**Purpose**: Provides project status, dependency checks, optional health validation, and development guidelines
**Portability**: Fully project-agnostic - auto-detects Node.js, Python, Go, Rust, Ruby, Java projects

### 4. Prompt Validation & Documentation Tracking
**File**: `prompt-validator.sh`
**Triggers**: UserPromptSubmit
**Purpose**: Validates prompts, enforces task requirements, and monitors documentation updates

---

## Markdown File Creation Restriction Hook

**File**: `validate-markdown-creation.sh`

### Purpose
Enforces a strict policy preventing markdown file proliferation outside designated documentation areas.

### Policy Rules

✅ **Allowed Locations:**
- `/docs` directory and subdirectories - For all project documentation
- Hidden directories (starting with `.`) - `.claude`, `.github`, `.vscode`, etc.
- `CLAUDE.md` file - Allowed in any location (scoped project instructions)
  - **Pro tip**: Use subdirectory CLAUDE.md files for area-specific guidance
  - Works like inheritance: root CLAUDE.md = baseline, subdirs add/override specifics
  - Example: `components/CLAUDE.md` for component conventions, `api/CLAUDE.md` for API rules

❌ **Blocked Locations:**
- Root directory (except `CLAUDE.md`)
- Component directories (`/components`, `/lib`, `/app`, etc.)
- Any non-whitelisted location

### How It Works

1. **Triggers On**:
   - `Write` tool calls creating `.md` files
   - `Bash` tool calls containing markdown file creation (touch, echo >, cat >, etc.)

2. **Behavior**:
   - Checks file path against whitelist rules
   - Returns `"ask"` permission decision for restricted files
   - Shows user clear policy explanation

3. **User Action Required**:
   - Review the blocked markdown file path
   - The hook suggests creating `CLAUDE.md` in that specific directory
   - Consider these alternatives:
     - Move documentation to `/docs` directory
     - Create `CLAUDE.md` in the target directory (scoped guidance, no conflicts)
     - Use hidden directories for tooling configs

### Example Flows

**README.md Blocking (Special Case):**
```
Claude: "I'll create a README.md in the root directory."
[Hook triggers]
User sees: "⛔ README.md Creation Blocked
            🚫 README.md files are not allowed in this project.
            💡 Use CLAUDE.md instead:
               • CLAUDE.md is the standard for Claude Code projects
               • Hierarchical: Root CLAUDE.md = baseline, subdirs add specifics
               • Auto-discovered by Claude when working in this area
            📚 Why CLAUDE.md over README.md?
               • Directly read by Claude Code for context and guidelines
               • Supports inheritance (root + subdirectory combined)
               • Better separation: CLAUDE.md = AI guidance, docs/ = human docs"
User: "Got it! Please create/update CLAUDE.md instead"
Claude: "I'll update CLAUDE.md with the project information"
[Hook allows] ✓ (CLAUDE.md allowed anywhere)
```

**Other Markdown Files:**
```
Claude: "I'll create a guide.md in the components folder."
[Hook triggers]
User sees: "⛔ Markdown File Creation Restricted
            💡 Consider: Create CLAUDE.md in this directory (components/CLAUDE.md)
               → Provides scoped guidance for this area
               → Won't conflict with root CLAUDE.md (works like inheritance)"
User: "Please create components/CLAUDE.md instead"
Claude: "I'll create components/CLAUDE.md with component-specific guidelines"
[Hook allows] ✓ (CLAUDE.md allowed anywhere)
```

### Testing

Test the hook manually:
```bash
# Should block with README.md-specific message
echo '{"tool_name": "Write", "tool_input": {"file_path": "/project/README.md"}}' | \
  ./.claude/hooks/validate-markdown-creation.sh

# Should block with general markdown message
echo '{"tool_name": "Write", "tool_input": {"file_path": "/project/guide.md"}}' | \
  ./.claude/hooks/validate-markdown-creation.sh

# Should allow
echo '{"tool_name": "Write", "tool_input": {"file_path": "/project/CLAUDE.md"}}' | \
  ./.claude/hooks/validate-markdown-creation.sh

echo '{"tool_name": "Write", "tool_input": {"file_path": "/project/docs/guide.md"}}' | \
  ./.claude/hooks/validate-markdown-creation.sh
```

---

## Directory Creation Hook

**File**: `validate-directory-creation.sh`

### Purpose
Enforces a policy requiring AI justification and user approval before creating new directories.

### How It Works

1. **Triggers On**:
   - `mcp__filesystem__create_directory` tool calls
   - `Bash` tool calls containing `mkdir` commands

2. **Behavior**:
   - Intercepts directory creation requests
   - Returns `"ask"` permission decision
   - Shows user a prompt requiring verification that Claude has:
     - Explained WHY the directory is needed
     - Described what will be stored in it
     - Confirmed it doesn't duplicate existing structure

3. **User Action Required**:
   - When prompted, review Claude's most recent message
   - Verify Claude provided adequate justification
   - Approve if justified, deny if not
   - If denied, ask Claude to explain before retrying

### Example Flow

```
Claude: "I'll create a new directory for test fixtures."
[Hook triggers]
User sees: "⚠️ Directory Creation Requires Approval
            Before approving, verify Claude has explained WHY..."
User reviews Claude's message, sees insufficient justification
User: Denies request, asks "Please explain why we need this directory"
Claude: "We need this directory to store JSON test fixtures for..."
[Hook triggers again]
User: Reviews explanation, approves
Directory created ✓
```

### Configuration

The hook is configured in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__filesystem__create_directory",
        "hooks": [...]
      },
      {
        "matcher": "Bash",
        "hooks": [...]
      }
    ]
  }
}
```

### Testing

Test the hook manually:
```bash
echo '{"tool_name": "mcp__filesystem__create_directory", "tool_input": {"path": "/test"}}' | \
  ./.claude/hooks/validate-directory-creation.sh
```

### Notes

- Hook changes require Claude Code restart to take effect
- Check `/hooks` menu in Claude Code to verify hook is registered
- Use `claude --debug` to see detailed hook execution logs

---

## Session Start Context Hook

**File**: `session-start.sh`

### Purpose
Provides intelligent project status information at session start, including environment validation, dependency checking, and development guidelines.

### Key Features

#### 1. Multi-Language Dependency Detection
Automatically detects project type and verifies dependencies:

**Supported Languages/Frameworks:**
- **Node.js/TypeScript** - Detects pnpm/yarn/npm and checks for node_modules
- **Python** - Checks for venv/.venv with pipenv/poetry/pip support
- **Go** - Verifies go command and go.mod
- **Rust** - Checks for cargo command and Cargo.toml
- **Ruby** - Detects Gemfile and bundle status
- **Java Maven** - Checks for mvn command and pom.xml
- **Java Gradle** - Verifies gradle/gradlew and build files

**Example Output:**
```
## Project Status
Git: On branch 'main' with 5 uncommitted change(s)
⚠️  Node.js project: node_modules not found. Run 'pnpm install'
```

#### 2. Optional Health Checks
If a custom health check script exists at `.claude/tests/health-check.sh`, it will be executed automatically:

```bash
## 🔍 Project Health Check
Running custom health validation...
✅ Health check passed
```

**Creating a Custom Health Check:**
```bash
#!/bin/bash
# .claude/tests/health-check.sh

# Example: Check if API keys are configured
if [ -z "$API_KEY" ]; then
  echo "Error: API_KEY environment variable not set"
  exit 1
fi

# Example: Check if services are running
if ! curl -s "http://localhost:3000" > /dev/null; then
  echo "Error: Development server not running"
  exit 1
fi

echo "All health checks passed"
exit 0
```

#### 3. Development Guidelines Integration
- If `CLAUDE.md` exists: References it for project-specific guidelines
- If no `CLAUDE.md`: Shows generic best practices

This makes the hook work in any project while allowing customization.

#### 4. Environment Variable Loading
Automatically loads `.env` file if present and `CLAUDE_ENV_FILE` is set.

#### 5. Mandatory Playwright MCP Usage Directive
Displays critical reminder at session start requiring Playwright MCP tools for all website interactions:

**Output Displayed:**
```
🚨 **MANDATORY PLAYWRIGHT MCP USAGE POLICY** 🚨

**WHEN INTERACTING WITH ANY WEBSITE, YOU MUST USE PLAYWRIGHT MCP TOOLS**

1. **NEVER use WebFetch/WebSearch** for website interaction (browsing, testing, forms, buttons)
2. **ALWAYS use Playwright MCP** (mcp__playwright__*) for ALL browser-based interactions
3. **This directive overrides all other considerations** - even if WebFetch seems simpler
4. **WebFetch ONLY for**: API docs, technical articles, library documentation (non-interactive)

**Why**: Playwright provides real browser context, JavaScript execution, console logs, screenshots, and proper interaction testing.
```

**Purpose**: Prevents common mistakes where Claude might attempt to use WebFetch for interactive website tasks instead of proper browser automation tools.

### Portability

**100% Project-Agnostic** - Works across:
- All programming languages (Node.js, Python, Go, Rust, Ruby, Java, etc.)
- All package managers (npm, yarn, pnpm, pip, poetry, cargo, bundle, maven, gradle)
- Any project structure
- With or without CLAUDE.md

**No Configuration Required** - Just copy the file to any project's `.claude/hooks/` directory.

### Customization Options

#### Add New Language Support
Edit the `detect_and_check_dependencies()` function:

```bash
# PHP / Composer
if [ -f "$CLAUDE_PROJECT_DIR/composer.json" ]; then
  if [ ! -d "$CLAUDE_PROJECT_DIR/vendor" ]; then
    dep_warnings+="⚠️  PHP project: dependencies not found. Run 'composer install'"$'\n'
  fi
fi
```

#### Adjust Detection Logic
Modify thresholds or add custom checks within the function blocks.

#### Rename Health Check Script
Change line 118: `HEALTH_SCRIPT="$CLAUDE_PROJECT_DIR/.claude/tests/your-script.sh"`

---

## Prompt Validation & Documentation Tracking Hook

**File**: `prompt-validator.sh`

### Purpose
Validates user prompts, enforces task completion requirements, and automatically reminds Claude to check if documentation files need updates.

### Documentation Update Monitoring

The hook monitors for changes that likely affect these key files:

#### docs/ADR.md (Architecture Decision Records)
**Trigger Keywords**: architecture, state management, api design, database, deployment, build system, integration pattern, design pattern

**When to Update**:
- New architectural patterns introduced
- State management approach changes
- API design decisions
- Database schema or persistence changes
- Build/deploy process modifications
- Major integration decisions

#### CLAUDE.md (Development Guidelines)
**Trigger Keywords**: typescript config, dev command, workflow, slash command, hook, build process, lint rule, prettier, tsconfig

**When to Update**:
- New development commands added
- TypeScript configuration changes
- New slash commands created
- Hook modifications
- Build process updates
- Linting/formatting rule changes
- Project guideline additions

#### docs/NOTES.md (Critical Items Log)
**Trigger Keywords**: critical, urgent, blocker, high priority, must fix, breaking change

**Auto-Logging Behavior**:
- Items with 🔴76-100 (documentation updates)
- Items with 🔴76-100 (technical debt)
- Items with ⭐76-100 (next steps)
- Appended with timestamp in format: `## YYYY-MM-DD HH:MM - [DOCS|DEBT|NEXT]`

**Manual Cleanup**:
- Use `/notes:cleanup` command to review and remove completed items
- Automated cleanup disabled due to performance constraints

### Task Completion Requirements

The hook enforces mandatory completion requirements for every task:

1. **Initial Confidence (0-100%)** - Stated before starting
2. **Final Confidence (0-100%)** - Stated after completion
3. **Documentation Updates Required** - First mandatory section
4. **Technical Debt & Risks** - Second mandatory section
5. **Next Steps & Considerations** - Third mandatory section
6. **Auto-Logging** - Critical items (76-100) automatically logged to NOTES.md
7. **Performance Optimization** - Parallel execution and batching encouraged

### Critical Reflection Questions

The hook generates **exactly 3 dynamic questions** tailored to:
- Task type (bugfix, feature, refactor, performance)
- Project state (uncommitted changes, critical backlog items)
- Prompt context (UI/UX, API integration, state management, TypeScript)

**Question 1 - Task-Specific:**
- **Bugfix**: Root cause analysis vs symptom treatment
- **Feature**: Alignment with core project goals and scope
- **Refactor**: Value vs effort trade-off assessment
- **Performance**: Measurement and profiling before optimization
- **General**: Task clarity and requirement validation

**Question 2 - Project Health:**
- Uncommitted changes warning (>15 files)
- Critical backlog items from NOTES.md (>5 items)
- Side effects and testing strategy
- Integration risk with existing systems

**Question 3 - Context-Aware:**
- **Browser/Website Interaction**: Playwright MCP usage verification (triggered by: website, browser, webpage, web app, navigate, click, form, button, playwright, screenshot, scrape, crawl, dom, element, selector, input field, submit, login page, headless, automation)
- **UI/UX**: User experience and design consistency
- **API Integration**: Rate limits, costs, fallback behavior
- **State Management**: Migration strategy and backward compatibility
- **TypeScript**: Type safety and compliance with strict mode
- **Default (rotating)**: Code maintainability, system scalability, cross-platform compatibility, performance implications

These questions rotate based on current hour to ensure variety across sessions.

#### Portability

The hook is **fully project-agnostic** and can be used in any codebase without modification. Questions are intentionally generic to work across:
- Web applications, mobile apps, APIs, CLIs
- Any programming language or framework
- Frontend, backend, full-stack, or infrastructure projects

If you want to customize questions for domain-specific terminology, edit the prompt text in `prompt-validator.sh`:
- Question 1: Task-type specific prompts (lines 238-248)
- Question 2: Project health checks (lines 251-270)
- Question 3: Context-aware prompts (lines 273-300)

### Smart Features

- **Task Type Detection**: Automatically detects bugfix, feature, refactor, performance tasks
- **Context Filtering**: Shows only relevant TypeScript/lint errors for modified files
- **Caching**: Skips type/lint checks if run within 60s with no file changes
- **Parallel Execution**: Runs TypeScript and ESLint checks simultaneously (2x speedup)
- **Prompt Quality Analysis**: Warns about vague prompts and suggests improvements

### Practical Development Hygiene Reminders

Beyond the 3 critical reflection questions, the hook provides additional context-aware reminders for common quality and portability issues:

#### Configuration/Portability Check
**Trigger Keywords**: hardcoded, localhost, 127.0.0.1, absolute path, /Users/, C:\\, api.*url.*http, endpoint.*=.*http, .env, API_KEY, SECRET

**Warning Displayed**:
```
⚙️ **Configuration Check**: Hardcoded values detected. Use environment variables or config files for portability across environments.
```

**Purpose**: Catches hardcoded URLs, paths, and secrets that would break portability or cause "works on my machine" issues. Encourages proper configuration management without security theatre.

**Example Triggers**:
- "Set the API endpoint to http://localhost:3000"
- "Use absolute path /Users/john/project"
- "Add API_KEY = 'abc123' to the file"

#### Testing Discipline Reminder
**Trigger Keywords**: add.*(function|method|component|service|endpoint), new.*(function|component|service|class), create.*(function|component|service|api), implement.*(function|method|feature|endpoint), build.*(feature|service|component)

**Warning Displayed**:
```
🧪 **Testing Discipline**: New code detected. Consider test cases, edge cases, and validation strategy.
```

**Purpose**: Builds testing habit by reminding about test planning when new code is being added. Focuses on thinking through edge cases and validation, not coverage metrics or TDD dogma.

**Example Triggers**:
- "Add a new function for user authentication"
- "Implement a new endpoint for payment processing"
- "Create a service to handle file uploads"
- "Build a feature for real-time notifications"

#### Error Handling Awareness
**Trigger Keywords**: fetch, axios, api.*call, http.*request, database.*query, file.*read, file.*write, async, await, promise, external.*service, network.*request, third.*party

**Warning Displayed**:
```
🛡️ **Error Handling**: External operations can fail. Plan for network errors, timeouts, and unexpected responses.
```

**Purpose**: Encourages resilient code by reminding about error handling when working with external operations. Focuses on thinking through failure modes, not defensive programming paranoia.

**Example Triggers**:
- "Add a fetch call to the API endpoint"
- "Query the database for user records"
- "Make an HTTP request to external service"
- "Use async/await to load file data"

#### Breaking Change Warning
**Trigger Keywords**: change.*(type|interface|schema|api|contract), modify.*(api|interface|schema|signature), rename.*(field|prop|property|column|method|function), remove.*(field|prop|property|column|endpoint), update.*(interface|type|schema|api), deprecate, breaking

**Warning Displayed**:
```
⚠️ **Breaking Change**: API/interface modification detected. Consider versioning, migration path, and backwards compatibility.
```

**Purpose**: Risk management for API/interface changes. Reminds about impact on existing consumers and migration planning, not bureaucratic change control.

**Example Triggers**:
- "Rename the userId field to accountId"
- "Change the response type from string to object"
- "Remove the deprecated endpoint"
- "Update the API interface to use new schema"

#### Performance Consciousness
**Trigger Keywords**: map.*map, nested.*loop, loop.*loop, forEach.*forEach, \.map.*\.filter, \.filter.*\.map, recursive.*call, n\+1, query.*all, fetch.*all.*records, load.*entire

**Warning Displayed**:
```
⚡ **Performance**: Nested iterations or bulk operations detected. Consider data structure optimization, pagination, or lazy loading.
```

**Purpose**: Encourages algorithmic thinking when nested operations are detected. Focuses on considering alternatives, not premature optimization.

**Example Triggers**:
- "Use map followed by another map"
- "Nested loop to process all items"
- "Query all records from the database"
- "Filter then map the entire dataset"

**Philosophy**: These reminders are **practical nudges**, not bureaucratic requirements. They catch common mistakes early and encourage good development hygiene without being preachy or dogmatic.

### Example Output

When you submit a prompt containing "integrate with payment API", the hook will output:

```
📋 Reminder: Changes to architecture/design patterns may require docs/ADR.md update

## 🎯 Task Completion Requirements (MANDATORY)
[Full requirements displayed with documentation update guidelines]

---

## 💭 Critical Reflection Questions (MANDATORY)

Before proceeding, consider these questions:

1. **Clarity Check**: Is the task clearly defined, or should you ask clarifying questions before proceeding?
2. **Integration Risk**: How does this interact with existing systems and data flows?
3. **External Dependencies**: Are you considering rate limits, costs, and fallback behavior if external services fail?
```

**Note**: Questions dynamically adapt based on task type, project state, and prompt keywords. The hook works out-of-the-box for any project without customization.

### Configuration

Configured in `.claude/settings.json` under UserPromptSubmit hook. No user action required - the hook automatically injects context into every prompt submission.

---

## Question Quality Monitoring

### Purpose
Track the effectiveness of Critical Reflection Questions generated by `prompt-validator.sh` to identify areas for improvement.

### Monitoring Approach

#### 1. Manual Observation (Ongoing)
As you use Claude Code over multiple sessions, pay attention to:
- **Relevance**: Do the questions address actual concerns for the task?
- **Actionability**: Do the questions help you think through important aspects?
- **False Positives**: Are questions triggered unnecessarily?
- **False Negatives**: Are important concerns missed?

#### 2. Question Categories to Monitor

**Task-Specific Questions (Question 1)**
- Bugfix: "Root cause vs symptoms" - Does this prevent surface-level fixes?
- Feature: "Scope alignment" - Does this prevent scope creep?
- Refactor: "Value vs effort" - Does this prevent premature optimization?
- Performance: "Measurement first" - Does this encourage profiling?

**Project Health Questions (Question 2)**
- Uncommitted changes warning (>15 files) - Is threshold appropriate?
- Critical backlog (>5 NOTES.md items) - Is this useful?
- Side effects check - Does this catch integration issues?
- Testing strategy - Does this improve test coverage?

**Context-Aware Questions (Question 3)**
- UI/UX prompts → User experience question
- API/integration prompts → External dependencies question
- State/database prompts → Data migration question
- TypeScript prompts → Type safety question
- Default rotation (4 variations) - Are all relevant?

#### 3. Refinement Opportunities

Track these patterns over 2-4 weeks:

**Pattern 1: Irrelevant Questions**
- If a question consistently doesn't apply, adjust trigger keywords
- Example: If "External Dependencies" appears for non-API tasks, refine the regex pattern

**Pattern 2: Missing Questions**
- If important concerns aren't addressed, add new trigger keywords
- Example: If security concerns arise often without prompts, add security-focused questions

**Pattern 3: Threshold Tuning**
- Uncommitted files threshold (currently 15) - too high or too low?
- Critical items threshold (currently 5) - appropriate for your workflow?

#### 4. Keyword Refinement Log

Document trigger keyword effectiveness here:

```
Date: YYYY-MM-DD
Trigger: \b(api|service|integration)\b
Question: External Dependencies
Observations:
- Triggered appropriately: X times
- False positives: Y times
- Action: [Adjust/Keep/Remove]

Date: YYYY-MM-DD
Trigger: \b(ui|ux|interface)\b
Question: User Experience
Observations:
- Triggered appropriately: X times
- Missed opportunities: Y cases
- Action: [Add keywords/Adjust threshold]
```

#### 5. Recommended Adjustments

After monitoring, common refinements include:

**Add More Specific Triggers:**
```bash
# Security-focused prompts
elif echo "$PROMPT" | grep -qiE '\b(auth|security|crypto|password|token)\b'; then
  CONTEXT+="3. **Security**: Have you considered threat vectors and followed security best practices?"$'\n'
```

**Adjust Thresholds:**
```bash
# More aggressive uncommitted files warning
if [ "$UNCOMMITTED" -gt 10 ]; then  # Changed from 15
```

**Add Domain-Specific Variants:**
```bash
# Mobile-specific question
elif echo "$PROMPT" | grep -qiE '\b(mobile|ios|android|responsive)\b'; then
  CONTEXT+="3. **Mobile UX**: Does this work well on various screen sizes and orientations?"$'\n'
```

#### 6. Quick Feedback Loop

To test keyword changes:
```bash
# Test a specific prompt against the hook
export CLAUDE_PROJECT_DIR="$(pwd)"
echo '{"prompt": "YOUR TEST PROMPT HERE"}' | ./.claude/hooks/prompt-validator.sh | jq -r '.hookSpecificOutput.additionalContext' | grep -A 4 "Critical Reflection"
```

### Metrics to Track (Optional)

If you want quantitative data:
1. Questions asked per session (should be 3 every time)
2. Question relevance rating (1-5 scale, track manually)
3. Times you actually reconsidered approach due to question
4. False positive rate (questions that don't apply)

### Success Criteria

The questions are working well if:
- ✅ They catch 80%+ of important considerations
- ✅ False positive rate < 20%
- ✅ You actually pause to think about them
- ✅ They prevent real issues at least occasionally

### Next Review

Schedule first review: 2 weeks from deployment
- Review this document
- Analyze patterns
- Make 1-3 keyword/threshold adjustments
- Document changes in git commit

---

## Portability Summary

All hooks are **100% project-agnostic** and ready for use in any codebase:

| Hook | Portability | Languages Supported | Status |
|------|------------|---------------------|--------|
| validate-directory-creation.sh | 100% | All | ✅ Production Ready |
| validate-markdown-creation.sh | 100% | All | ✅ Production Ready |
| prompt-validator.sh | 100% | All | ✅ Production Ready |
| session-start.sh | 100% | Node.js, Python, Go, Rust, Ruby, Java | ✅ Production Ready |

### Quick Start for New Projects

1. Copy `.claude/hooks/` directory to your project
2. Ensure hooks are executable: `chmod +x .claude/hooks/*.sh`
3. Configure in `.claude/settings.json` (or let Claude Code auto-detect)
4. Restart Claude Code to activate

**That's it!** The hooks will automatically:
- Detect your project type (Node.js, Python, Go, Rust, Ruby, Java, etc.)
- Check dependencies and show relevant warnings
- Generate contextually appropriate reflection questions
- Enforce directory creation justification
- Restrict markdown file creation to approved locations
- Load project-specific guidelines from CLAUDE.md (if present)

### Testing Portability

Test the hooks work in different project types:

```bash
# Test in a Python project
cd /path/to/python-project
cp -r /path/to/these/hooks .claude/hooks
# Restart Claude Code

# Test in a Go project
cd /path/to/go-project
cp -r /path/to/these/hooks .claude/hooks
# Restart Claude Code
```

The hooks adapt automatically to each project's tech stack.

---

## Meta-Cognition Hook (Transcript Analysis)

### 5. Post-Tool Meta-Cognition
**File**: `posttooluse-metacognition.py`
**Triggers**: PostToolUse (all tools)
**Purpose**: Analyzes Claude's thinking patterns and tool usage to detect high-level reasoning gaps and missed opportunities

### 6. Pre-Tool Pattern Prevention
**File**: `pre-tool-pattern-prevention.sh`
**Triggers**: PreToolUse (all tools)
**Purpose**: Proactively prevents problematic tool usage before execution based on recent conversation patterns

---

## Meta-Cognition System

### Purpose
**Focuses on HIGH-LEVEL reasoning patterns, not syntax reminders.** This system detects when Claude:
- Claims things are impossible without checking available tools
- Hits problems without using Zen MCP or websearch
- Mentions tech without researching latest documentation
- Doesn't think "outside the box" or correlate complex systems

This is about **meta-cognitive awareness** - teaching Claude to recognize when it's missing opportunities.

### How It Works

**PostToolUse Hook** (Meta-Cognition Analysis):
- **Fast Path**: Checks tool name/response without transcript (tool-specific hints)
- **Slow Path**: Analyzes last 20 conversation turns for reasoning patterns
- Detects tool awareness gaps (Playwright, Zen MCP, WebSearch)
- Identifies meta-patterns (impossibility claims, uncertainty without research)
- Limits to top 3 hints to avoid overwhelming Claude

**PreToolUse Hook** (Policy Enforcement):
- Denies policy violations (e.g., WebFetch for browser interaction)
- Asks user approval for repeated TypeScript escape hatches
- Prevents mistakes before they happen

### Meta-Cognitive Patterns Detected

1. **Tool Awareness Gaps** (PostToolUse - REMINDER)
   - Mentions "manual testing" without Playwright MCP
   - Shows uncertainty without using Zen MCP
   - References tech versions without websearch
   - **Action**: Reminds about available tools

2. **Impossibility Claims** (PostToolUse - CHALLENGE)
   - Says "can't", "impossible", "requires manual" without verification
   - **Action**: Challenges to verify available tools first

3. **Uncertainty Without Research** (PostToolUse - SUGGESTION)
   - Says "I think", "probably", "maybe" without consulting resources
   - **Action**: Suggests websearch or Zen MCP consultation

4. **Missing Preventative Thinking** (PostToolUse - NUDGE)
   - Plans to test "after" or "later" instead of designing for testability
   - **Action**: Encourages proactive problem prevention

5. **WebFetch Misuse** (PreToolUse - DENY)
   - WebFetch + browser keywords → Blocks and redirects to Playwright MCP
   - **Action**: Denies tool call, enforces Playwright MCP policy

6. **TypeScript Violations** (PreToolUse - ASK)
   - @ts-ignore/as any (repeated) → Requests user approval
   - **Action**: Asks user to confirm or deny

### Performance
- **Target**: < 200ms per hook
- **Measured**: ~3-5ms per hook
- **Impact**: Zero user-facing delay (40x faster than target)

### Metrics & Monitoring

Pattern detections are logged to `.claude/hook-metrics.log` (if `CLAUDE_PROJECT_DIR` is set):

```
2025-11-02T12:34:56Z | PostToolUse | Read | repeated_errors (count: 3)
2025-11-02T12:35:10Z | PreToolUse | WebFetch | webfetch_misuse_denied
```

Use this log to track effectiveness and tune thresholds.

### Advanced Features

**Thinking Block Analysis** (Optional):
Uncomment the thinking block analysis section in `post-tool-self-correction.sh` to enable meta-level self-correction based on Claude's internal reasoning patterns:

- Detects low confidence ("I'm not sure", "uncertain")
- Identifies doubt patterns ("might not work", "let me try again")
- Provides additional context when Claude is uncertain

### Configuration

**Threshold Tuning**: Edit the hook scripts to adjust pattern thresholds:
- `ERROR_COUNT -ge 3` → Number of repeated errors before blocking
- `MAX_REPETITION -ge 7` → Circular tool usage threshold
- `CORRECTIONS -ge 2` → User correction threshold
- `TS_VIOLATIONS -ge 1` → TypeScript escape hatch threshold

**Pattern Addition**: Add new patterns by following existing pattern structure in hook scripts.

### Files
- `.claude/hooks/posttooluse-metacognition.py` - Meta-cognitive pattern detection (PostToolUse)
- `.claude/hooks/pre-tool-pattern-prevention.sh` - Proactive prevention (PreToolUse)
- `.claude/settings.json` - Hook configuration
- `.claude/hook-metrics.log` - Metrics logging (auto-created)

### Example Scenarios

**Scenario 1: Manual Testing Claim**
```
Claude: "We'll need to manually test the form validation in the browser..."
Hook detects: "testing" + "manual" + "browser" without Playwright mention
Output: "🎭 Playwright MCP Available: You have mcp__playwright__* tools for browser automation..."
```

**Scenario 2: Uncertainty Without Research**
```
Claude: "I think the new Tailwind version might have breaking changes..."
Hook detects: "think" + "Tailwind version" without websearch
Output: "🔍 WebSearch Available: You can search for latest documentation..."
```

**Scenario 3: Problem Without Investigation**
```
Claude encounters error, tries same approach 3 times
Hook detects: Repeated error pattern
Output: "🧘 Zen MCP Available: Consider using debug tool for systematic root cause analysis..."
```

**Scenario 4: Agent/Skill Awareness**
```
Claude: "I need to update the player stats UI component..."
Hook detects: "ui" + "component" keywords match game-ui-designer agent
Output: "🤖 Agent Available: `game-ui-designer` - Expert in game UI/UX design and visual polish

💡 Delegate with: `Task(subagent_type="game-ui-designer", prompt="Your instructions")`"
```

**Scenario 5: Complex Multi-File Task**
```
Claude: "I'll modify the state management in GameState.ts, PlayerStats.tsx, InventorySystem.ts, SaveManager.ts, and LocalStorageHandler.ts..."
Hook detects: 5+ file mentions
Output: "🔀 Complex Task Detected: Modifying 5+ files. Consider creating specialized agent:

💡 `Task(subagent_type="general-purpose", prompt="Specialized task description")`"
```

**Scenario 6: Parallelization Opportunity**
```
Claude: "First I'll update the types, then fix the tests, then update the docs, and then run the build..."
Hook detects: 4 sequential tasks ("then" patterns)
Output: "⚡ Parallelization Opportunity: Multiple sequential tasks detected. Run them in parallel:

💡 Launch multiple Task agents simultaneously (up to 10 parallel)"
```

### Agent/Skill Awareness System

**Added**: 2025-11-02

The meta-cognition hook now includes **agent and skill awareness** to help Claude recognize when to delegate work to specialized agents or create reusable skills.

#### Features

**1. Existing Agent Discovery**
- Automatically scans `.claude/agents/*.md` at startup (cached for performance)
- Extracts agent descriptions from frontmatter
- Matches conversation patterns to suggest relevant agents

**Domain-Specific Agent Triggers:**
- **UI/UX work** → `game-ui-designer`
- **Entity creation** → `entity-creator`
- **State/localStorage issues** → `state-debugger`
- **TypeScript errors** → `strict-typescript-enforcer`
- **Game balance** → `game-balance-auditor`
- **AI integration** → `ai-integration-specialist`

**2. Complexity-Based Agent Creation Suggestions**
- **5+ files being modified** → Suggest creating specialized agent
- **3+ sequential tasks** → Suggest parallel agent execution
- Helps Claude recognize when task complexity justifies delegation

**3. Skill Awareness**
- Automatically scans `.claude/skills/` directories
- Suggests skill creation for repeated workflows
- Lists available skills when patterns detected

**4. Smart Filtering**
- **Skips suggestions** if Claude is already using Task tool (avoids redundancy)
- **Limits to 1 suggestion** per tool call (avoids overwhelming)
- **Cached directory scan** (5-10ms one-time cost, not per-call)

#### Performance Impact

- **Discovery**: ~5-10ms (one-time, cached globally)
- **Pattern matching**: ~2-5ms per tool call
- **Total overhead**: ~7-15ms (negligible, well within budget)

#### Effectiveness Metrics

Track these metrics in `.claude/hook-metrics.log`:
- `agent_skill_discovery` - Number of agents/skills found at startup
- `agent_match_{agent_name}` - Domain-specific agent suggestions
- `complex_multi_file` - Complex task detections
- `parallelization_opportunity` - Parallelization suggestions
- `repeated_workflow` - Skill creation suggestions

**Target Impact:**
- Agent utilization: 5% → 30% (expected increase)
- Better task parallelization for complex multi-step work
- More consistent use of skills for repeated patterns

#### Configuration

**Adjust File Threshold:**
```python
# In detect_agent_opportunities()
if file_mentions >= 5:  # Change this threshold
```

**Adjust Parallelization Threshold:**
```python
# In detect_agent_opportunities()
if task_markers >= 3:  # Change this threshold
```

**Add Custom Agent Patterns:**
```python
# In agent_patterns dict
"your-agent-name": r"\b(keyword1|keyword2|pattern)\b"
```

#### Monitoring

After 2-4 weeks of usage, review metrics to assess:
- **Relevance**: Are agent suggestions helpful?
- **False positives**: Are suggestions triggered inappropriately?
- **Utilization**: Is Claude actually using suggested agents?

Adjust thresholds based on data.

### Troubleshooting

**Hooks not firing:**
1. Restart Claude Code (hooks are loaded at startup)
2. Check `/hooks` menu to verify registration
3. Use `claude --debug` to see hook execution details

**False positives:**
1. Increase thresholds in hook scripts
2. Review `.claude/hook-metrics.log` for patterns
3. Adjust after 50+ detections based on effectiveness

**Performance issues:**
- Hooks run in parallel (all matching hooks execute simultaneously)
- 10s timeout per hook (configurable)
- Gracefully degrades if jq is missing

### Testing

Test the hooks manually:

```bash
# Simulate PostToolUse with repeated error
echo '{"transcript_path": "~/.claude/projects/.../session.jsonl", "tool_name": "Read", "tool_response": {"error": "File not found"}}' | \
  ./.claude/hooks/post-tool-self-correction.sh

# Simulate PreToolUse with WebFetch
echo '{"transcript_path": "~/.claude/projects/.../session.jsonl", "tool_name": "WebFetch", "tool_input": {"url": "example.com"}}' | \
  ./.claude/hooks/pre-tool-pattern-prevention.sh
```

### Best Practices

1. **Start Conservative**: Use default thresholds, monitor effectiveness for 2-4 weeks
2. **Track Metrics**: Enable logging to understand pattern frequency
3. **Iterate Based on Data**: Adjust thresholds after gathering real-world usage data
4. **User Feedback**: After 50 detections, evaluate if patterns are helpful or noisy
5. **Gradual Rollout**: Test in development before production use

### Portability

✅ **100% Project-Agnostic**
- Works in any codebase without modification
- Auto-detects patterns regardless of language or framework
- No dependencies beyond `jq` (with graceful degradation)
- Portable across all Claude Code installations

**To use in a different project:**
```bash
# Copy hooks to new project
cp .claude/hooks/post-tool-self-correction.sh /path/to/other/project/.claude/hooks/
cp .claude/hooks/pre-tool-pattern-prevention.sh /path/to/other/project/.claude/hooks/

# Ensure executable
chmod +x /path/to/other/project/.claude/hooks/*.sh

# Update settings.json with hook configuration
# Restart Claude Code - hooks activate automatically
```

---
