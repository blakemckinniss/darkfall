#!/usr/bin/env python3
"""
Confidence Auditor Hook (PostToolUse)

Triggered: After each tool use
Purpose: Audit confidence rubric and enforce gating decisions

Actions:
1. Extract rubric from Claude's response (if present)
2. Verify metrics match tool usage
3. Call conflict detector (Zen MCP or heuristics)
4. Compute calibrated confidence
5. Apply tripwires and budget constraints
6. Determine gate decision
7. Log to history
8. Return guidance to Claude
"""

import sys
import json
import os
from pathlib import Path
from typing import Dict, Optional, List
from datetime import datetime

# Add lib to path
HOOKS_DIR = Path(__file__).parent
sys.path.insert(0, str(HOOKS_DIR / "lib"))

from rubric_schema import ConfidenceRubric, Evidence, Conflict
from confidence_model import ConfidenceModel, ConfidenceMetrics
from impact_model import ImpactModel, ImpactFactors, Environment
from beta_bounds import BetaBoundsCalculator, BucketHistory
from calibration_engine import CalibrationEngine, CalibrationSample
from nli_heuristics import NLIHeuristics
from tripwires import TripwireEngine, TripwireContext
from verification_budget import BudgetTracker, Budget, get_budget_for_task_class
from action_gates import ActionGate, GateContext

# Optional: ContinuationManager for calibration tuning sessions
try:
    from continuation_manager import ContinuationManager, get_global_manager
    CONTINUATION_MANAGER_AVAILABLE = True
except ImportError:
    CONTINUATION_MANAGER_AVAILABLE = False


def load_history(history_path: Path) -> List[Dict]:
    """Load calibration history from JSONL"""
    if not history_path.exists():
        return []

    history = []
    with open(history_path, 'r') as f:
        for line in f:
            if line.strip():
                history.append(json.loads(line))
    return history


def save_to_history(rubric: Dict, history_path: Path):
    """Append rubric to history file"""
    history_path.parent.mkdir(parents=True, exist_ok=True)

    with open(history_path, 'a') as f:
        f.write(json.dumps(rubric) + '\n')


