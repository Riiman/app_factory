import os
import ast
import logging
from typing import List, Dict, Optional, Any

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
            
        context = f"--- Local Context for: '{task_description}' ---\n"
        
        # Budget: 6000 tokens ~ 24000 chars
        BUDGET_CHARS = 24000
        current_chars = len(context)
        
        for fname in unique_files:
            if current_chars >= BUDGET_CHARS:
                context += "\n[CONTEXT BUDGET REACHED - SKIPPING FILES]"
                break
                
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
                    # Compact content
                    compact_content = self.compact_file(file_data["content"], real_path)
                    
                    # Fetch stored summary
                    summaries = self.get_file_summaries()
                    file_summary = summaries.get(real_path, "")
                    
                    entry = f"File: {real_path}\nSummary: {file_summary}\n```\n{compact_content}\n```\n"
                    
                    if current_chars + len(entry) > BUDGET_CHARS:
                        # Try to fit partial?
                        remaining = BUDGET_CHARS - current_chars
                        entry = entry[:remaining] + "\n...[TRUNCATED]..."
                        context += entry
                        current_chars = BUDGET_CHARS
                        break
                    else:
                        context += entry
                        current_chars += len(entry)

        return context

    def update_global_context(self, current_context: str, new_summary: str) -> str:
        """
        Appends new summary and enforces Global Budget (2000 tokens).
        """
        updated = (current_context or "") + f"\n- {new_summary}"
        return self.enforce_budget(updated, 2000, "text")

    def compress_mission_context(self, context_entries: List[str]) -> List[str]:
        """
        Enforces Mission Budget (4000 tokens).
        If over budget, summarizes the older half of entries.
        Returns the updated list of string entries.
        """
        full_text = "\n".join(context_entries)
        # Approx check (4000 tokens ~ 16000 chars)
        if len(full_text) < 16000:
             return context_entries
             
        # Compression Triggered
        logger.info("Mission Context Overflow. Compressing...")
        
        # Split: Oldest 50% vs Newest 50%
        mid = len(context_entries) // 2
        to_compress = context_entries[:mid]
        to_keep = context_entries[mid:]
        
        copilot = V3CoPilot(use_thinking=False)
        sys_p = "You are a Project Archivist. Summarize these completed tasks into a concise chronological history."
        user_p = f"Tasks:\n" + "\n".join(to_compress)
        
        res = copilot.ask(sys_p, user_p)
        summary = ""
        if hasattr(res, 'content'):
             summary = res.content
        else:
             summary = str(res)
             
        new_entry = f"--- ARCHIVED HISTORY (Episodes 1-{mid}) ---\n{summary}"
        return [new_entry] + to_keep

    def enforce_budget(self, text: str, token_limit: int, type: str = "text") -> str:
        """
        Hard enforcement of token limits.
        Approx 1 token = 4 chars.
        """
        char_limit = token_limit * 4
        if len(text) <= char_limit:
            return text
            
        logger.info(f"Context Budget Exceeded ({type}): {len(text)} > {char_limit}. Compressing...")
        
        if type == "code":
            # 1. First pass: Compact files (remove docs/comments is implied by compact_file, but here we enforce truncation)
            # Basic truncation for code is dangerous, but we have no choice.
            # Better strategy: Keep imports + definitions, remove bodies? 
            # We already did that in retrieval. 
            # So just truncate from bottom? Or top?
            # Truncating bottom is safer for "file context".
            return text[:char_limit] + "\n... [TRUNCATED DUE TO BUDGET] ..."
            
        elif type == "text":
            # LLM Summarization
            copilot = V3CoPilot(use_thinking=False)
            sys_p = f"You are a Context Compressor. Compress this text to under {token_limit} tokens while keeping key technical facts."
            user_p = f"Text to Compress:\n{text[:char_limit*2]}" # Send 2x limit to compress down
            
            res = copilot.ask(sys_p, user_p)
            if hasattr(res, 'content'):
                return res.content
            return text[:char_limit] + "..."
            
        return text[:char_limit]

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

    def get_global_context(self) -> str:
        """
        Unified API: Returns a merged view of Mutable History (missions.json) and Immutable Rules (project_memory.json).
        This is the SINGLE source of truth for Agents needing 'Global Context'.
        """
        # 1. Fetch History (Mutable)
        # For now, we rely on what's passed in state or re-read mission.json if needed.
        # But `ContextManager` is usually stateless w.r.t process state.
        # Let's assume we read the latest Summary from artifacts.
        
        # 2. Fetch Memory (Immutable Rules)
        memory = self.get_project_memory()
        
        # 3. Construct Context
        context = []
        
        # A. Tech Stack & Invariants (Priority 1)
        if memory.get("tech_stack"):
            context.append(f"TECH STACK: {memory['tech_stack']}")
        
        if memory.get("ui_theme"):
            variant = memory["ui_theme"].get("variant", "standard")
            context.append(f"UI THEME: {variant}")
            
        if memory.get("patterns"):
            context.append("ARCHITECTURAL PATTERNS:")
            for p in memory["patterns"]:
                context.append(f"- {p}")
                
        context.append("") # Spacer
        
        # B. Global History (Priority 2)
        # We assume the caller might append the specific mission history, 
        # but here we can return the 'Project Constraints' primarily.
        
        return "\n".join(context)

    @property
    def project_memory_path(self):
        return "artifacts/project_memory.json"

    def get_project_memory(self) -> Dict:
        """Reads the Project Memory (Rules/Constraints)."""
        res = self.docker_manager.read_file(self.startup_id, self.project_memory_path)
        if res.get("error"):
            return {}
        try:
            return json.loads(res["content"])
        except:
            return {}

    def update_project_memory(self, key: str, value: Any) -> None:
        """Updates a specific key in Project Memory."""
        current = self.get_project_memory()
        current[key] = value
        self.docker_manager.write_file(self.startup_id, self.project_memory_path, json.dumps(current, indent=2))
        logger.info(f"Updated Project Memory [{key}]")

    def get_global_constraints(self) -> str:
        """
        Returns just the constraints for System Prompt injection.
        """
        mem = self.get_project_memory()
        constraints = []
        if mem.get("tech_stack"): constraints.append(f"Stack: {mem['tech_stack']}")
        if mem.get("constraints"): 
             constraints.extend(mem["constraints"])
             
        return "\n".join(constraints)

    # --- Legacy / Helper Methods ---

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

