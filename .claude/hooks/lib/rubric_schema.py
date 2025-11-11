"""
Extended JSON Rubric Schema

Implements GPT-5's comprehensive confidence rubric structure including:
- Task summary and classification
- Multi-axis metrics
- Claims with evidence backing
- Verification checks
- Assumptions and risks
- Conflict detection results
- Confidence metrics (10 metrics)
- Confidence results (p_raw, p_correct_mean, p_correct_low)
- Risk assessment (impact, expected_risk)
- Budget status
- Gate decision
- Attribution (explainability)
- Rationale
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
import json


@dataclass
class MultiAxisMetrics:
    """Five-axis task characterization"""
    novelty: float  # 0.0 = familiar, 1.0 = never done before
    externality: float  # 0.0 = internal only, 1.0 = external dependencies
    blast_radius: float  # 0.0 = isolated, 1.0 = system-wide impact
    reversibility: float  # 0.0 = irreversible, 1.0 = easily rolled back
    exposure: float  # 0.0 = dev/local, 1.0 = production full traffic


@dataclass
class Claim:
    """A claim made during task execution"""
    id: str
    text: str
    type: str  # "empirical", "logical", "assumption"
    evidence_ids: List[str]  # References to Evidence items


@dataclass
class Evidence:
    """Evidence supporting claims"""
    id: str
    kind: str  # "web", "code", "tool", "empirical"
    where: str  # Source location (URL, file path, tool output)
    quote: str  # Actual evidence text
    independence_key: str  # For deduplication (domain, file, etc.)
    credibility: float  # 0.0-1.0
    timestamp: Optional[str] = None


@dataclass
class Check:
    """Verification check performed"""
    name: str  # e.g., "pnpm tsc --noEmit"
    result: str  # "pass", "fail", "skip"
    output: Optional[str] = None


@dataclass
class Assumption:
    """Unverified assumption"""
    text: str
    risk: str  # "low", "medium", "high"
    mitigation: Optional[str] = None


@dataclass
class Conflict:
    """Detected conflict between evidence"""
    between: List[str]  # Evidence IDs
    severity: str  # "high", "medium", "low"
    description: str
    resolution: str


@dataclass
class ConfidenceMetrics:
    """10 metrics contributing to confidence"""
    # Positive contributions
    spec_completeness: float  # 0-1
    context_grounding: float  # 0-1
    tooling_path: float  # 0-1
    empirical_verification: float  # 0-1
    source_diversity: float  # 0-1 (open_world only)
    time_relevance: float  # 0-1 (open_world only)
    reproducibility: float  # 0-1

    # Negative contributions (risks)
    assumption_risk: float  # 0-1
    contradiction_risk: float  # 0-1
    novelty_penalty: float  # 0-1


@dataclass
class ConfidenceResult:
    """Confidence calculation results"""
    p_raw: float  # Uncalibrated probability from sigmoid
    p_correct_mean: float  # Calibrated probability (best estimate)
    p_correct_low: float  # Conservative lower bound (90% credible interval)
    bucket: str  # Calibration bucket identifier


@dataclass
class RiskResult:
    """Risk assessment results"""
    impact: float  # Overall impact score [0, 1]
    expected_risk: float  # impact × (1 - p_correct_low)


@dataclass
class BudgetStatus:
    """Verification budget status"""
    max_actions: int
    max_time_seconds: float
    allowed_tools: List[str]
    mandatory: List[str]
    used: Dict[str, any]  # {"actions": int, "elapsed_sec": float, "tools": List[str]}


@dataclass
class FeatureContribution:
    """Explainability: feature contribution to confidence"""
    feature: str
    contribution: float  # Positive or negative contribution to p_raw


@dataclass
class ConfidenceRubric:
    """
    Complete confidence calibration rubric

    This is the comprehensive JSON structure Claude must output
    when confidence system is active.
    """
    # Task identification
    task_summary: str
    task_class: str  # "atomic", "routine", "open_world", "risky"

    # Multi-axis characterization
    axes: MultiAxisMetrics

    # Claims and evidence
    claims: List[Claim]
    evidence: List[Evidence]

    # Verification
    checks: List[Check]
    assumptions: List[Assumption]
    conflicts: List[Conflict]

    # Metrics
    metrics: ConfidenceMetrics

    # Results
    confidence: ConfidenceResult
    risk: RiskResult
    budgets: BudgetStatus

    # Decision
    gate: str  # "proceed", "caution", "ask", "stop"

    # Explainability
    attribution: List[FeatureContribution]
    rationale: str

    # Metadata
    timestamp: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: Dict) -> 'ConfidenceRubric':
        """Create from dictionary"""
        # Convert nested dicts to dataclasses
        data['axes'] = MultiAxisMetrics(**data['axes'])
        data['claims'] = [Claim(**c) for c in data['claims']]
        data['evidence'] = [Evidence(**e) for e in data['evidence']]
        data['checks'] = [Check(**c) for c in data['checks']]
        data['assumptions'] = [Assumption(**a) for a in data['assumptions']]
        data['conflicts'] = [Conflict(**c) for c in data['conflicts']]
        data['metrics'] = ConfidenceMetrics(**data['metrics'])
        data['confidence'] = ConfidenceResult(**data['confidence'])
        data['risk'] = RiskResult(**data['risk'])
        data['attribution'] = [FeatureContribution(**f) for f in data['attribution']]

        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> 'ConfidenceRubric':
        """Create from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data)


