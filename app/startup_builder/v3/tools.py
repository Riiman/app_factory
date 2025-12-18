from typing import List, Dict, Optional
from langchain_core.tools import tool
from ..context import ContextManager

class V3Tools:
    def __init__(self, docker_manager, startup_id):
        self.docker_manager = docker_manager
        self.startup_id = startup_id
        # We also need context manager to trigger summaries on write
        self.context_manager = ContextManager(docker_manager, startup_id)

    def get_tools(self):
        """Returns the list of tools to be bound to the LLM."""
        return [
            self.run_shell,
            self.read_file,
            self.write_file,
            self.list_files
        ]

    # --- Tool Definitions ---

    @tool
    def run_shell(self, command: str) -> str:
        """
        Executes a shell command in the container.
        Use this to run 'npm install', 'ls -la', 'mkdir', etc.
        """
        # Note: 'self' is tricky with @tool decorator if not careful.
        # But we will bind these methods to the instance. 
        # Actually, standard way is to return functions or structured tools.
        # Let's fix the schema: we can't use @tool on methods easily with 'self'.
        # Solution: We verify this acts as a bound method or we define them as standalone 
        # and partial them.
        # Wait, LangChain @tool on method works if we use the instance method in the list.
        # Let's verify.
        pass
        
    # Rethink: The @tool decorator makes it a static-like object.
    # Better approach: Manually create StructuredTool or use the decorator 
    # but we need access to 'self.startup_id'.
    # 
    # Let's use the closure pattern or dynamic function generation.
    
    def create_run_shell(self):
        @tool
        def run_shell(command: str) -> str:
            """
            Executes a shell command in the container.
            Use for installation, listing specific dirs, moving files, etc.
            Returns stdout or error.
            """
            res = self.docker_manager.run_command(self.startup_id, command)
            if res.get("exit_code") == 0:
                return res["output"][:2000] # Truncate 
            else:
                return f"Error (Exit {res.get('exit_code')}): {res.get('output')}"
        return run_shell

    def create_read_file(self):
        @tool
        def read_file(path: str) -> str:
            """
            Reads the content of a file.
            Always read a file before editing it to ensure you have the latest content.
            """
            res = self.docker_manager.read_file(self.startup_id, path)
            if res.get("error"):
                return f"Error reading file: {res['error']}"
            return res["content"]
        return read_file

    def create_write_file(self):
        @tool
        def write_file(path: str, content: str) -> str:
            """
            Writes content to a file. Overwrites if exists.
            Creates directories if needed.
            Triggers auto-summarization of the file context.
            """
            res = self.docker_manager.write_file(self.startup_id, path, content)
            if res.get("error"):
                return f"Error writing file: {res['error']}"
            
            # Post-action: Update Summary
            self.context_manager.update_file_summary(path)
            
            return f"Successfully wrote to {path}"
        return write_file
        
    def create_list_files(self):
        @tool
        def list_files(path: str = ".") -> str:
            """
            Lists files in a directory. 
            Useful to see the structure.
            """
            res = self.docker_manager.list_files(self.startup_id, path)
            if res.get("error"):
                return f"Error listing: {res['error']}"
            
            files = res.get("files", [])
            output = []
            for f in files:
                output.append(f"{f['name']}/" if f['type'] == 'directory' else f['name'])
            return "\n".join(output)
        return list_files

    def create_search_files(self):
        @tool
        def search_files(query: str, path: str = ".") -> str:
            """
            Searches for a string in the codebase using grep.
            Useful for finding where functions or variables are defined/used.
            Returns file paths and matching lines with context.
            """
            res = self.docker_manager.search_files(self.startup_id, query, path)
            if res.get("error"):
                return f"Error searching: {res['error']}"
            
            output = res.get("output", "")
            if not output:
                return "No matches found."
            return output[:3000] # Truncate to avoid context overflow
        return search_files

    def get_tool_list(self):
        """Returns the actual bound tool instances for the LLM."""
        return [
            self.create_run_shell(),
            self.create_read_file(),
            self.create_write_file(),
            self.create_list_files(),
            self.create_edit_file(),
            self.create_search_files(),
            self.create_read_logs(),
            self.create_restart_server(),
            self.create_refresh_memory()
        ]

    def create_read_logs(self):
        @tool
        def read_logs() -> str:
            """
            Reads the stdout/stderr logs from the application container.
            Essential for debugging runtime errors or 500 responses.
            """
            res = self.docker_manager.get_container_logs(self.startup_id)
            if res.get("error"):
                return f"Error reading logs: {res['error']}"
            return res.get("logs", "")[-3000:] # Return last 3000 chars
        return read_logs

    def create_restart_server(self):
        @tool
        def restart_server(command: Optional[str] = None) -> str:
            """
            Restarts the application server inside the container.
            Use this after changing configuration files or installing new dependencies.
            Args:
                command (str, optional): Custom start command e.g. "flask run --host=0.0.0.0". 
                                         If omitted, attempts auto-detection.
            """
            # Stop
            self.docker_manager.stop_server(self.startup_id)
            # Start
            res = self.docker_manager.ensure_app_running(self.startup_id, start_command=command)
            if res.get("error"):
                return f"Error restarting server: {res['error']}"
            return f"Server restarted. Status: {res.get('status')} PID: {res.get('pid')} Command: {res.get('command', command or 'auto')}"
        return restart_server

    def create_refresh_memory(self):
        @tool
        def refresh_memory(path: str) -> str:
            """
            Force-updates the AI's summary of a specific file.
            Use this ONLY if you modified a file using 'run_shell' (e.g. sed, git pull)
            and need the agent to recognize the change immediately.
            Normal 'write_file' updates memory automatically.
            """
            try:
                self.context_manager.update_file_summary(path)
                return f"Memory updated for {path}"
            except Exception as e:
                return f"Error updating memory: {str(e)}"
        return refresh_memory
