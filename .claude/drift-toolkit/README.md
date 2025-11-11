# 🛡️ Drift Prevention Toolkit

**Ultra-portable architectural drift detection for AI-assisted development**

Prevent AI coding agents from introducing architectural anti-patterns by enforcing your project's design decisions through automated static analysis.

---

## 🎯 Problem

AI coding agents suffer from "amnesia" - each session lacks awareness of:
- Historical architectural decisions (ADR.md)
- Established code patterns
- Previously rejected approaches
- Accumulated technical debt

This leads to **architectural drift**: slow erosion of design principles over time.

---

## ✨ Solution

A **copy-paste-ready toolkit** that:

✅ **Detects drift automatically** - Runs on every code change
✅ **Enforces your ADRs** - Links violations to architecture decisions
✅ **Works everywhere** - 30+ languages, any project
✅ **30-second setup** - One command, fully bootstrapped
✅ **Zero maintenance** - Self-contained, portable

---

## 🚀 Quick Start

```bash
# 1. Copy this directory to your project
cp -r /path/to/drift-toolkit /your/project/.claude/

# 2. Run bootstrap script
cd /your/project
.claude/drift-toolkit/bootstrap.sh

# 3. Customize your rejected approaches
vim .claude/drift/rejected.yaml

# 4. Restart Claude Code
```

**That's it!** Drift detection is now active.

---

## 📦 What's Included

### Tools (Installed Automatically)

- **Semgrep**: Multi-language static analysis (30+ languages)
- **ESLint**: JavaScript/TypeScript linting (optional)
- **dependency-cruiser**: Module boundary enforcement (optional)

### Configuration Templates

- `architecture.yaml` - Backend/database/layering rules
- `patterns.yaml` - Code quality anti-patterns
- `rejected.yaml.template` - Your project's ADR enforcement

### Claude Code Hooks

- `drift-detector.py` - Runs Semgrep on code changes
- `drift-awareness.sh` - Pre-execution warnings

### Documentation

- `docs/SETUP.md` - Installation and activation guide
- `docs/CUSTOMIZATION.md` - Writing custom rules

---

## 🎨 Features

### Architectural Constraint Enforcement

```yaml
# Example: Enforce client-side only architecture
rules:
  - id: no-backend-frameworks
    pattern: import ... from 'express'
    message: |
      📖 ADR-001: This project uses client-side only architecture
      ❌ Rejected: Backend frameworks (reason: simplicity, zero costs)
    severity: ERROR
```

### Pattern Consistency Detection

Catches when AI solves the same problem differently:

- Multiple error handling patterns
- Inconsistent state management
- Divergent naming conventions

### Technical Debt Tracking

Monitors accumulation of:
- TODO/FIXME markers
- Magic numbers
- Commented-out code
- Console.log in production

### Layer Violation Prevention

Enforces architectural boundaries:

```
app/ ✅ → components/ ✅ → lib/
app/ ✅ → lib/
components/ ❌ → app/  (BLOCKED)
```

---

## 📖 Example Rules

### Enforce State Management Pattern

```yaml
- id: use-state-abstraction
  pattern: localStorage.setItem(...)
  paths:
    exclude: ["**/lib/game-state.ts"]
  message: |
    Use saveGameState() instead of direct localStorage

    See: lib/game-state.ts
```

### Prevent Rejected Libraries

```yaml
- id: no-redux
  pattern: import ... from 'react-redux'
  message: |
    📖 ADR-004: This project uses Zustand, not Redux
    ❌ Rejected: Redux (too complex for solo developer)
```

### Catch Code Smells

```yaml
- id: magic-numbers
  pattern-regex: '\b\d{3,}\b'
  message: Extract to named constant
  severity: INFO
```

---

## 🔧 Usage

### Automatic (via Hooks)

Violations appear inline when you write code:

```
⚠️ Drift Detected: 2 violation(s) in UserService.ts

  🚫 no-backend-frameworks (line 5): Backend framework detected...
  ⚠️ use-state-abstraction (line 12): Direct localStorage access...

💡 Run `semgrep --config .claude/drift/ src/` for full details
```

### Manual (CLI)

```bash
# Check single file
semgrep --config .claude/drift/ src/MyComponent.tsx

# Check entire codebase
semgrep --config .claude/drift/ src/

# Auto-fix (where possible)
semgrep --config .claude/drift/ --autofix src/
```

