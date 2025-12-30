
import logging
import json
from ..agents.core import V3CoPilot
from .reflector import V3Reflector # New Import
from ...manager import DockerManager
from ...context import ContextManager
from ..tools import V3Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

logger = logging.getLogger(__name__)

class V3Developer:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=True, log_callback=log_callback) # Execution mode = fast, changed to True
        self.reflector = V3Reflector(log_callback=log_callback) # New Reflector
        self.docker_manager = DockerManager() # Reuse V2 Infrastructure
        # Startup ID is not available in __init__ usually, but we need it for ContextManager.
        # But ContextManager takes startup_id in __init__.
        # We should instantiate ContextManager inside developer_node where we have startup_id.
        self.context_manager = None

    def developer_node(self, state, injected_result=None):
        """
        The Developer Node for LangGraph.
        Executes the current task in the plan.
        Supports RE-INJECTION of results from async jobs.
        """
        current_plan = state.get("plan", [])
        startup_id = state.get("startup_id")
        
        current_mission = state.get("current_mission")
        if not current_mission:
             return {"status": "done_mission", "logs": ["Developer: No active mission found."]}
             
        current_mission_id = current_mission["id"]
        missions = [] 
        
        # 1. Find the next pending task FOR THIS MISSION
        next_task = None
        
        # self._log_to_file(f"DEV CHECK: Mission {current_mission_id}. Plan size: {len(current_plan)}")
        
        for i, task in enumerate(current_plan):
            t_mid = task.get("mission_id")
            t_comp = task.get("completed")
            
            # Flexible type comparison for ID
            is_id_match = (str(t_mid) == str(current_mission_id))
            
            if is_id_match and not t_comp:
                next_task = task
                self._log_to_file(f"DEV CHECK: Found next task: {task.get('description')}")
                break
        
        if not next_task:
            self._log_to_file(f"DEV CHECK: No pending tasks for Mission {current_mission_id}. Finishing.")
            # Mark mission as complete
            for m in missions:
                if m["id"] == current_mission_id:
                    m["status"] = "completed"
                    
            # --- GLOBAL CONTEXT UPDATE (Shifted here) ---
            # Summarize the entire mission into global context
            mission_summary_text = "\n".join(current_mission.get("mission_context", []))
            global_summary_entry = f"Mission '{current_mission['title']}' Completed.\nDetails:\n{mission_summary_text}"
            
            new_global_context = self.context_manager.update_global_context(state.get("global_context", ""), global_summary_entry)
            
            # --- PERSISTENCE: Sync to file ---
            impl_plan = current_mission.get("implementation_plan", "")
            mission_ctx = current_mission.get("mission_context", [])
            # Correctly pass status="completed" here
            self._sync_persistence(startup_id, current_mission_id, impl_plan, mission_ctx, current_mission.get("tasks", []), status="completed")
            
            return {
                "status": "done_mission", # Router will pick next mission
                "missions": missions,
                "global_context": new_global_context, # Return updated global context
                "logs": [f"Mission {current_mission_id} Complete!"]
            }
            
        # 1.5 Setup ContextManager
        if not self.context_manager or self.context_manager.startup_id != startup_id:
            self.context_manager = ContextManager(self.docker_manager, startup_id)
            
        # 1.6 Retrieve Local Context (RAG)
        local_context = self.context_manager.retrieve_local_context(next_task['description'])
        state["local_context"] = local_context
        
        # Emit explicit thought for UI visibility
        self.copilot.emit_thought(f"Starting Task: {next_task['description']}", "developer")
        
        logger.info(f"--- V3 Developer: Working on '{next_task['description']}' ---")
        
        # 2. Setup Tools
        tools_factory = V3Tools(self.docker_manager, startup_id)
        tools = tools_factory.get_tool_list()
        
        # 3. System Prompt
        system_prompt = """You are a Senior Full-Stack Developer (Expert Level).
        Your job is to EXECUTE the given task with PRODUCTION-QUALITY code.
        
        ENVIRONMENT CONSTRAINTS:
        - You are running INSIDE a Docker container.
        - You CANNOT run `docker`, `docker-compose`, or `systemctl`.
        - EXPOSED PORTS (MANDATORY): 3000 (Frontend), 8000 (Backend), 5000 (Flask), 8080 (Alt).
        - Verify code by running it DIRECTLY (e.g., `npm start`, `python main.py`).
        - VERIFICATION RULE: Frontend is NOT valid until `npm run build` passes (Exit 0).
        
        YOU HAVE ACCESS TO TOOLS:
        - run_shell: Run COMMANDS. Note: Slow commands (>5s) will return a Job ID. You MUST handle this by waiting.
        - ensure_server_running: Use this instead of `run_shell` for servers.
        - check_job: Check status of background jobs.
        
        STRATEGY:
        1. Explore relevant files if needed.
        2. Write/Update the code (Full Implementation).
        3. Verify checks passed if applicable.
        
        BLOCKING COMMAND RULE:
        - NEVER run `npm run dev` or servers via `run_shell`. Use `ensure_server_running`.
        - If `run_shell` returns `{"status": "background", "job_id": "..."}`, your turn is DONE. STOP there.
          The system will wake you up when the job is finish.
        
        FAILURE RECOVERY RULES:
        - If a tool FAILS (Error/Exit Code 1):
          * Do NOT just run 'list_files' and claim success.
          * You MUST fix the command and RETRY the action.
          
        LAZY GUARD:
        - You MUST execute the required action (e.g., 'write_file'). 
        - Thinking is NOT working. Listing files is NOT finishing the task.
        
        
        MISSION CONTEXT (What has been done so far):
        {mission_context}
        
        TASK CONTEXT (EXECUTION LOG):
        {task_context_str}
        
        When you are done, just output the final confirmation message.
        """
        
        mission_context = json.dumps(current_mission.get("mission_context", []), indent=2)
        base_user_prompt = f"Task: {next_task['description']}\nLogic: {next_task.get('logic', 'Standard Implementation')}\nDetails: {next_task.get('content_sketch', '')}\n\nLocal Context:\n{local_context}"
        
        messages = [HumanMessage(content=base_user_prompt)]
        
        # 4. Tool Loop (Max 10 turns to prevent infinite loops)
        executed_actions = []
        task_context = [] 
        
        # Handle Injected Resume
        if injected_result:
             task_context.append(f"SYSTEM: Resumed from Async Job. Result: {injected_result}")
             self.copilot.emit_thought(f"Resuming task after async job completion...", "developer")
        
        # CIRCUIT BREAKER STATE
        consecutive_failures = 0
        last_failed_command = ""
        last_error_log = ""
        
        for i in range(10):
            # Inject task context if we are retrying
            # We construct the prompt dynamically
            task_context_str = json.dumps(task_context, indent=2) if task_context else "No actions yet."
            
            current_prompt = system_prompt.replace("{mission_context}", mission_context).replace("{task_context_str}", task_context_str)
            
            res = self.copilot.act(current_prompt, messages, tools, active_node="developer")
            
            if res["error"]:
                 return {"status": "failed", "logs": [f"CoPilot Error: {res['error']}"]}
            
            ai_msg = res["content"]
            messages.append(ai_msg) # Add AI response to history
            
            # Check for tool calls
            if ai_msg.tool_calls:
                if ai_msg.content:
                    self.copilot.emit_thought(ai_msg.content, "developer")

                tool_executed = False
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]
                    
                    # Prettify Args for User Visibility
                    pretty_args = str(args)
                    try:
                        if tool_name == "run_shell":
                            pretty_args = f"Running: `{args.get('command')}`"
                        elif tool_name == "write_file":
                            pretty_args = f"Writing to `{args.get('path')}`"
                    except:
                        pass
                        
                    self.copilot.emit_thought(f"Invoking {tool_name}... {pretty_args}", "developer")
                    
                    # Execute locally (since we have the bound functions in `tools` list)
                    selected_tool = next((t for t in tools if t.name == tool_name), None)
                    
                    tool_result = "Error: Tool not found"
                    command_str = str(args) # Capture command for verification
                    
                    if selected_tool:
                        try:
                            # Invoke the tool
                            tool_result = selected_tool.invoke(args)
                        except Exception as e:
                            tool_result = f"Tool Execution Error: {str(e)}"
                    
                    # Check for Async Yield Signal
                    try:
                         # We check if result is JSON and has status: background
                         # Tool result is string, so we parse if it looks like JSON
                         if isinstance(tool_result, str) and tool_result.strip().startswith("{"):
                             try:
                                 res_json = json.loads(tool_result)
                                 if res_json.get("status") == "background":
                                     # YIELD EXECUTION
                                     job_id = res_json.get("job_id")
                                     self.copilot.emit_thought(f"Task moved to background (Job {job_id}). Yielding...", "developer")
                                     
                                     # Return 'blocked' status
                                     return {
                                         "status": "blocked",
                                         "waiting_on": job_id,
                                         "current_mission": current_mission,
                                         "logs": [f"Developer: Yielding for async job {job_id}."]
                                     }
                             except:
                                 pass
                    except:
                        pass
                    
                    # Store result in Task Context
                    task_context.append(f"Action: {tool_name}, Result: {str(tool_result)[:300]}...")
                    
                    # --- EXPLICIT VERIFICATION STEP ---
                    verification_status = self._verify_action(tool_name, command_str, str(tool_result))
                    
                    if verification_status == "FAILURE":
                         consecutive_failures += 1
                         if consecutive_failures >= 2:
                             hint = self.reflector.reflect(next_task, command_str, str(tool_result), consecutive_failures)
                             task_context.append(f"SYSTEM ALERT: {hint}")
                    else:
                         task_context.append(f"VERIFICATION: SUCCESS.")
                         consecutive_failures = 0 
                    
                    # Append ToolMessage
                    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))
                    executed_actions.append(f"Ran {tool_name}")
            else:
                 # Check for explicit STATUS in Final Message
                 content = ai_msg.content
                 if "STATUS: FAILURE" in content:
                      # ESCALATE
                      next_task["status"] = "failed"
                      next_task["task_context"] = task_context
                      self._sync_persistence(startup_id, current_mission["id"], current_mission.get("implementation_plan", ""), current_mission.get("mission_context", []), current_mission.get("tasks", []), status="in_progress")
                      
                      return {
                          "status": "fix_required", 
                          "current_mission": current_mission,
                          "failed_task": next_task,
                          "logs": [f"Developer: Task '{next_task['description']}' failed. Escalating to Architect."]
                      }
                 
                 # --- LAZY / SUCCESS GUARD ---
                 # 1. Lazy Check: Did we do ANYTHING?
                 if not executed_actions and not injected_result:
                      logger.warning(f"Lazy Guard Triggered: No actions executed.")
                      rejection_msg = "SYSTEM ERROR: You claimed completion but executed NO tools. You must execute the required action."
                      messages.append(HumanMessage(content=rejection_msg))
                      task_context.append("System: Rejected empty completion.")
                      continue # Retry
                 
                 # Otherwise assume success/completion
                 self._log_to_file(f"GUARD ACCEPT: Task {next_task['description']} passed.")
                 break
        
        # --- LOOP EXIT CHECK ---
        else:
             logger.error("Developer Loop Exhausted. Task Failed.")
             next_task["status"] = "failed"
             next_task["task_context"] = task_context
             
             self._sync_persistence(startup_id, current_mission["id"], current_mission.get("implementation_plan", ""), current_mission.get("mission_context", []), current_mission.get("tasks", []), status="in_progress")
             
             return { 
                 "status": "fix_required", 
                 "current_mission": current_mission, 
                 "failed_task": next_task, 
                 "logs": [f"Developer: Task '{next_task['description']}' failed after 10 attempts. Escalating to Strategist."] 
             }

        # Mark task as done
        next_task["completed"] = True
        next_task["task_context"] = task_context # Attach execution log
        
        # Ensure current_mission['tasks'] is updated
        if "tasks" not in current_mission:
             current_mission["tasks"] = []
             
        found_in_mission = False
        for t in current_mission["tasks"]:
            if t.get("description") == next_task.get("description"): 
                t["completed"] = True
                t["task_context"] = task_context
                found_in_mission = True
                break
        
        if not found_in_mission:
            current_mission["tasks"].append(next_task)
        
        # Update Mission Context
        # Update Mission Context with RICH SUMMARY
        rich_summary = self._generate_rich_summary(next_task, task_context)
        
        if "mission_context" not in current_mission:
             current_mission["mission_context"] = []
        current_mission["mission_context"].append(rich_summary)
        
        # Enforce Mission Budget (Compress if needed)
        current_mission["mission_context"] = self.context_manager.compress_mission_context(current_mission["mission_context"])
        
        # NOTE: We DO NOT update Global Context here anymore. Only on Mission Completion.
        new_global_context = state.get("global_context", "")
        
        # PERSIST: Sync everything (Mission Status, Context, AND Tasks)
        self._sync_persistence(
            startup_id, 
            current_mission["id"], 
            current_mission.get("implementation_plan", ""), 
            current_mission["mission_context"],
            current_mission["tasks"],
            status="in_progress" 
        )
            
        return {
            "plan": current_plan,
            "current_mission": current_mission, # Return updated mission with context
            "status": "coding",
            "logs": [f"Developer Loop: Completed {next_task['description']}"],
            "local_context": local_context,
            "global_context": new_global_context
        }

    def _verify_action(self, action: str, command: str, output: str) -> str:
        """
        Uses a cheap LLM call (or heuristic) to verify if the action succeeded.
        """
        # Heuristic for speed:
        if "Error" in output or "Exception" in output or "failed" in output.lower():
             return "FAILURE"
        return "SUCCESS"

    def _generate_rich_summary(self, task, context):
        """
        Uses LLM to generate a concise technical summary of what was accomplished.
        Focuses on: Created endpoints, modified logic, fixed bugs.
        """
        try:
             copilot = V3CoPilot(use_thinking=False) # Use fast mode
             
             # Extract raw logs
             # Limit to last 2000 chars to save tokens
             raw_logs = "\n".join(context)[-2000:]
             
             system_prompt = "You are a Technical Logger. Summarize the COMPLETED TASK into one concise sentence focusing on the technical outcome (e.g., 'Created POST /api/v1/users endpoint with validation'). Do not mention 'failed attempts' unless relevant to the final solution."
             user_prompt = f"Task: {task['description']}\nExecution Log:\n{raw_logs}"
             
             res = copilot.ask(system_prompt, user_prompt)
             if hasattr(res, 'content'):
                 return f"Task '{task['description']}': {res.content.strip()}"
             return f"Task '{task['description']}' Completed."
             
        except Exception as e:
            return f"Task '{task['description']}' Completed (Summary failed: {e})."

    def _sync_persistence(self, startup_id, mission_id, implementation_plan="", mission_context=[], tasks=[], status=None):
        """Updates missions.json: Marks mission_id as completed and saves plan/context/tasks."""
        try:
             save_path = "artifacts/missions.json"
             # 1. Read
             res = self.docker_manager.read_file(startup_id, save_path)
             if res.get("error"):
                 logger.error(f"Persistence Sync Failed: Could not read {save_path}")
                 return
                 
             data = json.loads(res["content"])
             missions = data.get("missions", [])
             
             # 2. Update
             updated = False
             for m in missions:
                 if m["id"] == mission_id:
                     if status:
                         m["status"] = status
                     
                     m["implementation_plan"] = implementation_plan
                     m["mission_context"] = mission_context
                     m["tasks"] = tasks
                     updated = True
                     break
            
             if updated:
                 # 3. Write
                 self.docker_manager.write_file(startup_id, save_path, json.dumps(data, indent=2))
                 logger.info(f"Persistence: Synced Mission {mission_id} (Status={status}).")
             else:
                 logger.warning(f"Persistence: Mission {mission_id} not found in file.")
                 
        except Exception as e:
            logger.error(f"Failed to sync persistence: {e}")

    def _log_to_file(self, message):
        """Append debug log to a local file for inspection."""
        try:
            with open("/home/ubuntu/app_factory/agent_debug.log", "a") as f:
                import datetime
                timestamp = datetime.datetime.now().isoformat()
                f.write(f"[{timestamp}] {message}\\n")
        except Exception:
            pass

