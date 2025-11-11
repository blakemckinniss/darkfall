#!/bin/bash
# Drift Prevention Toolkit - Bootstrap Script
# Ultra-portable: Copy this entire directory to any project and run this script

set -e

echo "🚀 Drift Prevention Toolkit Setup"
echo "=================================="
echo ""

# Detect project root (where .claude/ exists or should be created)
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Detect project type
detect_project_type() {
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        echo "nodejs"
    elif [ -f "$PROJECT_ROOT/requirements.txt" ] || [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
        echo "python"
    elif [ -f "$PROJECT_ROOT/go.mod" ]; then
        echo "go"
    elif [ -f "$PROJECT_ROOT/Cargo.toml" ]; then
        echo "rust"
    elif [ -f "$PROJECT_ROOT/Gemfile" ]; then
        echo "ruby"
    elif [ -f "$PROJECT_ROOT/pom.xml" ] || [ -f "$PROJECT_ROOT/build.gradle" ]; then
        echo "java"
    else
        echo "generic"
    fi
}

PROJECT_TYPE=$(detect_project_type)
echo "✓ Detected: $PROJECT_TYPE project"
echo ""

# Install Semgrep (works for all languages)
echo "📦 Installing drift detection tools..."
echo "  - Semgrep (multi-language static analysis)"

if command -v pip3 &> /dev/null; then
    pip3 install --user semgrep 2>/dev/null || echo "    ⚠️ Semgrep install failed (may already be installed)"
elif command -v pip &> /dev/null; then
    pip install --user semgrep 2>/dev/null || echo "    ⚠️ Semgrep install failed (may already be installed)"
else
    echo "    ⚠️ pip not found - please install Semgrep manually: pip install semgrep"
fi

# Language-specific tools
case $PROJECT_TYPE in
    nodejs)
        echo "  - ESLint (JS/TS linting)"
        if command -v npm &> /dev/null; then
            npm install -D eslint @eslint/js 2>/dev/null || echo "    ⚠️ ESLint install failed"
        elif command -v pnpm &> /dev/null; then
            pnpm add -D eslint @eslint/js 2>/dev/null || echo "    ⚠️ ESLint install failed"
        fi

        echo "  - dependency-cruiser (module boundaries)"
        if command -v npm &> /dev/null; then
            npm install -D dependency-cruiser 2>/dev/null || echo "    ⚠️ dependency-cruiser install failed"
        elif command -v pnpm &> /dev/null; then
            pnpm add -D dependency-cruiser 2>/dev/null || echo "    ⚠️ dependency-cruiser install failed"
        fi
        ;;
esac

echo ""
echo "🔗 Setting up Claude Code hooks..."

# Create .claude directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/.claude/hooks"

# Copy hooks to .claude/hooks/
cp "$(dirname "$0")/hooks/drift-detector.py" "$PROJECT_ROOT/.claude/hooks/"
cp "$(dirname "$0")/hooks/drift-awareness.sh" "$PROJECT_ROOT/.claude/hooks/"
chmod +x "$PROJECT_ROOT/.claude/hooks/"*.sh
chmod +x "$PROJECT_ROOT/.claude/hooks/"*.py

echo "  ✓ Copied drift-detector.py (PostToolUse hook)"
echo "  ✓ Copied drift-awareness.sh (UserPromptSubmit hook)"

echo ""
echo "⚙️ Creating project configuration..."

# Create drift config directory
mkdir -p "$PROJECT_ROOT/.claude/drift"

# Copy Semgrep rule templates
cp "$(dirname "$0")/rules/semgrep/architecture.yaml" "$PROJECT_ROOT/.claude/drift/"
cp "$(dirname "$0")/rules/semgrep/patterns.yaml" "$PROJECT_ROOT/.claude/drift/"
cp "$(dirname "$0")/rules/semgrep/rejected.yaml.template" "$PROJECT_ROOT/.claude/drift/rejected.yaml"

echo "  ✓ Created .claude/drift/ with rule templates"

# Copy dependency-cruiser config if Node.js project
if [ "$PROJECT_TYPE" = "nodejs" ]; then
    cp "$(dirname "$0")/rules/dependency-cruiser/template.js" "$PROJECT_ROOT/.dependency-cruiser.js"
    echo "  ✓ Created .dependency-cruiser.js config"
fi

echo ""
echo "📝 Hook integration instructions:"
echo ""
echo "Add these hooks to your .claude/settings.json:"
echo ""
echo '{
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
}'
echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .claude/drift/rejected.yaml with your ADR constraints"
echo "2. Test: semgrep --config .claude/drift/ src/"
echo "3. Restart Claude Code to activate hooks"
echo "4. See drift-toolkit/docs/CUSTOMIZATION.md for adding project-specific rules"
echo ""
