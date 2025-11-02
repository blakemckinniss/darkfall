#!/usr/bin/env python3
"""
PostToolUse Meta-Cognition Hook
Analyzes Claude's thinking patterns and tool usage to detect:
- Claims of impossibility without checking available tools
- Problems/uncertainty without using Zen MCP or websearch
- Tech mentions without researching latest documentation
- Missing connections between available systems

This focuses on HIGH-LEVEL reasoning patterns, not syntax.
"""

import json
import sys
import pathlib
import collections
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta

# ============================================================================
# Configuration
# ============================================================================
METRICS_LOG = ".claude/hook-metrics.log"
LEARNING_STATE_FILE = ".claude/hook-learning.json"
MAX_TRANSCRIPT_LINES = 100  # Optimized: only read what we need (analyze 20, buffer 80)
RECENT_ANALYSIS_WINDOW = 20  # Last N conversation turns to analyze

# Agent/Skill Discovery Cache
AGENTS_CACHE = None
SKILLS_CACHE = None

# Learning System State (Phase 2)
LEARNING_STATE = None
LEARNING_STATE_DIRTY = False
LEARNING_STATE_LAST_SAVE = None

# ============================================================================
# Pre-compiled Regex Patterns (Performance Optimization)
# ============================================================================
# Tool Awareness Patterns
PATTERN_PLAYWRIGHT_KW = re.compile(r"\b(test|testing|manual|browser|webpage|click|navigate|automation|e2e|integration test)\b", re.IGNORECASE)
PATTERN_ZEN_MCP_KW = re.compile(r"\b(uncertain|not sure|complex|difficult|stuck|problem|error|investigate|research|how to)\b", re.IGNORECASE)
PATTERN_WEBSEARCH_KW = re.compile(r"\b(latest|recent|current|new version|updated|documentation|best practice|2024|2025)\b", re.IGNORECASE)

# Meta-Cognition Patterns
PATTERN_IMPOSSIBILITY = re.compile(r"\b(can't|cannot|impossible|not possible|requires manual|need to manually|won't work|not able to)\b", re.IGNORECASE)
PATTERN_UNCERTAINTY = re.compile(r"\b(I think|probably|maybe|might|uncertain|not confident|not sure)\b", re.IGNORECASE)
PATTERN_TECH_VERSION = re.compile(r"\b(tailwind|react|next\.?js|typescript|vite|playwright|node\.?js|npm|pnpm)\s+(?:v?[0-9]+|version|latest|new|update)", re.IGNORECASE)
PATTERN_REACTIVE_TESTING = re.compile(r"\b(after|once|when done|then test|later check)\b.*\b(test|verify|validate|check)\b", re.IGNORECASE)

# Code Quality Patterns
PATTERN_CONDITIONALS = re.compile(r'\b(if|elif|else if|for|while|case|switch|catch|\?)\b')
PATTERN_CLASS_OR_INTERFACE = re.compile(r'\b(class|interface)\s+\w+')
PATTERN_TRY_BLOCK = re.compile(r'\btry\s*[{:]')
PATTERN_CATCH_BLOCK = re.compile(r'\b(catch|except)\s*[({:]')
PATTERN_DEBUG_STATEMENTS = re.compile(r'\bconsole\.(log|debug|info)\(|print\s*\(', re.IGNORECASE)
PATTERN_TECH_DEBT = re.compile(r'\b(TODO|FIXME|HACK|XXX)\b')
PATTERN_MAGIC_NUMBERS = re.compile(r'\b(?<!\.)\d{2,}\b(?!\.)')

# Performance Patterns
PATTERN_N_PLUS_ONE = re.compile(r'for\s+.*?\s+in\s+.*?[:]\s*\n?\s*.*?(query|fetch|get|find|load|select|http\.|axios\.|request)\s*\(', re.MULTILINE)
PATTERN_TRIPLE_LOOP = re.compile(r'for\s+.*?for\s+.*?for\s+')
PATTERN_DOUBLE_LOOP = re.compile(r'for\s+.*?for\s+')
PATTERN_STRING_CONCAT_LOOP = re.compile(r'for\s+.*?[:]\s*\n?\s*.*?\+=\s*[\'"]')
PATTERN_SYNC_FILE_OPS = re.compile(r'\b(readFileSync|writeFileSync|existsSync|open\(.*\)|read\(.*\))\s*\(')
PATTERN_EXPENSIVE_OPS = re.compile(r'\b(sort|filter|map|reduce|find)\s*\(')
PATTERN_LOOP_OBJECT_CREATION = re.compile(r'for\s+.*?[:]\s*\n?\s*.*?(\{|\[|new\s+\w+)')

