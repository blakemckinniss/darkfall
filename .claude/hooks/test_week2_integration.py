#!/usr/bin/env python3
"""
Week 2 Integration Test: Conflict Detection + Tripwires + Budget + Gates

Tests complete integration of:
1. Conflict detection (heuristic fallback)
2. Tripwire rules (5 critical safety checks)
3. Budget enforcement (action/time limits)
4. Action gates (risk-based decision making)
"""

import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / "lib"))

from nli_heuristics import NLIHeuristics, Evidence, Conflict
from tripwires import TripwireEngine, TripwireContext
from verification_budget import BudgetTracker, Budget, BudgetViolationError
from action_gates import ActionGate, GateContext, GateDecision


def test_scenario_1_safe_routine_task():
    """
    Scenario 1: Safe routine task
    - No conflicts in evidence
    - No tripwire violations
    - Within budget
    - Low risk → PROCEED
    """
    print("=" * 80)
    print("SCENARIO 1: Safe Routine Task - Should PROCEED")
    print("=" * 80)

    # Step 1: Conflict detection (no conflicts)
    print("\n1. Conflict Detection:")
    evidence = [
        Evidence(
            id="e1",
            kind="web",
            where="docs.python.org",
            quote="Python 3.12 includes PEP 701",
            independence_key="python.org",
            credibility=0.95
        ),
        Evidence(
            id="e2",
            kind="web",
            where="github.com/python",
            quote="Python 3.12 was released in October 2023",
            independence_key="github.com/python",
            credibility=0.90
        )
    ]

    detector = NLIHeuristics()
    conflicts = detector.detect_conflicts(evidence)
    contradiction_risk = sum(0.4 if c.severity == "high" else 0.25 if c.severity == "medium" else 0.1 for c in conflicts)

    print(f"   Conflicts found: {len(conflicts)}")
    print(f"   Contradiction risk: {contradiction_risk:.3f}")

    # Step 2: Tripwire evaluation (no violations)
    print("\n2. Tripwire Evaluation:")
    tripwire_context = TripwireContext(
        task_class="routine",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=contradiction_risk,
        blast_radius=0.3,
        reversibility=0.8,
        has_dry_run=True,
        has_backup=True,
        test_coverage="good_tests",
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )

    tripwire_engine = TripwireEngine()
    tripwire_violations = tripwire_engine.evaluate_tripwires(tripwire_context)

    print(f"   Tripwire violations: {len(tripwire_violations)}")
    tripwire_action = tripwire_engine.get_forced_action(tripwire_violations)
    print(f"   Forced action: {tripwire_action}")

    # Step 3: Budget tracking (within limits)
    print("\n3. Budget Tracking:")
    budget = Budget(
        max_actions=10,
        max_time_seconds=120,
        allowed_tools={"Read", "Grep", "WebSearch"},
        mandatory=set()
    )

    tracker = BudgetTracker(budget)
    tracker.start()

    try:
        # Simulate some tool usage
        tracker.check_tool("Read")
        tracker.record_action("Read")
        tracker.check_tool("Grep")
        tracker.record_action("Grep")
        tracker.check_mandatory()

        status = tracker.get_status()
        print(f"   Actions: {status.actions_used}/{budget.max_actions}")
        print(f"   Time: {status.elapsed_seconds:.3f}s/{budget.max_time_seconds}s")
        budget_action = tracker.get_forced_action()
        print(f"   Budget violations: {len(tracker.get_violations())}")
    except BudgetViolationError as e:
        print(f"   Budget violation: {e}")
        budget_action = "stop"

    # Step 4: Action gate (risk-based decision)
    print("\n4. Action Gate Decision:")
    impact = 0.12
    p_correct_low = 0.85
    expected_risk = impact * (1 - p_correct_low)

    gate_context = GateContext(
        expected_risk=expected_risk,
        impact=impact,
        p_correct_low=p_correct_low,
        has_tripwire_violations=len(tripwire_violations) > 0,
        tripwire_forced_action=tripwire_action,
        has_budget_violations=tracker.has_violations(),
        budget_forced_action=budget_action
    )

    gate = ActionGate()
    result = gate.determine_gate(gate_context)

    print(f"   Expected risk: {expected_risk:.1%}")
    print(f"   Decision: {result.decision.value.upper()}")
    print(f"   Rationale: {result.rationale}")

    print(f"\n✅ RESULT: {result.decision.value.upper()}")
    print("=" * 80 + "\n")

    return result.decision == GateDecision.PROCEED


