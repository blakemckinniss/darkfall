"""
NLI (Natural Language Inference) Heuristics

Lightweight fallback conflict detection when Zen MCP is unavailable.
Uses keyword-based contradiction detection and pattern matching.

Not as sophisticated as Zen MCP, but provides basic conflict detection
without external dependencies.
"""

from dataclasses import dataclass
from typing import List, Set
import re


@dataclass
class Evidence:
    """Evidence structure (imported from conflict_detector_zen)"""
    id: str
    kind: str
    where: str
    quote: str
    independence_key: str
    credibility: float
    timestamp: str = None


@dataclass
class Conflict:
    """Conflict structure (imported from conflict_detector_zen)"""
    evidence_ids: List[str]
    severity: str
    description: str
    resolution: str


class NLIHeuristics:
    """Heuristic-based conflict detection"""

    # Negation patterns
    NEGATION_PATTERNS = [
        r'\b(not|no|never|without|doesn\'t|don\'t|can\'t|cannot|won\'t)\b',
        r'\b(neither|nor|none|nobody|nothing)\b',
    ]

    # Contradiction indicators
    CONTRADICTION_KEYWORDS = {
        'high': [
            ('requires', 'does not require'),
            ('must', 'must not'),
            ('always', 'never'),
            ('true', 'false'),
            ('yes', 'no'),
            ('supported', 'not supported'),
            ('compatible', 'incompatible'),
        ],
        'medium': [
            ('should', 'should not'),
            ('recommended', 'not recommended'),
            ('stable', 'unstable'),
            ('safe', 'unsafe'),
            ('works with', 'does not work with'),
        ],
        'low': [
            ('might', 'might not'),
            ('could', 'could not'),
            ('possibly', 'impossible'),
            ('sometimes', 'never'),
        ]
    }

    # Version conflict patterns
    VERSION_PATTERN = r'\b(\d+)\.(\d+)(?:\.(\d+))?\b'

    def __init__(self):
        pass

    def detect_conflicts(self, evidence: List[Evidence]) -> List[Conflict]:
        """
        Detect conflicts using heuristic methods

        Returns list of detected conflicts
        """
        conflicts = []

        # Compare all pairs of evidence
        for i in range(len(evidence)):
            for j in range(i + 1, len(evidence)):
                conflict = self._compare_evidence_pair(evidence[i], evidence[j])
                if conflict:
                    conflicts.append(conflict)

        return conflicts

    def _compare_evidence_pair(self, e1: Evidence, e2: Evidence) -> Conflict:
        """Compare two pieces of evidence for conflicts"""

        # Skip if same source
        if e1.independence_key == e2.independence_key:
            return None

        # Check for keyword contradictions
        keyword_conflict = self._check_keyword_contradictions(e1, e2)
        if keyword_conflict:
            return keyword_conflict

        # Check for version conflicts
        version_conflict = self._check_version_conflicts(e1, e2)
        if version_conflict:
            return version_conflict

        # Check for numeric contradictions
        numeric_conflict = self._check_numeric_contradictions(e1, e2)
        if numeric_conflict:
            return numeric_conflict

        return None

    def _check_keyword_contradictions(self, e1: Evidence, e2: Evidence) -> Conflict:
        """Check for keyword-based contradictions"""

        quote1_lower = e1.quote.lower()
        quote2_lower = e2.quote.lower()

        # Check high severity contradictions first
        for pos, neg in self.CONTRADICTION_KEYWORDS['high']:
            if pos in quote1_lower and neg in quote2_lower:
                return self._create_conflict(
                    e1, e2, 'high',
                    f"Direct contradiction: '{pos}' vs '{neg}'",
                    self._suggest_resolution(e1, e2)
                )
            if neg in quote1_lower and pos in quote2_lower:
                return self._create_conflict(
                    e1, e2, 'high',
                    f"Direct contradiction: '{neg}' vs '{pos}'",
                    self._suggest_resolution(e1, e2)
                )

        # Check medium severity
        for pos, neg in self.CONTRADICTION_KEYWORDS['medium']:
            if pos in quote1_lower and neg in quote2_lower:
                return self._create_conflict(
                    e1, e2, 'medium',
                    f"Conflicting claims: '{pos}' vs '{neg}'",
                    self._suggest_resolution(e1, e2)
                )

        # Check low severity
        for pos, neg in self.CONTRADICTION_KEYWORDS['low']:
            if pos in quote1_lower and neg in quote2_lower:
                return self._create_conflict(
                    e1, e2, 'low',
                    f"Nuanced disagreement: '{pos}' vs '{neg}'",
                    self._suggest_resolution(e1, e2)
                )

        return None

    def _check_version_conflicts(self, e1: Evidence, e2: Evidence) -> Conflict:
        """Check for conflicting version requirements"""

        # Extract version numbers
        versions1 = self._extract_versions(e1.quote)
        versions2 = self._extract_versions(e2.quote)

        if not versions1 or not versions2:
            return None

        # Look for version conflicts (same package, different versions)
        # Simple heuristic: if both mention same major version but different requirements
        for v1 in versions1:
            for v2 in versions2:
                if v1 != v2 and self._same_context(e1.quote, e2.quote):
                    return self._create_conflict(
                        e1, e2, 'medium',
                        f"Version mismatch: {v1} vs {v2}",
                        self._suggest_resolution(e1, e2)
                    )

        return None

    def _check_numeric_contradictions(self, e1: Evidence, e2: Evidence) -> Conflict:
        """Check for contradictory numeric claims"""

        # Extract percentages
        pct1 = self._extract_percentages(e1.quote)
        pct2 = self._extract_percentages(e2.quote)

        if pct1 and pct2 and self._same_context(e1.quote, e2.quote):
            # If percentages differ significantly (>20%), flag as conflict
            diff = abs(pct1[0] - pct2[0])
            if diff > 20:
                return self._create_conflict(
                    e1, e2, 'medium',
                    f"Conflicting percentages: {pct1[0]}% vs {pct2[0]}%",
                    self._suggest_resolution(e1, e2)
                )

        return None

    def _extract_versions(self, text: str) -> List[str]:
        """Extract version numbers from text"""
        matches = re.findall(self.VERSION_PATTERN, text)
        return ['.'.join(m for m in match if m) for match in matches]

    def _extract_percentages(self, text: str) -> List[float]:
        """Extract percentage values from text"""
        matches = re.findall(r'(\d+(?:\.\d+)?)\s*%', text)
        return [float(m) for m in matches]

    def _same_context(self, text1: str, text2: str) -> bool:
        """
        Check if two texts discuss the same topic

        Simple heuristic: extract key nouns/terms and check overlap
        """
        # Extract capitalized words and technical terms
        terms1 = set(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text1))
        terms2 = set(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text2))

        # Also extract quoted terms
        terms1.update(re.findall(r'"([^"]+)"', text1))
        terms2.update(re.findall(r'"([^"]+)"', text2))

        # Check overlap
        overlap = len(terms1 & terms2)
        total = len(terms1 | terms2)

        # If >30% overlap, consider same context
        return overlap / total > 0.3 if total > 0 else False

    def _create_conflict(self, e1: Evidence, e2: Evidence,
                        severity: str, description: str,
                        resolution: str) -> Conflict:
        """Create a Conflict object"""
        return Conflict(
            evidence_ids=[e1.id, e2.id],
            severity=severity,
            description=description,
            resolution=resolution
        )

    def _suggest_resolution(self, e1: Evidence, e2: Evidence) -> str:
        """Suggest how to resolve conflict based on credibility and recency"""

        # Prefer higher credibility
        if e1.credibility > e2.credibility + 0.1:
            return f"Prefer {e1.where} (higher credibility: {e1.credibility:.0%} vs {e2.credibility:.0%})"
        elif e2.credibility > e1.credibility + 0.1:
            return f"Prefer {e2.where} (higher credibility: {e2.credibility:.0%} vs {e1.credibility:.0%})"

        # Prefer more recent if timestamps available
        if e1.timestamp and e2.timestamp:
            if e1.timestamp > e2.timestamp:
                return f"Prefer {e1.where} (more recent: {e1.timestamp})"
            else:
                return f"Prefer {e2.where} (more recent: {e2.timestamp})"

        # Default
        return "Review both sources and consult additional references"


