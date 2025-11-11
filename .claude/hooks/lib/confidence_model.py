"""
Confidence Model for Probability Calculation

Implements logistic regression model that transforms evidence metrics
into calibrated probabilities using:
1. Raw evidence score (z) from weighted metrics
2. Sigmoid transformation (p_raw)
3. Per-bucket calibration (p_correct_mean)
4. Conservative lower bounds (p_correct_low)
"""

from dataclasses import dataclass
from typing import Dict, Optional
import math
from enum import Enum


class TaskClass(Enum):
    """Task complexity classes"""
    ATOMIC = "atomic"
    ROUTINE = "routine"
    OPEN_WORLD = "open_world"
    RISKY = "risky"


@dataclass
class ConfidenceMetrics:
    """10 metrics that contribute to confidence"""
    # Positive contributions
    spec_completeness: float  # 0-1: How complete is the specification?
    context_grounding: float  # 0-1: How well grounded in codebase context?
    tooling_path: float  # 0-1: Clear path to verification tools?
    empirical_verification: float  # 0-1: Was it empirically tested?
    source_diversity: float  # 0-1: Multiple independent sources? (open_world only)
    time_relevance: float  # 0-1: How recent is the information? (open_world only)
    reproducibility: float  # 0-1: Can results be reproduced?

    # Negative contributions (risks)
    assumption_risk: float  # 0-1: How many unverified assumptions?
    contradiction_risk: float  # 0-1: Conflicting evidence detected?
    novelty_penalty: float  # 0-1: Penalty for unfamiliar territory


@dataclass
class ConfidenceResult:
    """Complete confidence calculation result"""
    p_raw: float  # Uncalibrated probability from sigmoid
    p_correct_mean: float  # Calibrated probability (best estimate)
    p_correct_low: float  # Conservative lower bound (90% credible interval)
    bucket: str  # Calibration bucket identifier
    evidence_score: float  # Raw weighted score (z)


class ConfidenceModel:
    """
    Logistic regression model for confidence calculation

    Based on GPT-5's mathematical framework with Platt Scaling calibration
    """

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        """
        Initialize confidence model with weights

        Args:
            weights: Optional custom weights (uses GPT-5 defaults if None)
        """
        self.weights = weights or self._default_weights()
        self.task_priors = self._default_priors()

    def _default_weights(self) -> Dict[str, float]:
        """Default weights from GPT-5 analysis"""
        return {
            "w0": 0.0,  # Intercept (learned from calibration)
            "w1": 0.18,  # spec_completeness
            "w2": 0.14,  # context_grounding
            "w3": 0.16,  # tooling_path
            "w4": 0.22,  # empirical_verification (highest weight)
            "w5": 0.10,  # source_diversity (open_world only)
            "w6": 0.06,  # time_relevance (open_world only)
            "w7": 0.10,  # assumption_risk (penalty)
            "w8": 0.12,  # contradiction_risk (penalty)
            "w9": 0.06,  # novelty_penalty
            "w10": 0.12,  # reproducibility
        }

    def _default_priors(self) -> Dict[str, float]:
        """Task class priors that shift baseline confidence"""
        return {
            "atomic": 1.5,  # sigmoid(1.5) ≈ 0.82
            "routine": 0.5,  # sigmoid(0.5) ≈ 0.62
            "open_world": -0.5,  # sigmoid(-0.5) ≈ 0.38
            "risky": -1.0,  # sigmoid(-1.0) ≈ 0.27
        }

    def calculate_confidence(self,
                            metrics: ConfidenceMetrics,
                            task_class: str,
                            is_open_world: bool = False) -> ConfidenceResult:
        """
        Calculate confidence using logistic model

        Args:
            metrics: 10 confidence metrics
            task_class: Task classification (atomic/routine/open_world/risky)
            is_open_world: Whether to apply open_world-specific metrics

        Returns:
            ConfidenceResult with p_raw, p_correct_mean, p_correct_low, etc.
        """
        # Step 1: Compute raw evidence score (z)
        z = self._compute_evidence_score(metrics, task_class, is_open_world)

        # Step 2: Transform to probability via sigmoid
        p_raw = self._sigmoid(z)

        # Step 3: Calibrate per bucket (placeholder - will be replaced by calibration engine)
        # For now, just use p_raw directly
        p_correct_mean = p_raw

        # Step 4: Compute conservative lower bound (placeholder - will be replaced by beta_bounds)
        # For now, apply simple conservative factor
        p_correct_low = p_raw * 0.85

        # Generate bucket identifier
        bucket = self._generate_bucket(task_class, metrics)

        return ConfidenceResult(
            p_raw=p_raw,
            p_correct_mean=p_correct_mean,
            p_correct_low=p_correct_low,
            bucket=bucket,
            evidence_score=z
        )

    def _compute_evidence_score(self,
                                metrics: ConfidenceMetrics,
                                task_class: str,
                                is_open_world: bool) -> float:
        """
        Compute raw evidence score (z) from weighted metrics

        z = w0 + Σ(w_i × metric_i) + prior[task_class]
        """
        w = self.weights

        z = (
            w["w0"]  # Intercept
            + w["w1"] * metrics.spec_completeness
            + w["w2"] * metrics.context_grounding
            + w["w3"] * metrics.tooling_path
            + w["w4"] * metrics.empirical_verification
            + w["w10"] * metrics.reproducibility
            - w["w7"] * metrics.assumption_risk
            - w["w8"] * metrics.contradiction_risk
            - w["w9"] * metrics.novelty_penalty
        )

        # Add open_world-specific metrics if applicable
        if is_open_world:
            z += w["w5"] * metrics.source_diversity
            z += w["w6"] * metrics.time_relevance

        # Add task class prior
        prior = self.task_priors.get(task_class, 0.0)
        z += prior

        return z

    def _sigmoid(self, z: float) -> float:
        """
        Sigmoid function: 1 / (1 + exp(-z))

        Transforms evidence score to probability [0, 1]
        """
        try:
            return 1.0 / (1.0 + math.exp(-z))
        except OverflowError:
            # Handle extreme values
            return 0.0 if z < 0 else 1.0

    def _generate_bucket(self, task_class: str, metrics: ConfidenceMetrics) -> str:
        """
        Generate calibration bucket identifier

        Format: "{task_class}|{stack}|{novelty_bin}|{externality_bin}|{test_coverage}"

        For now, simplified version
        """
        # Bin novelty
        if metrics.novelty_penalty < 0.3:
            novelty_bin = "low_novelty"
        elif metrics.novelty_penalty < 0.7:
            novelty_bin = "medium_novelty"
        else:
            novelty_bin = "high_novelty"

        # Bin empirical verification (proxy for test coverage)
        if metrics.empirical_verification > 0.7:
            test_coverage = "good_tests"
        elif metrics.empirical_verification > 0.4:
            test_coverage = "some_tests"
        else:
            test_coverage = "weak_tests"

        return f"{task_class}|generic|{novelty_bin}|internal|{test_coverage}"

    def update_weights(self, new_weights: Dict[str, float]):
        """Update model weights (for calibration tuning)"""
        self.weights.update(new_weights)


