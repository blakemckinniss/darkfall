#!/usr/bin/env python3
"""
Fast task classification for tool planning hook.
Reuses classification logic from confidence-classifier for consistency.
"""
import re
import sys


def classify_task(prompt: str) -> str:
    """
    Classify task into: atomic, routine, complex, risky, open_world

    This mirrors the logic in confidence-classifier.sh for consistency.
    Target: < 50ms execution time
    """
    prompt_lower = prompt.lower()

    # RISKY: Production, deployment, migration, destructive operations
    risky_patterns = r'\b(production|prod|deploy|migration|database|drop|delete|rm -rf|irreversible)\b'
    if re.search(risky_patterns, prompt_lower):
        return "risky"

    # OPEN_WORLD: External APIs, research, web scraping, new tech
    open_world_patterns = r'\b(api|external|integration|research|investigate|explore|new|latest|web|fetch|scrape)\b'
    if re.search(open_world_patterns, prompt_lower):
        return "open_world"

    # COMPLEX: Refactoring, architecture, multi-step, system-wide changes
    complex_patterns = r'\b(refactor|architecture|redesign|migrate|restructure|optimize|performance)\b'
    if re.search(complex_patterns, prompt_lower):
        return "complex"

    # ATOMIC: Simple queries, documentation, explanations (no implementation)
    atomic_patterns = r'\b(what|how|explain|describe|define|list|show)\b'
    no_implementation = r'\b(implement|build|create|add|modify)\b'
    if re.search(atomic_patterns, prompt_lower) and not re.search(no_implementation, prompt_lower):
        return "atomic"

    # Default: ROUTINE
    return "routine"


if __name__ == "__main__":
    # Read prompt from stdin or command line
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = sys.stdin.read().strip()

    print(classify_task(prompt))
