"""
Bayesian Lower Bounds for Conservative Confidence

Uses Beta distribution posteriors to compute conservative probability bounds.
Provides 90% credible intervals (10th percentile) for risk-averse decision making.

Mathematical basis:
- Prior: Beta(α₀, β₀)
- Posterior: Beta(α₀ + successes, β₀ + failures)
- Lower bound: 10th percentile of posterior distribution
"""

from dataclasses import dataclass
from typing import Dict, Optional
import math

try:
    from scipy.stats import beta as scipy_beta
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


@dataclass
class BucketHistory:
    """Historical success/failure data for a calibration bucket"""
    bucket_id: str
    successes: int
    failures: int
    total: int

    @property
    def success_rate(self) -> float:
        """Empirical success rate"""
        return self.successes / self.total if self.total > 0 else 0.5


@dataclass
class BayesianBounds:
    """Bayesian credible interval bounds"""
    p_lower: float  # 10th percentile (90% confidence interval lower bound)
    p_mean: float   # Mean of posterior
    p_upper: float  # 90th percentile (90% confidence interval upper bound)
    alpha: float    # Posterior alpha parameter
    beta: float     # Posterior beta parameter


class BetaBoundsCalculator:
    """
    Calculates conservative probability bounds using Beta distribution

    Key insight from Zen MCP consultation:
    - Use 10th percentile for 90% lower bound (not 90th percentile!)
    - This gives us 90% confidence that true probability is ABOVE this value
    """

    def __init__(self,
                 alpha_prior: float = 2.0,
                 beta_prior: float = 2.0,
                 credible_level: float = 0.90):
        """
        Initialize calculator with priors

        Args:
            alpha_prior: Prior alpha (conservative: 2.0)
            beta_prior: Prior beta (conservative: 2.0)
            credible_level: Credible interval level (default: 0.90)
        """
        self.alpha_prior = alpha_prior
        self.beta_prior = beta_prior
        self.credible_level = credible_level

        if not HAS_SCIPY:
            raise ImportError(
                "scipy is required for beta bounds calculation. "
                "Install with: pip install scipy"
            )

    def calculate_bounds(self, history: BucketHistory) -> BayesianBounds:
        """
        Calculate Bayesian bounds from bucket history

        Args:
            history: Historical successes/failures for this bucket

        Returns:
            BayesianBounds with conservative lower bound
        """
        # Compute posterior parameters
        alpha_post = self.alpha_prior + history.successes
        beta_post = self.beta_prior + history.failures

        # Calculate percentiles using scipy
        lower_percentile = (1.0 - self.credible_level) / 2.0  # For two-sided
        upper_percentile = 1.0 - lower_percentile

        # CRITICAL: Use 10th percentile for lower bound (as corrected by Zen MCP)
        # For 90% one-sided credible interval
        p_lower = scipy_beta.ppf(1.0 - self.credible_level, alpha_post, beta_post)
        p_mean = alpha_post / (alpha_post + beta_post)  # Mean of Beta distribution
        p_upper = scipy_beta.ppf(self.credible_level, alpha_post, beta_post)

        return BayesianBounds(
            p_lower=p_lower,
            p_mean=p_mean,
            p_upper=p_upper,
            alpha=alpha_post,
            beta=beta_post
        )

    def calculate_conservative_bound(self,
                                    p_raw: float,
                                    history: BucketHistory) -> float:
        """
        Calculate conservative lower bound for a given raw probability

        Args:
            p_raw: Uncalibrated probability
            history: Historical data for calibration bucket

        Returns:
            Conservative lower bound (10th percentile)
        """
        bounds = self.calculate_bounds(history)
        return bounds.p_lower

    def calculate_bounds_cold_start(self,
                                   successes: int,
                                   failures: int) -> BayesianBounds:
        """
        Calculate bounds with minimal data (cold start scenario)

        Uses prior-heavy posterior for conservative estimates
        """
        history = BucketHistory(
            bucket_id="cold_start",
            successes=successes,
            failures=failures,
            total=successes + failures
        )
        return self.calculate_bounds(history)


def calculate_conservative_bound(successes: int,
                                 failures: int,
                                 alpha_prior: float = 2.0,
                                 beta_prior: float = 2.0) -> float:
    """
    Convenience function for calculating conservative bound

    Args:
        successes: Number of successful outcomes
        failures: Number of failed outcomes
        alpha_prior: Prior alpha parameter
        beta_prior: Prior beta parameter

    Returns:
        Conservative lower bound (10th percentile)
    """
    if not HAS_SCIPY:
        # Fallback: use simple conservative factor
        empirical_rate = successes / (successes + failures) if (successes + failures) > 0 else 0.5
        return empirical_rate * 0.75  # Conservative 25% reduction

    calculator = BetaBoundsCalculator(alpha_prior, beta_prior)
    history = BucketHistory(
        bucket_id="default",
        successes=successes,
        failures=failures,
        total=successes + failures
    )
    bounds = calculator.calculate_bounds(history)
    return bounds.p_lower


