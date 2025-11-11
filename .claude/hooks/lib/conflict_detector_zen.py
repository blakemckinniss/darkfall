"""
Conflict Detector using Zen MCP

Uses Zen MCP chat tool to detect contradictions in evidence lists.
Provides structured conflict analysis with severity levels and resolutions.

Features:
- Response caching (hash-based) to avoid redundant API calls
- Retry logic with exponential backoff for transient failures
- Continuation ID support for conversation context
- Graceful fallback to heuristics

Based on Zen MCP consultation guidance:
- Use system prompt + clear instructions + few-shot examples
- Request structured JSON output
- Robust error handling with fallback to heuristics
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import json
import os
import hashlib
import time
from pathlib import Path

try:
    # Import Zen MCP if available (will be available in Claude Code context)
    # For testing, we'll handle gracefully
    ZEN_MCP_AVAILABLE = True
except ImportError:
    ZEN_MCP_AVAILABLE = False


@dataclass
class Evidence:
    """Single piece of evidence"""
    id: str
    kind: str  # "web", "code", "tool", "empirical"
    where: str  # Source location (URL, file path, etc.)
    quote: str  # Actual evidence text
    independence_key: str  # For deduplication (domain, source, etc.)
    credibility: float  # 0.0-1.0
    timestamp: Optional[str] = None


@dataclass
class Conflict:
    """Detected conflict between evidence"""
    evidence_ids: List[str]
    severity: str  # "high", "medium", "low"
    description: str
    resolution: str


@dataclass
class ConflictResult:
    """Result of conflict detection"""
    contradiction_risk: float  # 0.0-1.0 score for confidence model
    conflicts: List[Conflict]
    method: str  # "zen_mcp" or "heuristic"


class ConflictDetectorZen:
    """
    Detects contradictions in evidence using Zen MCP

    Strategy:
    1. Primary: Use Zen MCP for intelligent conflict detection
    2. Fallback: Use heuristic methods if Zen MCP unavailable
    """

    # System prompt for Zen MCP
    SYSTEM_PROMPT = """You are an expert analytical assistant. Your task is to identify logical conflicts or contradictions within a given list of evidence.
You must respond ONLY with a valid JSON object. Do not provide any preamble, explanation, or text outside of the JSON structure.
The JSON object must conform to the following schema:
{
  "conflicts_found": boolean,
  "conflicting_pairs": [
    {
      "evidence_ids": [1, 2],
      "severity": "high|medium|low",
      "description": "Brief explanation of why these pieces of evidence conflict",
      "resolution": "How this conflict could be resolved or which evidence is more credible"
    }
  ]
}

Severity levels:
- "high": Direct logical contradiction (mutually exclusive claims)
- "medium": Conflicting data or claims that can't both be true
- "low": Nuanced disagreement or different perspectives (may not be true conflict)

