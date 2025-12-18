import os
import ast
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class ContextManager:
    def __init__(self, docker_manager, startup_id):
        self.docker_manager = docker_manager
        self.startup_id = startup_id
        
    def get_focus_context(self, file_path: str, cursor_line: int, window: int = 50) -> str:
        """
        Gets the content around the cursor. 
        Note: Since we don't have a real cursor in the agent flow usually, 
        this might be used if the user provides a specific file/line to fix.
        """
        file_data = self.docker_manager.read_file(self.startup_id, file_path)
        if "error" in file_data:
            return ""
        
        lines = file_data["content"].splitlines()
        start = max(0, cursor_line - window)
        end = min(len(lines), cursor_line + window)
        
        return "\n".join(lines[start:end])

    def get_ast_context(self, symbols: List[str]) -> str:
        """
        Uses AST to find definitions of symbols across the codebase.
        This is a simplified implementation. Real-world would use tree-sitter or a graph DB.
        For now, we grep for class/function definitions in likely files.
        """
        context = ""
        for symbol in symbols:
            # Simple heuristic: Grep for 'class Symbol' or 'def symbol' or 'function symbol'
            # We use ripgrep or grep inside the container for speed
            cmd = f"grep -rE 'class {symbol}|def {symbol}|function {symbol}|const {symbol}' ."
            result = self.docker_manager.run_command(self.startup_id, cmd)
            if result.get("exit_code") == 0:
                context += f"--- Definition of {symbol} ---\n{result['output']}\n"
        return context

    def compact_file(self, content: str, file_path: str) -> str:
        """
        Compacts a file by removing function bodies, keeping signatures.
        Currently supports Python. JS/TS support to be added.
        """
        if file_path.endswith(".py"):
            return self._compact_python(content)
        # TODO: Add JS/TS compaction
        return content

    def _compact_python(self, content: str) -> str:
        try:
            tree = ast.parse(content)
            compacted = []
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    # Reconstruct signature (simplified)
                    # We can use ast.unparse in Python 3.9+ but let's be safe
                    # Just taking the first line of the definition usually works for a summary
                    # But we don't have line numbers easily unless we read lines.
                    # Let's try to just use ast.get_source_segment if available, 
                    # or just manual parsing for now.
                    # Simpler approach: iterate lines and look for 'def ' or 'class '
                    pass
            
            # fast regex approach for stability
            lines = content.splitlines()
            summary = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("def ") or stripped.startswith("class ") or stripped.startswith("@"):
                     summary.append(line)
                # Keep imports
                if stripped.startswith("import ") or stripped.startswith("from "):
                    summary.append(line)
            return "\n".join(summary)
        except:
             return content
