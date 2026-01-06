"""
V4 Tools

Pure V4 implementation of tools with built-in safety and healing.
"""

import logging
import json
from typing import Dict, Any, Optional
from langchain_core.tools import tool

from ..safety import SafetyCoordinator
from ..healing import SelfHealer, Failure
from ..knowledge import CommonKnowledge
from ...manager import DockerManager

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

logger = logging.getLogger(__name__)


class V4Tools:
    """
    V4 Tools - All tools with built-in safety and healing.
    
    Every tool call:
    - Checks safety limits before execution
    - Records execution for learning
    - Attempts healing on failure
    - Returns structured results
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        self.docker_manager = DockerManager()
        self.safety = SafetyCoordinator()
        self.healer = SelfHealer()
        self.knowledge = CommonKnowledge()
        
        logger.info(f"V4Tools initialized for startup {startup_id}")
    
    def get_tool_list(self) -> list:
        """Get list of all V4 tools"""
        return [
            self.create_run_shell(),
            self.create_update_file(),
            self.create_read_file(),
            self.create_list_files(),
            self.create_search_internet(),
            self.create_search_common_knowledge(),
            # Add more tools as needed
        ]
    
    def create_run_shell(self):
        """Create run_shell tool with V4 safety"""
        
        @tool
        def run_shell(command: str, directory: str = ".") -> str:
            """
            Execute a shell command with V4 safety and healing.
            
            Args:
                command: Command to execute
                directory: Working directory
                
            Returns:
                Command output or error with healing guidance
            """
            # Check safety
            allowed, reason = self.safety.check_tool_call(
                "run_shell",
                {"command": command, "directory": directory}
            )
            
            # Prepare warning prefix if reason exists (even if allowed)
            warning_prefix = ""
            if reason:
                warning_prefix = f"{reason}\n\n"
            
            if not allowed:
                # Try to get healing guidance
                failure = Failure(
                    error_message=f"Blocked: {reason}",
                    error_type="SafetyBlock",
                    tool_name="run_shell",
                    command=command
                )
                
                healing_result = self.healer.heal(failure, {"command": command})
                
                if healing_result and healing_result.success:
                    return f"❌ Blocked: {reason}\n\n💡 Suggested fix:\n{healing_result.suggested_fix}"
                
                return f"❌ Blocked: {reason}"
            
            # Execute command
            try:
                final_cmd = command
                if directory != ".":
                    final_cmd = f"cd {directory} && {command}"
                
                result = self.docker_manager.run_command(self.startup_id, final_cmd)
                
                # Record success
                self.safety.record_tool_call(
                    "run_shell",
                    {"command": command},
                    "success"
                )
                
                # Return output
                output = result.get("output", "")
                exit_code = result.get("exit_code", 0)
                
                if exit_code != 0:
                    # Command failed - try to heal
                    failure = Failure(
                        error_message=output,
                        error_type="CommandFailed",
                        tool_name="run_shell",
                        command=command
                    )
                    
                    healing_result = self.healer.heal(failure, {"command": command})
                    
                    if healing_result and healing_result.success:
                        return f"❌ Command failed (exit code {exit_code}):\n{output}\n\n💡 Suggested fix:\n{healing_result.suggested_fix}"
                    
                    return f"❌ Command failed (exit code {exit_code}):\n{output}"
                
                return f"{warning_prefix}{output}"
                
            except Exception as e:
                # Record failure
                self.safety.record_tool_call(
                    "run_shell",
                    {"command": command},
                    "error"
                )
                
                # Try to heal
                failure = Failure(
                    error_message=str(e),
                    error_type=type(e).__name__,
                    tool_name="run_shell",
                    command=command
                )
                
                healing_result = self.healer.heal(failure, {"command": command})
                
                if healing_result and healing_result.success:
                    return f"❌ Error: {e}\n\n💡 Suggested fix:\n{healing_result.suggested_fix}"
                
                return f"❌ Error: {e}"
        
        return run_shell
    
    def create_update_file(self):
        """Create update_file tool with V4 safety"""
        
        @tool
        def update_file(path: str, content: str) -> str:
            """
            Update a file with V4 safety and verification.
            
            Args:
                path: File path
                content: New content
                
            Returns:
                Success message or error
            """
            # Check safety
            allowed, reason = self.safety.check_tool_call(
                "update_file",
                {"path": path}
            )
            
            # Prepare warning prefix if reason exists (even if allowed)
            warning_prefix = ""
            if reason:
                warning_prefix = f"{reason}\n\n"
            
            if not allowed:
                return f"❌ Blocked: {reason}"
            
            # Write file
            try:
                result = self.docker_manager.write_file(self.startup_id, path, content)
                
                if result.get("error"):
                    raise Exception(result["error"])
                
                # Record success
                self.safety.record_tool_call(
                    "update_file",
                    {"path": path},
                    "success"
                )
                
                return f"{warning_prefix}✅ Successfully updated {path}"
                
            except Exception as e:
                # Record failure
                self.safety.record_tool_call(
                    "update_file",
                    {"path": path},
                    "error"
                )
                
                return f"❌ Error: {e}"
        
        return update_file
    
    def create_read_file(self):
        """Create read_file tool"""
        
        @tool
        def read_file(path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
            """
            Read a file with optional line range.
            
            Args:
                path: File path
                start_line: Optional start line (1-indexed)
                end_line: Optional end line (1-indexed)
                
            Returns:
                File content
            """
            try:
                result = self.docker_manager.read_file(self.startup_id, path)
                
                if result.get("error"):
                    return f"❌ Error: {result['error']}"
                
                content = result.get("content", "")
                
                # Handle line ranges
                if start_line is not None or end_line is not None:
                    lines = content.split("\n")
                    start_idx = (start_line - 1) if start_line else 0
                    end_idx = end_line if end_line else len(lines)
                    
                    selected_lines = lines[start_idx:end_idx]
                    return "\n".join(selected_lines)
                
                return f"{warning_prefix}{content}"
                
            except Exception as e:
                return f"❌ Error: {e}"
        
        return read_file
    
    def create_list_files(self):
        """Create list_files tool"""
        
        @tool
        def list_files(path: str = ".", recursive: bool = False) -> str:
            """
            List files in a directory.
            
            Args:
                path: Directory path
                recursive: Whether to list recursively
                
            Returns:
                File listing
            """

            # Check safety (post-check for read/list operations where args might be simple)
            # Actually list_files doesn't call check_tool_call in the original code? 
            # Wait, looking at the code, create_list_files MISSES the safety check entirely in the original file I viewed!
            # I must simply add the return modification for list_files assuming I add the check safely or just handle the return.
            # Ah, the view_file output for create_list_files (lines 242-276) DOES NOT show a safety check call.
            # I should probably add one to be consistent, but let's stick to the plan: modify output. 
            # But there is no 'reason' variable since check_tool_call isn't called.
            # I will skip modifying create_list_files output for now to avoid breaking it, or I should add the check. 
            # Adding the check is better.
            
            # Let's adjust this chunk to ADD the check.
            
            # Check safety
            allowed, reason = self.safety.check_tool_call(
                "list_files",
                {"path": path, "recursive": recursive}
            )
            
            if not allowed:
                 return f"❌ Blocked: {reason}"
                 
            warning_prefix = ""
            if reason:
                warning_prefix = f"{reason}\n\n"

            try:
                result = self.docker_manager.list_files(
                    self.startup_id,
                    path,
                    recursive=recursive
                )
                
                if result.get("error"):
                    return f"❌ Error: {result['error']}"
                
                files = result.get("files", [])
                
                output = [f"Directory listing for '{path}':"]
                for f in files:
                    type_sym = "[D]" if f["type"] == "directory" else "[F]"
                    output.append(f"{type_sym} {f['name']}")
                
                return f"{warning_prefix}" + "\n".join(output)
                
            except Exception as e:
                return f"❌ Error: {e}"
        
        return list_files
    
    def create_search_internet(self):
        """Create search_internet tool"""
        
        @tool
        def search_internet(query: str, domain: Optional[str] = None) -> str:
            """
            Search the internet for technical solutions.
            
            Args:
                query: Search query
                domain: Optional domain text to refine search
                
            Returns:
                Search results summary
            """
            # Check safety
            allowed, reason = self.safety.check_tool_call(
                "search_internet",
                {"query": query, "domain": domain}
            )
            
            warning_prefix = ""
            if reason:
                warning_prefix = f"{reason}\n\n"
            
            if not allowed:
                 return f"❌ Blocked: {reason}"

            try:
                if DDGS is None:
                    return "❌ Error: duckduckgo-search library not installed."
                
                results = []
                with DDGS() as ddgs:
                    # Search for 5 results
                    for r in ddgs.text(query, max_results=5):
                        results.append(f"- [{r['title']}]({r['href']}): {r['body']}")
                
                if not results:
                    return f"{warning_prefix}No results found for '{query}'"
                
                summary = "\n".join(results)
                return f"{warning_prefix}Search Results for '{query}':\n{summary}"
                
            except Exception as e:
                return f"❌ Error performing search: {e}"
        
        return search_internet
    
    def create_search_common_knowledge(self):
        """Create search_common_knowledge tool"""
        
        @tool
        def search_common_knowledge(query: str) -> str:
            """
            Search common technical knowledge (e.g. Jest, Tailwind configs).
            
            Args:
                query: Search query (e.g., "jest config", "tailwind versions")
                
            Returns:
                Relevant documentation snippets
            """
            try:
                result = self.knowledge.search(query)
                return result
            except Exception as e:
                return f"❌ Error searching knowledge: {e}"
                
        return search_common_knowledge
