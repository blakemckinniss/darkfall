#!/usr/bin/env python3
import sys
import json
import re

# Read hook input
hook_input = json.loads(sys.stdin.read())
prompt = hook_input.get("prompt", "").lower()

# Defeat patterns - when Claude might claim something is impossible
DEFEAT_PATTERNS = [
    r'\bmanual.*test.*required\b',
    r'\brequires.*user.*intervention\b',
    r'\bcannot.*automate\b',
    r'\bimpossible.*without.*user\b',
    r'\bneed.*human.*to\b',
    r"can'?t.*test.*automatically",
    r'\bunable.*to.*interact\b',
    r'\bno.*way.*to.*automate\b',
    r'\bmanual.*testing.*only\b',
]

# Check if prompt suggests testing/manual work
triggered = any(re.search(pattern, prompt, re.IGNORECASE) for pattern in DEFEAT_PATTERNS)

# Also check for testing-related keywords
testing_keywords = ['test', 'manual', 'ui', 'browser', 'click', 'interact', 'screenshot']
is_testing_related = any(kw in prompt for kw in testing_keywords)

if triggered or (is_testing_related and 'todo' in prompt):
    # Inject tool awareness reminder
    reminder = """
🔧 TOOL AWARENESS REMINDER:
- Playwright MCP (mcp__playwright__*) can automate browser testing, UI interactions, screenshots, form filling, and page validation
- You have FULL browser automation capabilities - do NOT claim manual testing is required
- Check ALL available MCP tools before claiming something requires user intervention
"""
    print(reminder)
    sys.exit(0)

# No intervention needed
sys.exit(0)
