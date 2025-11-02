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
from datetime import datetime

# ============================================================================
# Configuration
# ============================================================================
METRICS_LOG = ".claude/hook-metrics.log"
MAX_TRANSCRIPT_LINES = 400  # Keep it light to avoid timeouts
RECENT_ANALYSIS_WINDOW = 20  # Last N conversation turns to analyze

# ============================================================================
# Available Tool Detection Patterns
# ============================================================================
AVAILABLE_TOOLS = {
    "playwright": {
        "keywords": r"\b(test|testing|manual|browser|webpage|click|navigate|automation|e2e|integration test)\b",
        "reminder": "🎭 **Playwright MCP Available**: You have mcp__playwright__* tools for browser automation. Consider using them instead of manual testing.",
        "threshold": 2  # mentions before triggering
    },
    "zen_mcp": {
        "keywords": r"\b(uncertain|not sure|complex|difficult|stuck|problem|error|investigate|research|how to)\b",
        "reminder": "🧘 **Zen MCP Available**: You have Zen MCP tools (chat, thinkdeep, debug, analyze) with websearch enabled. Consider consulting them when uncertain or stuck.",
        "threshold": 3
    },
    "websearch": {
        "keywords": r"\b(latest|recent|current|new version|updated|documentation|best practice|2024|2025)\b",
        "reminder": "🔍 **WebSearch Available**: You can search for latest documentation and best practices. Don't rely on potentially outdated knowledge when current info matters.",
        "threshold": 2
    }
}

# ============================================================================
# Meta-Cognition Patterns
# ============================================================================
META_PATTERNS = {
    "impossibility_claim": {
        "regex": r"\b(can't|cannot|impossible|not possible|requires manual|need to manually|won't work|not able to)\b",
        "check_tools": True,
        "message": "⚠️ **Impossibility Claim Detected**: Before claiming something can't be done, verify:\n1. All available MCP tools checked\n2. Zen MCP consulted for alternative approaches\n3. Latest documentation researched\n\nAvailable tools: Playwright MCP, Zen MCP, WebSearch, filesystem, bash, etc."
    },
    "uncertainty_without_research": {
        "regex": r"\b(I think|probably|maybe|might|uncertain|not confident|not sure)\b",
        "check_tools": False,
        "message": "🤔 **Uncertainty Detected**: When uncertain, consider:\n1. Use WebSearch for latest documentation\n2. Consult Zen MCP (thinkdeep/analyze) for systematic investigation\n3. Ask user for clarification\n\nDon't guess when you can research."
    },
    "tech_mention_no_research": {
        "regex": r"\b(tailwind|react|next\.?js|typescript|vite|playwright|node\.?js|npm|pnpm)\s+(?:v?[0-9]+|version|latest|new|update)",
        "check_tools": False,
        "message": "📚 **Technology Version Mentioned**: Use WebSearch to verify latest documentation and breaking changes for this version before proceeding."
    },
    "missing_preventative_thinking": {
        "regex": r"\b(after|once|when done|then test|later check)\b.*\b(test|verify|validate|check)\b",
        "check_tools": False,
        "message": "🛡️ **Reactive Testing Detected**: Consider preventative measures:\n1. Think through edge cases BEFORE implementing\n2. Design with testing in mind from the start\n3. Consider what could go wrong and handle it proactively"
    }
}

# ============================================================================
# Transcript Analysis
# ============================================================================
def tail_jsonl(path: pathlib.Path, n: int = 400) -> List[str]:
    """Efficiently read last N lines from JSONL file."""
    dq = collections.deque(maxlen=n)
    try:
        with path.open('r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                stripped = line.rstrip('\n')
                if stripped:
                    dq.append(stripped)
    except Exception as e:
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
    except Exception as e:
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
        matches = len(re.findall(config["keywords"], combined, re.IGNORECASE))
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
        if re.search(config["regex"], combined, re.IGNORECASE):
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
# Tool-Specific Fast Path Checks
# ============================================================================
def check_tool_specific_hints(tool_name: str, tool_input: Dict, tool_response: Dict) -> List[str]:
    """Fast-path checks based on tool name and response (no transcript needed)."""
    hints = []

    # Write/Edit tool - suggest post-action steps
    if tool_name in ("Write", "Edit"):
        file_path = tool_input.get("file_path", "")
        if re.search(r"\.(ts|tsx|js|jsx)$", file_path):
            hints.append("💡 **Suggested**: Run `pnpm format` and `pnpm tsc --noEmit` after editing TypeScript files.")
        elif file_path.endswith(".md"):
            hints.append("💡 **Suggested**: Check for broken links and update table of contents if this is README.md")

    # Bash tool - suggest better alternatives
    elif tool_name == "Bash":
        command = tool_input.get("command", "")
        if re.search(r"\bgrep\b", command) and "rg" not in command:
            hints.append("⚡ **Performance Tip**: Use `rg` (ripgrep) instead of `grep` for 10-100x speed improvement.")
        if re.search(r"\bfind\b.*-name", command):
            hints.append("⚡ **Performance Tip**: Use `rg --files -g 'pattern'` instead of `find` for better performance.")
        if re.search(r"\brm\s+-rf\s+/\b", command):
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
# Logging
# ============================================================================
def log_pattern(pattern_name: str, count: int):
    """Log pattern detection to metrics file."""
    try:
        metrics_file = pathlib.Path(METRICS_LOG)
        metrics_file.parent.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        with metrics_file.open("a", encoding="utf-8") as f:
            f.write(f"{timestamp} | PostToolUse | {pattern_name} | count:{count}\n")
    except Exception:
        pass  # Graceful degradation

def log_error(message: str):
    """Log errors for debugging."""
    try:
        metrics_file = pathlib.Path(METRICS_LOG)
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        with metrics_file.open("a", encoding="utf-8") as f:
            f.write(f"{timestamp} | PostToolUse | ERROR | {message}\n")
    except Exception:
        pass

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

        # SLOW PATH: Transcript analysis for meta-patterns
        if transcript_path:
            analysis = analyze_recent_conversation(transcript_path)

            # Detect tool awareness gaps
            hints.extend(detect_tool_awareness_gaps(analysis))

            # Detect meta-cognitive patterns
            hints.extend(detect_meta_patterns(analysis))

            # Detect repeated approaches
            hints.extend(detect_repeated_approaches(analysis))

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

    except Exception as e:
        log_error(f"Hook execution failed: {e}")
        # Graceful degradation - don't block Claude
        print(json.dumps({"suppressOutput": True}))
        sys.exit(0)

if __name__ == "__main__":
    main()