# Tool-Specific Patterns
PATTERN_TS_FILES = re.compile(r"\.(ts|tsx|js|jsx)$")
PATTERN_GREP_COMMAND = re.compile(r"\bgrep\b")
PATTERN_FIND_COMMAND = re.compile(r"\bfind\b.*-name")
PATTERN_DANGEROUS_RM = re.compile(r"\brm\s+-rf\s+/\b")

# Agent Discovery Patterns
PATTERN_FRONTMATTER_DESC = re.compile(r'description:\s*(.+)')
PATTERN_FILE_EXTENSIONS = re.compile(r"\.(ts|tsx|js|jsx|css|json)")

# Agent/Skill Opportunity Patterns
PATTERN_TASK_TOOL = re.compile(r"task tool|subagent|task\(", re.IGNORECASE)
PATTERN_UI_UX = re.compile(r"\b(ui|ux|interface|design|visual|component|layout|styling|responsive)\b", re.IGNORECASE)
PATTERN_ENTITY_CREATION = re.compile(r"\b(create|add|new).*(entity|enemy|treasure|monster|loot|item)\b", re.IGNORECASE)
PATTERN_STATE_DEBUG = re.compile(r"\b(state|localStorage|persist|save|load|migration|serialization)\b", re.IGNORECASE)
PATTERN_TYPESCRIPT_ERROR = re.compile(r"\b(type.?error|typescript|strict.?mode|type.?safety)\b", re.IGNORECASE)
PATTERN_GAME_BALANCE = re.compile(r"\b(balance|stats|difficulty|progression|overpowered|underpowered)\b", re.IGNORECASE)
PATTERN_AI_INTEGRATION = re.compile(r"\b(fal\.ai|groq|ai.*(endpoint|generation)|portrait|image.?gen)\b", re.IGNORECASE)
PATTERN_TASK_MARKERS = re.compile(r"\b(then|and then|after that|next|also)\b", re.IGNORECASE)
PATTERN_REPEATED_WORKFLOW = re.compile(r"\b(always|every.?time|whenever|repeatedly)\b.*\b(do|run|execute|perform)\b", re.IGNORECASE)

# ============================================================================
# Available Tool Detection Patterns
# ============================================================================
AVAILABLE_TOOLS = {
    "playwright": {
        "pattern": PATTERN_PLAYWRIGHT_KW,
        "reminder": "🎭 **Playwright MCP Available**: You have mcp__playwright__* tools for browser automation. Consider using them instead of manual testing.",
        "threshold": 2  # mentions before triggering
    },
    "zen_mcp": {
        "pattern": PATTERN_ZEN_MCP_KW,
        "reminder": "🧘 **Zen MCP Available**: You have Zen MCP tools (chat, thinkdeep, debug, analyze) with websearch enabled. Consider consulting them when uncertain or stuck.",
        "threshold": 3
    },
    "websearch": {
        "pattern": PATTERN_WEBSEARCH_KW,
        "reminder": "🔍 **WebSearch Available**: You can search for latest documentation and best practices. Don't rely on potentially outdated knowledge when current info matters.",
        "threshold": 2
    }
}

# ============================================================================
# Meta-Cognition Patterns
# ============================================================================
META_PATTERNS = {
    "impossibility_claim": {
        "pattern": PATTERN_IMPOSSIBILITY,
        "check_tools": True,
        "message": "⚠️ **Impossibility Claim Detected**: Before claiming something can't be done, verify:\n1. All available MCP tools checked\n2. Zen MCP consulted for alternative approaches\n3. Latest documentation researched\n\nAvailable tools: Playwright MCP, Zen MCP, WebSearch, filesystem, bash, etc."
    },
    "uncertainty_without_research": {
        "pattern": PATTERN_UNCERTAINTY,
        "check_tools": False,
        "message": "🤔 **Uncertainty Detected**: When uncertain, consider:\n1. Use WebSearch for latest documentation\n2. Consult Zen MCP (thinkdeep/analyze) for systematic investigation\n3. Ask user for clarification\n\nDon't guess when you can research."
    },
    "tech_mention_no_research": {
        "pattern": PATTERN_TECH_VERSION,
        "check_tools": False,
        "message": "📚 **Technology Version Mentioned**: Use WebSearch to verify latest documentation and breaking changes for this version before proceeding."
    },
    "missing_preventative_thinking": {
        "pattern": PATTERN_REACTIVE_TESTING,
        "check_tools": False,
        "message": "🛡️ **Reactive Testing Detected**: Consider preventative measures:\n1. Think through edge cases BEFORE implementing\n2. Design with testing in mind from the start\n3. Consider what could go wrong and handle it proactively"
    }
}