def create_example_rubric() -> ConfidenceRubric:
    """
    Create example rubric for testing and documentation

    Example: "Configure Tailwind v4 with Next.js 15"
    """
    return ConfidenceRubric(
        task_summary="Configure Tailwind v4 with Next.js 15",
        task_class="open_world",

        axes=MultiAxisMetrics(
            novelty=0.6,
            externality=0.8,
            blast_radius=0.3,
            reversibility=0.9,
            exposure=0.05
        ),

        claims=[
            Claim(
                id="c1",
                text="Tailwind v4 requires new CSS-first configuration format",
                type="empirical",
                evidence_ids=["e1", "e2"]
            ),
            Claim(
                id="c2",
                text="Next.js 15 supports Tailwind v4",
                type="empirical",
                evidence_ids=["e2", "e3"]
            )
        ],

        evidence=[
            Evidence(
                id="e1",
                kind="web",
                where="https://tailwindcss.com/docs/v4/upgrade#line-42",
                quote="v4 uses CSS-first configuration...",
                independence_key="tailwindcss.com",
                credibility=0.95,
                timestamp="2025-01-10T00:00:00Z"
            ),
            Evidence(
                id="e2",
                kind="web",
                where="https://nextjs.org/docs/app/building-your-application/styling/tailwind#v4",
                quote="Next.js 15 supports Tailwind v4...",
                independence_key="nextjs.org",
                credibility=0.95,
                timestamp="2025-01-08T00:00:00Z"
            ),
            Evidence(
                id="e3",
                kind="tool",
                where="pnpm build",
                quote="Build succeeded with no errors",
                independence_key="local",
                credibility=1.0,
                timestamp=datetime.now().isoformat()
            )
        ],

        checks=[
            Check(name="pnpm tsc --noEmit", result="pass"),
            Check(name="pnpm build", result="pass")
        ],

        assumptions=[
            Assumption(
                text="User is using App Router (not Pages)",
                risk="medium",
                mitigation="Check next.config.js for App Router configuration"
            )
        ],

        conflicts=[
            Conflict(
                between=["e1", "e3"],
                severity="low",
                description="Minor version syntax differences",
                resolution="Both valid, depends on build tool"
            )
        ],

        metrics=ConfidenceMetrics(
            spec_completeness=0.8,
            context_grounding=0.7,
            tooling_path=0.9,
            empirical_verification=1.0,
            source_diversity=1.0,
            time_relevance=0.95,
            reproducibility=0.8,
            assumption_risk=0.4,
            contradiction_risk=0.2,
            novelty_penalty=0.6
        ),

        confidence=ConfidenceResult(
            p_raw=0.78,
            p_correct_mean=0.72,
            p_correct_low=0.58,
            bucket="open_world|node|medium_novelty|external|good_tests"
        ),

        risk=RiskResult(
            impact=0.12,
            expected_risk=0.05
        ),

        budgets=BudgetStatus(
            max_actions=15,
            max_time_seconds=300,
            allowed_tools=["Read", "Grep", "WebSearch", "Bash"],
            mandatory=["WebSearch"],
            used={
                "actions": 7,
                "elapsed_sec": 45,
                "tools": ["WebSearch", "Read", "Bash"]
            }
        ),

        gate="caution",

        attribution=[
            FeatureContribution(feature="empirical_verification", contribution=0.22),
            FeatureContribution(feature="source_diversity", contribution=0.10),
            FeatureContribution(feature="contradiction_risk", contribution=-0.024)
        ],

        rationale="Two independent authoritative sources (e1, e2) confirm v4 compatibility "
                 "with Next.js 15. Minor conflicts resolved. Empirical verification passed "
                 "(build succeeded). Proceeding with caution due to medium assumption risk "
                 "about App Router usage.",

        timestamp=datetime.now().isoformat()
    )


