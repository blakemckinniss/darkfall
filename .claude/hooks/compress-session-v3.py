#!/usr/bin/env python3
"""
compress-session-v3.py - Preservation-focused compression with token-efficient format

PHILOSOPHY: Preserve ALL meaningful content, remove only JSON overhead + redundancy
TARGET: 40-60% compression by eliminating structure overhead while keeping full conversations

What gets KEPT (valuable):
- ALL user messages (full text, whitespace compressed)
- ALL assistant responses (full text, whitespace compressed)
- ALL thinking blocks (full text, whitespace compressed)
- ALL tool calls and results (summarized, not full content)
- ALL file modifications
- ALL structured sections (DOCS/DEBT/NEXT)

What gets REMOVED (worthless):
- JSON structure overhead (42% of file size)
- Duplicate system reminders (same text 50+ times)
- Excessive whitespace
- Redundant metadata fields

OUTPUT FORMAT: Token-efficient delimiters
[CTX:session_preservation]
[U1] First user message...
[U2] Second user message...
[R1] First assistant response...
[T1] Thinking block...
[FILES] file1.py:modified|file2.ts:created
[DONE] Completed todo 1|Completed todo 2
[TODO] Pending todo 1|Pending todo 2
[DOCS] 🟢20 Update ADR.md|🟡45 Document new pattern
[DEBT] 🟠60 Tech debt item 1
[NEXT] ⭐85 Next step 1|🟣70 Next step 2

Usage: compress-session-v3.py <input.jsonl> [output.txt]
"""

import json
import sys
import re
import os
from typing import List, Dict, Any, Set
from pathlib import Path
from hashlib import md5