def audit_rubric(rubric_data: Dict, tool_history: List[Dict]) -> Dict:
    """
    Audit confidence rubric and determine gate

    Args:
        rubric_data: Parsed rubric JSON from Claude
        tool_history: Recent tool usage history

    Returns:
        Dict with audit results and guidance
    """
    try:
        # Parse rubric
        rubric = ConfidenceRubric.from_dict(rubric_data)
    except Exception as e:
        return {
            "error": f"Failed to parse rubric: {e}",
            "gate": "ask",
            "rationale": "Invalid rubric format - please review and correct"
        }

    # Step 1: Conflict detection
    if rubric.evidence:
        # Convert to Evidence objects
        evidence_list = [
            Evidence(
                id=e['id'],
                kind=e['kind'],
                where=e['where'],
                quote=e['quote'],
                independence_key=e['independence_key'],
                credibility=e['credibility'],
                timestamp=e.get('timestamp')
            )
            for e in rubric_data['evidence']
        ]

        # Use heuristic conflict detection (Zen MCP integration would go here)
        detector = NLIHeuristics()
        detected_conflicts = detector.detect_conflicts(evidence_list)

        # Update contradiction_risk based on detected conflicts
        contradiction_risk = sum(
            0.4 if c.severity == "high" else 0.25 if c.severity == "medium" else 0.1
            for c in detected_conflicts
        )

        # Update rubric metrics
        rubric.metrics.contradiction_risk = max(
            rubric.metrics.contradiction_risk,
            contradiction_risk
        )

    # Step 2: Recalculate confidence with updated metrics
    conf_model = ConfidenceModel()
    metrics = ConfidenceMetrics(**rubric_data['metrics'])

    confidence = conf_model.calculate_confidence(
        metrics,
        rubric.task_class,
        is_open_world=(rubric.task_class == "open_world")
    )

    # Step 3: Load history and calibrate
    history_path = HOOKS_DIR.parent / "confidence_history.jsonl"
    history = load_history(history_path)

    # Filter history for this bucket
    bucket_samples = [
        CalibrationSample(
            p_raw=h.get("confidence", {}).get("p_raw", 0.5),
            outcome=h.get("outcome", False),
            bucket=h.get("confidence", {}).get("bucket", "unknown")
        )
        for h in history
        if h.get("confidence", {}).get("bucket") == confidence.bucket
    ]

    # Calibrate
    cal_engine = CalibrationEngine()
    cal_result = cal_engine.calibrate(
        confidence.p_raw,
        confidence.bucket,
        bucket_samples
    )

    # Step 4: Compute conservative lower bound
    bucket_history_data = [h for h in history if h.get("confidence", {}).get("bucket") == confidence.bucket]
    successes = sum(1 for h in bucket_history_data if h.get("outcome", False))
    failures = len(bucket_history_data) - successes

    if successes + failures > 0:
        bucket_hist = BucketHistory(
            bucket_id=confidence.bucket,
            successes=successes,
            failures=failures,
            total=successes + failures
        )
        bounds_calc = BetaBoundsCalculator()
        try:
            bounds = bounds_calc.calculate_bounds(bucket_hist)
            p_correct_low = bounds.p_lower
        except:
            # Fallback if scipy not available
            p_correct_low = cal_result.p_calibrated * 0.85
    else:
        # No history - conservative estimate
        p_correct_low = cal_result.p_calibrated * 0.75

    # Update rubric confidence
    rubric.confidence.p_raw = confidence.p_raw
    rubric.confidence.p_correct_mean = cal_result.p_calibrated
    rubric.confidence.p_correct_low = p_correct_low

    # Step 5: Tripwire evaluation
    tripwire_context = TripwireContext(
        task_class=rubric.task_class,
        source_count=len(set(e['independence_key'] for e in rubric_data['evidence'])),
        has_empirical_verification=any(e['kind'] == 'empirical' for e in rubric_data['evidence']),
        contradiction_risk=rubric.metrics.contradiction_risk,
        blast_radius=rubric.axes.blast_radius,
        reversibility=rubric.axes.reversibility,
        has_dry_run=any(c['name'] == 'dry_run' for c in rubric_data.get('checks', [])),
        has_backup=True,  # Assume git provides backup
        test_coverage="good_tests" if rubric.metrics.empirical_verification > 0.7 else "weak_tests",
        is_production=rubric.axes.exposure > 0.5,
        is_out_of_distribution_stack=rubric.axes.novelty > 0.7,
        has_sandbox=rubric.axes.exposure < 0.1
    )

    tripwire_engine = TripwireEngine()
    tripwire_violations = tripwire_engine.evaluate_tripwires(tripwire_context)
    tripwire_action = tripwire_engine.get_forced_action(tripwire_violations)

    # Step 6: Budget checking (simplified - would track in real implementation)
    budget_action = None  # No violations in audit phase

    # Step 7: Gate decision
    expected_risk = rubric.risk.impact * (1 - p_correct_low)

    gate_context = GateContext(
        expected_risk=expected_risk,
        impact=rubric.risk.impact,
        p_correct_low=p_correct_low,
        has_tripwire_violations=len(tripwire_violations) > 0,
        tripwire_forced_action=tripwire_action,
        has_budget_violations=False,
        budget_forced_action=budget_action
    )

    gate_engine = ActionGate()
    gate_result = gate_engine.determine_gate(gate_context)

    # Update rubric
    rubric.gate = gate_result.decision.value
    rubric.risk.expected_risk = expected_risk

    # Step 8: Save to history (with outcome = unknown for now)
    history_entry = rubric.to_dict()
    history_entry['outcome'] = None  # Will be updated later by user or system
    history_entry['audit_timestamp'] = datetime.now().isoformat()

    save_to_history(history_entry, history_path)

    # Step 9: Generate guidance
    guidance = gate_engine.format_guidance(gate_result, gate_context)

    # Add tripwire warnings if any
    if tripwire_violations:
        guidance += "\n\n⚠️ Tripwire Violations Detected:\n"
        for v in tripwire_violations:
            guidance += f"\n  - {v.tripwire_type.value}: {v.description}\n"
            guidance += f"    Rationale: {v.rationale}\n"

    return {
        "gate": gate_result.decision.value,
        "confidence": {
            "p_raw": confidence.p_raw,
            "p_correct_mean": cal_result.p_calibrated,
            "p_correct_low": p_correct_low
        },
        "risk": {
            "impact": rubric.risk.impact,
            "expected_risk": expected_risk
        },
        "tripwire_violations": len(tripwire_violations),
        "guidance": guidance,
        "calibration_method": cal_result.method,
        "bucket": confidence.bucket
    }