def calculate_confidence(metrics: ConfidenceMetrics,
                        task_class: str,
                        is_open_world: bool = False) -> ConfidenceResult:
    """Convenience function for confidence calculation"""
    model = ConfidenceModel()
    return model.calculate_confidence(metrics, task_class, is_open_world)


if __name__ == "__main__":
    # Test cases
    print("Confidence Model Test Results:\n")

    # Test 1: ATOMIC task with perfect metrics
    metrics_atomic = ConfidenceMetrics(
        spec_completeness=1.0,
        context_grounding=0.9,
        tooling_path=1.0,
        empirical_verification=1.0,
        source_diversity=0.0,
        time_relevance=0.0,
        reproducibility=1.0,
        assumption_risk=0.0,
        contradiction_risk=0.0,
        novelty_penalty=0.1
    )

    model = ConfidenceModel()
    result = model.calculate_confidence(metrics_atomic, "atomic", False)

    print("Test 1: ATOMIC task (perfect metrics)")
    print(f"Evidence score (z): {result.evidence_score:.3f}")
    print(f"p_raw: {result.p_raw:.3f}")
    print(f"p_correct_mean: {result.p_correct_mean:.3f}")
    print(f"p_correct_low: {result.p_correct_low:.3f}")
    print(f"Bucket: {result.bucket}\n")

    # Test 2: OPEN_WORLD task with moderate metrics
    metrics_open_world = ConfidenceMetrics(
        spec_completeness=0.7,
        context_grounding=0.6,
        tooling_path=0.5,
        empirical_verification=0.8,
        source_diversity=0.8,
        time_relevance=0.9,
        reproducibility=0.6,
        assumption_risk=0.5,
        contradiction_risk=0.4,
        novelty_penalty=0.6
    )

    result = model.calculate_confidence(metrics_open_world, "open_world", True)

    print("Test 2: OPEN_WORLD task (moderate metrics)")
    print(f"Evidence score (z): {result.evidence_score:.3f}")
    print(f"p_raw: {result.p_raw:.3f}")
    print(f"p_correct_mean: {result.p_correct_mean:.3f}")
    print(f"p_correct_low: {result.p_correct_low:.3f}")
    print(f"Bucket: {result.bucket}\n")

    # Test 3: RISKY task with poor metrics
    metrics_risky = ConfidenceMetrics(
        spec_completeness=0.5,
        context_grounding=0.4,
        tooling_path=0.3,
        empirical_verification=0.2,
        source_diversity=0.0,
        time_relevance=0.0,
        reproducibility=0.3,
        assumption_risk=0.8,
        contradiction_risk=0.6,
        novelty_penalty=0.9
    )

    result = model.calculate_confidence(metrics_risky, "risky", False)

    print("Test 3: RISKY task (poor metrics)")
    print(f"Evidence score (z): {result.evidence_score:.3f}")
    print(f"p_raw: {result.p_raw:.3f}")
    print(f"p_correct_mean: {result.p_correct_mean:.3f}")
    print(f"p_correct_low: {result.p_correct_low:.3f}")
    print(f"Bucket: {result.bucket}\n")