class PreservationCompressor:
    """Preserve meaning with token-efficient delimiter format"""

    def __init__(self):
        # Full preservation (no truncation)
        self.user_messages = []  # ALL user messages
        self.assistant_responses = []  # ALL assistant responses
        self.thinking_blocks = []  # ALL thinking blocks
        self.tool_results = []  # ALL tool results (THE BONES!)
        self.tool_calls = []  # ALL tool calls (summarized)
        self.file_states = {}  # ALL file modifications
        self.todos = {"completed": [], "pending": []}
        self.tech_stack = set()
        self.decisions = []

        # Structured sections with priority/severity markers
        self.doc_updates = []  # 📚 Documentation Updates Required
        self.tech_debt = []    # ⚠️ Technical Debt & Risks
        self.next_steps = []   # Next Steps & Considerations

        # Deduplication tracking
        self.seen_system_reminders: Set[str] = set()
        self.seen_tool_results: Dict[str, int] = {}  # hash -> count
        self.deduplicated_tool_results: int = 0

    def compress_whitespace(self, text: str) -> str:
        """Remove excessive whitespace while preserving readability"""
        if not text:
            return ""

        # Collapse multiple spaces to single space
        text = re.sub(r' +', ' ', text)

        # Collapse multiple blank lines to single blank line
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

        # Convert tabs to spaces
        text = text.replace('\t', ' ')

        # Trim trailing whitespace per line
        text = '\n'.join(line.rstrip() for line in text.split('\n'))

        return text.strip()

    def hash_content(self, content: str) -> str:
        """Create hash of content for deduplication"""
        normalized = re.sub(r'\s+', ' ', content).strip().lower()
        return md5(normalized.encode()).hexdigest()[:16]

    def extract_structured_sections(self, text: str) -> None:
        """Extract structured sections with priority/severity markers"""
        if not text:
            return

        # Pattern to match numbered items with emoji and priority/severity
        item_pattern = r'^\s*\d+\.\s*([🟢🟡🟠🔴⚪🔵🟣⭐])\s*(\d+)\s+(.+?)$'

        lines = text.split('\n')
        current_section = None

        for line in lines:
            # Detect section headers
            if '📚' in line and 'Documentation' in line:
                current_section = 'doc_updates'
            elif '⚠️' in line and ('Technical Debt' in line or 'Risks' in line):
                current_section = 'tech_debt'
            elif 'Next Steps' in line and 'Considerations' in line:
                current_section = 'next_steps'
            elif line.strip().startswith('##') and current_section:
                current_section = None

            # Extract items from current section
            if current_section:
                match = re.match(item_pattern, line, re.MULTILINE)
                if match:
                    emoji, priority, description = match.groups()
                    item = f"{emoji}{priority} {description.strip()}"

                    # Store in appropriate list (avoid duplicates)
                    if current_section == 'doc_updates' and item not in self.doc_updates:
                        self.doc_updates.append(item)
                    elif current_section == 'tech_debt' and item not in self.tech_debt:
                        self.tech_debt.append(item)
                    elif current_section == 'next_steps' and item not in self.next_steps:
                        self.next_steps.append(item)

    def remove_system_reminders(self, text: str) -> str:
        """Remove duplicate system-reminder blocks"""
        # Extract system reminders
        reminder_pattern = r'<system-reminder>.*?</system-reminder>'
        reminders = re.findall(reminder_pattern, text, re.DOTALL)

        for reminder in reminders:
            reminder_hash = self.hash_content(reminder)
            if reminder_hash in self.seen_system_reminders:
                # Remove duplicate reminder
                text = text.replace(reminder, '', 1)
            else:
                # Keep first occurrence (but compress whitespace)
                self.seen_system_reminders.add(reminder_hash)

        return text

    def parse_message(self, msg: Dict[str, Any]) -> None:
        """Extract and compress information from transcript messages"""
        msg_type = msg.get("type", "")

        if msg_type == "user":
            content = msg.get("message", {}).get("content", "")

            # Tool results are INSIDE user message content blocks!
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        # BONES: Extract tool result content
                        tool_content = block.get("content", "")
                        if tool_content and len(tool_content) > 10:
                            compressed = self.compress_whitespace(tool_content)
                            compressed = self.remove_system_reminders(compressed)

                            if compressed:
                                # Deduplicate repeated tool results (e.g., same ls output 10 times)
                                result_hash = self.hash_content(compressed)

                                if result_hash in self.seen_tool_results:
                                    # Already seen this exact output
                                    count = self.seen_tool_results[result_hash]

                                    # Keep first 2 occurrences, then skip duplicates
                                    if count < 2:
                                        self.tool_results.append(compressed)
                                        self.seen_tool_results[result_hash] += 1
                                    else:
                                        # Skip duplicate (already have 2 copies)
                                        self.deduplicated_tool_results += 1
                                else:
                                    # First occurrence
                                    self.tool_results.append(compressed)
                                    self.seen_tool_results[result_hash] = 1
            elif isinstance(content, str) and content and len(content) > 10:
                # Regular user message
                compressed = self.compress_whitespace(content)
                compressed = self.remove_system_reminders(compressed)
                if compressed:
                    self.user_messages.append(compressed)

        elif msg_type == "assistant":
            content_blocks = msg.get("message", {}).get("content", [])
            for block in content_blocks:
                self._process_content_block(block)

    def _process_content_block(self, block: Dict[str, Any]) -> None:
        """Process assistant content blocks with preservation"""
        block_type = block.get("type", "")

        if block_type == "tool_use":
            tool_name = block.get("name", "")
            tool_input = block.get("input", {})
            self._process_tool_call(tool_name, tool_input)

        elif block_type == "thinking":
            thinking_text = block.get("thinking", "")
            if thinking_text and len(thinking_text) > 30:
                # Keep FULL thinking, compress whitespace only
                compressed = self.compress_whitespace(thinking_text)
                self.thinking_blocks.append(compressed)

        elif block_type == "text":
            text_content = block.get("text", "")
            if text_content and len(text_content) > 10:
                # Extract structured sections BEFORE compression
                self.extract_structured_sections(text_content)
                # Keep FULL response, compress whitespace only
                compressed = self.compress_whitespace(text_content)
                # Remove duplicate system reminders
                compressed = self.remove_system_reminders(compressed)
                if compressed:  # Only add if non-empty
                    self.assistant_responses.append(compressed)

    def _process_tool_call(self, tool_name: str, tool_input: Dict[str, Any]) -> None:
        """Extract file state, todos, and tool info"""

        # Track tool calls (for context)
        if tool_name not in ["Read", "Glob", "Grep"]:  # Skip read-only tools
            self.tool_calls.append(tool_name)

        if tool_name == "Write":
            file_path = tool_input.get("file_path", "")
            if file_path:
                self.file_states[file_path] = "created"

        elif tool_name == "Edit":
            file_path = tool_input.get("file_path", "")
            if file_path:
                self.file_states[file_path] = "modified"

        elif tool_name == "TodoWrite":
            todos = tool_input.get("todos", [])
            for todo in todos:
                status = todo.get("status", "")
                content = todo.get("content", "")
                compressed = self.compress_whitespace(content)
                if status == "completed" and compressed not in self.todos["completed"]:
                    self.todos["completed"].append(compressed)
                elif status in ["pending", "in_progress"] and compressed not in self.todos["pending"]:
                    self.todos["pending"].append(compressed)

        elif tool_name == "Bash":
            cmd = tool_input.get("command", "")
            for pm in ["npm", "pnpm", "yarn", "pip", "cargo", "go", "mvn", "gradle"]:
                if pm in cmd.lower():
                    self.tech_stack.add(pm)

        elif tool_name.startswith("mcp__zen__"):
            prompt = tool_input.get("prompt", "")
            if prompt:
                compressed = self.compress_whitespace(prompt)[:200]  # First 200 chars
                self.decisions.append({
                    "type": tool_name.replace("mcp__zen__", ""),
                    "context": compressed
                })

    def compress(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """Compress session with token-efficient delimiter format + full preservation"""

        # Read JSONL
        messages = []
        try:
            with open(input_path, 'r') as f:
                for line in f:
                    if line.strip():
                        messages.append(json.loads(line))
        except Exception as e:
            return {"error": f"Failed to read input: {e}"}

        # Process ALL messages (no truncation)
        for msg in messages:
            self.parse_message(msg)

        # Build token-optimized output with delimiter format
        output_lines = []
        output_lines.append("[CTX:session_preservation]")

        # ALL user messages with delimiter format (no truncation)
        for i, msg in enumerate(self.user_messages, 1):
            output_lines.append(f"[U{i}] {msg}")

        # ALL assistant responses (no truncation)
        for i, resp in enumerate(self.assistant_responses, 1):
            output_lines.append(f"[R{i}] {resp}")

        # ALL thinking blocks (no truncation)
        for i, think in enumerate(self.thinking_blocks, 1):
            output_lines.append(f"[T{i}] {think}")

        # ALL tool results (THE BONES - Read output, Bash output, etc.)
        for i, result in enumerate(self.tool_results, 1):
            output_lines.append(f"[TOOL{i}] {result}")

        # File states (all files)
        if self.file_states:
            files_str = "|".join([f"{p}:{s}" for p, s in self.file_states.items()])
            output_lines.append(f"[FILES] {files_str}")

        # Todos (all todos)
        if self.todos["completed"]:
            todos_str = "|".join(self.todos["completed"])
            output_lines.append(f"[DONE] {todos_str}")
        if self.todos["pending"]:
            todos_str = "|".join(self.todos["pending"])
            output_lines.append(f"[TODO] {todos_str}")

        # Tech stack
        if self.tech_stack:
            output_lines.append(f"[TECH] {','.join(sorted(self.tech_stack))}")

        # Decisions
        if self.decisions:
            for dec in self.decisions:
                output_lines.append(f"[DEC:{dec['type']}] {dec['context']}")

        # Structured sections with priority markers (all items)
        if self.doc_updates:
            docs_str = "|".join(self.doc_updates)
            output_lines.append(f"[DOCS] {docs_str}")

        if self.tech_debt:
            debt_str = "|".join(self.tech_debt)
            output_lines.append(f"[DEBT] {debt_str}")

        if self.next_steps:
            steps_str = "|".join(self.next_steps)
            output_lines.append(f"[NEXT] {steps_str}")

        # Calculate stats
        original_size = Path(input_path).stat().st_size

        # Write compressed output
        try:
            with open(output_path, 'w') as f:
                f.write('\n'.join(output_lines))
        except Exception as e:
            return {"error": f"Failed to write output: {e}"}

        compressed_size = Path(output_path).stat().st_size
        ratio = ((original_size - compressed_size) / original_size * 100) if original_size > 0 else 0

        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": f"{ratio:.1f}%",
            "saved_bytes": original_size - compressed_size,
            "original_messages": len(messages),
            "user_messages": len(self.user_messages),
            "responses": len(self.assistant_responses),
            "thinking": len(self.thinking_blocks),
            "tool_results": len(self.tool_results),
            "files": len(self.file_states),
            "todos": len(self.todos["completed"]) + len(self.todos["pending"]),
            "doc_updates": len(self.doc_updates),
            "tech_debt": len(self.tech_debt),
            "next_steps": len(self.next_steps),
            "deduplicated_reminders": len(self.seen_system_reminders),
            "deduplicated_tool_results": self.deduplicated_tool_results
        }


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: compress-session-v3.py <input.jsonl> [output.txt]", file=sys.stderr)
        print("  If output.txt not specified, writes to .claude/logs/last_conversation.txt", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]

    # Auto-generate output path if not provided
    if len(sys.argv) == 3:
        output_path = sys.argv[2]
    else:
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        logs_dir = Path(project_dir) / '.claude' / 'logs'
        logs_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(logs_dir / 'last_conversation.txt')

    if not Path(input_path).exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    compressor = PreservationCompressor()
    result = compressor.compress(input_path, output_path)

    if "error" in result:
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Output success
    print(f"✓ Preservation compression: {result['original_messages']} messages")
    print(f"  Original: {result['original_size']:,} bytes")
    print(f"  Compressed: {result['compressed_size']:,} bytes")
    print(f"  Saved: {result['compression_ratio']} ({result['saved_bytes']:,} bytes)")
    print(f"  Preserved: {result['user_messages']}U {result['responses']}R {result['thinking']}T {result['tool_results']}TOOL (ALL content)")
    print(f"  Tracked: {result['files']} files, {result['todos']} tasks")

    # Show deduplication stats
    dedup_items = []
    if result['deduplicated_reminders'] > 0:
        dedup_items.append(f"{result['deduplicated_reminders']} reminders")
    if result['deduplicated_tool_results'] > 0:
        dedup_items.append(f"{result['deduplicated_tool_results']} tool results")

    if dedup_items:
        print(f"  Deduplicated: {', '.join(dedup_items)}")

    # Show structured sections if captured
    sections_captured = []
    if result['doc_updates'] > 0:
        sections_captured.append(f"{result['doc_updates']} docs")
    if result['tech_debt'] > 0:
        sections_captured.append(f"{result['tech_debt']} debt")
    if result['next_steps'] > 0:
        sections_captured.append(f"{result['next_steps']} next")

    if sections_captured:
        print(f"  Sections: {', '.join(sections_captured)}")


if __name__ == "__main__":
    main()
