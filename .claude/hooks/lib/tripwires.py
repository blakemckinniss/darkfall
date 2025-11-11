"""
Tripwire Rules for Confidence System

Implements 5 critical safety rules that force conservative actions
when specific risk conditions are detected.

Tripwires override normal confidence-based gating to prevent
high-risk scenarios from proceeding without explicit review.
"""

from dataclasses import dataclass
from typing import List, Optional, Dict
from enum import Enum


class TripwireType(Enum):
    """Types of tripwires"""
    SINGLE_SOURCE_EMPIRICAL = "single_source_empirical"
    NO_DRY_RUN = "no_dry_run"
    HIGH_BLAST_NO_TESTS = "high_blast_no_tests"
    NLI_CONTRADICTION = "nli_contradiction"
    OOD_STACK_NO_SANDBOX = "ood_stack_no_sandbox"


@dataclass
class TripwireViolation:
    """A detected tripwire violation"""
    tripwire_type: TripwireType
    severity: str  # "critical" or "major"
    description: str
    forced_action: str  # "stop" or "ask"
    rationale: str


@dataclass
class TripwireContext:
    """Context for tripwire evaluation"""
    # Task characteristics
    task_class: str  # "atomic", "routine", "open_world", "risky"

    # Evidence characteristics
    source_count: int
    has_empirical_verification: bool
    contradiction_risk: float  # From conflict detector

    # Impact factors
    blast_radius: float
    reversibility: float
    has_dry_run: bool
    has_backup: bool

    # Test coverage
    test_coverage: str  # "good_tests", "some_tests", "weak_tests", "na"

    # Environment
    is_production: bool
    is_out_of_distribution_stack: bool  # Unfamiliar tech stack
    has_sandbox: bool


class TripwireEngine:
    """
    Evaluates tripwire rules and forces conservative actions

    The 5 critical tripwires (from GPT-5 framework):
    1. Single-source empirical (open_world) → Cap p_correct_low ≤ 0.70
    2. No dry-run/backup (risky) → Force "stop"
    3. High blast radius + low test coverage → Force "ask"
    4. NLI-grade contradiction ≥ medium → Force "ask"
    5. Out-of-distribution stack without sandbox → Force "ask"
    """

    def __init__(self):
        pass

    def evaluate_tripwires(self, context: TripwireContext) -> List[TripwireViolation]:
        """
        Evaluate all tripwire rules against context

        Returns list of triggered violations (empty if none)
        """
        violations = []

        # Tripwire 1: Single-source empirical (open_world)
        if self._check_single_source_empirical(context):
            violations.append(TripwireViolation(
                tripwire_type=TripwireType.SINGLE_SOURCE_EMPIRICAL,
                severity="major",
                description="Open-world task with only one empirical source",
                forced_action="cap_confidence",
                rationale="Single-source verification in uncertain domain is insufficient. "
                         "Cap p_correct_low at 0.70 to reflect higher uncertainty."
            ))

        # Tripwire 2: No dry-run/backup (risky)
        if self._check_no_dry_run(context):
            violations.append(TripwireViolation(
                tripwire_type=TripwireType.NO_DRY_RUN,
                severity="critical",
                description="Risky operation without dry-run or backup",
                forced_action="stop",
                rationale="High-impact changes require either dry-run validation or "
                         "backup/rollback mechanism. Do not proceed without safety measures."
            ))

        # Tripwire 3: High blast radius + low test coverage
        if self._check_high_blast_no_tests(context):
            violations.append(TripwireViolation(
                tripwire_type=TripwireType.HIGH_BLAST_NO_TESTS,
                severity="major",
                description="High blast radius with weak test coverage",
                forced_action="ask",
                rationale=f"Blast radius {context.blast_radius:.2f} with {context.test_coverage} "
                         "increases risk. Request user approval before proceeding."
            ))

        # Tripwire 4: NLI-grade contradiction
        if self._check_nli_contradiction(context):
            violations.append(TripwireViolation(
                tripwire_type=TripwireType.NLI_CONTRADICTION,
                severity="major",
                description=f"Medium/high contradiction detected (risk: {context.contradiction_risk:.2f})",
                forced_action="ask",
                rationale="Conflicting evidence requires explicit resolution. "
                         "Present alternatives to user for decision."
            ))

        # Tripwire 5: Out-of-distribution stack without sandbox
        if self._check_ood_stack_no_sandbox(context):
            violations.append(TripwireViolation(
                tripwire_type=TripwireType.OOD_STACK_NO_SANDBOX,
                severity="major",
                description="Unfamiliar tech stack without sandbox environment",
                forced_action="ask",
                rationale="Working with unfamiliar technology in production environment. "
                         "Recommend testing in sandbox first or requesting user guidance."
            ))

        return violations

    def _check_single_source_empirical(self, context: TripwireContext) -> bool:
        """
        Tripwire 1: Single-source empirical (open_world)

        Triggers when:
        - Task is open_world
        - Has empirical verification
        - Only 1 source
        """
        return (
            context.task_class == "open_world" and
            context.has_empirical_verification and
            context.source_count <= 1
        )

    def _check_no_dry_run(self, context: TripwireContext) -> bool:
        """
        Tripwire 2: No dry-run/backup (risky)

        Triggers when:
        - Task is risky
        - No dry-run available
        - No backup available
        - Low reversibility
        """
        return (
            context.task_class == "risky" and
            not context.has_dry_run and
            not context.has_backup and
            context.reversibility < 0.5
        )

    def _check_high_blast_no_tests(self, context: TripwireContext) -> bool:
        """
        Tripwire 3: High blast radius + low test coverage

        Triggers when:
        - Blast radius > 0.6
        - Test coverage is weak or NA
        """
        return (
            context.blast_radius > 0.6 and
            context.test_coverage in ["weak_tests", "na"]
        )

    def _check_nli_contradiction(self, context: TripwireContext) -> bool:
        """
        Tripwire 4: NLI-grade contradiction ≥ medium

        Triggers when:
        - Contradiction risk >= 0.25 (medium severity from conflict detector)
        """
        return context.contradiction_risk >= 0.25

    def _check_ood_stack_no_sandbox(self, context: TripwireContext) -> bool:
        """
        Tripwire 5: Out-of-distribution stack without sandbox

        Triggers when:
        - Working with unfamiliar tech stack
        - In production environment
        - No sandbox available
        """
        return (
            context.is_out_of_distribution_stack and
            context.is_production and
            not context.has_sandbox
        )

    def has_critical_violations(self, violations: List[TripwireViolation]) -> bool:
        """Check if any violations are critical (force "stop")"""
        return any(v.severity == "critical" for v in violations)

    def has_major_violations(self, violations: List[TripwireViolation]) -> bool:
        """Check if any violations are major (force "ask")"""
        return any(v.severity == "major" for v in violations)

    def get_forced_action(self, violations: List[TripwireViolation]) -> Optional[str]:
        """
        Get the most restrictive forced action from violations

        Returns:
            "stop" if any critical violations
            "ask" if any major violations
            None if no violations
        """
        if not violations:
            return None

        if self.has_critical_violations(violations):
            return "stop"

        if self.has_major_violations(violations):
            return "ask"

        return None


