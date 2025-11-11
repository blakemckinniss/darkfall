#!/usr/bin/env python3
"""
Drift Detector Hook - PORTABLE VERSION
Detects architectural drift using Semgrep rules

Triggers: PostToolUse (Write, Edit, MultiEdit)
Purpose: Run Semgrep checks on changed files to detect drift

Ultra-portable: Works in any project with Semgrep installed
"""
import subprocess
import sys
import json
from pathlib import Path
from typing import List, Dict, Optional

def find_project_root() -> Optional[Path]:
    """Find project root by looking for .claude directory"""
    current = Path.cwd()

    # Try environment variable first
    if "CLAUDE_PROJECT_DIR" in os.environ:
        return Path(os.environ["CLAUDE_PROJECT_DIR"])

    # Walk up directory tree
    while current != current.parent:
        if (current / ".claude").exists():
            return current
        current = current.parent

    # Fallback to current directory
    return Path.cwd()

def run_semgrep(file_path: str, config_dir: Path) -> List[Dict]:
    """
    Run Semgrep on a single file

    Returns list of violations (empty if none or error)
    """
    if not config_dir.exists():
        return []  # No drift config = skip silently

    try:
        result = subprocess.run(
            ["semgrep", "--config", str(config_dir), "--json", "--quiet", file_path],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0 or result.returncode == 1:  # 1 = findings found
            data = json.loads(result.stdout)
            return data.get("results", [])

    except subprocess.TimeoutExpired:
        # Timeout - skip silently
        return []
    except FileNotFoundError:
        # Semgrep not installed - skip silently
        return []
    except json.JSONDecodeError:
        # Invalid JSON - skip silently
        return []
    except Exception:
        # Any other error - skip silently
        return []

    return []

def format_violation(violation: Dict) -> str:
    """Format a single Semgrep violation for display"""
    check_id = violation.get("check_id", "unknown")
    message = violation.get("extra", {}).get("message", "No message")
    severity = violation.get("extra", {}).get("severity", "INFO")
    line = violation.get("start", {}).get("line", "?")

    # Extract just the rule ID (remove path prefix)
    rule_id = check_id.split(".")[-1]

    # Emoji based on severity
    emoji = {
        "ERROR": "🚫",
        "WARNING": "⚠️",
        "INFO": "ℹ️"
    }.get(severity.upper(), "•")

    # Format: emoji rule_id (line X): first line of message
    first_line = message.split("\n")[0].strip()
    return f"{emoji} {rule_id} (line {line}): {first_line}"

def main():
    """Main hook entry point"""
    try:
        # Read hook input from stdin
        input_data = json.load(sys.stdin)

        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        # Only run on Write/Edit operations
        if tool_name not in ["Write", "Edit", "MultiEdit"]:
            output = {"hookSpecificOutput": {"additionalContext": ""}}
            print(json.dumps(output))
            return

        # Get file path from tool input
        file_path = tool_input.get("file_path", "")
        if not file_path or not Path(file_path).exists():
            output = {"hookSpecificOutput": {"additionalContext": ""}}
            print(json.dumps(output))
            return

        # Find project root and config directory
        project_root = find_project_root()
        config_dir = project_root / ".claude/drift"

        # Run Semgrep
        violations = run_semgrep(file_path, config_dir)

        # Format output
        if violations:
            guidance = f"\n⚠️ **Drift Detected**: {len(violations)} violation(s) in {Path(file_path).name}\n\n"

            # Show up to 3 violations
            for v in violations[:3]:
                guidance += f"  {format_violation(v)}\n"

            if len(violations) > 3:
                guidance += f"\n  ... and {len(violations) - 3} more\n"

            guidance += f"\n💡 Run `semgrep --config .claude/drift/ {file_path}` for full details\n"

            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": guidance
                }
            }
        else:
            # No violations
            output = {"hookSpecificOutput": {"additionalContext": ""}}

        print(json.dumps(output))

    except Exception as e:
        # Graceful failure - never block the user
        output = {"hookSpecificOutput": {"additionalContext": ""}}
        print(json.dumps(output))
        sys.exit(0)

if __name__ == "__main__":
    import os  # Import here to avoid issues if not needed
    main()
