#!/usr/bin/env python3
"""
Tier-1 Fast Pattern Matcher for Tool Planning Hook
Detects optimization opportunities using regex patterns.
Target: < 100ms execution time
"""
import re
import sys
from typing import List, Dict, Any


class ToolPlan:
    """Structured tool plan with metadata and recommendations"""

    def __init__(self, task_class: str):
        self.task_class = task_class
        self.optimizations: List[Dict[str, Any]] = []
        self.confidence_boost = 0.0
        self.estimated_time_savings = 0
        self.planner = "local_v1.0"

    def add_optimization(self, category: str, description: str, boost: float = 0.0, savings: int = 0):
        """Add an optimization suggestion"""
        self.optimizations.append({
            "category": category,
            "description": description,
            "confidence_boost": boost,
            "time_savings_seconds": savings
        })
        self.confidence_boost += boost
        self.estimated_time_savings += savings

    def to_markdown(self) -> str:
        """Convert plan to markdown format for injection"""
        if not self.optimizations:
            return ""  # No plan needed

        lines = [
            "## 🛠️ Tool Strategy (Auto-Generated)",
            "",
            f"**Task Class:** {self.task_class} | **Planning Tier:** 1 (local pattern matching)",
            "",
            "**Recommended Optimizations:**"
        ]

        for i, opt in enumerate(self.optimizations, 1):
            emoji = {
                "parallelization": "⚡",
                "script": "📝",
                "mcp_tool": "🔧",
                "agent": "🤖",
                "caching": "💾"
            }.get(opt["category"], "💡")

            lines.append(f"{i}. {emoji} **{opt['category'].title()}**: {opt['description']}")

        if self.estimated_time_savings > 0:
            lines.append(f"\n**Estimated Time Savings:** ~{self.estimated_time_savings}s")

        if self.confidence_boost > 0:
            lines.append(f"**Confidence Boost:** +{self.confidence_boost:.2f} (via tooling_optimization_score)")

        lines.extend([
            "",
            "**Execution Strategy:**",
            "- Use single message with multiple tool calls for parallel operations",
            "- Generate helper scripts for repeated operations",
            "- Consult appropriate MCP tools when needed",
            ""
        ])

        return "\n".join(lines)


def detect_parallelization(prompt: str) -> List[Dict[str, Any]]:
    """Detect opportunities for parallel file operations"""
    opportunities = []

    # Pattern: Multiple files mentioned
    file_pattern = r'\b(\w+\.(ts|tsx|js|jsx|py|go|rs|java|md|json|yaml|yml))\b'
    files = re.findall(file_pattern, prompt, re.IGNORECASE)

    if len(files) >= 3:
        opportunities.append({
            "category": "parallelization",
            "description": f"Files {[f[0] for f in files[:5]]} can be read simultaneously using parallel Read calls",
            "boost": 0.05,
            "savings": 30
        })

    # Pattern: "multiple files", "all files", "across codebase"
    multi_file_pattern = r'\b(multiple files|all files|across (the )?codebase|every file)\b'
    if re.search(multi_file_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "parallelization",
            "description": "Multiple file operations detected - use parallel Read/Grep calls",
            "boost": 0.05,
            "savings": 45
        })

    return opportunities


def detect_script_opportunities(prompt: str) -> List[Dict[str, Any]]:
    """Detect when helper scripts would be beneficial"""
    opportunities = []

    # Pattern: Testing, validation, repeated operations
    test_pattern = r'\b(test|testing|validate|validation|check|verify|run tests)\b'
    if re.search(test_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "script",
            "description": "Create tmp-test-runner.sh for automated test execution",
            "boost": 0.08,
            "savings": 60
        })

    # Pattern: Build operations
    build_pattern = r'\b(build|compile|bundle|package)\b'
    if re.search(build_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "script",
            "description": "Create tmp-build-script.sh for repeated build operations",
            "boost": 0.06,
            "savings": 40
        })

    return opportunities


