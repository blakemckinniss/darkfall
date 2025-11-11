"""
Impact Model for Risk Assessment

Calculates potential impact of changes using 3 axes:
1. Blast Radius - Scope of changes (files, services, data)
2. Reversibility - Ease of rollback (git revert, data recovery, etc.)
3. Exposure - Who/what is affected (dev, staging, prod traffic)

Impact score [0, 1] is used with confidence to compute expected risk:
    expected_risk = impact × (1 - p_correct_low)
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum


class Environment(Enum):
    """Deployment environment"""
    LOCAL = "local"
    DEV = "dev"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class ImpactFactors:
    """Detailed factors contributing to impact"""
    # Blast radius factors
    files_changed: int = 0
    services_touched: int = 0
    database_changes: bool = False
    config_changes: bool = False
    api_changes: bool = False

    # Reversibility factors
    has_rollback_script: bool = False
    has_backup: bool = False
    has_data_migration: bool = False
    affects_external_systems: bool = False

    # Exposure factors
    environment: Environment = Environment.LOCAL
    traffic_percentage: float = 0.0  # 0.0-1.0
    user_count_affected: int = 0


@dataclass
class ImpactResult:
    """Complete impact assessment result"""
    impact: float  # Overall impact score [0, 1]
    blast_radius: float  # Scope component [0, 1]
    reversibility: float  # Rollback difficulty [0, 1]
    exposure: float  # Affected surface [0, 1]
    reasoning: str


class ImpactModel:
    """
    Calculates potential impact of changes using 3-axis model

    Based on GPT-5's mathematical framework:
    impact = 0.40 × blast_radius + 0.35 × (1 - reversibility) + 0.25 × exposure
    """

    # Weights for impact components
    WEIGHT_BLAST = 0.40
    WEIGHT_REVERSIBILITY = 0.35
    WEIGHT_EXPOSURE = 0.25

    def __init__(self):
        pass

    def calculate_impact(self, factors: ImpactFactors) -> ImpactResult:
        """
        Calculate impact score from factors

        Args:
            factors: ImpactFactors describing the change

        Returns:
            ImpactResult with component scores and overall impact
        """
        # Calculate each axis
        blast_radius = self._calculate_blast_radius(factors)
        reversibility = self._calculate_reversibility(factors)
        exposure = self._calculate_exposure(factors)

        # Compute weighted impact
        impact = (
            self.WEIGHT_BLAST * blast_radius +
            self.WEIGHT_REVERSIBILITY * (1.0 - reversibility) +
            self.WEIGHT_EXPOSURE * exposure
        )

        # Clamp to [0, 1]
        impact = self._clamp(impact)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            impact, blast_radius, reversibility, exposure, factors
        )

        return ImpactResult(
            impact=impact,
            blast_radius=blast_radius,
            reversibility=reversibility,
            exposure=exposure,
            reasoning=reasoning
        )

    def _calculate_blast_radius(self, factors: ImpactFactors) -> float:
        """
        Calculate blast radius: scope of changes

        Formula: 0.6 × (files/20) + 0.4 × services_touched
        Plus bonuses for database/API changes
        """
        # Normalize files changed (cap at 20 files)
        files_normalized = min(1.0, factors.files_changed / 20.0)

        # Normalize services (cap at 5 services)
        services_normalized = min(1.0, factors.services_touched / 5.0)

        blast = 0.6 * files_normalized + 0.4 * services_normalized

        # Bonuses for high-impact change types
        if factors.database_changes:
            blast = min(1.0, blast * 1.3)

        if factors.api_changes:
            blast = min(1.0, blast * 1.2)

        if factors.config_changes and factors.services_touched > 1:
            blast = min(1.0, blast * 1.15)

        return self._clamp(blast)

    def _calculate_reversibility(self, factors: ImpactFactors) -> float:
        """
        Calculate reversibility: ease of rollback

        Starts at 1.0 (perfect rollback), reduced by risk factors
        """
        reversibility = 1.0

        # Rollback mechanisms
        if not factors.has_rollback_script:
            reversibility *= 0.5

        if not factors.has_backup:
            reversibility *= 0.7

        # Irreversible operations
        if factors.has_data_migration:
            reversibility *= 0.5

        if factors.affects_external_systems:
            reversibility *= 0.7

        if factors.database_changes and not factors.has_backup:
            reversibility *= 0.6

        return self._clamp(reversibility)

    def _calculate_exposure(self, factors: ImpactFactors) -> float:
        """
        Calculate exposure: who/what is affected

        Based on environment and traffic percentage
        """
        env = factors.environment
        traffic = factors.traffic_percentage

        # Environment-based exposure
        if env == Environment.PRODUCTION:
            if traffic >= 1.0:
                exposure = 1.0  # Full production
            elif traffic < 0.10:
                exposure = traffic + 0.05  # Canary deployment
            else:
                exposure = 0.1 + (traffic * 0.9)  # Partial rollout

        elif env == Environment.STAGING:
            exposure = 0.01  # Staging environment

        elif env == Environment.DEV:
            exposure = 0.005  # Dev environment

        else:  # LOCAL
            exposure = 0.001  # Local development

        # Increase if user count is significant
        if factors.user_count_affected > 10000:
            exposure = min(1.0, exposure * 1.5)
        elif factors.user_count_affected > 1000:
            exposure = min(1.0, exposure * 1.2)

        return self._clamp(exposure)

    def _generate_reasoning(self,
                          impact: float,
                          blast: float,
                          reversibility: float,
                          exposure: float,
                          factors: ImpactFactors) -> str:
        """Generate human-readable reasoning for impact score"""

        parts = []

        # Blast radius reasoning
        if blast > 0.7:
            parts.append(f"High blast radius ({blast:.2f}): {factors.files_changed} files, "
                        f"{factors.services_touched} services")
        elif blast > 0.4:
            parts.append(f"Moderate blast radius ({blast:.2f})")
        else:
            parts.append(f"Low blast radius ({blast:.2f}): isolated change")

        # Reversibility reasoning
        if reversibility < 0.3:
            parts.append(f"Difficult to reverse ({reversibility:.2f}): "
                        f"{'no backup, ' if not factors.has_backup else ''}"
                        f"{'data migration, ' if factors.has_data_migration else ''}"
                        f"{'affects external systems' if factors.affects_external_systems else ''}")
        elif reversibility < 0.7:
            parts.append(f"Moderate reversibility ({reversibility:.2f})")
        else:
            parts.append(f"Easily reversible ({reversibility:.2f})")

        # Exposure reasoning
        if exposure > 0.7:
            parts.append(f"High exposure ({exposure:.2f}): production with "
                        f"{factors.traffic_percentage*100:.0f}% traffic")
        elif exposure > 0.1:
            parts.append(f"Moderate exposure ({exposure:.2f}): {factors.environment.value}")
        else:
            parts.append(f"Low exposure ({exposure:.2f}): {factors.environment.value} only")

        return ". ".join(parts)

    def _clamp(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """Clamp value between min and max"""
        return max(min_val, min(max_val, value))


def calculate_impact(factors: ImpactFactors) -> ImpactResult:
    """Convenience function for impact calculation"""
    model = ImpactModel()
    return model.calculate_impact(factors)


if __name__ == "__main__":
    # Test cases
    print("Impact Model Test Results:\n")

    # Test 1: Low-impact local change
    factors_low = ImpactFactors(
        files_changed=2,
        services_touched=1,
        has_rollback_script=True,
        has_backup=True,
        environment=Environment.LOCAL
    )

    model = ImpactModel()
    result = model.calculate_impact(factors_low)

    print("Test 1: Low-impact local change")
    print(f"Impact: {result.impact:.3f}")
    print(f"  Blast radius: {result.blast_radius:.3f}")
    print(f"  Reversibility: {result.reversibility:.3f}")
    print(f"  Exposure: {result.exposure:.3f}")
    print(f"Reasoning: {result.reasoning}\n")

    # Test 2: Moderate-impact staging deployment
    factors_moderate = ImpactFactors(
        files_changed=10,
        services_touched=2,
        database_changes=True,
        has_rollback_script=True,
        has_backup=True,
        environment=Environment.STAGING
    )

    result = model.calculate_impact(factors_moderate)

    print("Test 2: Moderate-impact staging deployment")
    print(f"Impact: {result.impact:.3f}")
    print(f"  Blast radius: {result.blast_radius:.3f}")
    print(f"  Reversibility: {result.reversibility:.3f}")
    print(f"  Exposure: {result.exposure:.3f}")
    print(f"Reasoning: {result.reasoning}\n")

    # Test 3: High-impact production deployment
    factors_high = ImpactFactors(
        files_changed=25,
        services_touched=5,
        database_changes=True,
        api_changes=True,
        has_data_migration=True,
        affects_external_systems=True,
        has_rollback_script=False,
        has_backup=False,
        environment=Environment.PRODUCTION,
        traffic_percentage=1.0,
        user_count_affected=50000
    )

    result = model.calculate_impact(factors_high)

    print("Test 3: High-impact production deployment")
    print(f"Impact: {result.impact:.3f}")
    print(f"  Blast radius: {result.blast_radius:.3f}")
    print(f"  Reversibility: {result.reversibility:.3f}")
    print(f"  Exposure: {result.exposure:.3f}")
    print(f"Reasoning: {result.reasoning}\n")

    # Test 4: Canary deployment (low traffic)
    factors_canary = ImpactFactors(
        files_changed=5,
        services_touched=1,
        has_rollback_script=True,
        has_backup=True,
        environment=Environment.PRODUCTION,
        traffic_percentage=0.05,  # 5% traffic
        user_count_affected=500
    )

    result = model.calculate_impact(factors_canary)

    print("Test 4: Canary deployment (5% traffic)")
    print(f"Impact: {result.impact:.3f}")
    print(f"  Blast radius: {result.blast_radius:.3f}")
    print(f"  Reversibility: {result.reversibility:.3f}")
    print(f"  Exposure: {result.exposure:.3f}")
    print(f"Reasoning: {result.reasoning}\n")
