"""
Verification Budget Enforcement

Implements hard constraints on verification actions to prevent:
- Runaway tool usage (action limits)
- Excessive time spent (time limits)
- Unauthorized tool access (tool whitelist)

Budget violations automatically force conservative gating decisions.
"""

from dataclasses import dataclass
from typing import List, Dict, Optional, Set
import time
from enum import Enum


class BudgetViolationType(Enum):
    """Types of budget violations"""
    ACTION_LIMIT = "action_limit"
    TIME_LIMIT = "time_limit"
    TOOL_RESTRICTION = "tool_restriction"
    MANDATORY_MISSING = "mandatory_missing"


@dataclass
class Budget:
    """Budget constraints for verification"""
    max_actions: int  # Maximum number of tool calls
    max_time_seconds: float  # Maximum time allowed
    allowed_tools: Set[str]  # Whitelist of permitted tools
    mandatory: Set[str]  # Required actions (dry_run, backup, etc.)


@dataclass
class BudgetStatus:
    """Current budget usage status"""
    actions_used: int
    elapsed_seconds: float
    tools_used: Set[str]
    mandatory_completed: Set[str]


@dataclass
class BudgetViolation:
    """A detected budget violation"""
    violation_type: BudgetViolationType
    description: str
    severity: str  # "critical" or "warning"
    forced_action: str  # "stop" or "ask"


class BudgetTracker:
    """
    Tracks and enforces verification budget constraints

    Usage:
        tracker = BudgetTracker(budget)
        tracker.start()

        # Before each tool use
        tracker.check_tool("Read")  # Raises BudgetViolationError if violated
        tracker.record_action("Read")

        # At end
        tracker.check_mandatory()  # Raises if mandatory actions not completed
    """

    def __init__(self, budget: Budget):
        """
        Initialize budget tracker

        Args:
            budget: Budget constraints to enforce
        """
        self.budget = budget
        self.status = BudgetStatus(
            actions_used=0,
            elapsed_seconds=0.0,
            tools_used=set(),
            mandatory_completed=set()
        )
        self.start_time: Optional[float] = None
        self.violations: List[BudgetViolation] = []

    def start(self):
        """Start tracking time"""
        self.start_time = time.time()

    def check_tool(self, tool_name: str):
        """
        Check if tool is allowed and budget not exceeded

        Raises:
            BudgetViolationError if constraints violated
        """
        # Update elapsed time
        if self.start_time:
            self.status.elapsed_seconds = time.time() - self.start_time

        # Check action limit
        if self.status.actions_used >= self.budget.max_actions:
            violation = BudgetViolation(
                violation_type=BudgetViolationType.ACTION_LIMIT,
                description=f"Action limit exceeded: {self.status.actions_used}/{self.budget.max_actions}",
                severity="critical",
                forced_action="stop"
            )
            self.violations.append(violation)
            raise BudgetViolationError(violation)

        # Check time limit
        if self.status.elapsed_seconds >= self.budget.max_time_seconds:
            violation = BudgetViolation(
                violation_type=BudgetViolationType.TIME_LIMIT,
                description=f"Time limit exceeded: {self.status.elapsed_seconds:.1f}s/{self.budget.max_time_seconds}s",
                severity="critical",
                forced_action="stop"
            )
            self.violations.append(violation)
            raise BudgetViolationError(violation)

        # Check tool whitelist
        if self.budget.allowed_tools and tool_name not in self.budget.allowed_tools:
            violation = BudgetViolation(
                violation_type=BudgetViolationType.TOOL_RESTRICTION,
                description=f"Tool '{tool_name}' not in allowed list: {', '.join(sorted(self.budget.allowed_tools))}",
                severity="critical",
                forced_action="stop"
            )
            self.violations.append(violation)
            raise BudgetViolationError(violation)

    def record_action(self, tool_name: str):
        """
        Record a tool action

        Call this after successfully using a tool
        """
        self.status.actions_used += 1
        self.status.tools_used.add(tool_name)

        # Check if this was a mandatory action
        if tool_name in self.budget.mandatory:
            self.status.mandatory_completed.add(tool_name)

    def check_mandatory(self):
        """
        Check if all mandatory actions were completed

        Raises:
            BudgetViolationError if mandatory actions missing
        """
        missing = self.budget.mandatory - self.status.mandatory_completed

        if missing:
            violation = BudgetViolation(
                violation_type=BudgetViolationType.MANDATORY_MISSING,
                description=f"Mandatory actions not completed: {', '.join(sorted(missing))}",
                severity="critical",
                forced_action="ask"
            )
            self.violations.append(violation)
            raise BudgetViolationError(violation)

    def get_status(self) -> BudgetStatus:
        """Get current budget usage status"""
        if self.start_time:
            self.status.elapsed_seconds = time.time() - self.start_time
        return self.status

    def get_violations(self) -> List[BudgetViolation]:
        """Get list of all violations"""
        return self.violations

    def has_violations(self) -> bool:
        """Check if any violations occurred"""
        return len(self.violations) > 0

    def get_forced_action(self) -> Optional[str]:
        """
        Get most restrictive forced action from violations

        Returns:
            "stop" if any critical violations
            "ask" if any warnings
            None if no violations
        """
        if not self.violations:
            return None

        if any(v.severity == "critical" for v in self.violations):
            return "stop"

        return "ask"