# ============================================================================
# Transcript Analysis
# ============================================================================
def tail_jsonl(path: pathlib.Path, n: int = 100) -> List[str]:
    """Efficiently read last N lines from JSONL file."""
    dq = collections.deque(maxlen=n)
    try:
        with path.open('r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                stripped = line.rstrip('\n')
                if stripped:
                    dq.append(stripped)
    except (IOError, OSError, UnicodeDecodeError) as e:
        log_error(f"Failed to read transcript: {e}")
        return []
    return list(dq)

def parse_message(line: str) -> Optional[Dict[str, Any]]:
    """Parse a single JSONL line into message structure."""
    try:
        obj = json.loads(line)
        msg_type = obj.get("type", "")
        message = obj.get("message", {})

        # Extract content (handle both string and array formats)
        content = message.get("content", "")
        if isinstance(content, list):
            # For assistant messages, extract text and thinking
            text_parts = []
            thinking_parts = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text":
                        text_parts.append(item.get("text", ""))
                    elif item.get("type") == "thinking":
                        thinking_parts.append(item.get("thinking", ""))
            content = {
                "text": " ".join(text_parts),
                "thinking": " ".join(thinking_parts)
            }

        return {
            "type": msg_type,
            "role": message.get("role", ""),
            "content": content,
            "timestamp": obj.get("timestamp", "")
        }
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        # Specific exceptions for JSON parsing and dict access
        return None

def analyze_recent_conversation(transcript_path: str) -> Dict[str, Any]:
    """
    Analyze recent conversation for meta-cognitive patterns.
    Returns dict with detected patterns and recommendations.
    """
    path = pathlib.Path(transcript_path).expanduser()
    if not path.exists():
        return {"patterns": [], "recommendations": []}

    lines = tail_jsonl(path, MAX_TRANSCRIPT_LINES)
    messages = [parse_message(line) for line in lines[-RECENT_ANALYSIS_WINDOW:]]
    messages = [m for m in messages if m]  # Filter None

    # Combine all assistant text and thinking for analysis
    assistant_text = []
    assistant_thinking = []

    for msg in messages:
        if msg["role"] == "assistant":
            content = msg["content"]
            if isinstance(content, dict):
                if content.get("text"):
                    assistant_text.append(content["text"])
                if content.get("thinking"):
                    assistant_thinking.append(content["thinking"])
            elif isinstance(content, str):
                assistant_text.append(content)

    combined_text = " ".join(assistant_text)
    combined_thinking = " ".join(assistant_thinking)

    return {
        "assistant_text": combined_text,
        "assistant_thinking": combined_thinking,
        "messages": messages
    }

# ============================================================================
# Pattern Detection
# ============================================================================
def detect_tool_awareness_gaps(analysis: Dict[str, Any]) -> List[str]:
    """Detect when Claude doesn't use available tools."""
    hints = []
    text = analysis["assistant_text"].lower()
    thinking = analysis["assistant_thinking"].lower()
    combined = text + " " + thinking

    for tool_name, config in AVAILABLE_TOOLS.items():
        matches = len(config["pattern"].findall(combined))
        if matches >= config["threshold"]:
            # Check if Claude actually mentioned using the tool
            tool_mentioned = False
            if tool_name == "playwright":
                tool_mentioned = "playwright" in combined or "mcp__playwright" in combined
            elif tool_name == "zen_mcp":
                tool_mentioned = "zen" in combined or "thinkdeep" in combined or "analyze" in combined
            elif tool_name == "websearch":
                tool_mentioned = "search" in combined or "websearch" in combined

            if not tool_mentioned:
                log_pattern(f"tool_gap_{tool_name}", matches)
                hints.append(config["reminder"])

    return hints

def detect_meta_patterns(analysis: Dict[str, Any]) -> List[str]:
    """Detect high-level reasoning patterns."""
    hints = []
    text = analysis["assistant_text"]
    thinking = analysis["assistant_thinking"]
    combined = text + " " + thinking

    for pattern_name, config in META_PATTERNS.items():
        if config["pattern"].search(combined):
            log_pattern(f"meta_{pattern_name}", 1)
            hints.append(config["message"])
            # Only report first meta-pattern to avoid overwhelming Claude
            break

    return hints

def detect_repeated_approaches(analysis: Dict[str, Any]) -> List[str]:
    """Detect if Claude is trying the same thing multiple times."""
    hints = []
    messages = analysis["messages"]

    # Look for tool calls (simplified - would need actual tool tracking)
    tool_calls = []
    for msg in messages:
        if msg["role"] == "assistant" and isinstance(msg["content"], dict):
            # In real implementation, would extract tool_use blocks
            pass

    # For now, detect repeated phrases in text
    text_chunks = [msg["content"] if isinstance(msg["content"], str) else msg["content"].get("text", "")
                   for msg in messages if msg["role"] == "assistant"]

    # Simple heuristic: if same phrase appears 3+ times
    phrase_counts = collections.Counter()
    for chunk in text_chunks:
        # Extract significant phrases (5+ words)
        words = chunk.split()
        for i in range(len(words) - 4):
            phrase = " ".join(words[i:i+5]).lower()
            phrase_counts[phrase] += 1

    for phrase, count in phrase_counts.most_common(3):
        if count >= 3 and len(phrase) > 20:  # Meaningful phrases only
            log_pattern("repeated_approach", count)
            hints.append(f"🔄 **Repeated Approach Detected**: The phrase '{phrase[:50]}...' appears {count} times. Consider trying a different approach.")
            break

    return hints

# ============================================================================
# Code Quality Pattern Detection
# ============================================================================
# File types to skip for code analysis (data/documentation files)
SKIP_FILE_TYPES = re.compile(r'\.(md|txt|json|yml|yaml|toml|xml|csv|log)$', re.IGNORECASE)

def detect_code_quality_issues(tool_name: str, tool_input: Dict) -> List[str]:
    """Detect code quality anti-patterns in Write/Edit operations."""
    hints = []

    if tool_name not in ("Write", "Edit"):
        return hints

    # Skip analysis for documentation and data files
    file_path = tool_input.get("file_path", "")
    if file_path and SKIP_FILE_TYPES.search(file_path):
        return hints

    code = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not code or len(code) < 20:
        return hints

    # 1. Long method detection (adaptive threshold)
    lines = code.count('\n') + 1
    threshold = adjust_threshold_based_on_usage("quality_long_method", 50)
    if lines > threshold:
        log_pattern("quality_long_method", lines)
        update_pattern_trigger("quality_long_method")
        hints.append(f"📏 **Long Method**: {lines} lines detected (threshold: {int(threshold)}). Consider breaking into smaller, focused functions.")

    # 2. High cyclomatic complexity (adaptive threshold)
    conditionals = len(PATTERN_CONDITIONALS.findall(code))
    threshold = adjust_threshold_based_on_usage("quality_high_complexity", 10)
    if conditionals > threshold:
        log_pattern("quality_high_complexity", conditionals)
        update_pattern_trigger("quality_high_complexity")
        hints.append(f"🌀 **High Complexity**: {conditionals} conditionals detected (threshold: {int(threshold)}). Consider simplifying logic or extracting functions.")

    # 3. Deep nesting (adaptive threshold)
    lines_list = code.split('\n')
    max_indent = 0
    for line in lines_list:
        if line.strip():  # Skip empty lines
            indent = len(line) - len(line.lstrip())
            max_indent = max(max_indent, indent)

    nesting_levels = max_indent // 4  # Assuming 4-space indentation
    threshold = adjust_threshold_based_on_usage("quality_deep_nesting", 4)
    if nesting_levels > threshold:
        log_pattern("quality_deep_nesting", nesting_levels)
        update_pattern_trigger("quality_deep_nesting")
        hints.append(f"🪆 **Deep Nesting**: {nesting_levels} levels detected (threshold: {int(threshold)}). Consider extracting nested logic into separate functions.")

    # 4. God object/class detection (>500 lines)
    if PATTERN_CLASS_OR_INTERFACE.search(code):
        if lines > 500:
            log_pattern("quality_god_object", lines)
            hints.append(f"🏛️ **God Object**: {lines} line class. Consider splitting responsibilities (Single Responsibility Principle).")

    # 5. Missing error handling
    has_try = bool(PATTERN_TRY_BLOCK.search(code))
    has_catch = bool(PATTERN_CATCH_BLOCK.search(code))
    if has_try and not has_catch:
        log_pattern("quality_missing_error_handler", 1)
        hints.append("⚠️ **Missing Error Handler**: Try block without catch/except clause. Add error handling.")

    # 6. Console/debug statements left in code (adaptive threshold)
    debug_statements = len(PATTERN_DEBUG_STATEMENTS.findall(code))
    threshold = adjust_threshold_based_on_usage("quality_debug_statements", 3)
    if debug_statements >= threshold:
        log_pattern("quality_debug_statements", debug_statements)
        update_pattern_trigger("quality_debug_statements")
        hints.append(f"🐛 **Debug Statements**: {debug_statements} console.log/print found (threshold: {int(threshold)}). Remove before committing.")

    # 7. TODO/FIXME/HACK accumulation (adaptive threshold)
    tech_debt_markers = len(PATTERN_TECH_DEBT.findall(code))
    threshold = adjust_threshold_based_on_usage("quality_tech_debt_markers", 5)
    if tech_debt_markers > threshold:
        log_pattern("quality_tech_debt_markers", tech_debt_markers)
        update_pattern_trigger("quality_tech_debt_markers")
        hints.append(f"📝 **Technical Debt**: {tech_debt_markers} TODO/FIXME markers (threshold: {int(threshold)}). Consider addressing before adding more.")

    # 8. Magic numbers (adaptive threshold)
    magic_numbers = len(PATTERN_MAGIC_NUMBERS.findall(code))
    threshold = adjust_threshold_based_on_usage("quality_magic_numbers", 5)
    if magic_numbers > threshold:
        log_pattern("quality_magic_numbers", magic_numbers)
        update_pattern_trigger("quality_magic_numbers")
        hints.append(f"🔢 **Magic Numbers**: {magic_numbers} numeric literals found (threshold: {int(threshold)}). Consider using named constants.")

    return hints[:2]  # Limit to top 2 quality hints

# ============================================================================
# Performance Anti-Pattern Detection
# ============================================================================
def detect_performance_issues(tool_name: str, tool_input: Dict) -> List[str]:
    """Detect performance anti-patterns in code."""
    hints = []

    if tool_name not in ("Write", "Edit"):
        return hints

    # Skip analysis for documentation and data files
    file_path = tool_input.get("file_path", "")
    if file_path and SKIP_FILE_TYPES.search(file_path):
        return hints

    code = tool_input.get("content", "") or tool_input.get("new_string", "")
    if not code or len(code) < 20:
        return hints

    # 1. N+1 query detection (always warn - critical performance issue)
    if PATTERN_N_PLUS_ONE.search(code):
        log_pattern("perf_n_plus_one", 1)
        update_pattern_trigger("perf_n_plus_one")
        hints.append("⚡ **N+1 Query Detected**: Database/API call inside loop. Consider bulk fetching or caching.")

    # 2. Nested loops (always warn for O(n³), adaptive for O(n²))
    nested_loops = len(PATTERN_TRIPLE_LOOP.findall(code))
    if nested_loops > 0:
        log_pattern("perf_nested_loops", nested_loops)
        update_pattern_trigger("perf_nested_loops")
        hints.append(f"🔄 **Nested Loops**: O(n³) complexity detected. Consider using hash maps, sets, or better algorithms.")
    elif PATTERN_DOUBLE_LOOP.search(code):
        # O(n²) is common, use adaptive threshold based on context
        log_pattern("perf_double_loop", 1)
        update_pattern_trigger("perf_double_loop")
        hints.append("🔁 **Nested Loops**: O(n²) complexity. Consider optimization if operating on large datasets.")

    # 3. Inefficient string concatenation in loops (always warn - common mistake)
    if PATTERN_STRING_CONCAT_LOOP.search(code):
        log_pattern("perf_string_concat_loop", 1)
        update_pattern_trigger("perf_string_concat_loop")
        hints.append("📝 **String Concat in Loop**: Use array.join() or StringBuilder instead of += for better performance.")

    # 4. Synchronous file operations (adaptive threshold)
    sync_file_ops = len(PATTERN_SYNC_FILE_OPS.findall(code))
    threshold = adjust_threshold_based_on_usage("perf_blocking_io", 1)
    if sync_file_ops >= threshold:
        log_pattern("perf_blocking_io", sync_file_ops)
        update_pattern_trigger("perf_blocking_io")
        hints.append(f"🐌 **Blocking I/O**: {sync_file_ops} synchronous file operation(s) (threshold: {int(threshold)}). Consider async alternatives for non-blocking I/O.")

    # 5. Repeated expensive calculations (adaptive threshold)
    expensive_funcs = PATTERN_EXPENSIVE_OPS.findall(code)
    threshold = adjust_threshold_based_on_usage("perf_repeated_calculation", 3)
    if len(expensive_funcs) >= threshold:
        # Check if same operation repeated
        func_counts = collections.Counter(expensive_funcs)
        for func, count in func_counts.items():
            threshold_ops = adjust_threshold_based_on_usage("perf_repeated_calculation_ops", 2)
            if count >= threshold_ops:
                log_pattern("perf_repeated_calculation", count)
                update_pattern_trigger("perf_repeated_calculation")
                hints.append(f"🔁 **Repeated Operations**: {func} called {count} times (threshold: {int(threshold_ops)}). Consider caching/memoization.")
                break

    # 6. Large object creation in loops
    if PATTERN_LOOP_OBJECT_CREATION.search(code):
        log_pattern("perf_object_creation_loop", 1)
        hints.append("🏗️ **Object Creation in Loop**: Creating objects/arrays in loop. Consider pre-allocation if size is known.")

    return hints[:2]  # Limit to top 2 performance hints

# ============================================================================
# Tool-Specific Fast Path Checks
# ============================================================================
def check_tool_specific_hints(tool_name: str, tool_input: Dict, tool_response: Dict) -> List[str]:
    """Fast-path checks based on tool name and response (no transcript needed)."""
    hints = []

    # Write/Edit tool - suggest post-action steps
    if tool_name in ("Write", "Edit"):
        file_path = tool_input.get("file_path", "")
        if PATTERN_TS_FILES.search(file_path):
            hints.append("💡 **Suggested**: Run `pnpm format` and `pnpm tsc --noEmit` after editing TypeScript files.")
        elif file_path.endswith(".md"):
            hints.append("💡 **Suggested**: Check for broken links and update table of contents if this is README.md")

    # Bash tool - suggest better alternatives
    elif tool_name == "Bash":
        command = tool_input.get("command", "")
        if PATTERN_GREP_COMMAND.search(command) and "rg" not in command:
            hints.append("⚡ **Performance Tip**: Use `rg` (ripgrep) instead of `grep` for 10-100x speed improvement.")
        if PATTERN_FIND_COMMAND.search(command):
            hints.append("⚡ **Performance Tip**: Use `rg --files -g 'pattern'` instead of `find` for better performance.")
        if PATTERN_DANGEROUS_RM.search(command):
            hints.append("🚨 **DANGER**: Destructive command detected. Verify path safety before executing.")

    # Read tool - suggest batch reading
    elif tool_name == "Read":
        # Could track if Claude is reading files one-by-one
        pass

    # Error response - suggest investigation
    if isinstance(tool_response, dict):
        error = tool_response.get("error")
        if error:
            hints.append("🔍 **Error Detected**: Consider using Zen MCP (debug tool) for systematic root cause analysis instead of trial-and-error.")

    return hints

# ============================================================================
# Agent/Skill Awareness
# ============================================================================
def discover_agents_and_skills() -> tuple:
    """
    Discover available agents and skills once per session (cached).
    Returns (agents_dict, skills_list)
    """
    global AGENTS_CACHE, SKILLS_CACHE

    if AGENTS_CACHE is not None:
        return AGENTS_CACHE, SKILLS_CACHE

    agents = {}
    skills = []

    # Scan agents directory
    agents_dir = pathlib.Path(".claude/agents")
    if agents_dir.exists():
        for agent_file in agents_dir.glob("*.md"):
            agent_name = agent_file.stem
            try:
                with agent_file.open('r', encoding='utf-8') as f:
                    content = f.read(500)  # First 500 chars only
                    # Extract description from frontmatter
                    desc_match = PATTERN_FRONTMATTER_DESC.search(content)
                    agents[agent_name] = desc_match.group(1).strip() if desc_match else "Specialized agent"
            except (IOError, OSError, UnicodeDecodeError) as e:
                # File read errors or encoding issues
                agents[agent_name] = "Specialized agent"

    # Scan skills directory
    skills_dir = pathlib.Path(".claude/skills")
    if skills_dir.exists():
        for item in skills_dir.iterdir():
            if item.is_dir():
                skills.append(item.name)

    AGENTS_CACHE = agents
    SKILLS_CACHE = skills

    if agents or skills:
        log_pattern("agent_skill_discovery", len(agents) + len(skills))

    return agents, skills

def detect_agent_opportunities(analysis: Dict[str, Any]) -> List[str]:
    """
    Detect when to suggest agents or skills based on conversation patterns.
    Returns list of agent/skill suggestions (limited to 1).
    """
    hints = []
    agents, skills = discover_agents_and_skills()

    if not agents and not skills:
        return hints  # No agents/skills available

    text = analysis["assistant_text"].lower()
    thinking = analysis["assistant_thinking"].lower()
    combined = text + " " + thinking

    # Skip if already using Task tool
    if PATTERN_TASK_TOOL.search(combined):
        return hints

    # Domain-specific agent matching
    agent_patterns = {
        "game-ui-designer": PATTERN_UI_UX,
        "entity-creator": PATTERN_ENTITY_CREATION,
        "state-debugger": PATTERN_STATE_DEBUG,
        "strict-typescript-enforcer": PATTERN_TYPESCRIPT_ERROR,
        "game-balance-auditor": PATTERN_GAME_BALANCE,
        "ai-integration-specialist": PATTERN_AI_INTEGRATION
    }

    for agent_name, pattern in agent_patterns.items():
        if agent_name in agents and pattern.search(combined):
            desc = agents[agent_name]
            log_pattern(f"agent_match_{agent_name}", 1)
            hints.append(f"🤖 **Agent Available**: `{agent_name}` - {desc}\n\n💡 Delegate with: `Task(subagent_type=\"{agent_name}\", prompt=\"Your instructions\")`")
            return hints  # Only suggest one agent per tool call

    # Complexity-based suggestions for NEW agent creation
    file_mentions = len(PATTERN_FILE_EXTENSIONS.findall(combined))
    if file_mentions >= 5:  # Expert recommendation: 5+ files (not 3+)
        log_pattern("complex_multi_file", file_mentions)
        hints.append(f"🔀 **Complex Task Detected**: Modifying {file_mentions}+ files. Consider creating specialized agent:\n\n💡 `Task(subagent_type=\"general-purpose\", prompt=\"Specialized task description\")`")
        return hints

    # Parallelization opportunities
    task_markers = len(PATTERN_TASK_MARKERS.findall(combined))
    if task_markers >= 3:
        log_pattern("parallelization_opportunity", task_markers)
        hints.append("⚡ **Parallelization Opportunity**: Multiple sequential tasks detected. Run them in parallel:\n\n💡 Launch multiple Task agents simultaneously (up to 10 parallel)")
        return hints

    # Repeated workflow detection (suggest skill creation)
    if PATTERN_REPEATED_WORKFLOW.search(combined):
        log_pattern("repeated_workflow", 1)
        skills_list = ', '.join(skills) if skills else 'None yet'
        hints.append(f"🔄 **Repeated Workflow**: Consider creating a Skill to automate this pattern.\n\n💡 Available skills: {skills_list}")
        return hints

    return hints

# ============================================================================
# Logging
# ============================================================================
def log_pattern(pattern_name: str, count: int):
    """Log pattern detection to metrics file."""
    try:
        metrics_file = pathlib.Path(METRICS_LOG)
        metrics_file.parent.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with metrics_file.open("a", encoding="utf-8") as f:
            f.write(f"{timestamp} | PostToolUse | {pattern_name} | count:{count}\n")
    except (IOError, OSError) as e:
        # File write errors - graceful degradation
        pass

def log_error(message: str):
    """Log errors for debugging."""
    try:
        metrics_file = pathlib.Path(METRICS_LOG)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        with metrics_file.open("a", encoding="utf-8") as f:
            f.write(f"{timestamp} | PostToolUse | ERROR | {message}\n")
    except (IOError, OSError) as e:
        # File write errors - graceful degradation
        pass

# ============================================================================
# Learning System (Phase 2A - Adaptive Thresholds)
# ============================================================================
def load_learning_state() -> Dict[str, Any]:
    """Load learning state from disk (cached globally)."""
    global LEARNING_STATE

    if LEARNING_STATE is not None:
        return LEARNING_STATE

    try:
        path = pathlib.Path(LEARNING_STATE_FILE)
        if path.exists():
            with path.open('r', encoding='utf-8') as f:
                LEARNING_STATE = json.load(f)
        else:
            LEARNING_STATE = {}
    except (IOError, OSError, json.JSONDecodeError) as e:
        log_error(f"Failed to load learning state: {e}")
        LEARNING_STATE = {}

    return LEARNING_STATE

def mark_dirty():
    """Mark learning state as needing save."""
    global LEARNING_STATE_DIRTY
    LEARNING_STATE_DIRTY = True

def maybe_save_learning_state(force: bool = False):
    """Save learning state to disk (lazy write every 5 minutes)."""
    global LEARNING_STATE_DIRTY, LEARNING_STATE_LAST_SAVE

    if not LEARNING_STATE_DIRTY and not force:
        return

    now = datetime.now(timezone.utc)
    if LEARNING_STATE_LAST_SAVE and not force:
        time_since = (now - LEARNING_STATE_LAST_SAVE).total_seconds()
        if time_since < 300:  # Save every 5 minutes
            return

    try:
        path = pathlib.Path(LEARNING_STATE_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open('w', encoding='utf-8') as f:
            json.dump(LEARNING_STATE, f, indent=2)
        LEARNING_STATE_DIRTY = False
        LEARNING_STATE_LAST_SAVE = now
    except (IOError, OSError) as e:
        log_error(f"Failed to save learning state: {e}")

def get_pattern_state(pattern_name: str, default_threshold: float) -> Dict[str, Any]:
    """Get or initialize pattern learning state."""
    state = load_learning_state()

    if pattern_name not in state:
        state[pattern_name] = {
            "threshold": default_threshold,
            "trigger_count": 0,
            "last_trigger": None,
            "cooldown_until": None,
            "default_threshold": default_threshold
        }
        mark_dirty()

    return state[pattern_name]

def adjust_threshold_based_on_usage(pattern_name: str, base_threshold: float) -> float:
    """
    Adaptive threshold adjustment based on usage patterns.
    Returns adjusted threshold to use for this detection.
    """
    state = get_pattern_state(pattern_name, base_threshold)
    now = datetime.now(timezone.utc)

    # Check cooldown
    if state["cooldown_until"]:
        try:
            cooldown = datetime.fromisoformat(state["cooldown_until"])
            if now < cooldown:
                return float('inf')  # Suppress pattern during cooldown
        except (ValueError, TypeError):
            state["cooldown_until"] = None  # Invalid cooldown, clear it

    # Time-based adjustment
    if state["last_trigger"]:
        try:
            last = datetime.fromisoformat(state["last_trigger"])
            time_delta = (now - last).total_seconds()

            if time_delta < 300:  # < 5 minutes - likely false positive
                state["threshold"] *= 1.5  # Increase threshold 50%
                state["cooldown_until"] = (now + timedelta(hours=1)).isoformat()
                mark_dirty()
            elif time_delta > 86400:  # > 24 hours - valuable insight
                state["threshold"] = max(
                    state["threshold"] * 0.9,  # Decrease 10%
                    state["default_threshold"] * 0.5  # Floor at 50% of default
                )
                mark_dirty()
        except (ValueError, TypeError):
            pass  # Invalid timestamp, skip adjustment

    return state["threshold"]

def update_pattern_trigger(pattern_name: str):
    """Update pattern state after trigger."""
    state = load_learning_state()
    if pattern_name in state:
        state[pattern_name]["last_trigger"] = datetime.now(timezone.utc).isoformat()
        state[pattern_name]["trigger_count"] += 1
        mark_dirty()

# ============================================================================
# Main Hook Logic
# ============================================================================
def main():
    """Main PostToolUse hook entry point."""
    try:
        # Read hook input
        data = json.load(sys.stdin)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {}) or {}
        tool_response = data.get("tool_response", {}) or {}
        transcript_path = data.get("transcript_path", "")

        hints = []

        # FAST PATH: Tool-specific checks (no transcript needed)
        hints.extend(check_tool_specific_hints(tool_name, tool_input, tool_response))

        # CODE QUALITY: Detect quality anti-patterns
        hints.extend(detect_code_quality_issues(tool_name, tool_input))

        # PERFORMANCE: Detect performance anti-patterns
        hints.extend(detect_performance_issues(tool_name, tool_input))

        # SLOW PATH: Transcript analysis for meta-patterns
        if transcript_path:
            analysis = analyze_recent_conversation(transcript_path)

            # Detect tool awareness gaps
            hints.extend(detect_tool_awareness_gaps(analysis))

            # Detect meta-cognitive patterns
            hints.extend(detect_meta_patterns(analysis))

            # Detect repeated approaches
            hints.extend(detect_repeated_approaches(analysis))

            # Detect agent/skill opportunities
            hints.extend(detect_agent_opportunities(analysis))

        # Output result
        if hints:
            # Deduplicate and limit to top 3 hints (avoid overwhelming)
            unique_hints = []
            seen = set()
            for hint in hints:
                key = hint[:50]  # Use first 50 chars as dedup key
                if key not in seen:
                    unique_hints.append(hint)
                    seen.add(key)

            limited_hints = unique_hints[:3]

            output = {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": "🧠 **Meta-Cognition Check**:\n\n" + "\n\n".join(limited_hints)
                }
            }
            print(json.dumps(output))
        else:
            # No hints - suppress output to keep transcript clean
            print(json.dumps({"suppressOutput": True}))

        # Save learning state (lazy write)
        maybe_save_learning_state()

    except Exception as e:
        log_error(f"Hook execution failed: {e}")
        # Graceful degradation - don't block Claude
        print(json.dumps({"suppressOutput": True}))
        sys.exit(0)

if __name__ == "__main__":
    main()