If no conflicts are found, "conflicts_found" should be false and "conflicting_pairs" should be an empty list.
"""

    def __init__(self, working_directory: str, continuation_id: Optional[str] = None):
        """
        Initialize conflict detector

        Args:
            working_directory: Absolute path to working directory for Zen MCP
            continuation_id: Optional continuation ID for conversation context
        """
        self.working_directory = working_directory
        self.continuation_id = continuation_id
        self._zen_mcp_available = self._check_zen_mcp_availability()
        self._cache = {}  # In-memory cache: {evidence_hash: (result, timestamp)}
        self._cache_ttl = 300  # 5 minutes TTL

    def _check_zen_mcp_availability(self) -> bool:
        """Check if Zen MCP is available in current context"""
        # In Claude Code, mcp__zen__chat will be available
        # For standalone testing, return False
        try:
            # Try to import the function (will be in globals in Claude Code)
            return 'mcp__zen__chat' in dir()
        except:
            return False

    def detect_conflicts(self, evidence: List[Evidence]) -> ConflictResult:
        """
        Detect conflicts in evidence list with caching

        Args:
            evidence: List of evidence to analyze

        Returns:
            ConflictResult with contradiction risk score and detected conflicts
        """
        if not evidence or len(evidence) < 2:
            # No conflicts possible with < 2 pieces of evidence
            return ConflictResult(
                contradiction_risk=0.0,
                conflicts=[],
                method="none"
            )

        # Check for independence (same source = no conflict possible)
        if self._all_same_source(evidence):
            return ConflictResult(
                contradiction_risk=0.0,
                conflicts=[],
                method="same_source"
            )

        # Check cache first
        cache_key = self._create_cache_key(evidence)
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        # Try Zen MCP first
        if self._zen_mcp_available:
            try:
                result = self._detect_via_zen_mcp_with_retry(evidence)
                self._cache_result(cache_key, result)
                return result
            except Exception as e:
                print(f"Warning: Zen MCP conflict detection failed: {e}")
                print("Falling back to heuristic method")

        # Fallback to heuristics
        result = self._detect_via_heuristics(evidence)
        self._cache_result(cache_key, result)
        return result

    def _all_same_source(self, evidence: List[Evidence]) -> bool:
        """Check if all evidence comes from the same source"""
        if len(evidence) < 2:
            return True
        first_key = evidence[0].independence_key
        return all(e.independence_key == first_key for e in evidence)

    def _create_cache_key(self, evidence: List[Evidence]) -> str:
        """
        Create canonical cache key from evidence list

        Canonicalizes evidence by sorting and serializing to ensure
        consistent hashing regardless of input order.
        """
        # Convert evidence to serializable dicts and sort
        evidence_dicts = []
        for e in evidence:
            evidence_dicts.append({
                'kind': e.kind,
                'where': e.where,
                'quote': e.quote,
                'independence_key': e.independence_key,
                'credibility': e.credibility
            })

        # Sort by a stable key combination
        sorted_evidence = sorted(
            evidence_dicts,
            key=lambda x: (x['independence_key'], x['where'], x['quote'])
        )

        # Serialize and hash
        canonical_string = json.dumps(sorted_evidence, sort_keys=True)
        return hashlib.sha256(canonical_string.encode('utf-8')).hexdigest()

    def _get_cached_result(self, cache_key: str) -> Optional[ConflictResult]:
        """Get cached result if valid (within TTL)"""
        if cache_key not in self._cache:
            return None

        result, timestamp = self._cache[cache_key]
        if time.time() - timestamp > self._cache_ttl:
            # Expired - remove from cache
            del self._cache[cache_key]
            return None

        return result

    def _cache_result(self, cache_key: str, result: ConflictResult):
        """Cache a conflict detection result"""
        self._cache[cache_key] = (result, time.time())

    def _detect_via_zen_mcp_with_retry(self, evidence: List[Evidence]) -> ConflictResult:
        """
        Detect conflicts using Zen MCP with retry logic

        Retries on transient failures (network errors, 5xx) with exponential backoff.
        Max 3 attempts, preserves continuation_id across retries.
        """
        max_retries = 3
        initial_delay = 0.1  # 100ms
        factor = 2

        last_exception = None

        for attempt in range(max_retries):
            try:
                return self._detect_via_zen_mcp(evidence)
            except (RuntimeError, ConnectionError, TimeoutError) as e:
                # Retryable errors
                last_exception = e
                if attempt < max_retries - 1:
                    delay = initial_delay * (factor ** attempt)
                    time.sleep(delay)
                    continue
                # Last attempt failed - re-raise
                raise
            except Exception as e:
                # Non-retryable error (e.g., ValueError from bad response)
                raise

        # Should not reach here, but just in case
        if last_exception:
            raise last_exception
        raise RuntimeError("Retry logic exhausted without result")

    def _detect_via_zen_mcp(self, evidence: List[Evidence]) -> ConflictResult:
        """
        Detect conflicts using Zen MCP chat tool

        Uses continuation from earlier consultation for context
        """
        # Format evidence for Zen MCP
        evidence_text = self._format_evidence_for_prompt(evidence)

        # Create user prompt with examples
        user_prompt = f"""Analyze the following list of evidence for contradictions:

{evidence_text}

Respond with a JSON object detailing any conflicts found.

