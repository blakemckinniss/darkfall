---
argument-hint: [section | all]
description: Execute tasks from docs/TODO.md systematically
---

# Execute TODO Tasks

Systematically work through `/home/devcontainers/workspace/blackfell/docs/TODO.md` to complete planned implementation tasks.

## Quick Reference

```bash
# Read TODO.md to understand structure
/todo

# Execute a specific section/phase by name or number
/todo prereq
/todo 1a
/todo phase-2
/todo "Critical Fixes"

# Execute everything in order
/todo all
```

## How It Works

This command is **completely agnostic** to what's in TODO.md. It dynamically reads the file and helps you execute whatever tasks are documented there.

### First Time Using This Command?

**Step 1: Read TODO.md**
```bash
/todo
# Without arguments, I'll read docs/TODO.md and explain the structure
```

**Step 2: Execute sections**
```bash
/todo <section-name>
# I'll find that section in TODO.md and execute the tasks
```

**Step 3: Complete everything**
```bash
/todo all
# I'll execute all sections in order
```

## Your Task (Implementation)

Parse the argument `$ARGUMENTS` to determine execution:

### Available Arguments:
- **No argument** - Read and explain docs/TODO.md structure
- **Section name** - Execute specific section from TODO.md (e.g., "prereq", "1a", "phase-2", "Critical Fixes")
- **`all`** - Execute all sections in TODO.md order

### Implementation Steps:

#### 1. No Argument: Read TODO.md

**If `$ARGUMENTS` is empty:**

1. **Read docs/TODO.md:**
   ```
   Read /home/devcontainers/workspace/blackfell/docs/TODO.md
   ```

2. **Analyze the structure:**
   - Identify major sections (headings, phases, steps)
   - Note any prerequisites or dependencies
   - Find time estimates and priorities
   - Locate "Start Here" or introduction sections

3. **Present to user:**
   - Summarize what TODO.md contains
   - List available sections/phases by name
   - Show how to execute each section
   - Note total estimated time
   - Highlight any immediate priorities

4. **Example output:**
   ```
   docs/TODO.md contains the following structure:

   Prerequisites (30 mins)
   - Linting checks
   - Git status verification
   - Documentation reading

   Phase 1A: Feature X (30 mins) ⭐ IMMEDIATE
   - Task 1
   - Task 2

   Phase 1B: Feature Y (2 hours) ⭐ HIGH
   - Task 3
   - Task 4

   Run:
   /todo prereq        → Execute prerequisites
   /todo 1a            → Execute Phase 1A
   /todo 1b            → Execute Phase 1B
   /todo all           → Execute everything in order
   ```

#### 2. Section Name: Execute Specific Section

**If `$ARGUMENTS` contains a section name:**

1. **Read docs/TODO.md:**
   - Find the section matching the argument
   - Match flexibly: "prereq", "Prerequisites", "Phase 1A", "1a" should all work
   - Case-insensitive matching

2. **Extract section content:**
   - Get all tasks, checklists, instructions under that section
   - Note any dependencies or prerequisites mentioned
   - Find file locations and code references
   - Identify success criteria or testing requirements

3. **Create TodoWrite task list:**
   - Break down section into actionable items
   - Use checklist items from TODO.md directly
   - Track progress with in_progress and completed states

4. **Execute the section:**
   - Follow instructions in TODO.md exactly
   - Complete each task/checklist item
   - Mark completed in TodoWrite as you go
   - Test after completing (if testing section exists)
   - Document what was accomplished

5. **After completion:**
   - State final confidence (0-100%)
   - Provide mandatory sections (Documentation, Debt, Next Steps)
   - Auto-log critical items (🔴/⭐ 76-100) to NOTES.md

#### 3. All: Execute Everything

**If `$ARGUMENTS` is "all":**

1. **Read docs/TODO.md:**
   - Identify all major sections in order
   - Note dependencies between sections
   - Calculate total estimated time

2. **Create comprehensive TodoWrite:**
   - Add all sections as separate todos
   - Mark dependencies clearly
   - Show total checklist count

3. **Execute in order:**
   - Complete each section sequentially
   - Mark each section complete before moving to next
   - Check for blocking issues after each section
   - Document cumulative progress
   - Run tests after each section (if specified)

4. **After all sections complete:**
   - Provide comprehensive summary
   - State final confidence
   - Document all changes made
   - Identify any incomplete items
   - Suggest next steps beyond TODO.md

### Important Guidelines

#### Before Starting ANY Section:

1. ✅ **State Initial Confidence (0-100%)**
   - If < 90%, consult Zen MCP with websearch enabled
   - Read TODO.md thoroughly for context

2. ✅ **Check Prerequisites**
   - If TODO.md has a prerequisites section, verify it's complete
   - Don't skip ahead to implementation sections

