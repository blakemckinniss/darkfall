#!/usr/bin/env python3
"""
Task Classification with Zen MCP Integration

Two-tier strategy:
1. Fast Path: Heuristic pattern matching (< 50ms) for clear-cut cases
2. Slow Path: Zen MCP consultation for uncertain/ambiguous prompts

Continuation ID Strategy (per ADR-CC001):
- Fresh continuation_id per prompt (strict isolation)
- NO reuse across prompts to prevent classification bias
- Single-turn operation (no conversation)
"""

import hashlib
import re
import sys
from typing import Optional, Tuple
from pathlib import Path


class TaskClassifierZen:
    """
    Task classifier with optional Zen MCP fallback for uncertain cases

    Usage:
        classifier = TaskClassifierZen(working_directory="/path/to/project")
        task_class, confidence = classifier.classify("Implement user authentication")
    """

    # Classification thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.9  # Use heuristic result
    LOW_CONFIDENCE_THRESHOLD = 0.5   # Consult Zen MCP

    def __init__(self, working_directory: str, enable_zen_fallback: bool = False):
        """
        Initialize task classifier

        Args:
            working_directory: Absolute path to project directory
            enable_zen_fallback: Enable Zen MCP consultation for uncertain cases (default: False)
        """
        self.working_directory = working_directory
        self.enable_zen_fallback = enable_zen_fallback
        self._zen_mcp_available = self._check_zen_mcp_availability()

    def _check_zen_mcp_availability(self) -> bool:
        """Check if Zen MCP is available in current context"""
        try:
            return 'mcp__zen__chat' in dir()
        except:
            return False

    def classify(self, prompt: str) -> Tuple[str, float]:
        """
        Classify task with confidence score

        Args:
            prompt: User prompt to classify

        Returns:
            Tuple of (task_class, confidence_score)
            - task_class: atomic, routine, complex, risky, open_world
            - confidence_score: 0.0-1.0
        """
        # Fast path: Heuristic classification
        task_class, confidence = self._classify_heuristic(prompt)

        # High confidence in heuristic result - return immediately
        if confidence >= self.HIGH_CONFIDENCE_THRESHOLD:
            return task_class, confidence

        # Low confidence and Zen MCP enabled - consult for better classification
        if confidence < self.LOW_CONFIDENCE_THRESHOLD and self.enable_zen_fallback:
            if self._zen_mcp_available:
                try:
                    zen_class, zen_confidence = self._classify_via_zen_mcp(prompt)
                    return zen_class, zen_confidence
                except Exception as e:
                    # Fallback to heuristic on error
                    print(f"Warning: Zen MCP classification failed: {e}", file=sys.stderr)
                    return task_class, confidence

        # Medium confidence or Zen MCP disabled - use heuristic
        return task_class, confidence

    def _classify_heuristic(self, prompt: str) -> Tuple[str, float]:
        """
        Fast heuristic classification with confidence estimation

        Returns:
            Tuple of (task_class, confidence_score)
        """
        prompt_lower = prompt.lower()

        # RISKY: Production, deployment, migration, destructive operations
        risky_patterns = r'\b(production|prod|deploy|migration|database|drop|delete|rm -rf|irreversible)\b'
        if re.search(risky_patterns, prompt_lower):
            # High confidence if multiple risk keywords
            risk_count = len(re.findall(risky_patterns, prompt_lower))
            confidence = min(0.95, 0.75 + (risk_count * 0.1))
            return "risky", confidence

        # OPEN_WORLD: External APIs, research, web scraping, new tech
        open_world_patterns = r'\b(api|external|integration|research|investigate|explore|new|latest|web|fetch|scrape)\b'
        if re.search(open_world_patterns, prompt_lower):
            # Medium confidence - "API" could be internal or external
            open_count = len(re.findall(open_world_patterns, prompt_lower))
            confidence = min(0.85, 0.65 + (open_count * 0.1))
            return "open_world", confidence

        # COMPLEX: Refactoring, architecture, multi-step, system-wide changes
        complex_patterns = r'\b(refactor|architecture|redesign|migrate|restructure|optimize|performance)\b'
        if re.search(complex_patterns, prompt_lower):
            complex_count = len(re.findall(complex_patterns, prompt_lower))
            confidence = min(0.90, 0.70 + (complex_count * 0.1))
            return "complex", confidence

        # ATOMIC: Simple queries, documentation, explanations (no implementation)
        atomic_patterns = r'\b(what|how|explain|describe|define|list|show)\b'
        no_implementation = r'\b(implement|build|create|add|modify)\b'
        if re.search(atomic_patterns, prompt_lower) and not re.search(no_implementation, prompt_lower):
            return "atomic", 0.90

        # Default: ROUTINE (low confidence - many edge cases)
        return "routine", 0.60

    def _classify_via_zen_mcp(self, prompt: str) -> Tuple[str, float]:
        """
        Classify using Zen MCP with fresh continuation_id per prompt

        CRITICAL: Fresh continuation_id per prompt to prevent classification bias
        """
        # Generate unique continuation_id for this classification
        # Hash prompt to create deterministic but unique ID per prompt
        prompt_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()[:12]
        continuation_id = f"classify-{prompt_hash}"

        classification_prompt = f"""Classify the following task into one of five categories:

**Categories:**
1. **atomic**: Simple query, explanation, or single-file change (<5 actions, low complexity)
2. **routine**: Standard multi-file change, familiar patterns (5-10 actions)
3. **complex**: Architecture changes, refactoring, unfamiliar patterns (10-15 actions)
4. **risky**: Production changes, irreversible operations, requires dry-run
5. **open_world**: External research, new technologies, novel solutions

**Task Prompt:**
"{prompt}"

**Output Format:**
Respond with JSON only:
{{
  "task_class": "atomic|routine|complex|risky|open_world",
  "confidence": 0.0-1.0,
  "rationale": "Brief 1-sentence explanation"
}}

Examples:
- "Fix typo in README" → {{"task_class": "atomic", "confidence": 0.95}}
- "Refactor authentication to use JWT" → {{"task_class": "complex", "confidence": 0.85}}
- "Deploy to production" → {{"task_class": "risky", "confidence": 0.98}}
- "Research best practices for React 19" → {{"task_class": "open_world", "confidence": 0.90}}
"""

        try:
            # Import Zen MCP dynamically (available in Claude Code context)
            import sys
            if 'mcp__zen__chat' in dir(sys.modules.get('__main__', {})):
                mcp_chat = sys.modules['__main__'].mcp__zen__chat
            else:
                raise RuntimeError("Zen MCP not available in current context")

            # Call Zen MCP with fresh continuation_id (NO reuse)
            response = mcp_chat(
                prompt=classification_prompt,
                model="google/gemini-2.5-pro",  # Fast model for classification
                working_directory_absolute_path=self.working_directory,
                temperature=0.2,  # Low temperature for consistent classification
                continuation_id=continuation_id  # Fresh ID per prompt
            )

            # Parse JSON response
            result = self._parse_zen_response(response)
            return result["task_class"], result["confidence"]

        except Exception as e:
            raise RuntimeError(f"Zen MCP classification failed: {e}")

    def _parse_zen_response(self, response: str) -> dict:
        """Parse JSON response from Zen MCP"""
        import json
        import re

        # Try to extract JSON from response
        json_match = re.search(r'\{.*"task_class".*\}', response, re.DOTALL)
        if json_match:
            json_text = json_match.group(0)
        else:
            # Try markdown code block
            json_match = re.search(r'```json\s*\n(.*?)\n```', response, re.DOTALL)
            if json_match:
                json_text = json_match.group(1)
            else:
                raise ValueError(f"Could not extract JSON from response: {response[:200]}...")

        try:
            result = json.loads(json_text)
            # Validate required fields
            if "task_class" not in result:
                raise ValueError("Missing 'task_class' field in response")
            if result["task_class"] not in ["atomic", "routine", "complex", "risky", "open_world"]:
                raise ValueError(f"Invalid task_class: {result['task_class']}")

            # Default confidence if missing
            if "confidence" not in result:
                result["confidence"] = 0.75

            return result
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON: {e}\nText: {json_text[:200]}...")


def classify_task(prompt: str, enable_zen: bool = False, working_directory: str = ".") -> str:
    """
    Convenience function for quick classification

    Args:
        prompt: User prompt to classify
        enable_zen: Enable Zen MCP fallback for uncertain cases
        working_directory: Project directory path

    Returns:
        Task class string (atomic, routine, complex, risky, open_world)
    """
    classifier = TaskClassifierZen(working_directory, enable_zen_fallback=enable_zen)
    task_class, confidence = classifier.classify(prompt)
    return task_class


if __name__ == "__main__":
    # Read prompt from stdin or command line
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = sys.stdin.read().strip()

    # Use heuristic-only classification (fast)
    task_class = classify_task(prompt, enable_zen=False)
    print(task_class)
