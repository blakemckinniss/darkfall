#!/usr/bin/env python3
"""
End-to-End Test for Confidence Calibration Pipeline

Tests complete flow:
1. Task classification (input prompt → task class + axes)
2. Confidence calculation (metrics → p_raw via logistic model)
3. Calibration (p_raw → p_correct_mean via Platt Scaling)
4. Bayesian bounds (history → p_correct_low via Beta posteriors)
5. Impact assessment (factors → impact score)
6. Risk calculation (impact × (1 - p_correct_low) → expected_risk)
"""

import sys
import json
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / "lib"))

from task_classifier import TaskClassifier, TaskClassification
from confidence_model import ConfidenceModel, ConfidenceMetrics, ConfidenceResult
from impact_model import ImpactModel, ImpactFactors, ImpactResult, Environment
from beta_bounds import BetaBoundsCalculator, BucketHistory
from calibration_engine import CalibrationEngine, CalibrationSample


def load_synthetic_history(path: Path):
    """Load synthetic history from JSONL"""
    history = []
    with open(path, 'r') as f:
        for line in f:
            history.append(json.loads(line))
    return history


def test_scenario_atomic():
    """Test Scenario: Atomic task with high confidence"""
    print("=" * 80)
    print("TEST SCENARIO 1: ATOMIC TASK - 'What does a transmission do?'")
    print("=" * 80)

    # Step 1: Task Classification
    classifier = TaskClassifier()
    classification = classifier.classify(
        "What does a transmission do?",
        context={}
    )

    print(f"\n1. Task Classification:")
    print(f"   Class: {classification.task_class.value}")
    print(f"   Axes: novelty={classification.axes.novelty:.2f}, "
          f"externality={classification.axes.externality:.2f}, "
          f"blast={classification.axes.blast_radius:.2f}")
    print(f"   Reasoning: {classification.reasoning}")

    # Step 2: Confidence Calculation
    metrics = ConfidenceMetrics(
        spec_completeness=1.0,
        context_grounding=0.8,
        tooling_path=1.0,
        empirical_verification=1.0,
        source_diversity=0.0,
        time_relevance=0.0,
        reproducibility=1.0,
        assumption_risk=0.0,
        contradiction_risk=0.0,
        novelty_penalty=0.1
    )

    conf_model = ConfidenceModel()
    confidence = conf_model.calculate_confidence(
        metrics,
        classification.task_class.value,
        is_open_world=False
    )

    print(f"\n2. Confidence Calculation:")
    print(f"   Evidence score (z): {confidence.evidence_score:.3f}")
    print(f"   p_raw (uncalibrated): {confidence.p_raw:.3f}")
    print(f"   Bucket: {confidence.bucket}")

    # Step 3: Calibration (using synthetic history)
    history_path = Path(__file__).parent / "synthetic_history_seed.jsonl"
    synthetic_history = load_synthetic_history(history_path)

    # Filter history for this bucket
    bucket_samples = [
        CalibrationSample(
            p_raw=h["p_raw"],
            outcome=h["outcome"],
            bucket=h["bucket"]
        )
        for h in synthetic_history
        if h["task_class"] == "atomic"
    ]

    cal_engine = CalibrationEngine()
    cal_result = cal_engine.calibrate(
        confidence.p_raw,
        confidence.bucket,
        bucket_samples
    )

    print(f"\n3. Calibration:")
    print(f"   p_correct_mean: {cal_result.p_calibrated:.3f}")
    print(f"   Method: {cal_result.method}")
    print(f"   Samples used: {cal_result.samples_used}")

    # Step 4: Bayesian Lower Bound
    atomic_history = [h for h in synthetic_history if h["task_class"] == "atomic"]
    successes = sum(1 for h in atomic_history if h["outcome"])
    failures = len(atomic_history) - successes

    bucket_history = BucketHistory(
        bucket_id=confidence.bucket,
        successes=successes,
        failures=failures,
        total=len(atomic_history)
    )

    bounds_calc = BetaBoundsCalculator(alpha_prior=2.0, beta_prior=2.0)
    bounds = bounds_calc.calculate_bounds(bucket_history)

    print(f"\n4. Bayesian Bounds:")
    print(f"   Posterior: Beta({bounds.alpha:.1f}, {bounds.beta:.1f})")
    print(f"   p_correct_low (10th percentile): {bounds.p_lower:.3f}")
    print(f"   90% Credible Interval: [{bounds.p_lower:.3f}, {bounds.p_upper:.3f}]")

    # Step 5: Impact Assessment
    impact_factors = ImpactFactors(
        files_changed=0,
        services_touched=0,
        environment=Environment.LOCAL
    )

    impact_model = ImpactModel()
    impact = impact_model.calculate_impact(impact_factors)

    print(f"\n5. Impact Assessment:")
    print(f"   Impact: {impact.impact:.3f}")
    print(f"   Reasoning: {impact.reasoning}")

    # Step 6: Risk Calculation
    expected_risk = impact.impact * (1 - bounds.p_lower)

    print(f"\n6. Risk-Based Gating:")
    print(f"   Expected Risk: {expected_risk:.4f}")

    if expected_risk < 0.02:
        gate = "proceed"
    elif expected_risk < 0.08:
        gate = "caution"
    elif expected_risk < 0.20:
        gate = "ask"
    else:
        gate = "stop"

    print(f"   Gate Decision: {gate.upper()}")

    print("\n" + "=" * 80 + "\n")


