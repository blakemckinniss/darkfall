#!/usr/bin/env python3
"""
Zen MCP Tool Planner (Phase 2 - Tier 2)

Invokes Zen MCP planner for deep strategic analysis on risky/open_world tasks.
Provides safety recommendations, research synthesis, and context-aware planning.

Target: < 15s execution time (12s Zen MCP + 3s overhead)
Fallback: Tier-1.5 if Zen MCP fails or times out
"""
import json
import os
import subprocess
import sys
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

# Configure logging for debugging (logs to stderr, won't interfere with hook output)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - zen_planner - %(levelname)s - %(message)s',
    stream=sys.stderr
)


# Cache configuration
CACHE_DIR = "/tmp/claude-zen-mcp-plans"
CACHE_TTL_SECONDS = 900  # 15 minutes


def get_cache_key(prompt: str, task_class: str) -> str:
    """Generate cache key from prompt and task class"""
    key_str = f"{task_class}:{prompt}"
    return hashlib.md5(key_str.encode()).hexdigest()


def get_cached_plan(cache_key: str) -> Optional[str]:
    """Retrieve cached Zen MCP plan if valid"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")

    if not os.path.exists(cache_file):
        return None

    # Check cache age
    cache_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
    if cache_age > timedelta(seconds=CACHE_TTL_SECONDS):
        return None

    try:
        with open(cache_file, 'r') as f:
            cached = json.load(f)
            return cached.get("plan", "")
    except Exception:
        return None


def save_cached_plan(cache_key: str, plan: str):
    """Save Zen MCP plan to cache"""
    os.makedirs(CACHE_DIR, exist_ok=True)
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")

    try:
        with open(cache_file, 'w') as f:
            json.dump({
                "plan": plan,
                "timestamp": datetime.now().isoformat()
            }, f)
    except Exception:
        pass  # Caching is optional


def build_zen_prompt(prompt: str, task_class: str, context: Dict[str, Any]) -> str:
    """
    Build structured JSON input for Zen MCP planner tool

    Returns JSON string formatted for mcp__zen__planner input schema:
    {
      "step": "planning prompt",
      "step_number": 1,
      "total_steps": 1,
      "next_step_required": false,
      "findings": "context and requirements",
      "model": "google/gemini-2.5-pro"
    }
    """
    # Context summary
    project_type = context.get("project_type", "unknown")
    uncommitted = context.get("git", {}).get("uncommitted_files", 0)

    context_summary = f"""Project Type: {project_type}
Git Status: {uncommitted} uncommitted file(s)
Task Complexity: {task_class}"""

    # Safety emphasis for risky tasks
    safety_note = ""
    if task_class == "risky":
        safety_note = """
⚠️ RISKY TASK - Prioritize safety:
- Backup/snapshot strategy
- Dry-run capability
- Rollback plan
- Reversibility check"""

    # Research emphasis for open_world tasks
    research_note = ""
    if task_class == "open_world":
        research_note = """
🔍 OPEN WORLD RESEARCH - Prioritize accuracy:
- Multiple independent sources (≥2)
- Latest documentation (check dates)
- Version compatibility
- Breaking changes awareness"""

    planning_prompt = f"""Analyze this task and create a strategic tool usage plan:

Task: {prompt}

Context:
{context_summary}
{safety_note}{research_note}

Optimize for:
1. **Safety**: Backup strategy, dry runs, rollback planning
2. **Research Quality**: Source diversity, latest docs, version checks
3. **Time Efficiency**: Parallelization, batching, caching
4. **Confidence**: Evidence-based recommendations

Provide 3-5 specific recommendations in markdown format:
- Category: [parallelization|script|mcp_tool|safety|research|agent]
- Description: What to do and why (specific, actionable)
- Confidence Boost: 0.0-0.3 (how much this improves confidence)
- Time Estimate: seconds saved or 0 for safety/quality improvements

Focus on HIGH-IMPACT recommendations that aren't obvious from basic pattern matching."""

    # Build mcp__zen__planner input JSON
    zen_input = {
        "step": planning_prompt,
        "step_number": 1,
        "total_steps": 1,
        "next_step_required": False,
        "findings": f"Tool planning for {task_class} task",
        "model": "google/gemini-2.5-pro"
    }

    return json.dumps(zen_input, indent=2)