---

## 🌍 Portability

**Works in ANY project without modification:**

| Feature | Portability |
|---------|-------------|
| **Languages** | 30+ (JS, TS, Python, Go, Rust, Java, Ruby, etc.) |
| **Frameworks** | All (React, Vue, Django, Rails, etc.) |
| **Project Size** | Any (solo to enterprise) |
| **Setup Time** | 30 seconds |
| **Dependencies** | Only Semgrep (pip install semgrep) |

**Copy to multiple projects:**

```bash
for project in ~/projects/*; do
  cp -r .claude/drift-toolkit "$project/.claude/"
  (cd "$project" && .claude/drift-toolkit/bootstrap.sh)
done
```

---

## 📚 Documentation Structure

```
drift-toolkit/
├── README.md              # You are here
├── bootstrap.sh           # One-command setup
├── rules/
│   ├── semgrep/          # Language-agnostic rules
│   └── dependency-cruiser/ # Module boundary rules
├── hooks/                 # Claude Code integration
└── docs/
    ├── SETUP.md          # Installation guide
    └── CUSTOMIZATION.md  # Writing custom rules
```

---

## 🎯 Philosophy

### Design Principles

1. **Portability First** - Works anywhere, no configuration
2. **Low Maintenance** - Set it and forget it
3. **Human-Friendly** - Rules reference ADRs with clear messaging
4. **Graceful Degradation** - Never blocks workflow
5. **Solo Developer Friendly** - No enterprise complexity

### What This Is NOT

❌ **Not** a replacement for code review
❌ **Not** a linter for syntax errors
❌ **Not** a testing framework
❌ **Not** a CI/CD pipeline

✅ **Is** architectural guardrails for AI coding
✅ **Is** ADR enforcement automation
✅ **Is** drift detection early warning system

---

## 🤝 Contributing (Portable)

Since this toolkit is designed to be copied between projects:

1. **Improve in one project** - Make changes in `.claude/drift-toolkit/`
2. **Test thoroughly** - Ensure rules work across multiple codebases
3. **Sync to others** - Copy updated toolkit to other projects
4. **Share improvements** - Commit to shared repository (optional)

### Rule Contribution Guidelines

- **Be specific** - Link to ADR.md decisions
- **Provide examples** - Show what to do instead
- **Test widely** - Verify across different languages/frameworks
- **Keep portable** - Avoid project-specific assumptions

---

## 📊 Metrics

Track effectiveness over time:

```bash
# Violation count per category
semgrep --config .claude/drift/ --metrics src/

# Track over time
echo "$(date),$(semgrep --config .claude/drift/ src/ | wc -l)" >> drift-metrics.csv
```

---

## 🛠️ Troubleshooting

### Semgrep Not Found

```bash
pip install semgrep
# or
pipx install semgrep
```

### Hooks Not Firing

1. Check `.claude/settings.json` has hook configurations
2. Restart Claude Code
3. Verify permissions: `chmod +x .claude/hooks/*.{sh,py}`

### No Violations Detected

1. Check rule syntax: `semgrep --validate --config .claude/drift/`
2. Test manually: `semgrep --config .claude/drift/ test-file.ts`
3. Review path filters in rules

See [docs/SETUP.md](docs/SETUP.md#troubleshooting) for more.

---

## 📄 License

Copy freely! This toolkit is designed to be portable and reusable.

---

## 🙏 Credits

Built on:
- [Semgrep](https://semgrep.dev) - Multi-language static analysis
- [ESLint](https://eslint.org) - JavaScript linting
- [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) - Module boundaries

Inspired by architectural drift problems in AI-assisted development.

---

## 🚦 Status

**Production Ready** ✅

- ✅ Tested across Node.js, Python, Go projects
- ✅ 30+ language support via Semgrep
- ✅ Self-contained, no external dependencies
- ✅ Documentation complete
- ✅ Bootstrap automation working

---

## 📞 Support

This is a **portable, standalone toolkit** - no centralized support needed.

For questions:
1. See [docs/SETUP.md](docs/SETUP.md)
2. See [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md)
3. Search [Semgrep docs](https://semgrep.dev/docs)
4. Ask your AI assistant (Claude, etc.)

---

**Happy drift-free coding! 🚀**
