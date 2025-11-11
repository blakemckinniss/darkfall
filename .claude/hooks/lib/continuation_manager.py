#!/usr/bin/env python3
"""
Continuation ID Manager for Zen MCP Integration

Automates task-scoped continuation_id lifecycle based on ADR-CC001 guidelines.

Key Responsibilities:
- Generate unique continuation_id per logical task
- Detect task boundaries (start, continuation, completion)
- Enforce optimal conversation length (5-20 turns)
- Prevent session-wide ID pollution

Usage:
    manager = ContinuationManager()

    # Start new task
    task_id = manager.start_task("conflict-detection")

    # Reuse for follow-ups
    task_id = manager.continue_task("conflict-detection")  # Same ID

    # Complete task
    manager.complete_task("conflict-detection")
"""

import hashlib
import time
from dataclasses import dataclass
from typing import Dict, Optional
from pathlib import Path
import json


@dataclass
class TaskContext:
    """Context for a single logical task"""
    task_type: str  # e.g., "conflict-detection", "calibration-tuning"
    continuation_id: str
    start_time: float
    turn_count: int
    last_activity: float


class ContinuationManager:
    """
    Manages continuation_id lifecycle for Zen MCP consultations

    Design Principles (from ADR-CC001):
    - Task-scoped > Session-wide
    - Fresh ID per logical task
    - Reuse for follow-ups within same goal
    - Reset on topic change
    - Optimal length: 5-20 turns
    """

    # Configuration
    MAX_TURN_COUNT = 20  # Soft limit before suggesting reset
    WARN_TURN_COUNT = 15  # Warn at 75% of max
    INACTIVE_TIMEOUT = 300  # 5 minutes - auto-complete after inactivity

    def __init__(self, state_file: Optional[Path] = None):
        """
        Initialize continuation manager

        Args:
            state_file: Optional path to persist task state (for cross-session)
        """
        self.state_file = state_file
        self.active_tasks: Dict[str, TaskContext] = {}

        # Load persisted state if available
        if state_file and state_file.exists():
            self._load_state()

    def start_task(self, task_type: str, task_id: Optional[str] = None) -> str:
        """
        Start a new logical task with fresh continuation_id

        Args:
            task_type: Type of task (e.g., "conflict-detection", "calibration-tuning")
            task_id: Optional specific task identifier (defaults to timestamp-based)

        Returns:
            Fresh continuation_id for this task
        """
        # Clean up inactive tasks first
        self._cleanup_inactive_tasks()

        # Generate unique continuation_id
        if task_id is None:
            # Use timestamp + task type for uniqueness
            timestamp = int(time.time() * 1000)
            task_id = f"{timestamp}"

        continuation_id = f"{task_type}-{task_id}"

        # Create task context
        now = time.time()
        self.active_tasks[task_type] = TaskContext(
            task_type=task_type,
            continuation_id=continuation_id,
            start_time=now,
            turn_count=1,
            last_activity=now
        )

        self._save_state()
        return continuation_id

    def continue_task(self, task_type: str) -> Optional[str]:
        """
        Continue existing task (reuses continuation_id)

        Args:
            task_type: Type of task to continue

        Returns:
            Existing continuation_id if task is active, None if task not found
        """
        # Clean up inactive tasks
        self._cleanup_inactive_tasks()

        # Check if task exists and is still active
        if task_type not in self.active_tasks:
            return None

        context = self.active_tasks[task_type]

        # Increment turn count
        context.turn_count += 1
        context.last_activity = time.time()

        # Check if approaching turn limit
        if context.turn_count >= self.WARN_TURN_COUNT:
            print(f"Warning: Task '{task_type}' at {context.turn_count} turns "
                  f"(limit: {self.MAX_TURN_COUNT}). Consider completing and starting fresh.",
                  file=sys.stderr)

        # Hard limit: Force reset at MAX_TURN_COUNT
        if context.turn_count > self.MAX_TURN_COUNT:
            print(f"Warning: Task '{task_type}' exceeded {self.MAX_TURN_COUNT} turns. "
                  f"Auto-completing and generating fresh continuation_id.",
                  file=sys.stderr)
            self.complete_task(task_type)
            return self.start_task(task_type)

        self._save_state()
        return context.continuation_id

    def complete_task(self, task_type: str):
        """
        Mark task as complete and remove from active tasks

        Args:
            task_type: Type of task to complete
        """
        if task_type in self.active_tasks:
            del self.active_tasks[task_type]
            self._save_state()

    def reset_all(self):
        """Reset all active tasks (e.g., on session restart)"""
        self.active_tasks.clear()
        self._save_state()

    def get_or_start_task(self, task_type: str, task_id: Optional[str] = None) -> str:
        """
        Get existing continuation_id or start new task

        Convenience method for "get if exists, else create" pattern

        Args:
            task_type: Type of task
            task_id: Optional specific task identifier

        Returns:
            continuation_id (existing or new)
        """
        continuation_id = self.continue_task(task_type)
        if continuation_id is None:
            continuation_id = self.start_task(task_type, task_id)
        return continuation_id

    def _cleanup_inactive_tasks(self):
        """Remove tasks that have been inactive for > INACTIVE_TIMEOUT"""
        now = time.time()
        inactive_tasks = [
            task_type
            for task_type, context in self.active_tasks.items()
            if (now - context.last_activity) > self.INACTIVE_TIMEOUT
        ]

        for task_type in inactive_tasks:
            print(f"Auto-completing inactive task: {task_type} "
                  f"(inactive for {int((now - self.active_tasks[task_type].last_activity) / 60)}m)",
                  file=sys.stderr)
            del self.active_tasks[task_type]

    def _save_state(self):
        """Persist active tasks to file"""
        if self.state_file is None:
            return

        # Convert to JSON-serializable format
        state = {
            task_type: {
                "task_type": ctx.task_type,
                "continuation_id": ctx.continuation_id,
                "start_time": ctx.start_time,
                "turn_count": ctx.turn_count,
                "last_activity": ctx.last_activity
            }
            for task_type, ctx in self.active_tasks.items()
        }

        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.state_file, 'w') as f:
            json.dump(state, f, indent=2)

    def _load_state(self):
        """Load persisted tasks from file"""
        if self.state_file is None or not self.state_file.exists():
            return

        with open(self.state_file, 'r') as f:
            state = json.load(f)

        # Reconstruct TaskContext objects
        for task_type, data in state.items():
            self.active_tasks[task_type] = TaskContext(
                task_type=data["task_type"],
                continuation_id=data["continuation_id"],
                start_time=data["start_time"],
                turn_count=data["turn_count"],
                last_activity=data["last_activity"]
            )


