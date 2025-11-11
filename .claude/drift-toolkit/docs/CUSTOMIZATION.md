# Drift Prevention Toolkit - Customization Guide

## Writing Custom Semgrep Rules

### Rule Structure

```yaml
rules:
  - id: unique-rule-id
    mode: search  # or: regex, taint, join
    languages: [javascript, typescript]  # or [generic] for all
    pattern: import ... from 'some-library'
    message: |
      What was detected and why it's a problem

      📖 Reference to ADR or documentation
      💡 Suggested alternative

    severity: ERROR  # or WARNING, INFO
    metadata:
      category: architecture  # for organization
      adr_reference: "ADR-XXX"
```

### Pattern Matching Modes

#### 1. Search Mode (Structural Code Matching)

Best for: Finding specific code patterns

```yaml
# Find all direct localStorage usage
- id: no-direct-localstorage
  mode: search
  languages: [javascript, typescript]
  pattern: localStorage.setItem(...)
  message: Use state abstraction layer instead
  severity: WARNING
```

**Advanced patterns:**

```yaml
# Multiple patterns (OR logic)
pattern-either:
  - pattern: foo()
  - pattern: bar()

# All patterns must match (AND logic)
pattern-all:
  - pattern: foo($X)
  - pattern-not: foo(null)

# Pattern inside another pattern
pattern-inside: |
  function dangerous() {
    ...
  }
```

#### 2. Regex Mode (Text Matching)

Best for: Language-agnostic patterns, comments, strings

```yaml
# Find TODO markers
- id: track-todos
  mode: regex
  languages: [generic]
  pattern-regex: '(TODO|FIXME|HACK):'
  message: Track technical debt in NOTES.md
  severity: INFO
```

#### 3. Metavariables (Capture and Match)

```yaml
# Detect function calls with too many arguments
- id: too-many-arguments
  mode: search
  languages: [javascript, typescript]
  pattern: |
    function $FUNC($A, $B, $C, $D, $E, $F, ...) {
      ...
    }
  message: Function has 6+ parameters - consider using options object
  severity: WARNING
```

---

## Project-Specific Patterns

### Example 1: Enforce Your State Management Pattern

```yaml
# rejected.yaml
rules:
  - id: enforce-game-state-usage
    mode: search
    languages: [javascript, typescript]
    pattern-either:
      - pattern: localStorage.setItem(...)
      - pattern: localStorage.getItem(...)
    paths:
      exclude:
        - "**/lib/game-state.ts"  # Allow in state manager
    message: |
      Direct localStorage detected.

      📖 **ADR-001**: Use loadGameState/saveGameState functions
      ❌ **Rejected**: Direct localStorage access

      See: lib/game-state.ts for proper state management

    severity: ERROR
    metadata:
      adr_reference: "ADR-001"
```

### Example 2: Prevent Architectural Layer Violations

```yaml
# architecture.yaml
rules:
  - id: no-components-import-app
    mode: search
    languages: [javascript, typescript]
    patterns:
      - pattern: import ... from '$PATH'
      - metavariable-regex:
          metavariable: $PATH
          regex: '^(\.\.\/)*app\/'
    paths:
      include:
        - "**/components/**"
    message: |
      Components importing from app/ (layer violation).

      💡 **Fix**: Move shared code to lib/ instead
      📖 **Pattern**: components → lib (not components → app)

    severity: ERROR
```

### Example 3: Enforce Naming Conventions

```yaml
# patterns.yaml
rules:
  - id: component-naming-convention
    mode: search
    languages: [javascript, typescript]
    pattern: |
      export function $FUNC(...) {
        ...
      }
    paths:
      include:
        - "**/components/**"
    metavariable-regex:
      metavariable: $FUNC
      regex: '^[a-z]'  # Starts with lowercase
    message: |
      Component function should start with uppercase.

      💡 **Convention**: PascalCase for React components
      Example: export function UserProfile() { }

    severity: WARNING
```

---

## Path Filtering

### Include/Exclude Patterns

```yaml
rules:
  - id: my-rule
    # ... pattern ...
    paths:
      include:
        - "**/src/**"          # Only in src/
        - "**/components/**"   # Or in components/
      exclude:
        - "**/*test*"          # Skip test files
        - "**/*spec*"          # Skip spec files
        - "**/node_modules/**" # Skip dependencies
```

### Path Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `**` | Any directory depth | `**/src/**` |
| `*` | Any filename | `*.ts` |
| `?` | Single character | `test?.ts` |

---

## Severity Levels

| Severity | When to Use | Blocks Commit? |
|----------|-------------|----------------|
| `ERROR` | Architectural violations, security issues | Yes (if configured) |
| `WARNING` | Code smells, potential issues | No |
| `INFO` | Suggestions, reminders | No |

---

## Testing Your Rules

### Test Individual Rule

