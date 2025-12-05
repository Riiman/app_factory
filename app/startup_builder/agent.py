import os
import json
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from .manager import DockerManager, Linter
from .memory import MemoryManager
from .graph import AgentStateEnum
from .utils import JsonRepair

class MultiAgentSystem:
    def __init__(self):
        self.docker_manager = DockerManager()
        self.linter = Linter(self.docker_manager)
        self.memory_managers = {} # Cache for MemoryManager instances
        self._init_llm()

    def _get_memory_manager(self, startup_id):
        if startup_id not in self.memory_managers:
            self.memory_managers[startup_id] = MemoryManager(startup_id)
        return self.memory_managers[startup_id]


    def _init_llm(self):
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")

        if self.api_key and self.endpoint:
            try:
                self.llm = AzureChatOpenAI(
                    azure_deployment=self.deployment_name,
                    api_version=self.api_version,
                    openai_api_key=self.api_key,
                    azure_endpoint=self.endpoint,
                    temperature=0.2,
                    max_tokens=4000,
                )
            except Exception as e:
                print(f"Error initializing LLM: {e}")
                self.llm = None
        else:
            self.llm = None

    # --- Nodes ---

    def _get_relevant_context(self, startup_id, goal):
        """
        Retrieves scoped context by selecting and reading only relevant files.
        """
        print(f"DEBUG: Context Manager identifying files for goal: {goal}")
        
        # 1. List all files
        ls_result = self.docker_manager.run_command(startup_id, "git ls-files --cached --others --exclude-standard")
        if ls_result.get("exit_code") != 0:
             ls_result = self.docker_manager.run_command(startup_id, "find . -maxdepth 3 -name .git -prune -o -name node_modules -prune -o -not -name '.*' -print")
        
        all_files = ls_result.get("output", "")
        if not all_files:
            return "Project is empty."

        # 2. Ask LLM to select relevant files
        system_prompt = """You are a Context Manager.
        Your job is to select the most relevant files from the project to help an agent complete a specific task.
        
        CRITICAL RULES:
        1. Return a JSON OBJECT with a single key "files" containing a list of file paths.
        2. Select at most 5 files.
        3. Prioritize:
            - Files directly mentioned in the task.
            - Configuration files (package.json, tsconfig.json) if setup is needed.
            - Core logic files (models, controllers) related to the feature.
        
        Example Output:
        {"files": ["backend/src/app.ts", "backend/package.json"]}
        """
        
        user_message = f"""
        Task: {goal}
        All Files:
        {all_files}
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        selected_files = []
        try:
            response = json_llm.invoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1]
            
            selected_files = json.loads(content).get("files", [])
            print(f"Context Manager selected: {selected_files}")
            
        except Exception as e:
            print(f"Context Manager failed to select files: {e}")

        # 3. Semantic Search (RAG)
        memory_manager = self._get_memory_manager(startup_id)
        semantic_snippets = memory_manager.retrieve(goal, k=3)
        print(f"Context Manager retrieved {len(semantic_snippets)} semantic snippets.")

        # 4. Read content of selected files & Combine
        context_str = f"Project Structure:\n{all_files}\n\n"
        
        # Always read Project History
        progress_path = "artifacts/PROGRESS.md"
        progress_data = self.docker_manager.read_file(startup_id, progress_path)
        if "content" in progress_data:
            context_str += f"--- PROJECT HISTORY ({progress_path}) ---\n{progress_data['content']}\n\n"
        
        if semantic_snippets:
            context_str += "--- Semantic Search Results (Relevant Code) ---\n"
            for i, snippet in enumerate(semantic_snippets):
                context_str += f"Snippet {i+1}:\n{snippet}\n\n"
        
        context_str += "--- Selected File Contents ---\n"
        for file_path in selected_files:
            file_data = self.docker_manager.read_file(startup_id, file_path)
            if "content" in file_data:
                context_str += f"\n--- {file_path} ---\n{file_data['content']}\n"
            else:
                context_str += f"\n--- {file_path} ---\n(File not found or unreadable)\n"
                
        return context_str

    def architect_node(self, state):
        """Analyzes the request and file system to provide context."""
        print("--- Architect Node ---")
        startup_id = state["startup_id"]
        goal = state["goal"]
        
        # --- RAG: Sync and Index ---
        from .memory import MemoryManager
        import shutil
        
        # 1. Copy files from container to host temp dir
        # This is a bit hacky for MVP. Ideally we mount a shared volume.
        # For now, we'll just list files and maybe read critical ones if RAG fails.
        # But to do RAG properly, we need the content.
        # Let's try to use the 'find' command to get file structure first, which is fast.
        
        # Try git ls-files first (respects .gitignore)
        ls_result = self.docker_manager.run_command(startup_id, "git ls-files --cached --others --exclude-standard")
        
        # Fallback to find if git fails (e.g. not a git repo)
        if ls_result.get("exit_code") != 0:
             ls_result = self.docker_manager.run_command(startup_id, "find . -maxdepth 3 -name .git -prune -o -name node_modules -prune -o -not -name '.*' -print")
             
        files = ls_result.get("output", "")
        
        context = f"Project Files:\n{files}\n\nGoal: {goal}"
        
        # 3. Spec Generation (The "Architect" Phase)
        system_prompt = """You are a Chief Technology Officer (CTO).
        Analyze the goal and the current project state.
        Create a high-level Technical Specification (spec.md).
        
        CRITICAL RULES:
        1. Return the content of the spec.md file directly.
        2. Include:
           - **Goal**: Restate the goal.
           - **Architecture**: Brief overview of the approach.
           - **Files**: List of files to be created/modified.
           - **Steps**: High-level steps.
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=context)
        ]
        
        try:
            response = self.llm.invoke(messages)
            spec_content = response.content
            
            # Save spec to artifacts
            self.docker_manager.run_command(startup_id, "mkdir -p artifacts")
            self.docker_manager.write_file(startup_id, "artifacts/spec.md", spec_content)
            
            return {
                "context": context,
                "logs": state.get("logs", []) + ["Architect: Generated Technical Specification (spec.md)."]
            }
        except Exception as e:
            print(f"Architect failed: {e}")
            return {
                "context": context,
                "logs": state.get("logs", []) + [f"Architect: Failed to generate spec: {e}"]
            }

    def spec_approval_node(self, state):
        """Dummy node to trigger interrupt for Spec Approval."""
        print("--- Spec Approval Node ---")
        return {"status": "planning"} # Reset status to proceed

    def task_manager_node(self, state):
        """Breaks down the spec into a list of tasks."""
        print("--- Task Manager Node ---")
        startup_id = state["startup_id"]

        # --- FIX: Handle QA Failure ---
        if state.get("status") == "qa_failed":
             print("Task Manager: Detected QA Failure. Generating fix task.")
             error_history = state.get("error_history", [])
             last_error = error_history[-1] if error_history else "Unknown error"
             
             # Create a fix task
             # Clean up error message for title
             clean_error = last_error.split('\n')[0][:100]
             fix_task = f"Fix QA Error: {clean_error}"
             
             # Append to tasks.json
             tasks_path = "artifacts/tasks.json"
             existing_tasks_data = self.docker_manager.read_file(startup_id, tasks_path)
             
             all_tasks = []
             if "content" in existing_tasks_data and existing_tasks_data["content"]:
                 try:
                     all_tasks = json.loads(existing_tasks_data["content"])
                 except:
                     pass
             
             # Avoid adding duplicate fix tasks if we are looping on the same error
             # But if we failed again, maybe we need to try again? 
             # Let's just add it. The Developer/Planner will handle it.
             
             new_id = len(all_tasks) + 1
             new_task_entry = {"id": new_id, "title": fix_task, "status": "pending"}
             all_tasks.append(new_task_entry)
             
             self.docker_manager.write_file(startup_id, tasks_path, json.dumps(all_tasks, indent=2))
             
             return {
                 "task_queue": [fix_task],
                 "status": "developer",
                 "logs": state.get("logs", []) + [f"Task Manager: Added fix task: {fix_task}"]
             }
        
        # Resumability: Check for existing tasks
        tasks_path = "artifacts/tasks.json"
        existing_tasks_data = self.docker_manager.read_file(startup_id, tasks_path)
        
        if "content" in existing_tasks_data and existing_tasks_data["content"]:
            try:
                all_tasks = json.loads(existing_tasks_data["content"])
                pending_tasks = [t["title"] for t in all_tasks if t.get("status") == "pending"]
                completed_count = len([t for t in all_tasks if t.get("status") == "completed"])
                
                print(f"Task Manager: Found existing tasks. Pending: {len(pending_tasks)}, Completed: {completed_count}")
                
                if pending_tasks:
                     return {
                        "task_queue": pending_tasks,
                        "total_tasks": len(all_tasks),
                        "completed_tasks": completed_count,
                        "logs": state.get("logs", []) + ["Task Manager: Resuming from existing task list."],
                        "status": "developer"
                    }
                else:
                    return {
                        "task_queue": [],
                        "logs": state.get("logs", []) + ["Task Manager: All tasks completed."],
                        "status": "developer" # Developer will handle empty queue
                    }
            except json.JSONDecodeError:
                print("Task Manager: Failed to parse existing tasks.json. Regenerating.")

        # If no tasks or invalid json, generate new ones
        spec_path = "artifacts/spec.md"
        spec_data = self.docker_manager.read_file(startup_id, spec_path)
        spec = spec_data.get("content", "")
        
        system_prompt = """You are a Project Manager.
        Break down the technical specification into a list of actionable development tasks.
        
        CRITICAL RULES:
        1. Return a JSON OBJECT with a single key "tasks".
        2. "tasks" must be a list of strings (Task Titles).
        3. Order them logically (Dependencies first).
        4. Keep them granular (e.g., "Setup React Router", "Create Login Component").
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Specification:\n{spec}")
        ]
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        response = json_llm.invoke(messages)
        
        try:
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1]
                
            task_list = json.loads(content).get("tasks", [])
            
            # Save tasks to artifacts/tasks.json with status
            formatted_tasks = [{"id": i+1, "title": t, "status": "pending"} for i, t in enumerate(task_list)]
            self.docker_manager.run_command(startup_id, "mkdir -p artifacts")
            self.docker_manager.write_file(startup_id, tasks_path, json.dumps(formatted_tasks, indent=2))
            
            return {
                "task_queue": task_list,
                "total_tasks": len(task_list),
                "completed_tasks": 0,
                "logs": state.get("logs", []) + [f"Task Manager: Generated {len(task_list)} tasks."],
                "status": "developer"
            }
        except Exception as e:
            print(f"Task Manager Error: {e}")
            return {"status": "failed", "logs": state.get("logs", []) + [f"Task Manager failed: {e}"]}

    def reasoning_node(self, state):
        """Analyzes the problem and decides on a strategy (Chain of Thought)."""
        print("--- Reasoning Node ---")
        startup_id = state["startup_id"]
        goal = state["goal"]
        
        # Context Manager: Get Scoped Context
        context = self._get_relevant_context(startup_id, goal)
        
        system_prompt = """You are a Senior Software Architect.
        Analyze the user's request and the current project context.
        
        CRITICAL INSTRUCTIONS:
        1. **Initialization:** If the project is uninitialized (no README.md), your FIRST step must be to initialize it (e.g., `npx create-react-app .`) and create a `README.md`.
        2. **Context:** Always plan to update `PROGRESS.md` at the end of the task with a summary of what was done.
        3. **Server Management:** You are responsible for the server. If the server is not running (or if you just initialized it), you MUST plan a final step to start it (e.g., `npm start` or `python app.py`).
        
        Think step-by-step about:
        1. Architecture: How should this feature be structured?
        2. Libraries/Dependencies: What tools are needed?
        3. Edge Cases: What could go wrong?
        4. Strategy: What is the best implementation approach?
        
        Do NOT generate code or specific steps yet. Just provide a high-level technical strategy.
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Goal: {goal}\n\nContext: {context}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            reasoning = response.content
            
            # Append reasoning to context for the Planner
            updated_context = f"{context}\n\n--- Technical Strategy ---\n{reasoning}"
            
            return {
                "context": updated_context,
                "logs": state.get("logs", []) + ["Thinker: Analyzed architecture and devised strategy."]
            }
        except Exception as e:
            print(f"Reasoning failed: {e}")
            return {
                "logs": state.get("logs", []) + [f"Thinker: Failed to reason: {e}"]
            }

    def planner_node(self, state):
        """Generates a detailed plan for the current task."""
        print("--- Planner Node ---")
        startup_id = state["startup_id"]
        current_task = state.get("current_task")
        
        # Context Manager: Get Scoped Context for Planning
        # We re-fetch context here because the Planner might need more detail than Reasoning
        context = self._get_relevant_context(startup_id, current_task)
        
        system_prompt = """You are a Senior DevOps Engineer & Developer.
        Create a detailed, step-by-step execution plan for the given task.
        
        CONTEXT:
        The project files and their contents are provided below. Use them to verify paths and existing code.
        
        CRITICAL RULES:
        1. Return a JSON OBJECT with a single key "steps".
        2. "steps" must be a list of objects, each with:
           - "id": integer
           - "description": string
           - "action": "command" or "write_file"
           - "command": string (if action is command)
           - "file_path": string (if action is write_file)
           - "content": string (if action is write_file)
        3. **File Paths**: Must be relative to project root.
        4. **Granularity**: One logical change per step.
        5. **Verification**: Do NOT include "verify" steps. The Reviewer handles that.
        6. **Output Format**: Return ONLY valid JSON. Do not include markdown formatting, code blocks, or explanations.
        7. **Interactive Commands**: Prefer non-interactive commands. However, if an interactive command is absolutely necessary (e.g. `npm login`, `cypress open`), set `"interactive": true` in the step object.
        
        Example Output:
        {
            "steps": [
                {"id": 1, "description": "Install axios", "action": "command", "command": "npm install axios"},
                {"id": 2, "description": "Open Cypress", "action": "command", "command": "npx cypress open", "interactive": true}
            ]
        }
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Task: {current_task}\n\nContext:\n{context}")
        ]
        
        # Use JSON Mode
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        max_retries = 3
        current_messages = messages.copy()
        
        for attempt in range(max_retries):
            try:
                response = json_llm.invoke(current_messages)
                content = response.content.strip()
                
                # Use JsonRepair for robust parsing
                try:
                    data = JsonRepair.parse(content)
                except ValueError as e:
                    print(f"Planner JSON Parse Error (Attempt {attempt+1}/{max_retries}): {e}")
                    # Feedback loop: Add error to messages and retry
                    current_messages.append(HumanMessage(content=f"JSON Error: {str(e)}. Please fix the JSON format and return ONLY the JSON object."))
                    continue

                plan = data.get("steps", [])
                if not plan and isinstance(data, list):
                    plan = data
                
                # Format log as JSON string for UI parsing
                log_entry = {
                    "agent": "Planner",
                    "message": f"Generated {len(plan)} steps for task: {current_task}",
                    "details": json.dumps(plan, indent=2)
                }
                
                return {
                    "plan": plan,
                    "current_step_index": 0,
                    "status": "plan_ready",
                    "logs": state.get("logs", []) + [json.dumps(log_entry)]
                }
            except Exception as e:
                print(f"Planner LLM Error (Attempt {attempt+1}/{max_retries}): {e}")
                if attempt == max_retries - 1:
                    error_msg = f"Planner failed after {max_retries} attempts: {str(e)}"
                    return {
                        "status": "failed", 
                        "error_history": [str(e)],
                        "logs": state.get("logs", []) + [error_msg]
                    }
                current_messages.append(HumanMessage(content=f"Error: {str(e)}. Please try again."))
        
        return {
            "status": "failed",
            "error_history": ["Planner failed to generate valid JSON after multiple attempts."],
            "logs": state.get("logs", []) + ["Planner: Failed to generate valid plan."]
        }

    def developer_node(self, state):
        """Manages task queue and prepares steps for execution."""
        print("--- Developer Node ---")
        
        current_task = state.get("current_task")
        task_queue = state.get("task_queue", [])
        plan = state.get("plan", [])
        idx = state.get("current_step_index", 0)
        
        # 1. Task Management: Pick a task if none exists
        if not current_task:
            if not task_queue:
                print("Developer: No more tasks in queue.")
                return {"status": "execution_done"}
            
            current_task = task_queue.pop(0)
            print(f"Developer: Starting new task: {current_task}")
            return {
                "current_task": current_task,
                "task_queue": task_queue,
                "goal": current_task,
                "plan": [],
                "current_step_index": 0,
                "logs": state.get("logs", []) + [f"Developer: Starting task: {current_task}"],
                "status": "planning_needed" # Trigger Planner
            }

        # 2. Step Management: Execute the plan
        if not plan:
             print("Developer: Plan is empty. Triggering Planner.")
             return {"status": "planning_needed"}

        if idx >= len(plan):
            # Task Complete! Pick next one immediately.
            print(f"Developer: Task '{current_task}' complete.")
            
            # Increment completed tasks
            completed_tasks = state.get("completed_tasks", 0) + 1
            
            # Auto-Update PROGRESS.md
            try:
                progress_entry = f"- [x] **{current_task}** (Completed)\\n"
                # Ensure artifacts dir exists
                self.docker_manager.run_command(state["startup_id"], "mkdir -p artifacts")
                # Append to file
                cmd = f"echo '{progress_entry}' >> artifacts/PROGRESS.md"
                self.docker_manager.run_command(state["startup_id"], cmd)
                print(f"Developer: Updated artifacts/PROGRESS.md")
                
                # Resumability: Update tasks.json
                tasks_path = "artifacts/tasks.json"
                tasks_data = self.docker_manager.read_file(state["startup_id"], tasks_path)
                if "content" in tasks_data:
                    all_tasks = json.loads(tasks_data["content"])
                    for t in all_tasks:
                        if t["title"] == current_task:
                            t["status"] = "completed"
                            break
                    self.docker_manager.write_file(state["startup_id"], tasks_path, json.dumps(all_tasks, indent=2))
                    print(f"Developer: Updated status in tasks.json")
                    
            except Exception as e:
                print(f"Failed to update PROGRESS.md or tasks.json: {e}")
            
            # Auto-Index Codebase (RAG Update)
            print(f"Developer: Task complete. Indexing codebase...")
            try:
                memory_manager = self._get_memory_manager(state["startup_id"])
                startup_id = state["startup_id"]
                
                # Sync: Copy files from Container to Host for Indexing
                # We use 'docker cp' via the CLI or python client.
                # Since DockerManager wraps the client, we can add a method or use run_command with tar?
                # 'docker cp' is a host command, not a container command.
                
                # Workaround: We will use a temporary directory on host.
                local_workspace = f"./temp_workspaces/{startup_id}"
                os.makedirs(local_workspace, exist_ok=True)
                
                # Copy files from container (assuming /app is workdir)
                success = self.docker_manager.copy_from_container(startup_id, "/app", local_workspace)
                
                if success:
                    # Index the local copy
                    memory_manager.index_codebase(local_workspace)
                    print("Developer: Codebase indexed successfully.")
                else:
                    print("Developer: Failed to sync code for indexing.")
                
            except Exception as e:
                print(f"Indexing failed: {e}")

            if not task_queue:
                 return {"status": "execution_done", "completed_tasks": completed_tasks}
            
            next_task = task_queue.pop(0)
            print(f"Developer: Starting next task: {next_task}")
            return {
                "current_task": next_task,
                "task_queue": task_queue,
                "completed_tasks": completed_tasks,
                "goal": next_task,
                "plan": [],
                "current_step_index": 0,
                "logs": state.get("logs", []) + [f"Developer: Completed previous task. Starting: {next_task}"],
                "status": "planning_needed"
            }
            
        step = plan[idx]
        print(f"Developer: Processing step {idx + 1}/{len(plan)}")
        
        # Validation Logic (Placeholders & JSON)
        if step.get("action") == "write_file":
            path = step.get("file_path", "")
            if "<" in path or ">" in path or "[" in path or "path-to-" in path:
                # Simple resolution attempt
                step["file_path"] = path.replace("<", "").replace(">", "").replace("[", "").replace("]", "")
                
            if path.endswith(".json"):
                 content = step.get("content", "").strip()
                 if content and not content.startswith("{"):
                     # Simple fix attempt
                     if "```" in content:
                         step["content"] = content.split("```")[1].replace("json", "").strip()

        return {
            "current_step": step,
            "status": "coding",
            "logs": state.get("logs", []) + [f"Developer: Prepared step: {step.get('description')}"]
        }

    def debugger_node(self, state):
        """Diagnoses and fixes errors recursively."""
        print("--- Debugger Node ---")
        error_history = state.get("error_history", [])
        last_error = error_history[-1] if error_history else "Unknown error"
        current_task = state.get("current_task", "Unknown Task")
        
        print(f"Debugger: Analyzing error in task '{current_task}': {last_error}")
        
        system_prompt = """You are a Senior Debugger.
        Analyze the error and the failed task.
        Provide a SINGLE step to fix the issue.
        
        CRITICAL RULES:
        1. Return a JSON OBJECT with a single key "fix".
        2. The "fix" value must be a single step object (command or write_file).
        
        Example Output:
        {
            "fix": {"id": 1, "description": "Install missing dependency", "action": "command", "command": "npm install axios"}
        }
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Task: {current_task}\nError: {last_error}")
        ]
        
        # Use JSON Mode
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        try:
            response = json_llm.invoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1]
            
            data = json.loads(content)
            fix_step = data.get("fix")
            if not fix_step and isinstance(data, dict) and "action" in data:
                 fix_step = data # Fallback if model returned the step directly
            
            print(f"Debugger: Proposed fix: {fix_step}")
            
            return {
                "current_step": fix_step,
                "logs": state.get("logs", []) + [f"Debugger: Proposed fix for error: {last_error[:50]}..."],
                "status": "coding" # Go directly to Executor
            }
        except Exception as e:
            print(f"Debugger failed: {e}")
            return {"status": "failed"} # Critical failure if debugger fails

    def strategist_node(self, state):
        """Analyzes loops and proposes high-level recovery strategies."""
        print("--- Strategist Node ---")
        error_history = state.get("error_history", [])
        current_task = state.get("current_task", "Unknown Task")
        plan = state.get("plan", [])
        
        print(f"Strategist: Analyzing loop in task '{current_task}'. Errors: {len(error_history)}")
        
        system_prompt = """You are a Strategic Technical Lead.
        The agent is stuck in an execution loop. Your job is to analyze the situation and direct the team on how to proceed.
        
        CONTEXT:
        - Task: The high-level goal.
        - Plan: The current steps.
        - Errors: The recurring errors that caused the loop.
        
        AVAILABLE STRATEGIES:
        1. **REPLAN**: The current plan is flawed. Instruct the Planner to generate a NEW plan for this task.
        2. **PIVOT**: The underlying approach is wrong (e.g., wrong library). Instruct the Reasoning node to change strategy.
        3. **SKIP**: The error is non-critical (e.g., optional linting). Instruct the Developer to skip this step.
        4. **ABORT**: The issue is fatal and unsolvable. Fail the task.
        
        CRITICAL RULES:
        1. Return a JSON OBJECT with "action" (REPLAN, PIVOT, SKIP, ABORT) and "directive" (explanation).
        2. Be decisive.
        
        Example Output:
        {"action": "REPLAN", "directive": "The current approach of using 'fs' is failing. Switch to using 'fs-extra' and replan."}
        """
        
        user_message = f"""
        Task: {current_task}
        Recent Errors: {error_history[-3:]}
        Current Plan Length: {len(plan)}
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        # Use JSON Mode
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        try:
            response = json_llm.invoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1]
            
            strategy = json.loads(content)
            action = strategy.get("action", "ABORT").upper()
            directive = strategy.get("directive", "Unknown directive")
            
            print(f"Strategist Decision: {action} - {directive}")
            
            return {
                "status": "strategizing", # Intermediate status
                "strategy_action": action,
                "strategy_directive": directive,
                "logs": state.get("logs", []) + [f"Strategist: Loop detected. Decision: {action}. Directive: {directive}"]
            }
            
        except Exception as e:
            print(f"Strategist failed: {e}")
            return {"status": "failed", "logs": state.get("logs", []) + [f"Strategist: Failed to decide. Aborting."]}

    def executor_node(self, state):
        """Executes the command in Docker."""
        print("--- Executor Node ---")
        
        if state.get("status") == "failed":
             return {"status": "failed", "logs": state.get("logs", []) + ["Executor: Aborting due to previous failure."]}

        startup_id = state["startup_id"]
        step = state["current_step"]
        print(f"Executor: Running step: {step.get('description')}")
        
        # Check for resume signal
        if state.get("interaction_completed"):
            print("Executor: Resuming after manual interaction.")
            return {
                "last_result": {"exit_code": 0, "output": "Manual interaction completed by user."},
                "status": "success",
                "interaction_completed": False # Reset flag
            }

        # Check for interactive step
        if step.get("interactive"):
            print("Executor: Pausing for interactive step.")
            return {
                "status": "waiting_interaction",
                "logs": state.get("logs", []) + [f"Executor: Pausing for interactive command: {step.get('command')}"]
            }

        action = step.get("action")
        result = {"exit_code": 1, "output": "Unknown action"}
        
        if action == "command":
            cmd = step.get("command")
            detach = step.get("background", False)
            
            # Auto-detect server start commands to prevent blocking
            if "npm start" in cmd or "node api.js" in cmd or "python app.py" in cmd or "python3 app.py" in cmd:
                detach = True
                print(f"Executor: Detaching server command: {cmd}")
                
            result = self.docker_manager.run_command(startup_id, cmd, detach=detach)
        
        elif action == "write_file":
            path = step.get("file_path")
            content = step.get("content")
            print(f"DEBUG: Writing file to {path}. Content length: {len(content) if content else 0}")
            
            result = self.docker_manager.write_file(startup_id, path, content)
            print(f"DEBUG: Write Result: {result}")
            
            # Auto-Linting
            lint_result = self.linter.lint_file(startup_id, path)
            if not lint_result["passed"]:
                print(f"Linter Failed for {path}: {lint_result['errors']}")
                # We don't fail the step immediately, but we append errors to logs
                # The Reviewer will see this.
                result["linter_errors"] = lint_result["errors"]
            else:
                print(f"Linter Passed for {path}")
            
        # --- Git Automation ---
        if result.get("exit_code", 0) == 0:
            try:
                # Ensure git is initialized
                self.docker_manager.run_command(startup_id, "git init")
                self.docker_manager.run_command(startup_id, "git config user.email 'ai@startup.studio'")
                self.docker_manager.run_command(startup_id, "git config user.name 'AI Developer'")
                
                # Commit changes
                commit_msg = f"Step {step.get('id')}: {step.get('description')}"
                self.docker_manager.run_command(startup_id, "git add .")
                self.docker_manager.run_command(startup_id, f"git commit -m '{commit_msg}'")
            except Exception as e:
                print(f"Git automation failed: {e}")
                # Don't fail the step just because git failed
        
        # Format log as JSON string for UI parsing
        log_entry = {
            "agent": "Executor",
            "message": f"Ran {action}: {step.get('command') if action == 'command' else step.get('file_path')}",
            "details": result.get('output', '') if action == 'command' else f"Written {len(step.get('content', ''))} bytes"
        }
        
        return {
            "last_result": result,
            "logs": state.get("logs", []) + [json.dumps(log_entry)]
        }

    def _take_screenshot(self, startup_id):
        """Takes a screenshot of the running app."""
        try:
            from playwright.sync_api import sync_playwright
            
            # Get port (assuming 3000 for MVP)
            # In production, we should get the mapped port from DockerManager
            # But since we are running on the same host, we can use localhost:mapped_port
            # We need to ask DockerManager for the port.
            
            container_info = self.docker_manager.ensure_container(startup_id)
            ports = container_info.get("ports", {})
            if not ports or '3000/tcp' not in ports or not ports['3000/tcp']:
                return None
                
            port = ports['3000/tcp'][0]['HostPort']
            url = f"http://localhost:{port}"
            
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page()
                try:
                    page.goto(url, timeout=5000)
                    # Wait for network idle to ensure loading
                    page.wait_for_load_state('networkidle', timeout=5000)
                except:
                    pass # Proceed even if timeout, might be partial load
                
                screenshot_path = f"screenshots/{startup_id}_latest.png"
                os.makedirs("screenshots", exist_ok=True)
                page.screenshot(path=screenshot_path)
                browser.close()
                return screenshot_path
        except Exception as e:
            print(f"Screenshot failed: {e}")
            return None

    def reviewer_node(self, state):
        """Checks the execution result using an LLM."""
        print("--- Reviewer Node (Smart) ---")
        result = state.get("last_result", {})
        step = state.get("current_step", {})
        
        command = step.get("command") or step.get("file_path") or "Unknown Action"
        output = result.get("output", "") or result.get("error", "")
        exit_code = result.get("exit_code", 0)
        linter_errors = result.get("linter_errors", [])
        
        print(f"DEBUG: Reviewer checking: {command} (Exit: {exit_code})")
        
        # Immediate Fail on Linter Errors
        if linter_errors:
            error_msg = f"Linter Errors Detected:\n" + "\n".join(linter_errors[:10])
            print(f"Reviewer: {error_msg}")
            return {
                "status": "failed",
                "error_category": "LOGIC_SYNTAX",
                "error_history": state.get("error_history", []) + [error_msg],
                "logs": state.get("logs", []) + [f"Reviewer: Step failed due to linter errors."]
            }
        
        system_prompt = """You are a cynical QA Engineer.
        Analyze the execution result of a development step.
        
        INPUT DATA:
        - Command/Action: The command that was run.
        - Output: The stdout/stderr produced.
        - Exit Code: The shell exit code (0 = success, non-zero = usually failure).
        
        CRITICAL RULES:
        1. **TRUST OUTPUT OVER EXIT CODE**: The "Exit Code" is often WRONG (e.g. pip exits with 0 even when it fails).
        2. **SEARCH FOR ERRORS**: Scan the "Output" for keywords: "error", "failed", "exception", "externally-managed-environment", "command not found".
        3. **IF ERROR FOUND -> FAIL**: If ANY of those keywords appear in a failure context, you MUST return "status": "failed", even if Exit Code is 0.
        4. **Idempotency**: If a creation command fails because it already exists (e.g., "mkdir: File exists"), mark it as SUCCESS.
        5. **Warnings**: If the output contains ONLY warnings (e.g., "npm warn") but otherwise completed, mark it as SUCCESS.
        
        Return JSON: {"status": "success" | "failed", "reason": "...", "category": "..."}
        """
        
        user_message = f"""
        Command: {command}
        Exit Code: {exit_code}
        Output:
        {output[:2000]} 
        """
        
        print(f"DEBUG: Reviewer LLM Input:\n{user_message}")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        # Use JSON Mode
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        try:
            response = json_llm.invoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1]
            
            verdict = json.loads(content)
            status = verdict.get("status", "failed").lower()
            reason = verdict.get("reason", "Unknown reason")
            category = verdict.get("category", "LOGIC_SYNTAX") # Default to logic if unknown
            
            print(f"Reviewer Verdict: {status} - {reason} ({category})")
            
            if status == "success":
                 return {
                    "status": "done",
                    "current_step_index": state.get("current_step_index", 0) + 1,
                    "logs": state.get("logs", []) + [f"Reviewer: Step verified. Reason: {reason}"]
                }
            else:
                # Failure Logic
                error_history = state.get("error_history", [])
                error_msg = f"{reason} (Output: {output[:100]}...)"
                
                if len(error_history) >= 3 and error_msg in error_history[-2:]:
                    return {
                        "status": "failed",
                        "error_category": category,
                        "error_history": error_history + [error_msg],
                        "logs": state.get("logs", []) + [f"Reviewer: CRITICAL - Loop detected. Aborting. Error: {error_msg}"]
                    }

                return {
                    "status": "failed",
                    "error_category": category,
                    "error_history": error_history + [error_msg],
                    "logs": state.get("logs", []) + [f"Reviewer: Step failed. Reason: {reason}. Category: {category}. Requesting fix..."]
                }
                
        except Exception as e:
            print(f"Reviewer LLM failed: {e}")
            # Fallback to strict exit code check
            if exit_code == 0:
                 return {"status": "done", "logs": state.get("logs", []) + ["Reviewer: Verified (Fallback)."]}
            else:
                 return {
                     "status": "failed", 
                     "error_category": "LOGIC_SYNTAX", # Assume logic error on fallback
                     "logs": state.get("logs", []) + [f"Reviewer: Failed (Fallback). Error: {str(e)}"]
                 }
            
        # Robust check for npm errors even if exit code is 0 (some versions/configs might behave oddly)
        output = result.get("output", "").lower()
        error_keywords = ["npm error", "exception", "fatal", "typeerror", "syntaxerror", "referenceerror", "error:"]
        if any(keyword in output for keyword in error_keywords):
             error_msg = f"Detected error in output despite exit code 0: {result.get('output')[:200]}..."
             print(f"Reviewer found error in output: {error_msg}")
             return {
                "status": "failed",
                "error_category": "LOGIC_SYNTAX",
                "error_history": state.get("error_history", []) + [error_msg],
                "logs": state.get("logs", []) + [f"Reviewer: Step failed. Error: {error_msg}. Requesting fix..."]
            }

        # --- Verification for File Writes ---
        if step.get("action") == "write_file":
            path = step.get("file_path")
            # Verify file content
            read_result = self.docker_manager.read_file(startup_id, path)
            if "error" in read_result:
                error_msg = f"Verification failed: Could not read file {path}: {read_result['error']}"
                print(f"Reviewer: {error_msg}")
                return {
                    "status": "failed",
                    "error_category": "MISSING_IMPLEMENTATION",
                    "error_history": state.get("error_history", []) + [error_msg],
                    "logs": state.get("logs", []) + [f"Reviewer: {error_msg}"]
                }
            
            content = read_result.get("content", "")
            if not content or len(content.strip()) == 0:
                error_msg = f"Verification failed: File {path} is empty."
                print(f"Reviewer: {error_msg}")
                return {
                    "status": "failed",
                    "error_category": "LOGIC_SYNTAX",
                    "error_history": state.get("error_history", []) + [error_msg],
                    "logs": state.get("logs", []) + [f"Reviewer: {error_msg}"]
                }
            
            # Optional: Check if content matches expected (fuzzy check)
            expected_len = len(step.get("content", ""))
            actual_len = len(content)
            # Allow some variance for whitespace/encoding
            if abs(expected_len - actual_len) > expected_len * 0.2: # >20% difference
                 print(f"Reviewer Warning: Content length mismatch. Expected ~{expected_len}, got {actual_len}.")
                 # We don't fail here, just log, as encoding might change length slightly
            
            logs = state.get("logs", []) + [f"Reviewer: Verified file {path} (Size: {actual_len} bytes)."]
        else:
            logs = state.get("logs", []) + ["Reviewer: Step verified."]
        
        # --- Visual QA ---
        # Heuristic: If step involves UI changes
        description = step.get("description", "").lower()
        if "css" in description or "html" in description or "ui" in description or "frontend" in description:
            # screenshot_path = self._take_screenshot(startup_id)
            # if screenshot_path:
            #     logs.append(f"Reviewer: Visual QA - Screenshot captured at {screenshot_path}")
            pass
                # In a real system, we would send this image to GPT-4-Vision for analysis.
                # For MVP, we just log it.
                
        idx = state["current_step_index"]
        
        # Check if this was the last step
        if idx + 1 >= len(state["plan"]):
            return {
                "status": "execution_done", # Signal Overseer to switch to QA
                "current_step_index": idx + 1,
                "logs": logs
            }
            
        return {
            "status": "done", # Step done, not whole plan
            "current_step_index": idx + 1,
            "logs": logs
        }

    def overseer_node(self, state):
        """The Supervisor that decides which team works next."""
        print("--- Overseer Node ---")
        # This node is primarily for logging and state cleanup/transition prep.
        # The actual routing logic happens in the conditional edges of the graph.
        
        status = state.get("status", "start")
        logs = state.get("logs", [])
        
        if status == "start" or status == "planning_needed":
            logs.append("Overseer: Activating Planning Team.")
        elif status == "plan_ready":
            logs.append("Overseer: Plan approved. Activating Execution Team.")
        elif status == "execution_done":
            logs.append("Overseer: Execution complete. Activating QA Team.")
        elif status == AgentStateEnum.TEST_GEN:
            logs.append("Overseer: Generating Verification Script (Test-First).")
        elif status == AgentStateEnum.VERIFY:
            logs.append("Overseer: Running Verification Script.")
        elif status == "qa_failed":
            logs.append("Overseer: QA Failed. Re-activating Planning Team for fix.")
        elif status == "qa_passed":
            logs.append("Overseer: QA Passed. Task Completed Successfully.")
            
        return {"logs": logs}

    def test_gen_node(self, state):
        """Generates a verification script before implementation."""
        print("--- Test Gen Node ---")
        goal = state.get("current_task", state.get("goal"))
        startup_id = state["startup_id"]
        
        system_prompt = """You are a QA Automation Engineer.
        Your job is to write a standalone Python script to verify if a specific task has been completed successfully.
        
        CRITICAL RULES:
        1. The script must be self-contained (no external dependencies other than requests/standard lib if possible).
        2. It should print "VERIFICATION PASSED" if successful, and "VERIFICATION FAILED: <reason>" if not.
        3. It should exit with code 0 for pass, 1 for fail.
        4. Return ONLY the python code for the script.
        """
        
        user_message = f"""
        Task to Verify: {goal}
        
        Context: The app runs on localhost:3000 (React) and localhost:5000 (Flask).
        """
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]
        
        try:
            response = self.llm.invoke(messages)
            script_content = response.content.replace("```python", "").replace("```", "").strip()
            
            # Write the script
            self.docker_manager.write_file(startup_id, "verify_task.py", script_content)
            
            return {
                "status": "plan_ready",
                "logs": state.get("logs", []) + ["Test Gen: Created verification script."]
            }
        except Exception as e:
            print(f"Test Gen Failed: {e}")
            # Fallback to standard testing if generation fails
            return {
                "status": "plan_ready",
                "logs": state.get("logs", []) + [f"Test Gen: Failed to generate script ({e}). Using standard checks."]
            }

    def tester_node(self, state):
        """The QA Team that verifies the final output and manages server lifecycle."""
        print("--- QA/Tester Node ---")
        startup_id = state["startup_id"]
        logs = state.get("logs", [])
        
        # 0. Check for Verification Script (Test-First Strategy)
        check_script = self.docker_manager.run_command(startup_id, "ls verify_task.py")
        if check_script.get("exit_code") == 0:
            print("Tester: Found verification script. Running it...")
            # Run the script
            verify_result = self.docker_manager.run_command(startup_id, "python3 verify_task.py")
            output = verify_result.get("output", "")
            
            if verify_result.get("exit_code") == 0:
                logs.append(f"Tester: Verification Script Passed.\n{output}")
                return {"status": "qa_passed", "logs": logs}
            else:
                error_msg = f"Verification Script Failed.\n{output}"
                logs.append(f"Tester: {error_msg}")
                return {
                    "status": "qa_failed",
                    "error_category": "LOGIC_SYNTAX", # Verification script failure is usually logic
                    "error_history": state.get("error_history", []) + [error_msg],
                    "logs": logs
                }

        # Fallback: Standard Server Health Check
        # 1. Server Management: Ensure Server is Running
        print("Tester: Checking server status...")
        
        # Try to start/restart server
        # We always restart to ensure latest code is running
        self.docker_manager.stop_server(startup_id)
        start_result = self.docker_manager.start_server(startup_id)
        
        if start_result.get("error"):
            error_msg = f"Failed to start server: {start_result['error']}"
            print(f"Tester: {error_msg}")
            return {
                "status": "qa_failed",
                "error_category": "INFRASTRUCTURE",
                "error_history": state.get("error_history", []) + [error_msg],
                "logs": logs + [f"Tester: {error_msg}"]
            }
            
        logs.append(f"Tester: Server started (PID: {start_result.get('pid')}). Verifying health...")
        
        # 2. Health Check
        import time
        max_retries = 3 # Wait up to 9 seconds (3 * 3s)
        server_healthy = False
        
        for i in range(max_retries):
            # Check localhost:3000 (React) or 5000/8000 (Python)
            # We can try multiple ports or just the one mapped
            # For now, we assume 3000 as per MERN stack default
            result = self.docker_manager.run_command(startup_id, "curl -I http://localhost:3000")
            
            if result.get("exit_code") == 0:
                server_healthy = True
                break
            
            # If 3000 fails, try 8000 (Python)
            result_alt = self.docker_manager.run_command(startup_id, "curl -I http://localhost:8000")
            if result_alt.get("exit_code") == 0:
                 server_healthy = True
                 break
                 
            time.sleep(3)
            
        if server_healthy:
            logs.append("Tester: Application is responsive (HTTP 200 OK).")
            return {"status": "qa_passed", "logs": logs}
        else:
            # 3. Runtime Error Analysis
            # Fetch app.log to see why it failed
            log_result = self.docker_manager.read_file(startup_id, "app.log")
            app_log = log_result.get("content", "No app.log found.")
            
            # Truncate
            if len(app_log) > 2000:
                app_log = app_log[-2000:]
                
            error_msg = f"Server failed to start/respond.\n\n--- app.log ---\n{app_log}"
            logs.append(f"Tester: Runtime Error Detected. Logs:\n{app_log}")
            
            return {
                "status": "qa_failed", # Trigger Overseer to route to Architect/Developer
                "error_category": "INFRASTRUCTURE", # Runtime crash is usually infra/runtime
                "error_history": state.get("error_history", []) + [error_msg],
                "logs": logs
            }