def test_scenario_2_tripwire_violation():
    """
    Scenario 2: Tripwire violation
    - High blast radius with weak tests
    - Triggers Tripwire 3 → ASK
    """
    print("=" * 80)
    print("SCENARIO 2: Tripwire Violation - Should ASK")
    print("=" * 80)

    print("\n1. Tripwire Evaluation:")
    tripwire_context = TripwireContext(
        task_class="routine",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=0.0,
        blast_radius=0.75,  # HIGH blast radius
        reversibility=0.6,
        has_dry_run=False,
        has_backup=True,
        test_coverage="weak_tests",  # WEAK test coverage
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )

    tripwire_engine = TripwireEngine()
    tripwire_violations = tripwire_engine.evaluate_tripwires(tripwire_context)

    print(f"   Tripwire violations: {len(tripwire_violations)}")
    for v in tripwire_violations:
        print(f"     - {v.tripwire_type.value}: {v.description}")
        print(f"       Action: {v.forced_action}")

    tripwire_action = tripwire_engine.get_forced_action(tripwire_violations)

    # Gate decision
    print("\n2. Action Gate Decision:")
    gate_context = GateContext(
        expected_risk=0.05,  # Low risk, but tripwire overrides
        impact=0.2,
        p_correct_low=0.75,
        has_tripwire_violations=len(tripwire_violations) > 0,
        tripwire_forced_action=tripwire_action,
        has_budget_violations=False,
        budget_forced_action=None
    )

    gate = ActionGate()
    result = gate.determine_gate(gate_context)

    print(f"   Decision: {result.decision.value.upper()}")
    print(f"   Rationale: {result.rationale}")

    print(f"\n⚠️ RESULT: {result.decision.value.upper()} (tripwire override)")
    print("=" * 80 + "\n")

    return result.decision == GateDecision.ASK


def test_scenario_3_budget_violation():
    """
    Scenario 3: Budget violation
    - Exceeds action limit
    - Triggers budget violation → STOP
    """
    print("=" * 80)
    print("SCENARIO 3: Budget Violation - Should STOP")
    print("=" * 80)

    print("\n1. Budget Tracking:")
    budget = Budget(
        max_actions=3,
        max_time_seconds=120,
        allowed_tools={"Read", "Grep"},
        mandatory=set()
    )

    tracker = BudgetTracker(budget)
    tracker.start()

    budget_action = None
    try:
        # Try to exceed action limit
        for i in range(5):
            tracker.check_tool("Read")
            tracker.record_action("Read")
            print(f"   Action {i+1}: Read")
    except BudgetViolationError as e:
        print(f"\n   ✗ Budget violation: {e.violation.description}")
        budget_action = e.violation.forced_action

    # Gate decision
    print("\n2. Action Gate Decision:")
    gate_context = GateContext(
        expected_risk=0.01,  # Very low risk, but budget violation overrides
        impact=0.1,
        p_correct_low=0.90,
        has_tripwire_violations=False,
        tripwire_forced_action=None,
        has_budget_violations=True,
        budget_forced_action=budget_action
    )

    gate = ActionGate()
    result = gate.determine_gate(gate_context)

    print(f"   Decision: {result.decision.value.upper()}")
    print(f"   Rationale: {result.rationale}")

    print(f"\n🛑 RESULT: {result.decision.value.upper()} (budget violation)")
    print("=" * 80 + "\n")

    return result.decision == GateDecision.STOP


