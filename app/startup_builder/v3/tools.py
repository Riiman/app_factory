from typing import List, Dict, Optional
import json
import ast
import os
from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from ..context import ContextManager
from ..process_manager import ProcessManager # corrected import depth

class V3Tools:
    def __init__(self, docker_manager, startup_id, runtime_context: Optional[Dict] = None):
        self.docker_manager = docker_manager
        self.startup_id = startup_id
        # We also need context manager to trigger summaries on write
        self.context_manager = ContextManager(docker_manager, startup_id)
        self.runtime_context = runtime_context or {}
        self.process_manager = ProcessManager(docker_manager) # Initialize Middleware

    def get_tool_list(self, include_context_tools=False):
        """Returns the actual bound tool instances for the LLM."""
        base_tools = [
            self.create_run_shell(),
            self.create_ensure_server(), # NEW
            self.create_check_job(),     # NEW
            self.create_read_file(),
            self.create_update_file(),   # Unified Tool
            self.create_list_files(),
            self.create_search_files(),
            self.create_read_logs(),
            self.create_restart_server(),
            self.create_refresh_memory(),
            self.create_start_process(),
            self.create_stop_process(),
            self.create_read_process_logs(),
            self.create_list_processes(),
            self.create_wait_for_job(), 
            self.create_run_ui_test(), # Dedicated Tool
            self.create_search_web()
        ]
        
        if include_context_tools:
            base_tools.extend([
                self.create_get_mission_context(),
                self.create_get_task_context(),
                self.create_get_product_context()
            ])
            
        return base_tools

    # --- Tool Definitions ---

    def create_run_shell(self):
        @tool
        def run_shell(command: str) -> str:
            """
            Executes a shell command in the container.
            
            BEHAVIOR:
            - FAST commands (<5s) will return the output immediately.
            - SLOW commands (>5s) will return a 'Job ID' and continue in background.
            
            Use for: Installation (npm install), Listing (ls), File Ops (mv, cp), Git.
            DO NOT use for starting servers (use 'ensure_server_running' instead).
            """
            # Use Process Manager Middleware
            res = self.process_manager.run_smart(self.startup_id, command, timeout=5.0)
            
            if res.get("error"):
                return f"Error: {res['error']}"
            
            status = res.get("status")
            if status == "completed":
                output = res["output"][:2000] # Truncate 
                exit_code = res.get("exit_code", 0)
                
                # ENFORCE VISIBILITY OF FAILURE
                if exit_code != 0:
                    return f"COMMAND FAILED (Exit Code {exit_code}):\n{output}\n\n[SYSTEM]: The command returned a non-zero exit code. You MUST fix this."
                
                return output
            elif status == "background":
                # Return strict JSON format so Agent can parse it easily
                return json.dumps({
                    "status": "background",
                    "job_id": res["job_id"],
                    "message": f"Command is running in background (PID {res['pid']}). Agent must YIELD and wait."
                })
            else:
                return f"Unknown status: {res}"
        return run_shell

    def create_ensure_server(self):
        @tool
        def ensure_server_running(alias: str, start_command: str, port: int) -> str:
            """
            Safely starts a long-running server process only if not already running.
            
            Args:
                alias: Unique name (e.g., 'frontend', 'backend_flask').
                start_command: The command to start it (e.g., 'npm run dev').
                port: The port it listens on (e.g., 3000).
                
            Returns:
                Success message with PID, or 'Already Running'.
            """
            # 1. Check Port (Idempotency) (TODO: Add lsof check tool or assume alias check is enough)
            # For now, we rely on alias check via DockerManager's start_background_process logic 
            # which returns error if running.
            
            # We assume the Agent is smart enough to use this tool.
            # We use the raw docker manager start_background_process which enforces alias uniqueness.
            
            res = self.docker_manager.start_background_process(self.startup_id, alias, start_command)
            
            if res.get("error") and "already running" in res["error"]:
                 return f"Server '{alias}' is already running. You can proceed to verify it."
            elif res.get("error"):
                 return f"Error starting server: {res['error']}"
                 
            return f"Server '{alias}' started successfully (PID {res['pid']}). Logs at {res['log_file']}."
        return ensure_server_running
        
    def create_check_job(self):
        @tool
        def check_job(job_id: str) -> str:
            """
            Checks the status of a background job (returned by run_shell).
            Returns JSON string with status and logs.
            """
            import json
            res = self.process_manager.check_job(self.startup_id, job_id)
            if res.get("error"):
                  return json.dumps({"status": "error", "message": res["error"]})
                  
            # Pass through the ProcessManager result (which is a dict) as JSON
            return json.dumps(res)
        return check_job

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

    def create_update_file(self):
        @tool
        def update_file(path: str, content: str, mode: str = "overwrite", old_content: Optional[str] = None) -> str:
            """
            Updates a file with safety checks.
            Args:
                path: Absolute path to the file.
                content: New content (for overwrite) or replacement content (for replace).
                mode: 'overwrite' (default) or 'replace'.
                old_content: The exact text to be replaced (required if mode='replace').
            """
            
            # 1. Prepare New Content
            new_content = ""
            if mode == "replace":
                if not old_content:
                    return "Error: 'old_content' is required for replace mode."
                
                res = self.docker_manager.read_file(self.startup_id, path)
                if res.get("error"):
                    return f"Error reading file for replacement: {res['error']}"
                
                current_content = res["content"]
                if old_content not in current_content:
                    # Provide helpful tip on failure
                    snippet = current_content[:200]
                    return f"Error: 'old_content' not found in file. File start: {snippet}..."
                
                new_content = current_content.replace(old_content, content)
            else:
                new_content = content

            # 2. Write Temp
            tmp_path = f"{path}.tmp"
            write_res = self.docker_manager.write_file(self.startup_id, tmp_path, new_content)
            if write_res.get("error"):
                return f"Error writing temp file: {write_res['error']}"

            # 3. Syntax Validation
            validation_error = None
            if path.endswith(".py"):
                try:
                    ast.parse(new_content)
                except SyntaxError as e:
                    validation_error = f"Python Syntax Error: {e}"
            elif path.endswith(".json"):
                try:
                    json.loads(new_content)
                except json.JSONDecodeError as e:
                    validation_error = f"JSON Syntax Error: {e}"
            elif path.endswith(".js"):
                # Run node -c inside container
                chk = self.docker_manager.run_command(self.startup_id, f"node -c {tmp_path}")
                if chk.get("exit_code") != 0:
                     validation_error = f"JS Syntax Error: {chk.get('output', '').strip()}"

            if validation_error:
                # Cleanup and fail
                self.docker_manager.run_command(self.startup_id, f"rm {tmp_path}")
                return f"Validation Failed: {validation_error}. File NOT saved."

            # 4. Atomic Move
            move_res = self.docker_manager.run_command(self.startup_id, f"mv {tmp_path} {path}")
            if move_res.get("exit_code") != 0:
                 return f"Error moving temp file: {move_res['output']}"

            # 5. Post-Action Stats
            self.context_manager.update_file_summary(path)

            try:
                from flask import current_app
                with current_app.app_context():
                    from app.extensions import socketio
                    socketio.emit('files_updated', {'path': path}, room=f"startup_{self.startup_id}", namespace='/builder')
            except Exception as e:
                print(f"Failed to emit file update event: {e}")
            
            return f"Successfully updated {path}"
        return update_file



    def create_list_files(self):
        @tool
        def list_files(path: str = ".") -> str:
            """
            Lists files and directories in the given path.
            """
            res = self.docker_manager.list_files(self.startup_id, path)
            if res.get("error"):
                # Handle common "No such file or directory" error explicitly
                if "No such file" in res['error'] or "cannot access" in res['error']:
                     return f"Error: Directory '{path}' does not exist. You may need to create it first using 'run_shell' (mkdir -p)."
                return f"Error listing files: {res['error']}"
            
            # Format nicely for the agent
            files = res.get("files", [])
            output = [f"Directory listing for '{path}':"]
            for f in files:
                type_sym = "[HDR]" if f["name"].startswith(".") else ("[D]" if f["type"] == "directory" else "[F]")
                output.append(f"{type_sym} {f['name']}")
                
            if not files:
                output.append("(Empty)")
                
            return "\n".join(output)
        return list_files

    def create_search_files(self):
        @tool
        def search_files(query: str, path: str = ".") -> str:
            """
            Searches for a text pattern in files (grep).
            Useful for finding code definitions, usages, or specific strings.
            """
            res = self.docker_manager.search_files(self.startup_id, query, path)
            if res.get("error"):
                return f"Error searching files: {res['error']}"
            
            # DockerManager usually returns structure, we format it
            # manager.search_files returns 'output' raw from grep usually, or dict
            # Based on manager view in previous turn: it returns raw output in the exec_run result
            # Wait, manager.search_files in manager.py (viewed earlier) returns:
            # return {"matches": output.decode('utf-8')} or error
            
            matches = res.get("matches", "")
            if not matches:
                return "No matches found."
            return f"Search results for '{query}' in '{path}':\n{matches}"
        return search_files

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
    
    # --- Process Manager Tools ---

    def create_start_process(self):
        @tool
        def start_process(alias: str, command: str) -> str:
            """
            Starts a long-running process (e.g., server, watcher) in the background.
            Use this for tasks that block the terminal. 
            Returns the PID and log file path.
            """
            res = self.docker_manager.start_background_process(self.startup_id, alias, command)
            if res.get("error"):
                return f"Error using Start Process: {res['error']}"
            return f"Process '{alias}' started. PID: {res.get('pid')}. Logs redirected to {res.get('log_file')}."
        return start_process

    def create_wait_for_job(self):
        @tool
        def wait_for_job(job_id: str) -> str:
            """
            Explicitly waits for a background job to complete.
            Use this when you decide to wait longer for a running process.
            """
            import json
            # This triggers the specific "Yield" logic in developer.py
            return json.dumps({
                "status": "background",
                "job_id": job_id,
                "message": f"Agent decided to wait for job {job_id}."
            })
        return wait_for_job

    def create_run_ui_test(self):
        @tool
        def run_ui_test(test_file: str) -> str:
            """
            Executes a specific Playwright UI test file.
            Automatically captures results, screenshots, and logs.
            
            Args:
                test_file (str): Path to the .spec.ts file (e.g. apps/mobile/tests/login.spec.ts)
            """
            # 1. Run the test (force 1 worker for stability in container)
            cmd = f"npx playwright test {test_file} --workers=1 --reporter=line,json"
            
            # Use process manager for reliable execution
            # We set a higher timeout for tests (e.g. 30s)
            res = self.process_manager.run_smart(self.startup_id, cmd, timeout=30.0)
            
            if res.get("error"):
                 return f"System Error running test: {res['error']}"
            
            # 2. Check Status
            status = res.get("status")
            output = res.get("output", "")
            
            if status == "background":
                 return json.dumps({
                    "status": "background",
                    "job_id": res["job_id"],
                    "message": "UI Test is running long (background)..."
                })
            
            # 3. Analyze Results (Sync Completion)
            # Check exit code
            exit_code = res.get("exit_code", 0)
            
            # 4. Scan for Screenshots (Best Effort)
            # We look in the standard 'test-results' folder
            # Simple grep/find via docker manager would be best, but we can infer or list
            
            snapshots = []
            try:
                # List test-results to find new images
                # This assumes standard playwright config outputting to test-results/
                ls_res = self.docker_manager.run_command(self.startup_id, "find test-results -name '*.png'")
                if ls_res.get("exit_code") == 0:
                    lines = ls_res["output"].strip().split('\n')
                    for line in lines:
                        if line.strip():
                             snapshots.append(line.strip())
            except:
                pass

            # 5. Format Output
            response_lines = []
            response_lines.append(f"Test Execution Completed (Exit Code: {exit_code})")
            
            if exit_code == 0:
                response_lines.append("✅ TEST PASSED")
            else:
                response_lines.append("❌ TEST FAILED")
            
            if snapshots:
                response_lines.append("\nCaptured Snapshots:")
                for s in snapshots:
                    # Special format for Frontend to render
                    response_lines.append(f"[SNAPSHOT]: {s}")
            
            response_lines.append("\n--- Logs ---")
            # Filter JSON reporter noise if mixed? No, line reporter is human readable.
            # We might want to parse the JSON for strict details but raw log is fine for Agent
            response_lines.append(output[-3000:]) # Logs
            
            if exit_code != 0:
                response_lines.append("\n[SYSTEM]: The test failed. Analyze the logs above and FIX the issue.")
            
            return "\n".join(response_lines)
            
        return run_ui_test

    def create_stop_process(self):
        @tool
        def stop_process(alias: str) -> str:
            """
            Stops a background process by alias.
            Also deletes the log file to cleanup.
            """
            res = self.docker_manager.stop_background_process(self.startup_id, alias)
            if res.get("error"):
                return f"Error stopping process: {res['error']}"
            return f"Process '{alias}' stopped. Logs cleaned."
        return stop_process

    def create_read_process_logs(self):
        @tool
        def read_process_logs(alias: str) -> str:
            """
            Reads the last 20 lines of a background process log.
            Use this to debug why a server failed or crashed.
            """
            res = self.docker_manager.read_background_process_logs(self.startup_id, alias)
            if res.get("error"):
                return f"Error reading logs: {res['error']}"
            return res.get("logs", "")
        return read_process_logs

    def create_list_processes(self):
        @tool
        def list_processes() -> str:
            """
            Lists all active background process aliases.
            """
            res = self.docker_manager.list_background_processes(self.startup_id)
            if res.get("error"):
                return f"Error listing processes: {res['error']}"
            return f"Active Processes: {res.get('processes', [])}"
        return list_processes

    def create_search_web(self):
        @tool
        def search_web(query: str) -> str:
            """
            Performs a web search using DuckDuckGo.
            Use this to diagnose errors, check documentation, or find solutions when internal knowledge fails.
            Example: "latest tailwind css v4 init command error" or "python flask 502 bad gateway fix"
            """
            try:
                search = DuckDuckGoSearchRun()
                # Run search
                res = search.invoke(query)
                return f"Search Results for '{query}':\n{res}"
            except Exception as e:
                return f"Error searching web: {str(e)}"
        return search_web