# Global instance for convenience (optional)
_global_manager: Optional[ContinuationManager] = None


def get_global_manager(state_file: Optional[Path] = None) -> ContinuationManager:
    """Get or create global continuation manager instance"""
    global _global_manager
    if _global_manager is None:
        _global_manager = ContinuationManager(state_file)
    return _global_manager


# Convenience functions
def start_task(task_type: str, task_id: Optional[str] = None) -> str:
    """Start new task using global manager"""
    manager = get_global_manager()
    return manager.start_task(task_type, task_id)


def continue_task(task_type: str) -> Optional[str]:
    """Continue existing task using global manager"""
    manager = get_global_manager()
    return manager.continue_task(task_type)


def complete_task(task_type: str):
    """Complete task using global manager"""
    manager = get_global_manager()
    manager.complete_task(task_type)


def get_or_start_task(task_type: str, task_id: Optional[str] = None) -> str:
    """Get existing or start new task using global manager"""
    manager = get_global_manager()
    return manager.get_or_start_task(task_type, task_id)


if __name__ == "__main__":
    import sys

    # Demo usage
    print("Continuation Manager Demo\n")

    manager = ContinuationManager()

    # Start conflict detection task
    print("1. Start conflict detection task:")
    id1 = manager.start_task("conflict-detection")
    print(f"   continuation_id: {id1}\n")

    # Continue same task (reuses ID)
    print("2. Continue conflict detection (follow-up question):")
    id2 = manager.continue_task("conflict-detection")
    print(f"   continuation_id: {id2}")
    print(f"   Same ID? {id1 == id2}\n")

    # Start different task (fresh ID)
    print("3. Start calibration tuning task:")
    id3 = manager.start_task("calibration-tuning")
    print(f"   continuation_id: {id3}")
    print(f"   Different from conflict task? {id3 != id1}\n")

    # Complete task
    print("4. Complete conflict detection task:")
    manager.complete_task("conflict-detection")
    print("   Task completed and removed from active tasks\n")

    # Try to continue completed task (returns None)
    print("5. Try to continue completed task:")
    id4 = manager.continue_task("conflict-detection")
    print(f"   continuation_id: {id4} (None = task not found)\n")

    # Get or start (convenience method)
    print("6. Get or start conflict detection (will start new since completed):")
    id5 = manager.get_or_start_task("conflict-detection")
    print(f"   continuation_id: {id5} (fresh ID)")
