"""
Calibration Engine for Probability Calibration

Implements Platt Scaling (primary) and Isotonic Regression (fallback) for
calibrating raw probabilities to actual success rates.

Key insight from Zen MCP consultation:
- Use Platt Scaling for limited data (< 50 samples) - more robust
- Use Isotonic Regression only with large datasets (>= 50 samples)
- Platt Scaling fits sigmoid: p_calibrated = 1 / (1 + exp(a*p_raw + b))

Mathematical basis:
- Platt Scaling: Parametric (2 params) - less prone to overfitting
- Isotonic Regression: Non-parametric - flexible but needs more data
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
import math
import json

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.isotonic import IsotonicRegression
    import numpy as np
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


@dataclass
class CalibrationSample:
    """Single calibration data point"""
    p_raw: float  # Uncalibrated probability
    outcome: bool  # True = success, False = failure
    bucket: str  # Calibration bucket identifier


@dataclass
class CalibrationResult:
    """Result of calibration"""
    p_calibrated: float  # Calibrated probability
    method: str  # "platt_scaling", "isotonic", or "none"
    samples_used: int  # Number of samples in calibration set


class CalibrationEngine:
    """
    Calibrates raw probabilities using Platt Scaling or Isotonic Regression

    Strategy (as recommended by Zen MCP):
    1. < 20 samples: No calibration (use p_raw directly)
    2. 20-49 samples: Platt Scaling (robust to small data)
    3. >= 50 samples: Isotonic Regression (captures complex curves)
    """

    # Thresholds for calibration method selection
    MIN_SAMPLES_CALIBRATION = 20
    MIN_SAMPLES_ISOTONIC = 50

    def __init__(self):
        """Initialize calibration engine"""
        if not HAS_SKLEARN:
            print("Warning: sklearn not available. Calibration will be limited.")
            print("Install with: pip install scikit-learn numpy")

        # Cache for trained calibrators per bucket
        self._platt_models: Dict[str, 'LogisticRegression'] = {}
        self._isotonic_models: Dict[str, 'IsotonicRegression'] = {}

    def calibrate(self,
                  p_raw: float,
                  bucket: str,
                  history: List[CalibrationSample]) -> CalibrationResult:
        """
        Calibrate a raw probability using bucket-specific history

        Args:
            p_raw: Uncalibrated probability [0, 1]
            bucket: Calibration bucket identifier
            history: Historical samples for this bucket

        Returns:
            CalibrationResult with calibrated probability
        """
        if not history or len(history) < self.MIN_SAMPLES_CALIBRATION:
            # Not enough data - return uncalibrated
            return CalibrationResult(
                p_calibrated=p_raw,
                method="none",
                samples_used=len(history) if history else 0
            )

        if not HAS_SKLEARN:
            # Fallback: simple empirical calibration
            return self._calibrate_empirical(p_raw, bucket, history)

        # Choose calibration method based on sample size
        if len(history) >= self.MIN_SAMPLES_ISOTONIC:
            return self._calibrate_isotonic(p_raw, bucket, history)
        else:
            return self._calibrate_platt(p_raw, bucket, history)

    def _calibrate_platt(self,
                        p_raw: float,
                        bucket: str,
                        history: List[CalibrationSample]) -> CalibrationResult:
        """
        Platt Scaling calibration (logistic regression)

        Fits: p_calibrated = 1 / (1 + exp(a*p_raw + b))
        """
        try:
            # Check if we have a cached model
            if bucket not in self._platt_models:
                # Train new Platt Scaling model
                X = np.array([[s.p_raw] for s in history])
                y = np.array([1 if s.outcome else 0 for s in history])

                # LogisticRegression in sklearn implements Platt Scaling
                model = LogisticRegression(
                    solver='lbfgs',
                    max_iter=1000,
                    random_state=42
                )
                model.fit(X, y)

                self._platt_models[bucket] = model

            # Apply calibration
            model = self._platt_models[bucket]
            p_calibrated = model.predict_proba([[p_raw]])[0][1]

            return CalibrationResult(
                p_calibrated=float(p_calibrated),
                method="platt_scaling",
                samples_used=len(history)
            )

        except Exception as e:
            # Fallback to empirical if Platt fails
            print(f"Platt Scaling failed for bucket {bucket}: {e}")
            return self._calibrate_empirical(p_raw, bucket, history)

    def _calibrate_isotonic(self,
                           p_raw: float,
                           bucket: str,
                           history: List[CalibrationSample]) -> CalibrationResult:
        """
        Isotonic Regression calibration (non-parametric)

        Fits monotonic non-decreasing function
        """
        try:
            # Check if we have a cached model
            if bucket not in self._isotonic_models:
                # Train new Isotonic Regression model
                X = np.array([s.p_raw for s in history])
                y = np.array([1 if s.outcome else 0 for s in history])

                model = IsotonicRegression(out_of_bounds='clip')
                model.fit(X, y)

                self._isotonic_models[bucket] = model

            # Apply calibration
            model = self._isotonic_models[bucket]
            p_calibrated = model.predict([p_raw])[0]

            return CalibrationResult(
                p_calibrated=float(p_calibrated),
                method="isotonic",
                samples_used=len(history)
            )

        except Exception as e:
            # Fallback to Platt if Isotonic fails
            print(f"Isotonic Regression failed for bucket {bucket}: {e}")
            return self._calibrate_platt(p_raw, bucket, history)

    def _calibrate_empirical(self,
                            p_raw: float,
                            bucket: str,
                            history: List[CalibrationSample]) -> CalibrationResult:
        """
        Simple empirical calibration (fallback when sklearn unavailable)

        Groups samples into bins and uses empirical success rate
        """
        if not history:
            return CalibrationResult(
                p_calibrated=p_raw,
                method="none",
                samples_used=0
            )

        # Bin p_raw into 10% buckets
        bin_width = 0.1
        target_bin = int(p_raw / bin_width)

        # Find samples in this bin and adjacent bins
        relevant_samples = [
            s for s in history
            if abs(int(s.p_raw / bin_width) - target_bin) <= 1
        ]

        if not relevant_samples:
            # No relevant samples - use overall success rate
            relevant_samples = history

        # Compute empirical success rate
        successes = sum(1 for s in relevant_samples if s.outcome)
        p_calibrated = successes / len(relevant_samples)

        return CalibrationResult(
            p_calibrated=p_calibrated,
            method="empirical",
            samples_used=len(relevant_samples)
        )

    def train_all_buckets(self, history_by_bucket: Dict[str, List[CalibrationSample]]):
        """
        Pre-train calibration models for all buckets

        Args:
            history_by_bucket: Map of bucket_id -> list of samples
        """
        for bucket, samples in history_by_bucket.items():
            if len(samples) >= self.MIN_SAMPLES_CALIBRATION:
                # Train model by attempting calibration with first sample
                if samples:
                    self.calibrate(samples[0].p_raw, bucket, samples)

    def get_calibration_stats(self) -> Dict[str, Dict]:
        """Get statistics about trained calibration models"""
        return {
            "platt_models": len(self._platt_models),
            "isotonic_models": len(self._isotonic_models),
            "total_buckets": len(set(list(self._platt_models.keys()) +
                                    list(self._isotonic_models.keys())))
        }


def calibrate_probability(p_raw: float,
                         bucket: str,
                         history: List[CalibrationSample]) -> float:
    """
    Convenience function for probability calibration

    Args:
        p_raw: Uncalibrated probability
        bucket: Calibration bucket
        history: Historical samples

    Returns:
        Calibrated probability
    """
    engine = CalibrationEngine()
    result = engine.calibrate(p_raw, bucket, history)
    return result.p_calibrated


if __name__ == "__main__":
    if not HAS_SKLEARN:
        print("Error: sklearn not available. Install with: pip install scikit-learn numpy")
        exit(1)

    print("Calibration Engine Test Results:\n")

    # Generate synthetic test data
    # Scenario: Model is overconfident (p_raw consistently higher than actual rate)

    def generate_biased_samples(n: int, bucket: str, bias: float = 0.15) -> List[CalibrationSample]:
        """Generate samples where p_raw is biased higher than actual success rate"""
        import random
        random.seed(42)

        samples = []
        for _ in range(n):
            p_raw = random.uniform(0.5, 0.95)
            # Actual success rate is lower (model is overconfident)
            p_actual = max(0.0, min(1.0, p_raw - bias))
            outcome = random.random() < p_actual
            samples.append(CalibrationSample(p_raw, outcome, bucket))

        return samples

    engine = CalibrationEngine()

    # Test 1: Small dataset (Platt Scaling)
    print("Test 1: Small dataset (30 samples) - Platt Scaling")
    bucket1 = "routine|python|medium_novelty|internal|some_tests"
    history1 = generate_biased_samples(30, bucket1, bias=0.12)

    # Compute actual success rate
    actual_rate = sum(1 for s in history1 if s.outcome) / len(history1)
    avg_p_raw = sum(s.p_raw for s in history1) / len(history1)

    print(f"  Average p_raw: {avg_p_raw:.3f}")
    print(f"  Actual success rate: {actual_rate:.3f}")
    print(f"  Bias: {avg_p_raw - actual_rate:.3f} (overconfident)\n")

    # Test calibration
    test_p_raw = 0.80
    result1 = engine.calibrate(test_p_raw, bucket1, history1)
    print(f"  Calibrating p_raw={test_p_raw:.3f}:")
    print(f"    p_calibrated: {result1.p_calibrated:.3f}")
    print(f"    Method: {result1.method}")
    print(f"    Samples used: {result1.samples_used}")
    print(f"    Correction: {test_p_raw - result1.p_calibrated:.3f}\n")

    # Test 2: Large dataset (Isotonic Regression)
    print("Test 2: Large dataset (80 samples) - Isotonic Regression")
    bucket2 = "open_world|node|high_novelty|external|weak_tests"
    history2 = generate_biased_samples(80, bucket2, bias=0.20)

    actual_rate2 = sum(1 for s in history2 if s.outcome) / len(history2)
    avg_p_raw2 = sum(s.p_raw for s in history2) / len(history2)

    print(f"  Average p_raw: {avg_p_raw2:.3f}")
    print(f"  Actual success rate: {actual_rate2:.3f}")
    print(f"  Bias: {avg_p_raw2 - actual_rate2:.3f} (overconfident)\n")

    test_p_raw2 = 0.75
    result2 = engine.calibrate(test_p_raw2, bucket2, history2)
    print(f"  Calibrating p_raw={test_p_raw2:.3f}:")
    print(f"    p_calibrated: {result2.p_calibrated:.3f}")
    print(f"    Method: {result2.method}")
    print(f"    Samples used: {result2.samples_used}")
    print(f"    Correction: {test_p_raw2 - result2.p_calibrated:.3f}\n")

    # Test 3: Minimal data (No calibration)
    print("Test 3: Minimal data (5 samples) - No calibration")
    bucket3 = "atomic|generic|low_novelty|internal|good_tests"
    history3 = generate_biased_samples(5, bucket3, bias=0.10)

    test_p_raw3 = 0.90
    result3 = engine.calibrate(test_p_raw3, bucket3, history3)
    print(f"  Calibrating p_raw={test_p_raw3:.3f}:")
    print(f"    p_calibrated: {result3.p_calibrated:.3f}")
    print(f"    Method: {result3.method}")
    print(f"    Samples used: {result3.samples_used}")
    print(f"    Note: Not enough data for calibration\n")

    # Print summary
    print("\nCalibration Engine Summary:")
    stats = engine.get_calibration_stats()
    print(f"  Platt Scaling models trained: {stats['platt_models']}")
    print(f"  Isotonic models trained: {stats['isotonic_models']}")
    print(f"  Total buckets: {stats['total_buckets']}")