def invoke_zen_planner(prompt: str, task_class: str, context: Dict[str, Any], timeout: int = 12) -> Optional[str]:
    """
    Call Zen MCP planner via Claude CLI subprocess

    Uses subprocess to invoke: claude tool mcp__zen__planner -i -
    Passes structured JSON input via stdin
    Returns markdown plan or None on failure

    Timeout: 12 seconds (aggressive - we have fallback)
    """
    zen_prompt_json = build_zen_prompt(prompt, task_class, context)

    # Command: claude tool mcp__zen__planner -i -
    # -i - means read input from stdin
    command = ["claude", "tool", "mcp__zen__planner", "-i", "-"]

    logging.info(f"Invoking Zen MCP planner (timeout: {timeout}s)")

    try:
        result = subprocess.run(
            command,
            input=zen_prompt_json,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=True  # Raises CalledProcessError on non-zero exit
        )

        logging.info("Zen MCP planner call successful")
        return result.stdout.strip()

    except FileNotFoundError:
        logging.error(
            "Claude CLI not found. Ensure 'claude' command is in PATH. "
            "Falling back to Tier-1.5."
        )
        return None

    except subprocess.TimeoutExpired:
        logging.warning(f"Zen MCP planner timed out after {timeout}s. Falling back to Tier-1.5.")
        return None

    except subprocess.CalledProcessError as e:
        logging.error(
            f"Zen MCP planner failed with exit code {e.returncode}. "
            f"Stderr: {e.stderr.strip()}"
        )
        return None

    except Exception as e:
        logging.error(f"Unexpected error invoking Zen MCP: {e}")
        return None


def parse_zen_response(response: str) -> str:
    """
    Parse Zen MCP response into tool plan markdown

    Zen MCP planner returns structured analysis. We need to extract
    the recommendations and format them as tool plan output.

    Expected input: Markdown or JSON from Zen MCP
    Output: Formatted markdown for tool-planner.sh injection
    """
    if not response:
        return ""

    # Zen MCP typically returns markdown analysis
    # We'll format it into our tool plan structure

    lines = [
        "## 🛠️ Tool Strategy (Auto-Generated)",
        "",
        "**Planning Tier:** 2 (Zen MCP deep analysis)",
        "",
        "**Strategic Recommendations:**",
        ""
    ]

    # If response is already markdown with bullet points, use it directly
    if response.strip().startswith("-") or response.strip().startswith("*"):
        lines.append(response)
    else:
        # Wrap response in context
        lines.extend([
            "**Zen MCP Analysis:**",
            "",
            response,
            ""
        ])

    lines.extend([
        "",
        "**Execution Strategy:**",
        "- Follow safety recommendations before implementation",
        "- Validate all assumptions with evidence",
        "- Consider research recommendations for external dependencies",
        ""
    ])

    return "\n".join(lines)


def create_zen_tool_plan(prompt: str, task_class: str, context: Dict[str, Any]) -> str:
    """
    Create tool plan using Zen MCP planner

    Returns formatted markdown plan or empty string on failure (triggers fallback)
    """
    # Check cache first
    cache_key = get_cache_key(prompt, task_class)
    cached = get_cached_plan(cache_key)

    if cached:
        return cached

    # Invoke Zen MCP
    zen_response = invoke_zen_planner(prompt, task_class, context, timeout=12)

    if not zen_response:
        return ""  # Fallback to Tier-1.5

    # Parse response
    plan = parse_zen_response(zen_response)

    # Cache result
    save_cached_plan(cache_key, plan)

    return plan


if __name__ == "__main__":
    # Test invocation
    if len(sys.argv) < 3:
        print("Usage: zen_tool_planner.py <task_class> <prompt> [context_json]", file=sys.stderr)
        sys.exit(1)

    task_class = sys.argv[1]
    prompt = " ".join(sys.argv[2:])

    # Load context (from context_gatherer.sh output or default)
    context = {"project_type": "unknown", "git": {"uncommitted_files": 0}}

    try:
        # Try to load context from stdin if provided
        import select
        if select.select([sys.stdin], [], [], 0.0)[0]:
            context_json = sys.stdin.read()
            context = json.loads(context_json)
    except Exception:
        pass

    # Generate plan
    plan = create_zen_tool_plan(prompt, task_class, context)

    if plan:
        print(plan)
    else:
        print("", file=sys.stderr)  # Empty = fallback
        sys.exit(1)