if __name__ == "__main__":
    print("Confidence Rubric Schema Test:\n")

    # Create example rubric
    rubric = create_example_rubric()

    print("Example Rubric Structure:")
    print("=" * 80)
    print(f"Task: {rubric.task_summary}")
    print(f"Class: {rubric.task_class}")
    print(f"\nAxes:")
    print(f"  Novelty: {rubric.axes.novelty:.2f}")
    print(f"  Externality: {rubric.axes.externality:.2f}")
    print(f"  Blast Radius: {rubric.axes.blast_radius:.2f}")
    print(f"\nClaims: {len(rubric.claims)}")
    print(f"Evidence: {len(rubric.evidence)}")
    print(f"Checks: {len(rubric.checks)}")
    print(f"Assumptions: {len(rubric.assumptions)}")
    print(f"Conflicts: {len(rubric.conflicts)}")
    print(f"\nConfidence:")
    print(f"  p_raw: {rubric.confidence.p_raw:.3f}")
    print(f"  p_correct_mean: {rubric.confidence.p_correct_mean:.3f}")
    print(f"  p_correct_low: {rubric.confidence.p_correct_low:.3f}")
    print(f"\nRisk:")
    print(f"  Impact: {rubric.risk.impact:.3f}")
    print(f"  Expected Risk: {rubric.risk.expected_risk:.3f}")
    print(f"\nGate: {rubric.gate.upper()}")
    print(f"\nRationale: {rubric.rationale}")
    print("=" * 80)

    # Test JSON serialization
    print("\nJSON Serialization Test:")
    json_str = rubric.to_json()
    print(f"JSON size: {len(json_str)} bytes")

    # Test deserialization
    print("\nJSON Deserialization Test:")
    rubric2 = ConfidenceRubric.from_json(json_str)
    print(f"Deserialized task: {rubric2.task_summary}")
    print(f"Deserialized confidence: {rubric2.confidence.p_correct_mean:.3f}")
    print(f"Deserialized gate: {rubric2.gate}")

    # Verify round-trip
    assert rubric.task_summary == rubric2.task_summary
    assert rubric.confidence.p_raw == rubric2.confidence.p_raw
    assert rubric.gate == rubric2.gate
    print("\n✓ Round-trip serialization successful")

    # Write example to file
    output_path = Path(__file__).parent.parent / "example_rubric.json"
    with open(output_path, 'w') as f:
        f.write(json_str)
    print(f"\n✓ Example rubric written to: {output_path}")