def extract_rubric_from_response(tool_response: Dict) -> Optional[Dict]:
    """
    Extract confidence rubric JSON from Claude's response

    Looks for JSON code blocks containing rubric data in the tool response text.
    """
    # Get response text (could be in various fields)
    response_text = ""

    if isinstance(tool_response, dict):
        # Try common response fields
        response_text = tool_response.get('content', '') or \
                       tool_response.get('text', '') or \
                       tool_response.get('output', '') or \
                       str(tool_response)
    else:
        response_text = str(tool_response)

    if not response_text:
        return None

    # Look for JSON code blocks: ```json\n{...}\n```
    import re
    json_blocks = re.findall(r'```json\s*\n(.*?)\n```', response_text, re.DOTALL)

    for block in json_blocks:
        try:
            data = json.loads(block)
            # Validate this looks like a confidence rubric
            if all(key in data for key in ['task_summary', 'task_class', 'confidence', 'gate']):
                return data
        except json.JSONDecodeError:
            continue

    # Try finding raw JSON objects in the text
    json_objects = re.findall(r'\{[^{}]*"task_summary"[^{}]*\}', response_text, re.DOTALL)
    for obj_str in json_objects:
        try:
            # Expand to capture full nested object
            start = response_text.index(obj_str)
            brace_count = 0
            end = start
            for i, char in enumerate(response_text[start:], start=start):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end = i + 1
                        break

            full_json = response_text[start:end]
            data = json.loads(full_json)

            if all(key in data for key in ['task_summary', 'task_class', 'confidence', 'gate']):
                return data
        except (json.JSONDecodeError, ValueError, KeyError):
            continue

    return None


def main():
    """Main hook entry point"""
    try:
        # Read stdin
        input_data = json.load(sys.stdin)

        # Extract data
        tool_response = input_data.get('tool_response', {})
        tool_name = input_data.get('tool_name', '')

        # Try to extract rubric from response
        rubric_data = extract_rubric_from_response(tool_response)

        if not rubric_data:
            # No rubric found - this is normal for most tool uses
            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": ""
                }
            }
            print(json.dumps(output))
            return

        # Rubric found - audit it!
        tool_history = []  # Would track recent tool uses for context
        audit_result = audit_rubric(rubric_data, tool_history)

        # Format guidance for Claude
        guidance = f"\n---\n## 🎯 Confidence Audit Results\n\n"
        guidance += f"**Gate Decision: {audit_result['gate'].upper()}**\n\n"
        guidance += f"**Confidence:**\n"
        guidance += f"- Raw: {audit_result['confidence']['p_raw']:.1%}\n"
        guidance += f"- Calibrated: {audit_result['confidence']['p_correct_mean']:.1%}\n"
        guidance += f"- Conservative Lower Bound: {audit_result['confidence']['p_correct_low']:.1%}\n"
        guidance += f"- Bucket: {audit_result['bucket']}\n\n"
        guidance += f"**Risk Assessment:**\n"
        guidance += f"- Impact: {audit_result['risk']['impact']:.2f}\n"
        guidance += f"- Expected Risk: {audit_result['risk']['expected_risk']:.1%}\n\n"

        if audit_result.get('tripwire_violations', 0) > 0:
            guidance += f"⚠️ **{audit_result['tripwire_violations']} Tripwire Violation(s) Detected**\n\n"

        guidance += f"**Calibration Method:** {audit_result['calibration_method']}\n\n"
        guidance += audit_result['guidance']
        guidance += "\n---\n"

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": guidance
            }
        }

        print(json.dumps(output))

    except Exception as e:
        # Graceful failure - log error but don't block
        import traceback
        error_details = traceback.format_exc()

        output = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": f"\n⚠️ Confidence auditor encountered an error (non-blocking):\n{str(e)}\n"
            }
        }
        print(json.dumps(output))

        # Log to file for debugging
        log_path = HOOKS_DIR.parent / "confidence_auditor_errors.log"
        try:
            with open(log_path, 'a') as f:
                f.write(f"\n{datetime.now().isoformat()} - Error:\n{error_details}\n")
        except:
            pass

        sys.exit(0)


# Calibration Tuning Utilities (for Week 4 work)

def start_calibration_session(task_id: Optional[str] = None) -> Optional[str]:
    """
    Start a calibration tuning session with automatic continuation management

    Args:
        task_id: Optional task identifier for this calibration session

    Returns:
        continuation_id if ContinuationManager available, None otherwise

    Example:
        continuation_id = start_calibration_session("threshold-tuning")
        # ... perform calibration work with Zen MCP ...
        complete_calibration_session()
    """
    if not CONTINUATION_MANAGER_AVAILABLE:
        return None

    manager = get_global_manager()
    return manager.start_task("calibration-tuning", task_id)


def continue_calibration_session() -> Optional[str]:
    """
    Continue existing calibration session (reuses continuation_id)

    Returns:
        continuation_id if session active, None otherwise
    """
    if not CONTINUATION_MANAGER_AVAILABLE:
        return None

    manager = get_global_manager()
    return manager.continue_task("calibration-tuning")


def complete_calibration_session():
    """
    Mark calibration session as complete

    Should be called when threshold tuning or calibration work is finished.
    """
    if not CONTINUATION_MANAGER_AVAILABLE:
        return

    manager = get_global_manager()
    manager.complete_task("calibration-tuning")


if __name__ == "__main__":
    main()