def detect_conflicts_heuristic(evidence: List[Evidence]) -> List[Conflict]:
    """
    Convenience function for heuristic conflict detection

    Args:
        evidence: List of evidence to analyze

    Returns:
        List of detected conflicts
    """
    detector = NLIHeuristics()
    return detector.detect_conflicts(evidence)


if __name__ == "__main__":
    print("NLI Heuristics Test Results:\n")

    # Test 1: No conflict
    print("Test 1: No conflict - consistent evidence")
    evidence1 = [
        Evidence(
            id="e1",
            kind="web",
            where="source-a.com",
            quote="Python 3.12 was released in October 2023",
            independence_key="source-a.com",
            credibility=0.95
        ),
        Evidence(
            id="e2",
            kind="web",
            where="source-b.com",
            quote="Python 3.12 includes PEP 701 improvements",
            independence_key="source-b.com",
            credibility=0.90
        )
    ]

    detector = NLIHeuristics()
    conflicts1 = detector.detect_conflicts(evidence1)
    print(f"  Conflicts found: {len(conflicts1)}\n")

    # Test 2: High severity - direct contradiction
    print("Test 2: High severity - direct contradiction")
    evidence2 = [
        Evidence(
            id="e1",
            kind="web",
            where="source-a.com",
            quote="TypeScript 5.0 requires Node.js 16+",
            independence_key="source-a.com",
            credibility=0.90
        ),
        Evidence(
            id="e2",
            kind="web",
            where="source-b.com",
            quote="TypeScript 5.0 does not require Node.js 16+, works with Node 14",
            independence_key="source-b.com",
            credibility=0.80
        )
    ]

    conflicts2 = detector.detect_conflicts(evidence2)
    print(f"  Conflicts found: {len(conflicts2)}")
    if conflicts2:
        for c in conflicts2:
            print(f"    - Severity: {c.severity}")
            print(f"      Description: {c.description}")
            print(f"      Resolution: {c.resolution}")
    print()

    # Test 3: Version conflict
    print("Test 3: Version conflict")
    evidence3 = [
        Evidence(
            id="e1",
            kind="web",
            where="source-a.com",
            quote="Tailwind CSS 4.0 stable release",
            independence_key="source-a.com",
            credibility=0.95
        ),
        Evidence(
            id="e2",
            kind="web",
            where="source-b.com",
            quote="Tailwind CSS 3.4 is the latest stable version",
            independence_key="source-b.com",
            credibility=0.85
        )
    ]

    conflicts3 = detector.detect_conflicts(evidence3)
    print(f"  Conflicts found: {len(conflicts3)}")
    if conflicts3:
        for c in conflicts3:
            print(f"    - Severity: {c.severity}")
            print(f"      Description: {c.description}")
    print()

    # Test 4: Percentage conflict
    print("Test 4: Percentage conflict")
    evidence4 = [
        Evidence(
            id="e1",
            kind="web",
            where="source-a.com",
            quote="EV adoption will reach 40% by 2025",
            independence_key="source-a.com",
            credibility=0.85
        ),
        Evidence(
            id="e2",
            kind="web",
            where="source-b.com",
            quote="EV adoption projected at 15% by 2025",
            independence_key="source-b.com",
            credibility=0.80
        )
    ]

    conflicts4 = detector.detect_conflicts(evidence4)
    print(f"  Conflicts found: {len(conflicts4)}")
    if conflicts4:
        for c in conflicts4:
            print(f"    - Severity: {c.severity}")
            print(f"      Description: {c.description}")
            print(f"      Resolution: {c.resolution}")
    print()
