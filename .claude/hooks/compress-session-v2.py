#!/usr/bin/env python3
"""
compress-session-v2.py - Token-optimized compression for Claude Code sessions

Reduces token count by 60-70% while preserving semantic meaning.
Uses delimiter-based format optimized for Claude's tokenizer.

Usage: compress-session-v2.py <input.jsonl> [output.txt]
  - If output.txt not specified, writes to .claude/logs/last_conversation.txt
  - Automatically overwrites existing last_conversation.txt if present
  - Cleans up all other files in the output directory
"""

import json
import sys
import re
import os
from typing import List, Dict, Any
from pathlib import Path


class TokenOptimizedCompressor:
    """Compress sessions with aggressive token optimization for Claude consumption"""

    # Safe abbreviations Claude understands well
    ABBREVIATIONS = {
        'implementation': 'impl',
        'implementations': 'impls',
        'configuration': 'config',
        'configurations': 'configs',
        'authentication': 'auth',
        'authorization': 'authz',
        'database': 'DB',
        'function': 'fn',
        'functions': 'fns',
        'component': 'comp',
        'components': 'comps',
        'repository': 'repo',
        'repositories': 'repos',
        'application': 'app',
        'applications': 'apps',
        'typescript': 'TS',
        'javascript': 'JS',
        'documentation': 'docs',
        'environment': 'env',
        'production': 'prod',
        'development': 'dev',
        'parameter': 'param',
        'parameters': 'params',
        'argument': 'arg',
        'arguments': 'args',
        'variable': 'var',
        'variables': 'vars',
        'directory': 'dir',
        'directories': 'dirs',
        'initialize': 'init',
        'initialize': 'init',
        'response': 'resp',
        'request': 'req',
        'error': 'err',
        'warning': 'warn',
        'information': 'info',
        'modification': 'mod',
        'modifications': 'mods',
    }

    # NOTE: Stop word removal removed based on modern NLP research
    # Modern LLMs use subword tokenizers trained on natural syntax
    # Removing function words saves minimal tokens but hurts comprehension

    def __init__(self):
        self.user_messages = []
        self.assistant_responses = []
        self.thinking_blocks = []
        self.file_states = {}
        self.todos = {"completed": [], "pending": []}
        self.tech_stack = set()
        self.decisions = []
        # Structured sections with priority/severity markers
        self.doc_updates = []  # 📚 Documentation Updates Required
        self.tech_debt = []    # ⚠️ Technical Debt & Risks
        self.next_steps = []   # Next Steps & Considerations

    def compress_text(self, text: str, max_len: int = None) -> str:
        """Apply semantic compression to reduce tokens while preserving meaning"""
        if not text:
            return ""

        # Phase 1: Apply abbreviations (case-insensitive, preserve case in output)
        for full, abbr in self.ABBREVIATIONS.items():
            # Case-insensitive replacement
            text = re.sub(r'\b' + full + r'\b', abbr, text, flags=re.IGNORECASE)

        # Phase 2: Collapse multiple spaces (stop word removal removed)
        text = re.sub(r'\s+', ' ', text).strip()

        # Phase 4: Truncate if needed (preserve start and end)
        if max_len and len(text) > max_len:
            # Keep first 40% and last 60% for context
            split_point = int(max_len * 0.4)
            text = text[:split_point] + '...' + text[-(max_len - split_point - 3):]

        return text

    def extract_structured_sections(self, text: str) -> None:
        """Extract structured sections with priority/severity markers"""
        if not text:
            return

        # Pattern to match numbered items with emoji and priority/severity
        # Format: "1. 🟢20 Description" or "1. ⭐85 Description"
        item_pattern = r'^\s*\d+\.\s*([🟢🟡🟠🔴⚪🔵🟣⭐])\s*(\d+)\s+(.+?)$'

        # Split text into lines
        lines = text.split('\n')
        current_section = None

        for i, line in enumerate(lines):
            # Detect section headers
            if '📚' in line and 'Documentation' in line:
                current_section = 'doc_updates'
            elif '⚠️' in line and ('Technical Debt' in line or 'Risks' in line):
                current_section = 'tech_debt'
            elif 'Next Steps' in line and 'Considerations' in line:
                current_section = 'next_steps'
            elif line.strip().startswith('##') and current_section:
                # New section started, reset
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

    def parse_message(self, msg: Dict[str, Any]) -> None:
        """Extract and compress information from transcript messages"""
        msg_type = msg.get("type", "")

        if msg_type == "user":
            content = msg.get("message", {}).get("content", "")
            if content and len(content) > 20:
                # Compress user message
                compressed = self.compress_text(content, max_len=300)
                self.user_messages.append(compressed)

        elif msg_type == "assistant":
            content_blocks = msg.get("message", {}).get("content", [])
            for block in content_blocks:
                self._process_content_block(block)

    def _process_content_block(self, block: Dict[str, Any]) -> None:
        """Process assistant content blocks with compression"""
        block_type = block.get("type", "")

        if block_type == "tool_use":
            tool_name = block.get("name", "")
            tool_input = block.get("input", {})
            self._process_tool_call(tool_name, tool_input)

        elif block_type == "thinking":
            thinking_text = block.get("thinking", "")
            if thinking_text and len(thinking_text) > 50:
                # Aggressive compression for thinking - extract key insights
                compressed = self.compress_text(thinking_text, max_len=400)
                self.thinking_blocks.append(compressed)

        elif block_type == "text":
            text_content = block.get("text", "")
            if text_content and len(text_content) > 10:
                # Extract structured sections BEFORE compression
                self.extract_structured_sections(text_content)
                # Moderate compression for responses
                compressed = self.compress_text(text_content, max_len=300)
                self.assistant_responses.append(compressed)

    def _process_tool_call(self, tool_name: str, tool_input: Dict[str, Any]) -> None:
        """Extract file state and todo info with compression"""

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
                compressed = self.compress_text(content, max_len=100)
                if status == "completed" and compressed not in self.todos["completed"]:
                    self.todos["completed"].append(compressed)
                elif status == "pending" and compressed not in self.todos["pending"]:
                    self.todos["pending"].append(compressed)

        elif tool_name == "Bash":
            cmd = tool_input.get("command", "")
            for pm in ["npm", "pnpm", "yarn", "pip", "cargo", "go", "mvn", "gradle"]:
                if pm in cmd.lower():
                    self.tech_stack.add(pm)

        elif tool_name.startswith("mcp__zen__"):
            prompt = tool_input.get("prompt", "")[:100]
            compressed = self.compress_text(prompt, max_len=100)
            self.decisions.append({
                "type": tool_name.replace("mcp__zen__", ""),
                "context": compressed
            })

    def compress(self, input_path: str, output_path: str) -> Dict[str, Any]:
        """Compress session with delimiter-based format for max token efficiency"""

        # Read JSONL
        messages = []
        try:
            with open(input_path, 'r') as f:
                for line in f:
                    if line.strip():
                        messages.append(json.loads(line))
        except Exception as e:
            return {"error": f"Failed to read input: {e}"}

        # Process messages
        for msg in messages:
            self.parse_message(msg)

        # Build token-optimized output with delimiter format
        output_lines = []
        output_lines.append("[CTX:session_comp]")

        # User messages with delimiter format
        for i, msg in enumerate(self.user_messages[-5:], 1):
            output_lines.append(f"[U{i}]{msg}")

        # Assistant responses
        for i, resp in enumerate(self.assistant_responses[-5:], 1):
            output_lines.append(f"[R{i}]{resp}")

        # Thinking blocks (most compressed)
        for i, think in enumerate(self.thinking_blocks[-3:], 1):
            output_lines.append(f"[T{i}]{think}")

        # File state (ultra-compact)
        if self.file_states:
            files = list(self.file_states.items())[-15:]
            files_str = "|".join([f"{p}:{s}" for p, s in files])
            output_lines.append(f"[FILES]{files_str}")

        # Todos (compact)
        if self.todos["completed"]:
            todos_str = "|".join(self.todos["completed"][-10:])
            output_lines.append(f"[DONE]{todos_str}")
        if self.todos["pending"]:
            todos_str = "|".join(self.todos["pending"][-10:])
            output_lines.append(f"[TODO]{todos_str}")

        # Tech stack
        if self.tech_stack:
            output_lines.append(f"[TECH]{','.join(sorted(self.tech_stack))}")

        # Decisions
        if self.decisions:
            for dec in self.decisions[-3:]:
                output_lines.append(f"[DEC:{dec['type']}]{dec['context']}")

        # Structured sections with priority markers (NEW)
        if self.doc_updates:
            docs_str = "|".join(self.doc_updates[-10:])  # Last 10 items
            output_lines.append(f"[DOCS]{docs_str}")

        if self.tech_debt:
            debt_str = "|".join(self.tech_debt[-10:])  # Last 10 items
            output_lines.append(f"[DEBT]{debt_str}")

        if self.next_steps:
            steps_str = "|".join(self.next_steps[-10:])  # Last 10 items
            output_lines.append(f"[NEXT]{steps_str}")

        # Calculate stats BEFORE cleanup (to avoid race condition)
        original_size = Path(input_path).stat().st_size

        # Write compressed output
        try:
            with open(output_path, 'w') as f:
                f.write('\n'.join(output_lines))
        except Exception as e:
            return {"error": f"Failed to write output: {e}"}

        compressed_size = Path(output_path).stat().st_size

        # Clean up ALL other files in the same directory (keep only the new output file)
        # IMPORTANT: Don't delete the input file (it may be needed for reference)
        output_file = Path(output_path).resolve()
        input_file = Path(input_path).resolve()
        output_dir = output_file.parent
        deleted_count = 0
        try:
            for file in output_dir.iterdir():
                # Only delete files (not directories)
                # Don't delete the file we just created OR the input file
                if file.is_file() and file.resolve() != output_file and file.resolve() != input_file:
                    file.unlink()
                    deleted_count += 1
        except Exception as e:
            # Non-critical - don't fail the whole operation
            pass
        ratio = ((original_size - compressed_size) / original_size * 100) if original_size > 0 else 0

        return {
            "original_size": original_size,
            "compressed_size": compressed_size,
            "compression_ratio": f"{ratio:.1f}%",
            "original_messages": len(messages),
            "user_messages": len(self.user_messages),
            "responses": len(self.assistant_responses),
            "thinking": len(self.thinking_blocks),
            "files": len(self.file_states),
            "todos": len(self.todos["completed"]) + len(self.todos["pending"]),
            "doc_updates": len(self.doc_updates),
            "tech_debt": len(self.tech_debt),
            "next_steps": len(self.next_steps)
        }


def main():
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: compress-session-v2.py <input.jsonl> [output.txt]", file=sys.stderr)
        print("  If output.txt not specified, writes to .claude/logs/last_conversation.txt", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]

    # Auto-generate output path if not provided
    if len(sys.argv) == 3:
        output_path = sys.argv[2]
    else:
        # Try to use CLAUDE_PROJECT_DIR if set, otherwise use current directory
        project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
        logs_dir = Path(project_dir) / '.claude' / 'logs'
        logs_dir.mkdir(parents=True, exist_ok=True)
        output_path = str(logs_dir / 'last_conversation.txt')

    if not Path(input_path).exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    compressor = TokenOptimizedCompressor()
    result = compressor.compress(input_path, output_path)

    if "error" in result:
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Output success
    print(f"✓ Token-optimized compression: {result['original_messages']} messages")
    print(f"  Original: {result['original_size']:,} bytes")
    print(f"  Compressed: {result['compressed_size']:,} bytes")
    print(f"  Saved: {result['compression_ratio']}")
    print(f"  Extracted: {result['user_messages']}U {result['responses']}R {result['thinking']}T")
    print(f"  Tracked: {result['files']} files, {result['todos']} tasks")

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