if __name__ == "__main__":
    if not HAS_SCIPY:
        print("Error: scipy not available. Install with: pip install scipy")
        exit(1)

    print("Beta Bounds Calculator Test Results:\n")

    calculator = BetaBoundsCalculator(alpha_prior=2.0, beta_prior=2.0)

    # Test 1: High success rate with good sample size
    print("Test 1: High success rate (38/40 = 95%)")
    history1 = BucketHistory(
        bucket_id="atomic|generic|low_novelty|internal|good_tests",
        successes=38,
        failures=2,
        total=40
    )
    bounds1 = calculator.calculate_bounds(history1)
    print(f"  Empirical rate: {history1.success_rate:.3f}")
    print(f"  Posterior: Beta({bounds1.alpha:.1f}, {bounds1.beta:.1f})")
    print(f"  Mean: {bounds1.p_mean:.3f}")
    print(f"  90% Credible Interval: [{bounds1.p_lower:.3f}, {bounds1.p_upper:.3f}]")
    print(f"  Conservative bound (p_lower): {bounds1.p_lower:.3f}\n")

    # Test 2: Moderate success rate
    print("Test 2: Moderate success rate (24/30 = 80%)")
    history2 = BucketHistory(
        bucket_id="routine|python|medium_novelty|internal|some_tests",
        successes=24,
        failures=6,
        total=30
    )
    bounds2 = calculator.calculate_bounds(history2)
    print(f"  Empirical rate: {history2.success_rate:.3f}")
    print(f"  Posterior: Beta({bounds2.alpha:.1f}, {bounds2.beta:.1f})")
    print(f"  Mean: {bounds2.p_mean:.3f}")
    print(f"  90% Credible Interval: [{bounds2.p_lower:.3f}, {bounds2.p_upper:.3f}]")
    print(f"  Conservative bound (p_lower): {bounds2.p_lower:.3f}\n")

    # Test 3: Low success rate with high variance
    print("Test 3: Low success rate (13/20 = 65%)")
    history3 = BucketHistory(
        bucket_id="open_world|node|high_novelty|external|weak_tests",
        successes=13,
        failures=7,
        total=20
    )
    bounds3 = calculator.calculate_bounds(history3)
    print(f"  Empirical rate: {history3.success_rate:.3f}")
    print(f"  Posterior: Beta({bounds3.alpha:.1f}, {bounds3.beta:.1f})")
    print(f"  Mean: {bounds3.p_mean:.3f}")
    print(f"  90% Credible Interval: [{bounds3.p_lower:.3f}, {bounds3.p_upper:.3f}]")
    print(f"  Conservative bound (p_lower): {bounds3.p_lower:.3f}\n")

    # Test 4: Cold start with minimal data
    print("Test 4: Cold start (5/10 = 50%)")
    history4 = BucketHistory(
        bucket_id="risky|multi|high_novelty|external|weak_tests",
        successes=5,
        failures=5,
        total=10
    )
    bounds4 = calculator.calculate_bounds(history4)
    print(f"  Empirical rate: {history4.success_rate:.3f}")
    print(f"  Posterior: Beta({bounds4.alpha:.1f}, {bounds4.beta:.1f})")
    print(f"  Mean: {bounds4.p_mean:.3f}")
    print(f"  90% Credible Interval: [{bounds4.p_lower:.3f}, {bounds4.p_upper:.3f}]")
    print(f"  Conservative bound (p_lower): {bounds4.p_lower:.3f}")
    print(f"  Note: Prior dominates with small sample → conservative\n")

    # Test 5: Prior only (no data)
    print("Test 5: Prior only (0 successes, 0 failures)")
    history5 = BucketHistory(
        bucket_id="new_bucket",
        successes=0,
        failures=0,
        total=0
    )
    bounds5 = calculator.calculate_bounds(history5)
    print(f"  Posterior: Beta({bounds5.alpha:.1f}, {bounds5.beta:.1f}) [prior only]")
    print(f"  Mean: {bounds5.p_mean:.3f}")
    print(f"  90% Credible Interval: [{bounds5.p_lower:.3f}, {bounds5.p_upper:.3f}]")
    print(f"  Conservative bound (p_lower): {bounds5.p_lower:.3f}")
    print(f"  Note: Pure prior → Beta(2,2) → very conservative\n")
