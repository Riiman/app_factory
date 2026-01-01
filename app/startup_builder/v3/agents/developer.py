import logging
import json
import re
import base64
from typing import List, Dict, Any, Optional
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
        
        # Setup ContextManager (Ensuring it exists for all paths)
        if not self.context_manager or self.context_manager.startup_id != startup_id:
            from ...context import ContextManager
            self.context_manager = ContextManager(self.docker_manager, startup_id)
        
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
        
        # 1.1 ASYNC RESUME CHECK
        # If we were waiting for a job, check it NOW before asking LLM to do anything.
        waiting_on = state.get("waiting_on")
        
        if waiting_on:
             tools_factory_check = V3Tools(self.docker_manager, startup_id)
             check_tool = tools_factory_check.create_check_job()
             res_str = check_tool.invoke(waiting_on)
             try:
                 res = json.loads(res_str)
             except:
                 res = {"status": "error", "message": f"Invalid JSON from check_tool: {res_str}"}
             
             if res.get("status") == "running":
                  # DECISION POINT: Do not auto-yield. Let LLM decide.
                  logs = res.get("logs", "")[-2000:]
                  self.copilot.emit_thought(f"Async Job {waiting_on} still running. Deferring to LLM.", "developer")
                  
                  # Inject Context for Decision
                  resume_context = f"\n[SYSTEM ALERT]: Async Job {waiting_on} is STILL RUNNING.\nPartial Logs:\n{logs}\n\nACTION REQUIRED: Decide what to do:\n1. 'wait_for_job(job_id)': Continue waiting.\n2. 'stop_process(job_id)': Kill it.\n3. Proceed if logs indicate success."
                  
                  # Clear waiting_on so the loop proceeds to Prompt/Think phase
                  state["waiting_on"] = None
                  
                  if next_task:
                       if "task_context" not in next_task:
                            next_task["task_context"] = []
                       next_task["task_context"].append(resume_context)
                       
                  # Return nothing -> continues execution flow
             else:
                  # Finished!
                  self.copilot.emit_thought(f"Async Job {waiting_on} COMPLETED. Resuming task.", "developer")
                  resume_context = f"\n[SYSTEM]: Async Job {waiting_on} Completed.\nOutput:\n{res}\n(Do NOT run the command again. verify the output.)"
                  
                  # Inject result into the task context so LLM sees it
                  if next_task:
                       if "task_context" not in next_task:
                            next_task["task_context"] = []
                       next_task["task_context"].append(resume_context)
                       
                  # CLEAR waiting_on in the return dict (conceptually)
                  # Since we are proceeding, we just need to ensure we return `waiting_on: None` at the end or modify state.
                  # LangGraph merges updates. We need to explicitly clear it.
                  # We will add it to the final return.
                  state["waiting_on"] = None  # Helper for this run

        if not next_task:
            self._log_to_file(f"DEV CHECK: No pending tasks for Mission {current_mission_id}. Finishing.")
            # Mark mission as complete
            for m in missions:
                if str(m.get("id")) == str(current_mission_id):
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
            
        # 1.5 Setup ContextManager (Moved to top)
        # ensure local context is retrieved
             
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
        system_prompt = """
# ROLE & IDENTITY
You are a generic but expert Senior Full-Stack Developer. Your goal is to safe execute the given task with production-quality code, verify it, and ensure the startup's requirements are met entirely within this container.

# MODE: {mode}
# DIAGNOSIS INSTRUCTION: {diagnosis_instruction}

# CORE OPERATING RULES
1. **THINK FIRST**: Before ANY tool use, provide a brief (1 sentence) explanation of what you are doing and why.
2. **LAZY GUARD**: Do NOT just list files. You must take action (write code, run commands).
3. **NO PLACEHOLDERS**: Use real content from `/app/project_context.json`. No Lorem Ipsum.
4. **PERSISTENT ERRORS**: If an error occurs >2 times (e.g. build failing), USE `search_web`. Do not blindly retry.
5. **CHECK VERSIONS**: Verify package versions (e.g. `npm list`) before assuming configuration syntax (v3 vs v4).

# ENVIRONMENT & CONSTRAINTS
- **OS**: Linux (Headless Docker).
- **Forbidden**: `docker`, `docker-compose`, `systemctl`.
- **Ports**: 3000 (Web), 8000 (API), 5000 (Flask).
- **Blocking**: NEVER run blocking servers (e.g., `npm run dev`) with `run_shell`. Use `ensure_server_running`.

# TOOL USAGE STANDARDS
| Tool | Rule |
| :--- | :--- |
| `update_file` | USE for ALL file generation/editing. Atomic & Safe. |
| `run_shell` | For commands < 5s. If it creates a Job ID, you MUST stop and yield. |
| `ensure_server_running` | MANDATORY for starting servers. |
| `run_ui_test` | MANDATORY for UI tasks. Do NOT use manual `npx playwright`. |

# WORKFLOW STRATEGY
1. **EXPLORE**: Use `list_files(recursive=True)` to see the tree. Don't peck folder-by-folder.
2. **IMPLEMENT**: Write the complete code using `update_file`.
   - READ `theme.json` before writing CSS.
   - READ `project_context.json` for text content.
3. **VERIFY**: YOU MUST PROVE IT WORKS.
   - Node/React: `npm run build` or `npm run lint`.
   - Python: `python -m compileall` or `ast.parse`.
   - UI: `run_ui_test` (Capture Snapshots!).
     * **REQUIREMENT**: Ensure `playwright.config.ts` exists and has `screenshot: 'on'` before testing.

# RECOVERY & DEBUG
- **Tool Failure**: If a tool fails, FIX IT. Do NOT just run `list_files` and claim success.
- **Empty Results**: If `list_files` returns nothing, the directory is empty. STOP searching. CREATE the file.
- **Missing Auth**: If an API key is missing (e.g., OpenAI), DO NOT FAIL. Create a **Mock Script** to verify logic, then document the missing key.

# SNAPSHOT PROTOCOL (UI TASKS)
- **Capture**: Ensure tests save screenshots to `test-results/`.
- **Report**: You MUST output: `[SNAPSHOT]: /app/test-results/example-test/screenshot.png` in your logs.

# CONTEXT & HISTORY
## Mission Objective (Past Successful Steps)
{mission_context}

## Execution Logs (Recent Failures & Tool Outputs)
{task_context_str}

CRITICAL: If retrying based on these logs, ANALYZE WHY the previous attempt failed.
CHANGE YOUR APPROACH. Do not repeat failed commands.
"""
        
        global_context = state.get("global_context", "No global history yet.")
        mission_context = json.dumps(current_mission.get("mission_context", []), indent=2)
        base_user_prompt = f"Task: {next_task['description']}\nLogic: {next_task.get('logic', 'Standard Implementation')}\nDetails: {next_task.get('content_sketch', '')}\n\nGlobal Context (Project History):\n{global_context}\n\nLocal Context:\n{local_context}"
        
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
        
        # TURN LOGIC: We distinguish between "Context Gathering" (Free) and "Actions" (Costly)
        turn_count = 0      # Counts expensive actions (write, run, etc)
        total_steps = 0     # Hard limit to prevent infinite loops even with free actions
        MAX_TURNS = 10
        MAX_TOTAL_STEPS = 25
        
        while turn_count < MAX_TURNS and total_steps < MAX_TOTAL_STEPS:
            total_steps += 1
            # Inject task context if we are retrying
            # We construct the prompt dynamically
            task_context_str = json.dumps(task_context, indent=2) if task_context else "No actions yet."
            
            # DYNAMIC DIAGNOSIS LOGIC
            mode = "IMPLEMENTATION"
            diagnosis_instruction = "Follow the plan. Write clean code."
            
            if task_context: # If retries (context exists)
                mode = "DEBUGGING / FIXING"
                diagnosis_instruction = "CRITICAL: You are in DEBUG MODE. Read the logs below. Fix ONLY the Specific Error. Do NOT Rewrite the whole file."
            
            current_prompt = system_prompt.replace("{mission_context}", mission_context).replace("{task_context_str}", task_context_str).replace("{mode}", mode).replace("{diagnosis_instruction}", diagnosis_instruction)
            
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
                    
                    # LOGIC: Check if tool is "Free" (Context) or "Expensive" (Action)
                    SAFE_TOOLS = ["read_file", "list_files", "find_file", "search_files", "search_web", "check_job", "wait_for_job"]
                    if tool_name not in SAFE_TOOLS:
                        turn_count += 1
                    
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
                            
                            # CENTRALIZED LOGGING
                            self._log_to_file(f"TOOL EXECUTION: {tool_name}\nARGS: {command_str}")
                            # Log first 500 chars of result to avoid massive log files from 'list_files'
                            log_res = str(tool_result)[:1000] + ("..." if len(str(tool_result)) > 1000 else "")
                            self._log_to_file(f"TOOL RESULT: {log_res}")
                            
                        except Exception as e:
                            tool_result = f"Tool Execution Error: {str(e)}"
                            self._log_to_file(f"TOOL ERROR: {tool_name} -> {str(e)}")
                    
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
                                     latest_output = res_json.get("latest_output", "")
                                     
                                     public_log = f"Task moved to background (Job {job_id}). Yielding..."
                                     if latest_output:
                                          public_log += f"\n[PARTIAL OUTPUT]:\n{latest_output}"
                                          
                                          # Explicitly add to task context for next resume
                                          if next_task:
                                               if "task_context" not in next_task:
                                                    next_task["task_context"] = []
                                               next_task["task_context"].append(f"[SYSTEM]: Partial Output for Job {job_id}:\n{latest_output}")

                                     self.copilot.emit_thought(public_log, "developer")
                                     
                                     # PERSIST NOW to save the modified task context
                                     self._sync_persistence(
                                         startup_id,
                                         current_mission["id"],
                                         current_mission.get("implementation_plan", ""),
                                         current_mission.get("mission_context", []),
                                         current_mission["tasks"], # This includes the modified next_task
                                         status="in_progress",
                                         waiting_on=job_id # Save Background Job ID
                                      )
                                     
                                     # Return 'blocked' status
                                     return {
                                         "status": "blocked",
                                         "waiting_on": job_id, # Persist ID to state
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
                    
                    # --- MULTIMODAL INJECTION ---
                    # Check for [SNAPSHOT]: /path/to/image.png
                    if "[SNAPSHOT]:" in str(tool_result):
                        try:
                            match = re.search(r"\[SNAPSHOT\]: (.*)", str(tool_result))
                            if match:
                                img_path = match.group(1).strip()
                                self._inject_image_to_history(messages, img_path)
                        except Exception as e:
                            logger.error(f"Failed to inject snapshot: {e}")
                            
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
                 
                 # 0. Active Failure Guard (New): Did the last action fail?
                 if consecutive_failures > 0:
                      logger.warning(f"Failure Guard Triggered. Consecutive Failures: {consecutive_failures}")
                      rejection_msg = f"SYSTEM ERROR: The last command FAILED. You cannot claim completion in a failure state. Fix the error or try a different approach."
                      messages.append(HumanMessage(content=rejection_msg))
                      task_context.append("System: Rejected completion due to active failure state.")
                      continue

                 # 1. Lazy Check: Did we do ANYTHING?
                 if not executed_actions and not injected_result:
                      logger.warning(f"Lazy Guard Triggered: No actions executed.")
                      rejection_msg = "SYSTEM ERROR: You claimed completion but executed NO tools. You must execute the required action."
                      messages.append(HumanMessage(content=rejection_msg))
                      task_context.append("System: Rejected empty completion.")
                      continue # Retry
                 
                 # 2. STRICT VERIFICATION CHECK
                 desc_lower = next_task['description'].lower()
                 is_test_task = any(k in desc_lower for k in ["test", "verify", "validation"])
                 
                 if is_test_task and not injected_result:
                      # Must have run a verification tool
                      has_verified = any("run_ui_test" in act or "run_shell" in act or "ensure_server" in act for act in executed_actions)
                      if not has_verified:
                           rejection_msg = "SYSTEM ERROR: This is a VERIFICATION task. You MUST run a test command (run_ui_test or run_shell with npm test). Finding/Reading files is NOT enough."
                           messages.append(HumanMessage(content=rejection_msg))
                           task_context.append("System: Rejected completion. Verification tool missing.")
                           continue
                 
                 # Otherwise assume success/completion
                 
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
                 "logs": [f"Developer: Task '{next_task['description']}' failed after {turn_count} turns ({total_steps} steps). Escalating to Strategist."] 
             }

        # Mark task as done
        next_task["completed"] = True
        next_task["status"] = "completed" # Explicitly set status for UI tracking
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
            status="in_progress",
            waiting_on=None # Clear on task completion
        )
            
        return {
            "plan": current_plan,
            "current_mission": current_mission, # Return updated mission with context
            "status": "coding",
            "logs": [f"Developer Loop: Completed {next_task['description']}"],
            "local_context": local_context,
            "global_context": new_global_context,
            "waiting_on": None # Clear any waiting process
        }

    def _verify_action(self, action: str, command: str, output: str) -> str:
        """
        Uses LLM to smartly verify if the action succeeded.
        """
        # 1. HARD GUARDS (Fast Fail/Pass)
        if "COMMAND FAILED (Exit Code" in output:
             return "FAILURE"
        if "already running" in output.lower():
             return "SUCCESS"

        # 2. OPTIMIZATION: SKIP SAFTEY TOOLS (Save Tokens)
        # These tools have reliable deterministic outputs or are read-only.
        SAFE_TOOLS = ["read_file", "list_files", "find_file", "search_files", "check_job", "wait_for_job", "search_web"]
        if action in SAFE_TOOLS:
             # Simple Heuristic is enough
             if "Error:" in output or "Exception:" in output:
                  return "FAILURE"
             return "SUCCESS"

        # 3. LLM SEMANTIC CHECK
        try:
             # Fast check using thinking=False (Flash model usually)
             sys_prompt = "You are a verification engine. Analyze the command execution logs."
             user_prompt = f"""
             Analyze the execution of this Developer Tool.
             Action: {action}
             Command: {command}
             Output: {output[:1500]}
             
             Did this action SUCCEED or FAIL?
             Rules:
             - "Successfully started" -> SUCCESS
             - "Already running" -> SUCCESS
             - "SyntaxError" -> FAILURE
             - "command not found" -> FAILURE
             - "Exit code 1" -> FAILURE
             - "Warning" -> SUCCESS (ignore warnings)
             
             Return ONLY the word "SUCCESS" or "FAILURE". Do not add punctuation.
             """
             
             # Call Copilot (No tools)
             res = self.copilot.ask(sys_prompt, user_prompt)
             decision = res.content.strip().upper()
             
             # DEBUG LOGGING
             self._log_to_file(f"LLM VERIFY INPUT:\n{user_prompt}")
             self._log_to_file(f"LLM VERIFY OUTPUT: {decision}")
             
             if "FAILURE" in decision:
                  return "FAILURE"
             if "SUCCESS" in decision:
                  return "SUCCESS"
                  
        except Exception as e:
             logger.warning(f"LLM Verification Failed: {e}. Falling back to heuristic.")

        # ROBUST HEURISTIC (Fallback)
        lower_out = output.lower()
        if "error:" in lower_out or "exception:" in lower_out or "failed" in lower_out:
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

    def _sync_persistence(self, startup_id, mission_id, implementation_plan="", mission_context=[], tasks=[], status=None, waiting_on=None):
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
                 if str(m["id"]) == str(mission_id):
                     if status:
                         m["status"] = status
                     
                     if implementation_plan:
                         m["implementation_plan"] = implementation_plan
                     m["mission_context"] = mission_context
                     m["tasks"] = tasks
                     m["waiting_on"] = waiting_on # PERSIST ASYNC JOB ID
                     updated = True
                     break
            
             if updated:
                 # 3. Write
                 write_res = self.docker_manager.write_file(startup_id, save_path, json.dumps(data, indent=2))
                 if write_res.get("error"):
                      msg = f"Persistence WRITE FAILED for Mission {mission_id}: {write_res['error']}"
                      logger.error(msg)
                      # Write to local debug log for visibility
                      try:
                          with open("persistence_errors.jsonl", "a") as f:
                              f.write(json.dumps({"timestamp": datetime.datetime.now().isoformat(), "error": msg}) + "\n")
                      except: pass
                 else:
                     logger.info(f"Persistence: Synced Mission {mission_id} (Status={status}).")
             else:
                 logger.warning(f"Persistence: Mission {mission_id} not found in file.")
                 
        except Exception as e:
            logger.error(f"Failed to sync persistence: {e}")
            
        # 4. DEBUG: Log Context Snapshot for User
        try:
             import datetime
             snapshot = {
                 "timestamp": datetime.datetime.now().isoformat(),
                 "startup_id": startup_id,
                 "mission_id": mission_id,
                 "mission": mission,
                 "status": status,
                 "global_context": global_context,
                 "mission_context": mission_context if mission_context else "None",
                 "active_task": tasks[-1]["description"] if tasks else "None",
                 "active_task_context": tasks[-1].get("task_context", []) if tasks and tasks[-1].get("task_context") else [],
                 "waiting_on": waiting_on
             }
             # Append to JSONL file
             debug_file = "debug_contexts.jsonl"
             with open(debug_file, "a") as f:
                 f.write(json.dumps(snapshot) + "\n")
        except Exception as e:
             logging.error(f"Failed to log debug context: {e}")

    def _inject_image_to_history(self, messages: List[Any], img_path: str):
        """
        Reads an image from the container, converts to base64, and appends a HumanMessage 
        to the history so the LLM can 'see' the UI.
        """
        try:
            # Uses base64 inside container to get binary data safely as string
            cmd_res = self.docker_manager.run_command(self.context_manager.startup_id, f"base64 -w 0 {img_path}")
            
            if cmd_res.get("exit_code") == 0:
                 b64_data = cmd_res["output"].strip()
                 
                 # Create Multimodal Message
                 # We append a NEW HumanMessage to the history
                 from langchain_core.messages import HumanMessage
                 
                 img_msg = HumanMessage(content=[
                     {"type": "text", "text": f"[SYSTEM]: Here is the Snapshot captured at {img_path}. Analyze it for errors."},
                     {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_data}"}}
                 ])
                 
                 messages.append(img_msg)
                 self._log_to_file(f"MULTIMODAL: Injected image {img_path} ({len(b64_data)} bytes)")
            else:
                 logger.warning(f"Failed to base64 encode image for multimodal: {cmd_res.get('output')}")
                 
        except Exception as e:
            logger.error(f"Image Injection Error: {e}")

    def _log_to_file(self, message):
        """Append debug log to a local file for inspection."""
        try:
            with open("/home/ubuntu/app_factory/agent_debug.log", "a") as f:
                import datetime
                timestamp = datetime.datetime.now().isoformat()
                f.write(f"[{timestamp}] {message}\\n")
        except Exception:
            pass