Example of a non-conflicting list:
Evidence:
- Evidence 1 (docs.python.org): "Python 3.12 was released in October 2023"
- Evidence 2 (github.com/python): "Python 3.12 includes PEP 701 (f-string improvements)"
Expected JSON:
{{
  "conflicts_found": false,
  "conflicting_pairs": []
}}

Example of a conflicting list:
Evidence:
- Evidence 1 (source-a.com): "Tailwind v4 requires Node.js 18+"
- Evidence 2 (source-b.com): "Tailwind v4 works with Node.js 16+"
Expected JSON:
{{
  "conflicts_found": true,
  "conflicting_pairs": [
    {{
      "evidence_ids": [1, 2],
      "severity": "medium",
      "description": "Conflicting Node.js version requirements (18+ vs 16+)",
      "resolution": "Source A is official Tailwind docs (more authoritative). Use Node.js 18+ requirement."
    }}
  ]
}}

Now, analyze the provided evidence list and generate the JSON response."""

        # Call Zen MCP
        try:
            # Import the MCP tool dynamically (available in Claude Code context)
            import sys
            if 'mcp__zen__chat' in dir(sys.modules.get('__main__', {})):
                mcp_chat = sys.modules['__main__'].mcp__zen__chat
            else:
                # Not in Claude Code context - fallback to heuristics
                raise RuntimeError("Zen MCP not available in current context")

            # Make the API call with continuation_id if available
            call_params = {
                "prompt": user_prompt,
                "model": "google/gemini-2.5-pro",
                "working_directory_absolute_path": self.working_directory,
                "temperature": 0.2
            }

            if self.continuation_id:
                call_params["continuation_id"] = self.continuation_id

            response = mcp_chat(**call_params)

            # Parse the JSON response
            result_data = self._parse_zen_response(response)

            # Convert to Conflict objects
            conflicts = []
            if result_data.get("conflicts_found", False):
                for pair in result_data.get("conflicting_pairs", []):
                    conflicts.append(Conflict(
                        evidence_ids=[evidence[i-1].id for i in pair["evidence_ids"]],
                        severity=pair["severity"],
                        description=pair["description"],
                        resolution=pair["resolution"]
                    ))

            # Compute risk score
            risk_score = self._compute_risk_score(conflicts)

            return ConflictResult(
                contradiction_risk=risk_score,
                conflicts=conflicts,
                method="zen_mcp"
            )

        except Exception as e:
            # If Zen MCP fails, re-raise to trigger fallback
            raise e

    def _parse_zen_response(self, response: str) -> Dict:
        """
        Parse JSON response from Zen MCP

        Args:
            response: Raw response text from Zen MCP

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If response cannot be parsed as JSON
        """
        import re

        # Try to find JSON in the response (may have markdown formatting)
        # Look for ```json...``` blocks first
        json_match = re.search(r'```json\s*\n(.*?)\n```', response, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            # Try to find raw JSON object
            json_match = re.search(r'\{.*"conflicts_found".*\}', response, re.DOTALL)
            if json_match:
                json_text = json_match.group(0)
            else:
                # Last resort: try parsing entire response as JSON
                json_text = response

        try:
            return json.loads(json_text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse Zen MCP response as JSON: {e}\nResponse: {response[:200]}...")

    def _detect_via_heuristics(self, evidence: List[Evidence]) -> ConflictResult:
        """
        Fallback heuristic conflict detection

        Uses simple keyword and pattern matching
        """
        try:
            from nli_heuristics import detect_conflicts_heuristic
        except ImportError:
            # Try relative import for when called from parent directory
            from lib.nli_heuristics import detect_conflicts_heuristic

        # Delegate to heuristic module
        conflicts = detect_conflicts_heuristic(evidence)

        # Compute contradiction risk score
        risk_score = self._compute_risk_score(conflicts)

        return ConflictResult(
            contradiction_risk=risk_score,
            conflicts=conflicts,
            method="heuristic"
        )

    def _format_evidence_for_prompt(self, evidence: List[Evidence]) -> str:
        """Format evidence list for Zen MCP prompt"""
        lines = []
        for i, e in enumerate(evidence, 1):
            credibility_note = f" [credibility: {e.credibility:.0%}]" if e.credibility < 0.9 else ""
            timestamp_note = f" (as of {e.timestamp})" if e.timestamp else ""
            lines.append(
                f"- Evidence {i} ({e.where}{timestamp_note}): \"{e.quote}\"{credibility_note}"
            )
        return "\n".join(lines)

    def _compute_risk_score(self, conflicts: List[Conflict]) -> float:
        """
        Compute contradiction risk score from detected conflicts

        Score ranges from 0.0 (no conflicts) to 1.0 (severe conflicts)
        """
        if not conflicts:
            return 0.0

        risk_score = 0.0
        for conflict in conflicts:
            if conflict.severity == "high":
                risk_score += 0.40
            elif conflict.severity == "medium":
                risk_score += 0.25
            elif conflict.severity == "low":
                risk_score += 0.10

        # Cap at 1.0
        return min(1.0, risk_score)


def detect_conflicts_via_zen(evidence: List[Evidence],
                             working_directory: str) -> Tuple[float, List[Conflict]]:
    """
    Convenience function for conflict detection

    Args:
        evidence: List of evidence to analyze
        working_directory: Working directory for Zen MCP

    Returns:
        Tuple of (contradiction_risk_score, conflicts_list)
    """
    detector = ConflictDetectorZen(working_directory)
    result = detector.detect_conflicts(evidence)
    return result.contradiction_risk, result.conflicts


if __name__ == "__main__":
    print("Conflict Detector (Zen MCP) Test Results:\n")

    # Test 1: No conflicts
    print("Test 1: No conflicts - consistent evidence")
    evidence1 = [
        Evidence(
            id="e1",
            kind="web",
            where="https://tailwindcss.com/docs/v4",
            quote="Tailwind v4 uses CSS-first configuration",
            independence_key="tailwindcss.com",
            credibility=0.95
        ),
        Evidence(
            id="e2",
            kind="web",
            where="https://github.com/tailwindlabs/tailwindcss",
            quote="Version 4.0 introduces new CSS @config syntax",
            independence_key="github.com/tailwindlabs",
            credibility=0.95
        )
    ]

    detector = ConflictDetectorZen(os.getcwd())
    result1 = detector.detect_conflicts(evidence1)
    print(f"  Contradiction risk: {result1.contradiction_risk:.3f}")
    print(f"  Conflicts found: {len(result1.conflicts)}")
    print(f"  Method: {result1.method}\n")

    # Test 2: Medium conflict - different data
    print("Test 2: Medium conflict - version requirements differ")
    evidence2 = [
        Evidence(
            id="e1",
            kind="web",
            where="https://source-a.com",
            quote="Tailwind v4 requires Node.js 18+",
            independence_key="source-a.com",
            credibility=0.90
        ),
        Evidence(
            id="e2",
            kind="web",
            where="https://source-b.com",
            quote="Tailwind v4 works with Node.js 16+",
            independence_key="source-b.com",
            credibility=0.85
        )
    ]

    result2 = detector.detect_conflicts(evidence2)
    print(f"  Contradiction risk: {result2.contradiction_risk:.3f}")
    print(f"  Conflicts found: {len(result2.conflicts)}")
    print(f"  Method: {result2.method}")
    if result2.conflicts:
        for c in result2.conflicts:
            print(f"    - Severity: {c.severity}")
            print(f"      Description: {c.description}")
    print()

    # Test 3: Same source - no conflict possible
    print("Test 3: Same source - no conflict analysis needed")
    evidence3 = [
        Evidence(
            id="e1",
            kind="web",
            where="https://docs.python.org/3.12/",
            quote="Python 3.12 was released in October 2023",
            independence_key="python.org",
            credibility=0.95
        ),
        Evidence(
            id="e2",
            kind="web",
            where="https://docs.python.org/3.12/whatsnew",
            quote="Python 3.12 includes PEP 701",
            independence_key="python.org",
            credibility=0.95
        )
    ]

    result3 = detector.detect_conflicts(evidence3)
    print(f"  Contradiction risk: {result3.contradiction_risk:.3f}")
    print(f"  Method: {result3.method}")
    print(f"  Note: Same source, no conflict analysis needed\n")