def test_scenario_4_conflict_detection():
    """
    Scenario 4: Contradiction detected
    - Conflicting evidence
    - Triggers NLI contradiction tripwire → ASK
    """
    print("=" * 80)
    print("SCENARIO 4: Contradiction Detection - Should ASK")
    print("=" * 80)

    # Step 1: Detect conflicts
    print("\n1. Conflict Detection:")
    evidence = [
        Evidence(
            id="e1",
            kind="web",
            where="source-a.com",
            quote="Tailwind v4 requires Node.js 18+",
            independence_key="source-a.com",
            credibility=0.90
        ),
        Evidence(
            id="e2",
            kind="web",
            where="source-b.com",
            quote="Tailwind v4 does not require Node.js 18+, works with Node 16",
            independence_key="source-b.com",
            credibility=0.80
        )
    ]

    detector = NLIHeuristics()
    conflicts = detector.detect_conflicts(evidence)

    print(f"   Conflicts found: {len(conflicts)}")
    for c in conflicts:
        print(f"     - Severity: {c.severity}")
        print(f"       Description: {c.description}")
        print(f"       Resolution: {c.resolution}")

    # Compute contradiction risk
    contradiction_risk = sum(
        0.4 if c.severity == "high" else 0.25 if c.severity == "medium" else 0.1
        for c in conflicts
    )
    print(f"   Contradiction risk: {contradiction_risk:.3f}")

    # Step 2: Tripwire evaluation
    print("\n2. Tripwire Evaluation:")
    tripwire_context = TripwireContext(
        task_class="open_world",
        source_count=2,
        has_empirical_verification=True,
        contradiction_risk=contradiction_risk,  # Should trigger Tripwire 4
        blast_radius=0.3,
        reversibility=0.8,
        has_dry_run=False,
        has_backup=True,
        test_coverage="some_tests",
        is_production=False,
        is_out_of_distribution_stack=False,
        has_sandbox=True
    )

    tripwire_engine = TripwireEngine()
    tripwire_violations = tripwire_engine.evaluate_tripwires(tripwire_context)

    print(f"   Tripwire violations: {len(tripwire_violations)}")
    for v in tripwire_violations:
        print(f"     - {v.tripwire_type.value}")

    tripwire_action = tripwire_engine.get_forced_action(tripwire_violations)

    # Step 3: Gate decision
    print("\n3. Action Gate Decision:")
    gate_context = GateContext(
        expected_risk=0.05,
        impact=0.2,
        p_correct_low=0.75,
        has_tripwire_violations=len(tripwire_violations) > 0,
        tripwire_forced_action=tripwire_action,
        has_budget_violations=False,
        budget_forced_action=None
    )

    gate = ActionGate()
    result = gate.determine_gate(gate_context)

    print(f"   Decision: {result.decision.value.upper()}")
    print(f"   Rationale: {result.rationale}")

    print(f"\n🤔 RESULT: {result.decision.value.upper()} (contradiction requires resolution)")
    print("=" * 80 + "\n")

    return result.decision == GateDecision.ASK


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("WEEK 2 INTEGRATION TEST: Conflict Detection + Tripwires + Budget + Gates")
    print("=" * 80 + "\n")

    results = []

    try:
        results.append(("Safe routine task", test_scenario_1_safe_routine_task()))
        results.append(("Tripwire violation", test_scenario_2_tripwire_violation()))
        results.append(("Budget violation", test_scenario_3_budget_violation()))
        results.append(("Contradiction detection", test_scenario_4_conflict_detection()))

        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        for name, passed in results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"{status}: {name}")

        all_passed = all(passed for _, passed in results)
        if all_passed:
            print(f"\n✅ ALL TESTS PASSED ({len(results)}/{len(results)})")
            print("\nWeek 2 Components Validated:")
            print("  1. Conflict Detection (NLI Heuristics) ✓")
            print("  2. Tripwire Rules (5 critical safety checks) ✓")
            print("  3. Budget Enforcement (action/time limits) ✓")
            print("  4. Action Gates (risk-based decisions) ✓")
        else:
            failed = sum(1 for _, passed in results if not passed)
            print(f"\n✗ SOME TESTS FAILED ({len(results)-failed}/{len(results)} passed)")
            sys.exit(1)

    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