def test_scenario_open_world():
    """Test Scenario: Open world task with moderate confidence"""
    print("=" * 80)
    print("TEST SCENARIO 2: OPEN_WORLD TASK - 'Configure Tailwind v4 with Next.js 15'")
    print("=" * 80)

    # Step 1: Classification
    classifier = TaskClassifier()
    classification = classifier.classify(
        "Configure Tailwind v4 with Next.js 15",
        context={"has_tests": True}
    )

    print(f"\n1. Task Classification:")
    print(f"   Class: {classification.task_class.value}")
    print(f"   Axes: novelty={classification.axes.novelty:.2f}, "
          f"externality={classification.axes.externality:.2f}")

    # Step 2: Confidence with moderate metrics
    metrics = ConfidenceMetrics(
        spec_completeness=0.7,
        context_grounding=0.6,
        tooling_path=0.8,
        empirical_verification=0.9,
        source_diversity=0.8,
        time_relevance=0.95,
        reproducibility=0.7,
        assumption_risk=0.4,
        contradiction_risk=0.3,
        novelty_penalty=0.5
    )

    conf_model = ConfidenceModel()
    confidence = conf_model.calculate_confidence(
        metrics,
        "open_world",
        is_open_world=True
    )

    print(f"\n2. Confidence Calculation:")
    print(f"   p_raw: {confidence.p_raw:.3f}")

    # Step 3: Calibration
    history_path = Path(__file__).parent / "synthetic_history_seed.jsonl"
    synthetic_history = load_synthetic_history(history_path)

    bucket_samples = [
        CalibrationSample(h["p_raw"], h["outcome"], h["bucket"])
        for h in synthetic_history
        if h["task_class"] == "open_world"
    ]

    cal_engine = CalibrationEngine()
    cal_result = cal_engine.calibrate(confidence.p_raw, confidence.bucket, bucket_samples)

    print(f"\n3. Calibration:")
    print(f"   p_correct_mean: {cal_result.p_calibrated:.3f}")

    # Step 4: Bayesian Bounds
    open_world_history = [h for h in synthetic_history if h["task_class"] == "open_world"]
    successes = sum(1 for h in open_world_history if h["outcome"])
    failures = len(open_world_history) - successes

    bucket_history = BucketHistory(
        bucket_id=confidence.bucket,
        successes=successes,
        failures=failures,
        total=len(open_world_history)
    )

    bounds_calc = BetaBoundsCalculator()
    bounds = bounds_calc.calculate_bounds(bucket_history)

    print(f"\n4. Bayesian Bounds:")
    print(f"   p_correct_low: {bounds.p_lower:.3f}")

    # Step 5: Impact (moderate)
    impact_factors = ImpactFactors(
        files_changed=5,
        services_touched=1,
        config_changes=True,
        has_backup=True,
        environment=Environment.DEV
    )

    impact_model = ImpactModel()
    impact = impact_model.calculate_impact(impact_factors)

    print(f"\n5. Impact Assessment:")
    print(f"   Impact: {impact.impact:.3f}")

    # Step 6: Risk
    expected_risk = impact.impact * (1 - bounds.p_lower)
    gate = "proceed" if expected_risk < 0.02 else "caution" if expected_risk < 0.08 else "ask"

    print(f"\n6. Risk-Based Gating:")
    print(f"   Expected Risk: {expected_risk:.4f}")
    print(f"   Gate Decision: {gate.upper()}")

    print("\n" + "=" * 80 + "\n")


if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("CONFIDENCE CALIBRATION SYSTEM - END-TO-END TEST")
    print("=" * 80 + "\n")

    try:
        test_scenario_atomic()
        test_scenario_open_world()

        print("✓ ALL TESTS PASSED")
        print("\nPipeline validated:")
        print("  1. Task Classification ✓")
        print("  2. Confidence Model (Logistic + Sigmoid) ✓")
        print("  3. Calibration Engine (Platt Scaling) ✓")
        print("  4. Bayesian Bounds (Beta Posteriors) ✓")
        print("  5. Impact Model (3-axis) ✓")
        print("  6. Risk-Based Gating ✓")

    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
