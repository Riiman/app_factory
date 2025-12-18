import os
import ast
import logging
from typing import List, Dict, Optional

import re
import json
from app.startup_builder.v3.agents.core import V3CoPilot

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

    def retrieve_local_context(self, task_description: str) -> str:
        """
        RAG-lite: Retrieves relevant file content based on task description.
        1. Extract potential filenames/keywords.
        2. Grep for them.
        3. Compact and return.
        """
        context = ""
        
        # 1. Extract keywords (naive approach: look for words with extensions or CamelCase)
        # We can also search for file paths
        potential_files = re.findall(r'\b[\w-]+\.(?:js|ts|jsx|tsx|py|html|css|json)\b', task_description)
        
        # Also typical keywords associated with code structure
        # keywords = re.findall(r'\b[A-Z][a-zA-Z]+\b', task_description) # CamelCase classes
        
        unique_files = list(set(potential_files))
        
        if not unique_files:
            # Fallback: Searching widely? No, let's keep it tight for now.
            return ""
            
        context += f"--- Local Context for: '{task_description}' ---\n"
        
        for fname in unique_files:
            # Find closest match if full path not given
            cmd = f"find . -name '{fname}'"
            loc = self.docker_manager.run_command(self.startup_id, cmd)
            
            paths = loc.get("output", "").strip().splitlines()
            if paths:
                real_path = paths[0]
                if real_path.startswith("./"):
                    real_path = real_path[2:]
                    
                file_data = self.docker_manager.read_file(self.startup_id, real_path)
                if not file_data.get("error"):
                    compact_content = self.compact_file(file_data["content"], real_path)
                    
                    # Fetch stored summary if available
                    summaries = self.get_file_summaries()
                    file_summary = summaries.get(real_path, "")
                    
                    context += f"File: {real_path}\nSummary: {file_summary}\n```\n{compact_content}\n```\n"

        return context

    def update_global_context(self, current_context: str, new_summary: str) -> str:
        """
        Appends new summary and summarizes if too long.
        """
        updated = (current_context or "") + f"\n- {new_summary}"
        
        # Check limit (rough char count, e.g. 4000 chars ~ 1000 tokens)
        if len(updated) > 4000:
            copilot = V3CoPilot(use_thinking=False)
            system_prompt = "You are a Context Summarizer. Compress the history while keeping key technical decisions and architecture facts."
            user_prompt = f"Current Context:\n{updated}\n\nSummarize this to under 2000 characters."
            
            res = copilot.ask(system_prompt, user_prompt)
            if hasattr(res, 'content'):
                return res.content
            
        return updated

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
            # Safe AST walk? Or just regex?
            # Let's stick to regex from before if AST fails or is complex
            pass
        except:
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

    def get_file_summaries(self) -> Dict[str, str]:
        """Reads the file summaries map from the container."""
        # Use artifacts folder for metadata
        summary_path = "artifacts/file_summaries.json"
        res = self.docker_manager.read_file(self.startup_id, summary_path)
        if res.get("error"):
            return {}
        try:
            return json.loads(res["content"])
        except:
            return {}

    def update_file_summary(self, file_path: str) -> None:
        """
        Generates a summary for the given file and updates the metadata map.
        """
        # 1. Read file content
        fres = self.docker_manager.read_file(self.startup_id, file_path)
        if fres.get("error"):
            return
            
        content = fres["content"]
        
        # 2. Generate Summary
        copilot = V3CoPilot(use_thinking=False)
        system_prompt = "You are a Tech Lead. Summarize the purpose of this file in ONE concise sentence."
        user_prompt = f"File: {file_path}\nContent:\n{content[:2000]}..." # Truncate for speed
        
        res = copilot.ask(system_prompt, user_prompt)
        summary = ""
        if hasattr(res, 'content'):
            summary = res.content.strip()
            
        if not summary:
            return

        # 3. Update Map safely
        # We read-modify-write. Concurrent writes might race, but acceptable for this prototype.
        current_map = self.get_file_summaries()
        current_map[file_path] = summary
        
        summary_path = "artifacts/file_summaries.json"
        self.docker_manager.write_file(self.startup_id, summary_path, json.dumps(current_map, indent=2))
        logger.info(f"Updated summary for {file_path}: {summary}")