def evaluate_tripwires(context: TripwireContext) -> List[TripwireViolation]:
    """
    Convenience function for tripwire evaluation

    Args:
        context: TripwireContext with task and environment details

    Returns:
        List of triggered tripwire violations
    """
    engine = TripwireEngine()
    return engine.evaluate_tripwires(context)


if __name__ == "__main__":
    print("Tripwire Engine Test Results:\n")

    engine = TripwireEngine()

    # Test 1: No violations (safe scenario)
    print("Test 1: No violations - safe atomic task")
    context1 = TripwireContext(
        task_class="atomic",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=0.0,
        blast_radius=0.2,
        reversibility=0.9,
        has_dry_run=True,
        has_backup=True,
        test_coverage="good_tests",
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )
    violations1 = engine.evaluate_tripwires(context1)
    print(f"  Violations: {len(violations1)}")
    print(f"  Forced action: {engine.get_forced_action(violations1)}\n")

    # Test 2: Tripwire 1 - Single source empirical (open_world)
    print("Test 2: Tripwire 1 - Single source empirical")
    context2 = TripwireContext(
        task_class="open_world",
        source_count=1,
        has_empirical_verification=True,
        contradiction_risk=0.0,
        blast_radius=0.3,
        reversibility=0.8,
        has_dry_run=False,
        has_backup=True,
        test_coverage="some_tests",
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )
    violations2 = engine.evaluate_tripwires(context2)
    print(f"  Violations: {len(violations2)}")
    for v in violations2:
        print(f"    - Type: {v.tripwire_type.value}")
        print(f"      Severity: {v.severity}")
        print(f"      Action: {v.forced_action}")
        print(f"      Rationale: {v.rationale}")
    print()

    # Test 3: Tripwire 2 - No dry-run (risky)
    print("Test 3: Tripwire 2 - No dry-run/backup (CRITICAL)")
    context3 = TripwireContext(
        task_class="risky",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=0.0,
        blast_radius=0.7,
        reversibility=0.3,
        has_dry_run=False,
        has_backup=False,
        test_coverage="weak_tests",
        is_production=True,
        is_out_of_distribution_stack=False,
        has_sandbox=False
    )
    violations3 = engine.evaluate_tripwires(context3)
    print(f"  Violations: {len(violations3)}")
    print(f"  Forced action: {engine.get_forced_action(violations3)} ← STOPS execution")
    for v in violations3:
        print(f"    - Type: {v.tripwire_type.value}")
        print(f"      Severity: {v.severity}")
    print()

    # Test 4: Multiple tripwires
    print("Test 4: Multiple tripwires triggered")
    context4 = TripwireContext(
        task_class="routine",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=0.35,  # Triggers Tripwire 4
        blast_radius=0.8,  # Triggers Tripwire 3
        reversibility=0.6,
        has_dry_run=False,
        has_backup=True,
        test_coverage="weak_tests",
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )
    violations4 = engine.evaluate_tripwires(context4)
    print(f"  Violations: {len(violations4)}")
    print(f"  Forced action: {engine.get_forced_action(violations4)}")
    for v in violations4:
        print(f"    - {v.tripwire_type.value}: {v.description}")
    print()
