"""
Task Classification for Confidence Calibration System

Classifies tasks into 4 categories with 5-axis metrics:
- atomic: Deterministic, closed-scope tasks
- routine: Standard development with known patterns
- open_world: External dependencies, uncertain outcomes
- risky: High-impact changes with cascading effects
"""

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional


class TaskClass(Enum):
    """Four task complexity classes"""
    ATOMIC = "atomic"
    ROUTINE = "routine"
    OPEN_WORLD = "open_world"
    RISKY = "risky"


@dataclass
class MultiAxisMetrics:
    """Five-axis task characterization"""
    novelty: float  # 0.0 = familiar pattern, 1.0 = never done before
    externality: float  # 0.0 = internal only, 1.0 = external dependencies
    blast_radius: float  # 0.0 = isolated change, 1.0 = system-wide impact
    reversibility: float  # 0.0 = irreversible, 1.0 = easily rolled back
    exposure: float  # 0.0 = dev/local only, 1.0 = production with full traffic


@dataclass
class TaskClassification:
    """Complete task classification result"""
    task_class: TaskClass
    axes: MultiAxisMetrics
    confidence: float  # Classifier confidence in this categorization
    reasoning: str


class TaskClassifier:
    """
    Classifies tasks based on prompt analysis and context

    Uses heuristics + keyword matching to categorize task complexity
    """

    # Keywords that indicate task characteristics
    NOVELTY_HIGH = ["new", "novel", "first time", "never", "explore", "research", "investigate"]
    NOVELTY_LOW = ["refactor", "fix", "update", "improve", "optimize"]

    EXTERNALITY_HIGH = ["api", "external", "third-party", "integration", "web", "fetch", "scrape"]
    EXTERNALITY_LOW = ["internal", "local", "isolated", "self-contained"]

    BLAST_HIGH = ["migration", "breaking", "architecture", "system-wide", "all", "every"]
    BLAST_LOW = ["single", "one", "isolated", "specific", "local"]

    REVERSIBILITY_LOW = ["database", "production", "deploy", "migration", "delete", "drop"]
    REVERSIBILITY_HIGH = ["config", "feature flag", "canary", "rollback", "backup"]

    EXPOSURE_HIGH = ["production", "prod", "live", "users", "deployed"]
    EXPOSURE_LOW = ["local", "dev", "test", "staging", "localhost"]

    def __init__(self):
        pass

    def classify(self,
                 prompt: str,
                 context: Optional[Dict] = None) -> TaskClassification:
        """
        Classify a task based on the user prompt and optional context

        Args:
            prompt: User's task description
            context: Optional context (git status, project info, etc.)

        Returns:
            TaskClassification with task_class, axes, and reasoning
        """
        prompt_lower = prompt.lower()

        # Calculate axis metrics
        axes = self._calculate_axes(prompt_lower, context or {})

        # Determine task class based on axes
        task_class, confidence, reasoning = self._determine_class(axes, prompt_lower)

        return TaskClassification(
            task_class=task_class,
            axes=axes,
            confidence=confidence,
            reasoning=reasoning
        )

    def _calculate_axes(self, prompt: str, context: Dict) -> MultiAxisMetrics:
        """Calculate 5-axis metrics from prompt and context"""

        # Novelty: how familiar is this task?
        novelty = self._score_keywords(prompt, self.NOVELTY_HIGH, self.NOVELTY_LOW)

        # Externality: internal vs external dependencies
        externality = self._score_keywords(prompt, self.EXTERNALITY_HIGH, self.EXTERNALITY_LOW)

        # Blast radius: scope of changes
        blast_radius = self._score_keywords(prompt, self.BLAST_HIGH, self.BLAST_LOW)

        # Reversibility: can we rollback?
        reversibility = 1.0 - self._score_keywords(prompt, self.REVERSIBILITY_LOW, self.REVERSIBILITY_HIGH)

        # Exposure: dev vs production
        exposure = self._score_keywords(prompt, self.EXPOSURE_HIGH, self.EXPOSURE_LOW)

        # Adjust based on context
        if context.get("has_tests", False):
            reversibility = min(1.0, reversibility * 1.2)

        if context.get("environment") == "production":
            exposure = max(exposure, 0.8)
        elif context.get("environment") in ["staging", "test"]:
            exposure = min(exposure, 0.2)

        return MultiAxisMetrics(
            novelty=self._clamp(novelty),
            externality=self._clamp(externality),
            blast_radius=self._clamp(blast_radius),
            reversibility=self._clamp(reversibility),
            exposure=self._clamp(exposure)
        )

    def _score_keywords(self, text: str, high_keywords: List[str], low_keywords: List[str]) -> float:
        """Score text based on presence of high/low indicator keywords"""
        high_count = sum(1 for kw in high_keywords if kw in text)
        low_count = sum(1 for kw in low_keywords if kw in text)

        total = high_count + low_count
        if total == 0:
            return 0.5  # Neutral/unknown

        return high_count / total

    def _determine_class(self, axes: MultiAxisMetrics, prompt: str) -> tuple:
        """
        Determine task class based on axes

        Returns: (TaskClass, confidence, reasoning)
        """

        # ATOMIC: Low novelty, internal, small blast, reversible
        if (axes.novelty < 0.3 and
            axes.externality < 0.3 and
            axes.blast_radius < 0.3 and
            axes.reversibility > 0.7):
            return (
                TaskClass.ATOMIC,
                0.9,
                "Low novelty, internal, small scope, easily reversible"
            )

        # RISKY: High blast radius OR low reversibility OR high exposure with high impact
        if (axes.blast_radius > 0.7 or
            axes.reversibility < 0.3 or
            (axes.exposure > 0.7 and axes.blast_radius > 0.5)):
            return (
                TaskClass.RISKY,
                0.85,
                f"High risk: blast_radius={axes.blast_radius:.2f}, "
                f"reversibility={axes.reversibility:.2f}, exposure={axes.exposure:.2f}"
            )

        # OPEN_WORLD: High externality OR high novelty
        if axes.externality > 0.6 or axes.novelty > 0.7:
            return (
                TaskClass.OPEN_WORLD,
                0.8,
                f"External dependencies or novel patterns: "
                f"externality={axes.externality:.2f}, novelty={axes.novelty:.2f}"
            )

        # ROUTINE: Everything else (standard development)
        return (
            TaskClass.ROUTINE,
            0.75,
            "Standard development task with moderate complexity"
        )

    def _clamp(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        """Clamp value between min and max"""
        return max(min_val, min(max_val, value))


def classify_task(prompt: str, context: Optional[Dict] = None) -> TaskClassification:
    """Convenience function for task classification"""
    classifier = TaskClassifier()
    return classifier.classify(prompt, context)


if __name__ == "__main__":
    # Test cases
    test_cases = [
        ("What does a transmission do?", {}),
        ("Fix the login button color", {"has_tests": True}),
        ("Migrate database to new schema in production", {"environment": "production"}),
        ("Research EV impact on transmission repair profitability", {}),
        ("Add new Tailwind v4 configuration", {}),
    ]

    classifier = TaskClassifier()

    print("Task Classification Test Results:\n")
    for prompt, context in test_cases:
        result = classifier.classify(prompt, context)
        print(f"Prompt: {prompt}")
        print(f"Class: {result.task_class.value}")
        print(f"Axes: novelty={result.axes.novelty:.2f}, externality={result.axes.externality:.2f}, "
              f"blast={result.axes.blast_radius:.2f}, reversibility={result.axes.reversibility:.2f}, "
              f"exposure={result.axes.exposure:.2f}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Reasoning: {result.reasoning}\n")