class BudgetViolationError(Exception):
    """Raised when budget constraint is violated"""
    def __init__(self, violation: BudgetViolation):
        self.violation = violation
        super().__init__(violation.description)


# Predefined budgets for different task classes
TASK_CLASS_BUDGETS = {
    "atomic": Budget(
        max_actions=5,
        max_time_seconds=30,
        allowed_tools={"Read", "Grep", "Glob"},
        mandatory=set()
    ),
    "routine": Budget(
        max_actions=10,
        max_time_seconds=120,
        allowed_tools={"Read", "Grep", "Glob", "Bash", "WebSearch"},
        mandatory=set()
    ),
    "open_world": Budget(
        max_actions=15,
        max_time_seconds=300,
        allowed_tools={"Read", "Grep", "Glob", "Bash", "WebSearch", "WebFetch"},
        mandatory={"WebSearch"}  # Must search for external info
    ),
    "risky": Budget(
        max_actions=20,
        max_time_seconds=600,
        allowed_tools={"Read", "Grep", "Glob", "Bash", "WebSearch"},
        mandatory={"dry_run", "backup"}  # Must have safety measures
    )
}


def get_budget_for_task_class(task_class: str) -> Budget:
    """Get predefined budget for a task class"""
    return TASK_CLASS_BUDGETS.get(task_class, TASK_CLASS_BUDGETS["routine"])


if __name__ == "__main__":
    print("Verification Budget Test Results:\n")

    # Test 1: Normal usage within budget
    print("Test 1: Normal usage - within budget")
    budget1 = Budget(
        max_actions=5,
        max_time_seconds=10,
        allowed_tools={"Read", "Grep"},
        mandatory={"Read"}
    )
    tracker1 = BudgetTracker(budget1)
    tracker1.start()

    try:
        tracker1.check_tool("Read")
        tracker1.record_action("Read")
        tracker1.check_tool("Grep")
        tracker1.record_action("Grep")
        tracker1.check_mandatory()

        status = tracker1.get_status()
        print(f"  Actions used: {status.actions_used}/{budget1.max_actions}")
        print(f"  Time elapsed: {status.elapsed_seconds:.3f}s/{budget1.max_time_seconds}s")
        print(f"  Tools used: {', '.join(sorted(status.tools_used))}")
        print(f"  Mandatory completed: {', '.join(sorted(status.mandatory_completed))}")
        print(f"  ✓ All checks passed\n")
    except BudgetViolationError as e:
        print(f"  ✗ Violation: {e}\n")

    # Test 2: Action limit exceeded
    print("Test 2: Action limit violation")
    budget2 = Budget(
        max_actions=2,
        max_time_seconds=10,
        allowed_tools={"Read", "Grep"},
        mandatory=set()
    )
    tracker2 = BudgetTracker(budget2)
    tracker2.start()

    try:
        for i in range(3):  # Try 3 actions with limit of 2
            tracker2.check_tool("Read")
            tracker2.record_action("Read")
        print(f"  ✗ Should have raised violation\n")
    except BudgetViolationError as e:
        print(f"  ✓ Caught violation: {e.violation.description}")
        print(f"    Forced action: {e.violation.forced_action}\n")

    # Test 3: Tool restriction violation
    print("Test 3: Tool restriction violation")
    budget3 = Budget(
        max_actions=5,
        max_time_seconds=10,
        allowed_tools={"Read", "Grep"},
        mandatory=set()
    )
    tracker3 = BudgetTracker(budget3)
    tracker3.start()

    try:
        tracker3.check_tool("Bash")  # Not in allowed list
        print(f"  ✗ Should have raised violation\n")
    except BudgetViolationError as e:
        print(f"  ✓ Caught violation: {e.violation.description}")
        print(f"    Severity: {e.violation.severity}\n")

    # Test 4: Mandatory action missing
    print("Test 4: Mandatory action missing")
    budget4 = Budget(
        max_actions=5,
        max_time_seconds=10,
        allowed_tools={"Read", "Grep", "dry_run"},
        mandatory={"dry_run"}
    )
    tracker4 = BudgetTracker(budget4)
    tracker4.start()

    try:
        tracker4.check_tool("Read")
        tracker4.record_action("Read")
        tracker4.check_mandatory()  # dry_run not completed
        print(f"  ✗ Should have raised violation\n")
    except BudgetViolationError as e:
        print(f"  ✓ Caught violation: {e.violation.description}")
        print(f"    Forced action: {e.violation.forced_action}\n")

    # Test 5: Predefined budgets
    print("Test 5: Predefined task class budgets")
    for task_class in ["atomic", "routine", "open_world", "risky"]:
        budget = get_budget_for_task_class(task_class)
        print(f"  {task_class}:")
        print(f"    Max actions: {budget.max_actions}")
        print(f"    Max time: {budget.max_time_seconds}s")
        print(f"    Allowed tools: {', '.join(sorted(budget.allowed_tools))}")
        print(f"    Mandatory: {', '.join(sorted(budget.mandatory)) if budget.mandatory else 'none'}")
    print()
