from typing import List, Dict, Optional
import json
import ast
import os
from langchain_core.tools import tool
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

    def get_tool_list(self, include_context_tools=False, read_only=False):
        """
        Returns the actual bound tool instances for the LLM.
        
        Args:
            include_context_tools: Include context retrieval tools
            read_only: If True, exclude file-writing and state-changing tools (for Diagnostician)
        """
        base_tools = [
            self.create_run_shell(),
            self.create_check_job(),
            self.create_read_file(),
            self.create_list_files(),
            self.create_find_file(),
            self.create_search_files(),
            self.create_read_logs(),
            self.create_read_process_logs(),
            self.create_list_processes(),
            self.create_search_web()
        ]
        
        # Add write/modify tools only if NOT read_only
        if not read_only:
            base_tools.extend([
                self.create_ensure_server(),
                self.create_update_file(),
                self.create_restart_server(),
                self.create_refresh_memory(),
                self.create_start_process(),
                self.create_stop_process(),
                self.create_wait_for_job(),
                self.create_run_ui_test()
            ])
        
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
        def run_shell(command: str, directory: str = ".") -> str:
            """
            Executes a shell command in the container.
            
            Args:
                command (str): The command to run.
                directory (str): The directory to run the command in. Defaults to "." (root).
            
            BEHAVIOR:
            - FAST commands (<5s) will return the output immediately.
            - SLOW commands (>5s) will return a 'Job ID' and continue in background.
            
            Use for: Installation (npm install), Listing (ls), File Ops (mv, cp), Git.
            DO NOT use for starting servers (use 'ensure_server_running' instead).
            """
            # Handle Directory
            final_cmd = command
            if directory != ".":
                # Ensure we strictly switch directory before running
                final_cmd = f"cd {directory} && {command}"

            # Use Process Manager Middleware
            # Increased timeout to 75s as per user request to prefer Sync execution
            res = self.process_manager.run_smart(self.startup_id, final_cmd, timeout=75.0)
            
            # DEBUG LOGGING (Local File)
            try:
                with open("/home/ubuntu/app_factory/agent_debug.log", "a") as f:
                    import datetime
                    ts = datetime.datetime.now().isoformat()
                    f.write(f"[{ts}] RUN_SHELL: {command}\n")
                    f.write(f"RESULT: {json.dumps(res)}\n")
            except: pass
            
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
                    "message": f"Command is running in background (PID {res.get('pid', 'Unknown')}). Agent must YIELD and wait."
                })
            else:
                return f"Unknown status: {res}"
        return run_shell

    def create_ensure_server(self):
        @tool
        def ensure_server_running(alias: str, start_command: str, port: int, directory: str = ".") -> str:
            """
            Safely starts a long-running server process only if not already running.
            
            Args:
                alias: Unique name (e.g., 'frontend', 'backend_flask').
                start_command: The command to start it (e.g., 'npm start').
                port: The port it listens on (e.g., 3000).
                directory: The directory to run the command in (e.g., 'frontend'). Defaults to root ('.').
            
            Returns:
                Success message with PID, or 'Already Running'.
            """
            # 1. Check Port (Idempotency) (TODO: Add lsof check tool or assume alias check is enough)
            # For now, we rely on alias check via DockerManager's start_background_process logic 
            # which returns error if running.
            
            # We assume the Agent is smart enough to use this tool.
            # We use the raw docker manager start_background_process which enforces alias uniqueness.
            
            final_cmd = start_command
            if directory != ".":
                 final_cmd = f"cd {directory} && {start_command}"
            
            res = self.docker_manager.start_background_process(self.startup_id, alias, final_cmd)
            
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
        def read_file(path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> str:
            """
            Reads the content of a file, optionally reading only specific line ranges.
            
            Args:
                path: Path to the file to read
                start_line: (Optional) Starting line number (1-indexed, inclusive). If provided, only reads from this line.
                end_line: (Optional) Ending line number (1-indexed, inclusive). If provided, only reads up to this line.
            
            Examples:
                read_file("app.py") - Reads entire file
                read_file("app.py", start_line=10, end_line=20) - Reads lines 10-20 only
                read_file("app.py", start_line=50) - Reads from line 50 to end
            
            BEST PRACTICE: For large files (>200 lines), use line ranges to avoid token waste.
            Always read a file before editing it to ensure you have the latest content.
            """
            res = self.docker_manager.read_file(self.startup_id, path)
            if res.get("error"):
                return f"Error reading file: {res['error']}"
            
            content = res["content"]
            
            # If line ranges specified, extract only those lines
            if start_line is not None or end_line is not None:
                lines = content.split("\n")
                total_lines = len(lines)
                
                # Convert to 0-indexed and handle bounds
                start_idx = (start_line - 1) if start_line else 0
                end_idx = end_line if end_line else total_lines
                
                # Validate ranges
                if start_idx < 0:
                    return f"Error: start_line must be >= 1"
                if start_line and end_line and start_idx >= end_idx:
                    return f"Error: start_line ({start_line}) must be less than end_line ({end_line})"
                
                # Adjust end_idx if it exceeds total lines, and provide a warning
                if end_idx > total_lines:
                    # If end_line was specified, but it's beyond the file length, read to the end.
                    # If end_line was not specified (i.e., end_idx was set to total_lines), this condition won't trigger a warning.
                    if end_line is not None: 
                        warning_message = f"Warning: end_line {end_line} exceeds file length ({total_lines} lines). Reading to end.\n"
                    else:
                        warning_message = "" # No warning if end_line was not explicitly set
                    end_idx = total_lines
                else:
                    warning_message = ""
                
                # Extract the range
                selected_lines = lines[start_idx:end_idx]
                
                # Add helpful context about what was read
                range_info = f"[Reading lines {start_idx + 1 or 1}-{end_idx} of {total_lines} total lines]\n\n"
                return warning_message + range_info + "\n".join(selected_lines)
            
            return content
        
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
            # Preserve extension for syntax checkers (e.g. node -c needs .js)
            import os
            _, ext = os.path.splitext(path)
            tmp_path = f"{path}.tmp{ext}"
            
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
                # Note: node -c works on the temp file now because it ends in .js
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

            # 4.5 Verify Write
            verify = self.docker_manager.run_command(self.startup_id, f"ls -l {path}")
            if verify.get("exit_code") != 0:
                 return f"Error: File moved but verification failed. File may be missing. Output: {verify['output']}"

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


    # ... (skipping some tools to reach start_process)

    def create_list_files(self):
        @tool
        def list_files(path: str = ".", recursive: bool = False, depth: int = 2) -> str:
            """
            Lists files and directories in the given path.
            Set recursive=True to see deeper structure (useful for exploration).
            depth: Max depth for recursion (default 2).
            """
            res = self.docker_manager.list_files(self.startup_id, path, recursive=recursive, depth=depth)
            if res.get("error"):
                # Handle common "No such file or directory" error explicitly
                if "No such file" in res['error'] or "cannot access" in res['error']:
                     return f"Error: Directory '{path}' does not exist. You may need to create it first using 'run_shell' (mkdir -p)."
                return f"Error listing files: {res['error']}"
            
            # Format nicely for the agent
            files = res.get("files", [])
            mode_str = f" (Recursive Max Depth {depth})" if recursive else ""
            output = [f"Directory listing for '{path}'{mode_str}:"]
            for f in files:
                type_sym = "[HDR]" if f["name"].startswith(".") else ("[D]" if f["type"] == "directory" else "[F]")
                output.append(f"{type_sym} {f['name']}")
                
            if not files:
                output.append("(Empty)")
                
            return "\n".join(output)
        return list_files

    def create_find_file(self):
        @tool
        def find_file(filename: str, path: str = ".") -> str:
            """
            Finds specific files by NAME (fuzzy matching supported by shell glob, e.g. '*.js').
            Use this to locate a file when you don't know the full path.
            """
            res = self.docker_manager.find_file(self.startup_id, filename, path)
            if res.get("error"):
                 return f"Error finding file: {res['error']}"
            
            files = res.get("files", [])
            if not files:
                 return f"No files named '{filename}' found in '{path}'."
                 
            return f"Found {len(files)} matches:\n" + "\n".join(files)
        return find_file

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
            Force-updates the AI's summary of previously modified file.
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
        def start_process(alias: str, command: str, directory: str = ".") -> str:
            """
            Starts a long-running process (e.g., server, watcher) in the background.
            Use this for tasks that block the terminal. 
            Returns the PID and log file path.
            
            Args:
                alias: Unique name for the process.
                command: Command to execute.
                directory: Directory to run in (default '.').
            """
            final_cmd = command
            if directory != ".":
                 final_cmd = f"cd {directory} && {command}"

            res = self.docker_manager.start_background_process(self.startup_id, alias, final_cmd)
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
            # 1. Determine CWD based on test_file
            # If test_file is nested (e.g. frontend/tests/x.spec.ts), we should run from 'frontend/'
            # This avoids the common 'No Tests Found' error when Playwright config expects CWD 
            # to be the sub-project root.
            
            parts = test_file.split("/")
            working_dir = "."
            cmd_file = test_file
            
            if len(parts) > 1:
                # Heuristic: If first part is a known component (frontend, backend, apps/x)
                # Ideally, we look for package.json or playwright.config.ts
                # Simple heuristic: if it looks like a sub-project
                
                # Check 1: 'frontend' or 'backend' at start
                if parts[0] in ["frontend", "backend", "client", "server", "app"]:
                    working_dir = parts[0]
                    cmd_file = "/".join(parts[1:]) # Path relative to working_dir
                
                elif parts[0] == "apps" and len(parts) > 2:
                    working_dir = f"apps/{parts[1]}"
                    cmd_file = "/".join(parts[2:])
            
            # --- Auto-Cleanup: Remove stale results/logs ---
            # DISABLED (User Request): Check history or handle conflicts manually
            # cleanup_cmd = "rm -rf test-results ui_test_execution.log"
            # if working_dir != ".":
            #      cleanup_cmd = f"cd {working_dir} && {cleanup_cmd}"
            
            # self.docker_manager.run_command(self.startup_id, cleanup_cmd)

            # 2. Construct Command with CWD and Log Redirection
            # Reformulated for Multi-Purpose:
            # 1. 'set -o pipefail': Preserve exit code through pipe.
            # 2. 'tee {log_file}': Write to disk (persistence) AND stdout (for process_manager/agent visibility).
            # 3. 'find ...': Post-test, locate snapshots and echo them so they appear in logs for the Agent/Regex.
            log_file = "ui_test_execution.log"
            
            # Note: We use a subshell or block to ensure sequential execution even if test fails
            snapshot_scan = "find test-results -name '*.png' -exec echo '[SNAPSHOT]: {}' \\;"
            
            base_cmd = f"set -o pipefail; npx playwright test {cmd_file} --workers=1 --reporter=line,json 2>&1 | tee {log_file}; TEST_EXIT=$?; {snapshot_scan}; exit $TEST_EXIT"
            
            # Keep track of path for reading later
            full_log_path = log_file 
            if working_dir != ".":
                # Ensure we wrap the whole thing to execute in dir
                # We use bash -c explicitly to support pipefail/vars if needed, 
                # but docker run_command typically passes literal string to /bin/sh -c.
                # /bin/sh might not support pipefail.
                # Safer: "npx ... 2>&1 | tee log" works in sh. exit code strictly is tee's (0).
                # To capture exit code in sh without pipefail:
                # cmd > log 2>&1; ret=$?; cat log; ... exit $ret
                
                # Let's stick to the Robust "Tee + ExitFile" approach to support /bin/sh AND Streaming
                # Structure: ((cmd; echo $? > status) | tee log); exit $(cat status)
                base_cmd = f"((npx playwright test {cmd_file} --workers=1 --reporter=line,json 2>&1; echo $? > exit_code.txt) | tee {log_file}); TEST_EXIT=$(cat exit_code.txt); {snapshot_scan}; exit $TEST_EXIT"
                
                cmd = f"cd {working_dir} && {base_cmd}"
                full_log_path = f"{working_dir}/{log_file}"
            else:
                 base_cmd = f"((npx playwright test {cmd_file} --workers=1 --reporter=line,json 2>&1; echo $? > exit_code.txt) | tee {log_file}); TEST_EXIT=$(cat exit_code.txt); {snapshot_scan}; exit $TEST_EXIT"
                 cmd = base_cmd
            
            # Use process manager for reliable execution
            # We set a higher timeout for tests (e.g. 60s)
            res = self.process_manager.run_smart(self.startup_id, cmd, timeout=60.0)
            
            if res.get("error"):
                 return f"System Error running test: {res['error']}"
            
            # 3. Check Status
            status = res.get("status")
            if status == "background":
                 return json.dumps({
                    "status": "background",
                    "job_id": res["job_id"],
                    "message": f"UI Test is running long (background). Logs at {full_log_path}"
                })
            
            # 4. Analyze Results (Sync Completion)
            # Check exit code
            exit_code = res.get("exit_code", 0)

            # Read the log file we created
            log_read = self.docker_manager.read_file(self.startup_id, full_log_path)
            output = log_read.get("content", "Error reading log file.")
            
            # 5. Scan for Screenshots (Best Effort)
            # We look in the standard 'test-results' folder relative to working_dir
            # Simple grep/find via docker manager would be best, but we can infer or list
            
            snapshots = []
            try:
                # Find test-results folder relative to where we ran
                target_dir = f"{working_dir}/test-results" if working_dir != "." else "test-results"
                
                # List test-results to find new images
                ls_res = self.docker_manager.run_command(self.startup_id, f"find {target_dir} -name '*.png'")
                if ls_res.get("exit_code") == 0:
                    lines = ls_res["output"].strip().splitlines()
                    for line in lines:
                        if line.strip():
                             snapshots.append(line.strip())
            except:
                pass

            # 6. Format Output (Structured JSON)
            # We return a JSON string so the Agent can parse 'snapshots' reliably
            # instead of relying on regex.
            
            result_payload = {
                "exit_code": exit_code,
                "passed": (exit_code == 0),
                "working_dir": working_dir,
                "log_file": full_log_path,
                "snapshots": snapshots,
                "output": output[-3000:], # Logs
                "text_summary": "" # Human readable summary
            }
            
            summary_lines = []
            summary_lines.append(f"Test Execution Completed (Exit Code: {exit_code})")
            if exit_code == 0:
                summary_lines.append("✅ TEST PASSED")
            else:
                summary_lines.append("❌ TEST FAILED")
                
            if snapshots:
                summary_lines.append(f"Captured {len(snapshots)} Snapshots: {snapshots}")
            else:
                 summary_lines.append("(No snapshots found. Ensure playwright.config.ts has 'screenshot: on')")
            
            # CRITICAL: Append the actual logs so the Agent knows WHY it failed
            summary_lines.append("\n--- TEST LOGS (Last 3000 chars) ---")
            summary_lines.append(output[-3000:])
            summary_lines.append("-------------------------------------")
            
            result_payload["text_summary"] = "\n".join(summary_lines)
            
            return json.dumps(result_payload)
            
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
            import time
            
            # Use duckduckgo_search directly (more reliable than langchain wrapper)
            try:
                from duckduckgo_search import DDGS
            except ImportError:
                return "Web search unavailable: duckduckgo_search package not installed. Proceed with local debugging."
            
            # Try with retry logic (DuckDuckGo can be rate-limited)
            max_retries = 2
            for attempt in range(max_retries):
                try:
                    with DDGS() as ddgs:
                        # Get top 5 results
                        results = list(ddgs.text(query, max_results=5))
                        
                        if results and len(results) > 0:
                            # Format results
                            formatted = []
                            for i, result in enumerate(results, 1):
                                title = result.get('title', 'No title')
                                body = result.get('body', result.get('description', 'No description'))
                                link = result.get('href', result.get('link', ''))
                                
                                formatted.append(f"{i}. {title}")
                                formatted.append(f"   {body}")
                                if link:
                                    formatted.append(f"   Link: {link}")
                                formatted.append("")
                            
                            return f"Search Results for '{query}':\n\n" + "\n".join(formatted)
                        else:
                            # Empty result
                            if attempt < max_retries - 1:
                                time.sleep(1)  # Wait before retry
                                continue
                            return f"No results found for '{query}'. Try rephrasing or searching for specific error messages."
                        
                except Exception as e:
                    error_msg = str(e)
                    
                    # Check for common errors
                    if "rate" in error_msg.lower() or "limit" in error_msg.lower() or "429" in error_msg:
                        if attempt < max_retries - 1:
                            time.sleep(2)  # Wait longer for rate limits
                            continue
                        return f"Web search temporarily unavailable (rate limited). Try again later or search for: '{query}' manually."
                    
                    if "timeout" in error_msg.lower() or "connection" in error_msg.lower():
                        if attempt < max_retries - 1:
                            time.sleep(1)
                            continue
                        return f"Web search timed out. Network may be slow. You can try searching for: '{query}' manually or proceed without web search."
                    
                    # Unknown error
                    if attempt < max_retries - 1:
                        time.sleep(1)
                        continue
                    return f"Web search failed: {error_msg}. Proceed with local debugging or try a different search query."
            
            return "Web search failed after retries. Proceed with local investigation."
        
        return search_web
