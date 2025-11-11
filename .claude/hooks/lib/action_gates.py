"""
Action Gates for Risk-Based Decision Making

Determines appropriate action based on:
- Expected risk (impact × (1 - p_correct_low))
- Tripwire violations
- Budget violations

Gate decisions:
- "proceed" - Safe to continue automatically
- "caution" - Proceed but log and prepare rollback
- "ask" - Request user approval
- "stop" - Do not proceed
"""

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class GateDecision(Enum):
    """Possible gate decisions"""
    PROCEED = "proceed"
    CAUTION = "caution"
    ASK = "ask"
    STOP = "stop"


@dataclass
class GateContext:
    """Context for gate decision"""
    expected_risk: float  # impact × (1 - p_correct_low)
    impact: float
    p_correct_low: float

    # Overrides
    has_tripwire_violations: bool
    tripwire_forced_action: Optional[str]  # "stop" or "ask"

    has_budget_violations: bool
    budget_forced_action: Optional[str]  # "stop" or "ask"


@dataclass
class GateResult:
    """Result of gate decision"""
    decision: GateDecision
    rationale: str
    actions_required: List[str]  # Required actions before proceeding


class ActionGate:
    """
    Determines appropriate action based on risk and violations

    Risk thresholds (from GPT-5 framework):
    - < 2%: proceed (very low risk)
    - 2-8%: caution (low risk, log + prepare rollback)
    - 8-20%: ask (moderate risk, need approval)
    - > 20%: stop (high risk, do not proceed)

    Violations override risk-based thresholds
    """

    # Risk thresholds
    THRESHOLD_PROCEED = 0.02   # < 2% risk
    THRESHOLD_CAUTION = 0.08   # 2-8% risk
    THRESHOLD_ASK = 0.20       # 8-20% risk
    # > 20% = stop

    def __init__(self):
        pass

    def determine_gate(self, context: GateContext) -> GateResult:
        """
        Determine gate decision from context

        Args:
            context: GateContext with risk and violation info

        Returns:
            GateResult with decision and rationale
        """
        # Check for critical violations first (highest priority)
        if context.tripwire_forced_action == "stop":
            return GateResult(
                decision=GateDecision.STOP,
                rationale="Critical tripwire violation detected",
                actions_required=["Review tripwire violations", "Address safety concerns"]
            )

        if context.budget_forced_action == "stop":
            return GateResult(
                decision=GateDecision.STOP,
                rationale="Critical budget violation detected",
                actions_required=["Review budget constraints", "Reduce verification scope"]
            )

        # Check for major violations (force "ask")
        if context.tripwire_forced_action == "ask":
            return GateResult(
                decision=GateDecision.ASK,
                rationale="Major tripwire violation requires user approval",
                actions_required=["Review tripwire violations", "Get user decision"]
            )

        if context.budget_forced_action == "ask":
            return GateResult(
                decision=GateDecision.ASK,
                rationale="Budget constraints require user approval",
                actions_required=["Review mandatory actions", "Get user approval"]
            )

        # No violations - use risk-based thresholds
        return self._risk_based_decision(context)

    def _risk_based_decision(self, context: GateContext) -> GateResult:
        """
        Make decision based on expected risk

        expected_risk = impact × (1 - p_correct_low)
        """
        risk = context.expected_risk

        if risk < self.THRESHOLD_PROCEED:
            return GateResult(
                decision=GateDecision.PROCEED,
                rationale=f"Very low expected risk ({risk:.1%} < 2%)",
                actions_required=[]
            )

        elif risk < self.THRESHOLD_CAUTION:
            return GateResult(
                decision=GateDecision.CAUTION,
                rationale=f"Low expected risk ({risk:.1%}, 2-8% range)",
                actions_required=[
                    "Log action for audit trail",
                    "Prepare rollback plan",
                    "Monitor for issues"
                ]
            )

        elif risk < self.THRESHOLD_ASK:
            return GateResult(
                decision=GateDecision.ASK,
                rationale=f"Moderate expected risk ({risk:.1%}, 8-20% range)",
                actions_required=[
                    "Present risk assessment to user",
                    "Get explicit approval",
                    "Ensure rollback mechanism ready"
                ]
            )

        else:
            return GateResult(
                decision=GateDecision.STOP,
                rationale=f"High expected risk ({risk:.1%} > 20%)",
                actions_required=[
                    "Do not proceed",
                    "Reduce impact (smaller scope, canary deployment)",
                    "Improve confidence (more verification, better tests)",
                    "Reconsider approach"
                ]
            )

    def format_guidance(self, result: GateResult, context: GateContext) -> str:
        """
        Format human-readable guidance for the gate decision

        Returns formatted string suitable for display to user
        """
        lines = []

        # Header with decision
        decision_emoji = {
            GateDecision.PROCEED: "✅",
            GateDecision.CAUTION: "⚠️",
            GateDecision.ASK: "🤔",
            GateDecision.STOP: "🛑"
        }
        emoji = decision_emoji.get(result.decision, "❓")
        lines.append(f"{emoji} Gate Decision: {result.decision.value.upper()}")
        lines.append("")

        # Rationale
        lines.append(f"Rationale: {result.rationale}")
        lines.append("")

        # Risk breakdown
        lines.append("Risk Assessment:")
        lines.append(f"  - Impact: {context.impact:.3f}")
        lines.append(f"  - Confidence (lower bound): {context.p_correct_low:.3f}")
        lines.append(f"  - Expected Risk: {context.expected_risk:.1%}")
        lines.append("")

        # Violations (if any)
        if context.has_tripwire_violations or context.has_budget_violations:
            lines.append("Violations Detected:")
            if context.has_tripwire_violations:
                lines.append(f"  - Tripwire: {context.tripwire_forced_action}")
            if context.has_budget_violations:
                lines.append(f"  - Budget: {context.budget_forced_action}")
            lines.append("")

        # Required actions
        if result.actions_required:
            lines.append("Required Actions:")
            for action in result.actions_required:
                lines.append(f"  - {action}")

        return "\n".join(lines)