3. ✅ **Verify File Locations**
   - Confirm files referenced in TODO.md exist
   - Use Read tool to understand current state

#### During Execution:

1. ✅ **Use TodoWrite for Tracking**
   - Create todos for each major task in section
   - Mark in_progress before starting
   - Mark completed immediately after finishing

2. ✅ **Follow TODO.md Instructions Exactly**
   - Don't improvise or skip steps
   - If TODO.md says "read X first", do it
   - If TODO.md has code snippets, use them

3. ✅ **Test After Each Section**
   - If TODO.md has testing checklists, complete them
   - Run type check and lint if applicable
   - Manual testing as specified

#### After Completing Section:

1. ✅ **State Final Confidence (0-100%)**
   - If < 90%, validate with Zen MCP

2. ✅ **Provide Mandatory Sections:**
   - 📚 Documentation Updates Required
   - ⚠️ Technical Debt & Risks
   - 🎯 Next Steps & Considerations

3. ✅ **Auto-Log Critical Items (🔴/⭐ 76-100) to NOTES.md**

## Flexibility and Adaptability

This command works with **any TODO.md structure**:

- ✅ Phased implementations (Phase 1, Phase 2, etc.)
- ✅ Feature-based sections (Authentication, Payment, etc.)
- ✅ Priority-based lists (High Priority, Medium Priority)
- ✅ Checklist-style tasks
- ✅ Narrative documentation with embedded tasks
- ✅ Hybrid structures

**The command adapts to whatever is in TODO.md** - it doesn't enforce a specific format.

## Section Matching Examples

The command should match section names flexibly:

```
TODO.md has: "## Phase 1A: Portal Progress Tracking"

These should all work:
/todo 1a
/todo phase-1a
/todo "Phase 1A"
/todo "portal progress"
/todo "Progress Tracking"
```

```
TODO.md has: "## Prerequisites & Setup"

These should all work:
/todo prereq
/todo prerequisites
/todo "Prerequisites & Setup"
/todo setup
```

**Matching logic:**
- Case-insensitive
- Partial matches OK (if unambiguous)
- Remove special characters for matching
- Match heading text or common abbreviations

## Why Use `/todo`?

- **🎯 Project-Agnostic** - Works with any TODO.md content, any project
- **📋 Documentation-Driven** - TODO.md is source of truth, not the command
- **♻️ Reusable** - Won't become obsolete when current tasks complete
- **⚡ Efficient** - Clear structure, automatic progress tracking
- **🔄 Flexible** - Adapts to any TODO.md format
- **📚 Self-Documenting** - Run `/todo` to see what's available

## Tips for Writing Good TODO.md Files

To get the most value from `/todo`, structure TODO.md with:

1. **Clear Sections** - Use headings (##) for major phases/features
2. **Time Estimates** - Include estimated time per section
3. **Prerequisites** - Document what must be done first
4. **Checklists** - Use `- [ ]` for actionable items
5. **File References** - Specify exact file paths and line numbers
6. **Success Criteria** - Define what "done" means
7. **Testing Steps** - Include validation/testing checklists
8. **Dependencies** - Note which sections depend on others

**Good TODO.md example:**
```markdown
# Feature Implementation TODO

**Total Time:** 6 hours
**Status:** Ready to start

## Prerequisites (30 mins)
- [ ] Fix linting errors
- [ ] Commit uncommitted changes
- [ ] Read docs/ADR.md section X

## Phase 1: Core Logic (2 hours)
**Files:** lib/feature.ts, components/ui.tsx
**Dependencies:** Prerequisites complete

- [ ] Implement core function
- [ ] Add type definitions
- [ ] Write unit tests

Testing:
- [ ] Unit tests pass
- [ ] Type check clean

## Phase 2: UI Integration (3 hours)
**Files:** components/ui.tsx, app/page.tsx
**Dependencies:** Phase 1 complete

- [ ] Create UI component
- [ ] Wire to core logic
- [ ] Add styling

Testing:
- [ ] Manual testing
- [ ] Responsive design check
```

## Common Workflows

### Starting Fresh with TODO.md
```bash
# See what's in TODO.md
/todo

# Start with prerequisites
/todo prereq

# Then execute first phase
/todo 1
```

### Resuming Work
```bash
# Read TODO.md to remember structure
/todo

# Jump to specific section you're working on
/todo 3b
```

### Bulk Execution
```bash
# Execute everything at once
/todo all
# Takes total estimated time from TODO.md
```

---

**Last Updated:** 2025-11-02
**Command Type:** Generic, reusable across all projects
**TODO.md Location:** `/home/devcontainers/workspace/blackfell/docs/TODO.md`
