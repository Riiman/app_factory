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
from ...manager import DockerManager

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
        
        logger.info(f"V4Tools initialized for startup {startup_id}")
    
    def get_tool_list(self) -> list:
        """Get list of all V4 tools"""
        return [
            self.create_run_shell(),
            self.create_update_file(),
            self.create_read_file(),
            self.create_list_files(),
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
                
                return output
                
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
                
                return f"✅ Successfully updated {path}"
                
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
                
                return content
                
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
                
                return "\n".join(output)
                
            except Exception as e:
                return f"❌ Error: {e}"
        
        return list_files