def determine_gate(expected_risk: float,
                  impact: float,
                  p_correct_low: float,
                  tripwire_forced_action: Optional[str] = None,
                  budget_forced_action: Optional[str] = None) -> GateDecision:
    """
    Convenience function for gate determination

    Args:
        expected_risk: Expected risk score (impact × (1 - p_correct_low))
        impact: Impact score [0, 1]
        p_correct_low: Conservative confidence lower bound [0, 1]
        tripwire_forced_action: Override from tripwires ("stop" or "ask")
        budget_forced_action: Override from budget ("stop" or "ask")

    Returns:
        GateDecision enum value
    """
    context = GateContext(
        expected_risk=expected_risk,
        impact=impact,
        p_correct_low=p_correct_low,
        has_tripwire_violations=tripwire_forced_action is not None,
        tripwire_forced_action=tripwire_forced_action,
        has_budget_violations=budget_forced_action is not None,
        budget_forced_action=budget_forced_action
    )

    gate = ActionGate()
    result = gate.determine_gate(context)
    return result.decision


if __name__ == "__main__":
    print("Action Gate Test Results:\n")

    gate = ActionGate()

    # Test 1: Very low risk - PROCEED
    print("Test 1: Very low risk (1.5%) - PROCEED")
    context1 = GateContext(
        expected_risk=0.015,
        impact=0.1,
        p_correct_low=0.85,
        has_tripwire_violations=False,
        tripwire_forced_action=None,
        has_budget_violations=False,
        budget_forced_action=None
    )
    result1 = gate.determine_gate(context1)
    print(f"  Decision: {result1.decision.value}")
    print(f"  Rationale: {result1.rationale}")
    print(f"  Actions: {result1.actions_required}\n")

    # Test 2: Low risk - CAUTION
    print("Test 2: Low risk (5%) - CAUTION")
    context2 = GateContext(
        expected_risk=0.05,
        impact=0.2,
        p_correct_low=0.75,
        has_tripwire_violations=False,
        tripwire_forced_action=None,
        has_budget_violations=False,
        budget_forced_action=None
    )
    result2 = gate.determine_gate(context2)
    print(f"  Decision: {result2.decision.value}")
    print(f"  Rationale: {result2.rationale}")
    print(f"  Actions required: {len(result2.actions_required)}")
    for action in result2.actions_required:
        print(f"    - {action}")
    print()

    # Test 3: Moderate risk - ASK
    print("Test 3: Moderate risk (12%) - ASK")
    context3 = GateContext(
        expected_risk=0.12,
        impact=0.4,
        p_correct_low=0.70,
        has_tripwire_violations=False,
        tripwire_forced_action=None,
        has_budget_violations=False,
        budget_forced_action=None
    )
    result3 = gate.determine_gate(context3)
    print(f"  Decision: {result3.decision.value}")
    print(f"  Rationale: {result3.rationale}\n")

    # Test 4: High risk - STOP
    print("Test 4: High risk (25%) - STOP")
    context4 = GateContext(
        expected_risk=0.25,
        impact=0.5,
        p_correct_low=0.50,
        has_tripwire_violations=False,
        tripwire_forced_action=None,
        has_budget_violations=False,
        budget_forced_action=None
    )
    result4 = gate.determine_gate(context4)
    print(f"  Decision: {result4.decision.value}")
    print(f"  Rationale: {result4.rationale}\n")

    # Test 5: Tripwire override - STOP
    print("Test 5: Tripwire violation overrides low risk - STOP")
    context5 = GateContext(
        expected_risk=0.01,  # Very low risk
        impact=0.1,
        p_correct_low=0.90,
        has_tripwire_violations=True,
        tripwire_forced_action="stop",  # Critical tripwire
        has_budget_violations=False,
        budget_forced_action=None
    )
    result5 = gate.determine_gate(context5)
    print(f"  Decision: {result5.decision.value}")
    print(f"  Rationale: {result5.rationale}")
    print(f"  Note: Risk was only {context5.expected_risk:.1%}, but tripwire forced STOP\n")

    # Test 6: Format guidance
    print("Test 6: Formatted guidance output")
    print("-" * 70)
    guidance = gate.format_guidance(result3, context3)
    print(guidance)
    print("-" * 70)
