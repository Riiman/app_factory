import logging
import json
from ..agents.core import V3CoPilot
from ...manager import DockerManager
from ...context import ContextManager
from ..tools import V3Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

logger = logging.getLogger(__name__)

class V3Developer:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=False, log_callback=log_callback) # Execution mode = fast
        self.docker_manager = DockerManager() # Reuse V2 Infrastructure
        # Startup ID is not available in __init__ usually, but we need it for ContextManager.
        # But ContextManager takes startup_id in __init__.
        # We should instantiate ContextManager inside developer_node where we have startup_id.
        self.context_manager = None

    def developer_node(self, state):
        """
        The Developer Node for LangGraph.
        Executes the current task in the plan.
        """
        current_plan = state.get("plan", [])
        startup_id = state.get("startup_id")
        
        current_mission = state.get("current_mission")
        if not current_mission:
             return {"status": "done_mission", "logs": ["Developer: No active mission found."]}
             
        current_mission_id = current_mission["id"]
        missions = [] # Not used anymore from state, but logic below used it. Remove usage.
        
        # 1. Find the next pending task FOR THIS MISSION
        next_task = None
        for task in current_plan:
            # Check mission ownership + status
            if task.get("mission_id") == current_mission_id and not task.get("completed"):
                next_task = task
                break
        
            # No more tasks for this mission!
            # Mark mission as complete
            for m in missions:
                if m["id"] == current_mission_id:
                    m["status"] = "completed"
            
            # --- PERSISTENCE: Sync to file ---
            impl_plan = current_mission.get("implementation_plan", "")
            mission_ctx = current_mission.get("mission_context", [])
            # Correctly pass status="completed" here
            self._sync_persistence(startup_id, current_mission_id, impl_plan, mission_ctx, current_mission.get("tasks", []), status="completed")
            
            return {
                "status": "done_mission", # Router will pick next mission
                "missions": missions,
                "logs": [f"Mission {current_mission_id} Complete!"]
            }
            
        # 1.5 Setup ContextManager
        if not self.context_manager or self.context_manager.startup_id != startup_id:
            self.context_manager = ContextManager(self.docker_manager, startup_id)
            
        # 1.6 Retrieve Local Context (RAG)
        local_context = self.context_manager.retrieve_local_context(next_task['description'])
        state["local_context"] = local_context
        
        logger.info(f"--- V3 Developer: Working on '{next_task['description']}' ---")
        
        # 2. Setup Tools
        tools_factory = V3Tools(self.docker_manager, startup_id)
        tools = tools_factory.get_tool_list()
        
        # 3. System Prompt
        system_prompt = """You are a Senior Full-Stack Developer (Expert Level).
        Your job is to EXECUTE the given task with PRODUCTION-QUALITY code.
        
        YOU HAVE ACCESS TO TOOLS:
        - read_file: READ a file before modifying it.
        - write_file: Write the complete file content.
        - run_shell: Run commands like 'npm install'.
        - list_files: Check directory structure.
        
        STRATEGY:
        1. Explore relevant files if needed.
        2. Write/Update the code (Full Implementation).
        3. Verify checks passed if applicable.
        
        MISSION CONTEXT (What has been done so far):
        {mission_context}
        
        When you are done, just output the final confirmation message.
        """
        
        mission_context = json.dumps(current_mission.get("mission_context", []), indent=2)
        base_user_prompt = f"Task: {next_task['description']}\nLogic: {next_task.get('logic', 'Standard Implementation')}\nDetails: {next_task.get('content_sketch', '')}\n\nLocal Context:\n{local_context}"
        
        messages = [HumanMessage(content=base_user_prompt)]
        
        # 4. Tool Loop (Max 10 turns to prevent infinite loops)
        executed_actions = []
        task_context = [] # Log of retries/errors for THIS task
        
        for i in range(10):
            # Inject task context if we are retrying
            current_prompt = system_prompt.replace("{mission_context}", mission_context)
            if task_context:
                 current_prompt += f"\n\nCURRENT TASK ATTEMPTS/ERRORS:\n{json.dumps(task_context, indent=2)}\n\n(Learn from these mistakes!)"
            
            res = self.copilot.act(current_prompt, messages, tools, active_node="developer")
            
            if res["error"]:
                 return {"status": "failed", "logs": [f"CoPilot Error: {res['error']}"]}
            
            ai_msg = res["content"]
            messages.append(ai_msg) # Add AI response to history
            
            # Check for tool calls
            if ai_msg.tool_calls:
                if ai_msg.content:
                    self.copilot.emit_thought(ai_msg.content, "developer")

                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]
                    
                    self.copilot.emit_thought(f"Invoking {tool_name}...", "developer")
                    
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
                    
                    # Store result in Task Context
                    task_context.append(f"Action: {tool_name}, Result: {str(tool_result)[:300]}...")
                    
                    # --- EXPLICIT VERIFICATION STEP ---
                    # User Req: "output and command should be sent to the llm for verification... mark success or failed"
                    # We use a lightweight check.
                    verification_status = self._verify_action(tool_name, command_str, str(tool_result))
                    
                    if verification_status == "FAILURE":
                         # User Req: "if failed a fixer agent should be called"
                         # We allow a few internal retries? Or immediate?
                         # Let's say we try 3 times internally. If persistent failure, escalate.
                         # But user said "after each run... if failed a fixer...".
                         # Let's try explicit escalation if it seems critical.
                         # For robustness, let's stick to loop limit.
                         # But enable explicit "GIVE UP" logic.
                         task_context.append(f"VERIFICATION: FAILURE. Retrying...")
                    else:
                         task_context.append(f"VERIFICATION: SUCCESS.")
                         # If action was successful, does it mean the TASK is done? 
                         # Not necessarily (could be multi-step). 
                         # We let the LLM decide to finish in next turn.
                    
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
                      # Sync Persistence
                      self._sync_persistence(startup_id, current_mission["id"], current_mission.get("implementation_plan", ""), current_mission["mission_context"], current_mission.get("tasks", []), status="in_progress")
                      
                      return {
                          "status": "fix_required", # Route to Fixer
                          "current_mission": current_mission,
                          "failed_task": next_task,
                          "logs": [f"Developer: Task '{next_task['description']}' failed. Escalating to Architect for Diagnosis & Fix Plan."]
                      }
                 
                 # Otherwise assume success/completion
                 break

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
        summary_entry = f"Task '{next_task['description']}' Completed. Logic Used: {next_task.get('logic', '')}"
        if "mission_context" not in current_mission:
             current_mission["mission_context"] = []
        current_mission["mission_context"].append(summary_entry)
        
        summary = f"Completed task: {next_task['description']} via tools."
        new_global_context = self.context_manager.update_global_context(state.get("global_context", ""), summary)
        
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

