# Drift Prevention Toolkit - Setup Guide

## Quick Start (30 seconds)

```bash
cd /path/to/your/project
/path/to/drift-toolkit/bootstrap.sh
```

That's it! The toolkit is now installed.

---

## What Gets Installed

### 1. Tools

**Semgrep** (all projects):
- Multi-language static analysis (30+ languages)
- Pattern-based rule matching
- Fast (<5s for most files)

**ESLint** (Node.js/TypeScript projects only):
- JavaScript/TypeScript linting
- Custom rule support

**dependency-cruiser** (Node.js/TypeScript projects only):
- Module boundary enforcement
- Circular dependency detection

### 2. Configuration Files

Created in your project:

```
.claude/
├── drift/
│   ├── architecture.yaml      # Architectural constraint rules
│   ├── patterns.yaml           # Code quality anti-patterns
│   └── rejected.yaml           # Your project's rejected approaches
└── hooks/
    ├── drift-detector.py       # Runs Semgrep on code changes
    └── drift-awareness.sh      # Pre-execution warnings
```

**Node.js projects also get:**
```
.dependency-cruiser.js          # Module boundary config
```

### 3. Claude Code Hooks

Two hooks are installed but **not automatically activated**:

1. **drift-detector.py** (PostToolUse)
   - Runs Semgrep when you write/edit code
   - Shows violations inline

2. **drift-awareness.sh** (UserPromptSubmit)
   - Warns about drift risks before execution
   - Checks prompt against rejected patterns

---

## Activating the Hooks

### Manual Activation (Recommended)

Add to your `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/drift-detector.py",
        "timeout": 5,
        "matchers": ["Write", "Edit", "MultiEdit"]
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/drift-awareness.sh",
        "timeout": 2
      }
    ]
  }
}
```

### Restart Claude Code

Hooks only activate after restarting Claude Code.

---

## Customization

### Step 1: Define Rejected Approaches

Edit `.claude/drift/rejected.yaml`:

```yaml
rules:
  - id: no-redux-in-this-project
    pattern: import ... from 'react-redux'
    message: |
      📖 ADR-004: This project uses Zustand, not Redux

    severity: ERROR
```

Link rules to your ADR.md (Architecture Decision Records).

### Step 2: Test Your Rules

Run Semgrep manually:

```bash
# Check single file
semgrep --config .claude/drift/ src/components/MyComponent.tsx

# Check entire codebase
semgrep --config .claude/drift/ src/

# Auto-fix (where possible)
semgrep --config .claude/drift/ --autofix src/
```

### Step 3: Add to CI/CD (Optional)

```yaml
# .github/workflows/drift-check.yml
name: Drift Detection

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Semgrep
        run: |
          pip install semgrep
          semgrep --config .claude/drift/ src/
```

---

## Verifying Installation

### Check Tool Installation

```bash
# Semgrep
semgrep --version

# ESLint (Node.js projects)
npx eslint --version

# dependency-cruiser (Node.js projects)
npx dependency-cruiser --version
```

### Check Configuration Files

```bash
ls -la .claude/drift/
# Should show: architecture.yaml, patterns.yaml, rejected.yaml

ls -la .claude/hooks/
# Should show: drift-detector.py, drift-awareness.sh
```

### Test Hooks (Manual)

```bash
# Test drift-detector.py
echo '{"tool_name": "Write", "tool_input": {"file_path": "test.ts"}}' | \
  ./.claude/hooks/drift-detector.py

# Test drift-awareness.sh
echo '{"prompt": "add express backend"}' | \
  ./.claude/hooks/drift-awareness.sh
```

---

## Troubleshooting

### Semgrep Not Found

```bash
# Install with pip
pip install semgrep

# Or with pipx (isolated)
pipx install semgrep

# Verify
which semgrep
```

### Hooks Not Firing

1. **Check settings.json**: Ensure hooks are added
2. **Restart Claude Code**: Hooks load at startup
3. **Check permissions**: `chmod +x .claude/hooks/*.sh .claude/hooks/*.py`
4. **Test manually**: Run hook scripts directly (see above)

### No Violations Detected

If rules aren't catching anything:

1. **Test rule syntax**: `semgrep --config .claude/drift/ --test`
2. **Check file paths**: Rules may have path filters
3. **Review severity**: INFO/WARNING don't block, only ERROR does

### Performance Issues

If hooks are slow (>5s):

1. **Reduce rule scope**: Add path filters to rules
2. **Increase timeout**: Change `"timeout": 5` to `10` in settings.json
3. **Disable heavy rules**: Comment out complex patterns in YAML

---

## Next Steps

1. ✅ **Customize rejected.yaml** with your ADR decisions
2. ✅ **Test rules** on existing codebase (`semgrep --config .claude/drift/ src/`)
3. ✅ **Commit configuration** to git
4. ✅ **Share with team** (if applicable)

See [CUSTOMIZATION.md](./CUSTOMIZATION.md) for advanced rule writing.