```bash
# Test specific rule file
semgrep --config .claude/drift/architecture.yaml src/

# Test specific rule by ID
semgrep --config .claude/drift/ --include-rule no-backend-frameworks src/
```

### Validate Rule Syntax

```bash
# Check if rules are valid
semgrep --validate --config .claude/drift/
```

### Test with Example Code

Create a test file:

```typescript
// test-drift-rules.ts
import express from 'express';  // Should trigger no-backend-frameworks
localStorage.setItem('foo', 'bar');  // Should trigger enforce-state-abstraction
```

Run:

```bash
semgrep --config .claude/drift/ test-drift-rules.ts
```

Expected: 2 violations found

---

## Advanced: Autofix Rules

Some rules can automatically fix violations:

```yaml
rules:
  - id: prefer-const
    mode: search
    languages: [javascript, typescript]
    pattern: let $X = $Y
    fix: const $X = $Y
    message: Use const for variables that don't change
    severity: INFO
    metadata:
      autofix: true
```

Run with autofix:

```bash
semgrep --config .claude/drift/ --autofix src/
```

---

## Performance Optimization

### Rule Performance Tips

1. **Use specific languages**: `languages: [typescript]` faster than `[generic]`
2. **Add path filters**: Reduce files scanned
3. **Avoid complex regex**: Use `mode: search` when possible
4. **Cache results**: Semgrep caches by default

### Profile Rule Performance

```bash
# Show timing per rule
semgrep --config .claude/drift/ --time src/
```

---

## Sharing Rules Across Projects

### Option 1: Copy Entire Toolkit

```bash
cp -r /path/to/project1/.claude/drift-toolkit /path/to/project2/.claude/
cd /path/to/project2
.claude/drift-toolkit/bootstrap.sh
```

### Option 2: Symlink Shared Rules

```bash
# Create shared rules repository
mkdir ~/drift-rules-shared
cp .claude/drift-toolkit/rules/semgrep/*.yaml ~/drift-rules-shared/

# Link in projects
ln -s ~/drift-rules-shared .claude/drift-shared

# Use both project-specific and shared
semgrep --config .claude/drift/ --config .claude/drift-shared/ src/
```

### Option 3: Git Submodule (Teams)

```bash
# In your drift-toolkit repository
git init
git add .
git commit -m "Initial drift toolkit"
git remote add origin <your-repo-url>
git push

# In other projects
git submodule add <drift-toolkit-repo> .claude/drift-toolkit
git submodule init
git submodule update
```

---

## Integration with dependency-cruiser (Node.js)

Edit `.dependency-cruiser.js`:

```javascript
module.exports = {
  forbidden: [
    {
      name: 'my-layer-rule',
      from: { path: '^components/' },
      to: { path: '^app/' },
      severity: 'error'
    }
  ]
};
```

Run:

```bash
npx dependency-cruiser --validate .dependency-cruiser.js src/
```

---

## Best Practices

### 1. Start Small

- Add 1-2 critical rules first
- Test on codebase
- Gradually add more

### 2. Link to Documentation

Always reference ADR.md:

```yaml
message: |
  Problem detected.

  📖 **ADR-XXX**: Link to your decision
```

### 3. Provide Alternatives

```yaml
message: |
  ❌ Don't use X
  ✅ Use Y instead

  Example: [code example]
```

### 4. Tune Severity

- Start with `WARNING`
- Promote to `ERROR` after team agreement

### 5. Regular Review

- Monthly: Review rule violations
- Quarterly: Update rules based on new patterns
- Yearly: Major cleanup

---

## Examples from Real Projects

### Django Project: No Raw SQL

```yaml
- id: no-raw-sql-in-django
  mode: search
  languages: [python]
  pattern-either:
    - pattern: cursor.execute(...)
    - pattern: connection.cursor()
  message: |
    Use Django ORM instead of raw SQL

    📖 Security: Prevents SQL injection
    💡 Use: MyModel.objects.filter(...) instead

  severity: ERROR
```

### React Project: Consistent Imports

```yaml
- id: consistent-react-imports
  mode: search
  languages: [javascript, typescript]
  pattern: |
    import React from 'react'
    import { $X } from 'react'
  message: |
    Inconsistent React imports.

    💡 **Pick one**:
       - import React, { useState } from 'react'  ✅
       - import { useState } from 'react'  ✅

  severity: WARNING
```

---

## Resources

- **Semgrep Registry**: https://semgrep.dev/explore
- **Rule Examples**: https://github.com/semgrep/semgrep-rules
- **Pattern Syntax**: https://semgrep.dev/docs/writing-rules/pattern-syntax
- **Playground**: https://semgrep.dev/playground

---

## Getting Help

1. **Semgrep Playground**: Test patterns interactively
2. **Community Rules**: Search semgrep.dev/explore for similar rules
3. **AI Assistance**: Ask Claude to help write custom rules