def detect_mcp_tool_opportunities(prompt: str, task_class: str) -> List[Dict[str, Any]]:
    """Detect when MCP tools should be used"""
    opportunities = []

    # MANDATORY: Open world research
    if task_class == "open_world":
        opportunities.append({
            "category": "mcp_tool",
            "description": "MANDATORY: Use zen:chat with websearch enabled for external research (per CLAUDE.md)",
            "boost": 0.15,
            "savings": 0
        })

    # MANDATORY: Web/browser interaction
    web_pattern = r'\b(web|browser|webpage|website|ui test|click|form|button|navigate)\b'
    if re.search(web_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "mcp_tool",
            "description": "MANDATORY: Use playwright MCP (mcp__playwright__*) for browser interactions (per CLAUDE.md)",
            "boost": 0.10,
            "savings": 0
        })

    # SUGGESTED: Debugging
    debug_pattern = r'\b(debug|error|failure|broken|not working|fails|crash)\b'
    if re.search(debug_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "mcp_tool",
            "description": "Consider zen:debug for systematic root cause analysis",
            "boost": 0.12,
            "savings": 120
        })

    # SUGGESTED: Architecture/decisions
    decision_pattern = r'\b(decide|choose|which|approach|architecture|design|should i)\b'
    if re.search(decision_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "mcp_tool",
            "description": "Consider zen:consensus for multi-model architectural perspectives",
            "boost": 0.10,
            "savings": 0
        })

    # SUGGESTED: Code review
    review_pattern = r'\b(review|quality|security|vulnerabilit|best practice)\b'
    if re.search(review_pattern, prompt, re.IGNORECASE):
        opportunities.append({
            "category": "mcp_tool",
            "description": "Consider zen:codereview for comprehensive code analysis",
            "boost": 0.08,
            "savings": 0
        })

    return opportunities


def detect_agent_opportunities(prompt: str) -> List[Dict[str, Any]]:
    """Detect when Task tool with agents would be beneficial"""
    opportunities = []

    # Pattern: Multiple independent tasks
    task_markers = len(re.findall(r'\b(then|after|next|also|additionally)\b', prompt, re.IGNORECASE))
    if task_markers >= 3:
        opportunities.append({
            "category": "agent",
            "description": f"Use Task tool to launch parallel agents for {task_markers}+ sequential subtasks",
            "boost": 0.12,
            "savings": 90
        })

    # Pattern: Multiple files to modify
    file_count = len(re.findall(r'\b\w+\.(ts|tsx|js|jsx|py|go|rs)\b', prompt, re.IGNORECASE))
    if file_count >= 5:
        opportunities.append({
            "category": "agent",
            "description": f"Complex multi-file task ({file_count} files) - consider Task tool with specialized agent",
            "boost": 0.10,
            "savings": 60
        })

    return opportunities


def create_tool_plan(prompt: str, task_class: str) -> ToolPlan:
    """Create comprehensive tool plan based on prompt analysis"""
    plan = ToolPlan(task_class)

    # Skip planning for atomic tasks
    if task_class == "atomic":
        return plan

    # Detect all optimization opportunities
    optimizations = []
    optimizations.extend(detect_parallelization(prompt))
    optimizations.extend(detect_script_opportunities(prompt))
    optimizations.extend(detect_mcp_tool_opportunities(prompt, task_class))
    optimizations.extend(detect_agent_opportunities(prompt))

    # Add top 5 optimizations (avoid overwhelming)
    for opt in optimizations[:5]:
        plan.add_optimization(**opt)

    return plan


if __name__ == "__main__":
    import json

    # Read task class and prompt from command line
    if len(sys.argv) < 3:
        print("Usage: quick_tool_planner.py <task_class> <prompt>", file=sys.stderr)
        sys.exit(1)

    task_class = sys.argv[1]
    prompt = " ".join(sys.argv[2:])

    # Generate plan
    plan = create_tool_plan(prompt, task_class)

    # Output markdown (for hook injection)
    print(plan.to_markdown())
