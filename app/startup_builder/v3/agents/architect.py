import logging
import json
from ..agents.core import V3CoPilot
from ...manager import DockerManager
from ...context import ContextManager
from ..tools import V3Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

logger = logging.getLogger(__name__)

class V3Architect:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=True, log_callback=log_callback)
        self.docker_manager = DockerManager()
        self.context_manager = None # Initialized in node
        
    def architect_node(self, state):
        """
        Architect Node: Explores codebase AND generates the plan.
        Replaces Analyzer and Planner.
        """
        startup_id = state.get("startup_id")
        current_mission = state.get("current_mission")
        tech_stack = state.get("tech_stack", "General")
        
        if not current_mission:
             return {"status": "failed", "logs": ["Architect Error: No active mission."]}
             
        mission_title = current_mission["title"]
        mission_desc = current_mission["description"]
        
        logger.info(f"--- V3 Architect: Exploring & Planning for '{mission_title}' ---")
        
        if "mission_context" not in current_mission:
             current_mission["mission_context"] = [] # List of summaries
             
        global_context = state.get("global_context", "No history yet.")
        failed_task = state.get("failed_task")

        # 1. Setup Tools (Read/List/Search)
        tools_factory = V3Tools(self.docker_manager, startup_id)
        # We want exploration tools. 
        # Ideally V3Tools gives us 'read_file', 'list_files', 'run_command' (formatted as tools)
        tools = tools_factory.get_tool_list() 
        # Note: writing files is generally NOT for the Architect, but 'act' might have access.
        # We can instruct it strictly NOT to write code, only explore.
        
        # 2. System Prompt
        system_prompt = """You are the Lead Architect for a Code Studio.
        
        MODE: {mode}
        
        Your goal is to:
        1. EXPLORE the codebase to understand the current state (files, existing code, dependencies).
        2. {goal_instruction}
        
        You have access to tools to read and list files. USE THEM.
        Do NOT guess. Verify the file structure and contents before planning.
        
        TECH STACK: {tech_stack}
        
        GLOBAL PROJECT CONTEXT (HISTORY):
        {global_context}
        
        MISSION CONTEXT (PROGRESS):
        {mission_context}
        
        FAILED TASK (CRITICAL CONTEXT):
        {failed_task_context}
        
        Phase 1: EXPLORATION / DIAGNOSIS
        - List files to see structure.
        - Read key files to understand logic.
        - {diagnosis_instruction}
        
        Phase 2: PLANNING / RECOVERY
        - Output the FINAL PLAN in JSON format.
        - **VERIFICATION PHASE REQUIRED**: 
            - You MUST include a final phase of tasks dedicated to verification.
            - If this is a web app, you MUST plan to START the server (using `restart_server` tool) so the user can preview it.
            - Then add a task to "Verify endpoint" or "Run test".
        
        OUTPUT FORMAT (Last Message):
        {
            "thoughts": ["analyzed x", "decided y"],
            "implementation_plan": "# Goal\\n...\\n## Proposed Changes\\n...\\n## Verification Plan\\n...",
            "tasks": [
                {
                    "description": "MODIFY: app/startup_builder/v3/agents/architect.py",
                    "action": "write_file", 
                    "logic": "After generating final_tasks, persist them to missions.json.
                            Update current_mission["tasks"] = final_tasks.
                            Call a helper to write to file (or use docker_manager directly).",
                },
                ...
                {
                    "description": "VERIFICATION: Run test script",
                    "action": "command",
                    "logic": "Executes the newly created test to verify functionality",
                    "command": "npm test"
                }
            ]
        }
        
        Constraint: Do NOT return the JSON plan until you have verified the context.
        The `implementation_plan` should be a markdown string detailing the Goal, Proposed Changes (grouped by component), and Verification Plan.
        The `tasks` list should be the executable steps derived from that plan.
        """
        
        mode = "PLANNING"
        goal_instruction = "CREATE a comprehensive technical design and atomic coding plan."
        diagnosis_instruction = "Search for keywords related to the mission."
        failed_task_context = "None."
        
        if failed_task:
            mode = "RECOVERY / FIXING"
            failed_desc = failed_task['description'].lower()
            is_verification = any(kw in failed_desc for kw in ["verify", "test", "check", "validate"])
            
            if is_verification:
                goal_instruction = "DIAGNOSE the Logical Failure (Gap between Intent and Reality). Create a Fix Plan that corrects the code AND re-verifies."
                diagnosis_instruction = "Compare Expected vs Actual. Identify the Logic Flaw. List specific Issues."
                constraint_instruction = "CONSTRAINT: Your plan MUST end with a task to RE-RUN the verification."
            else:
                goal_instruction = "DIAGNOSE the Runtime Failure and CREATE a Recovery Plan."
                diagnosis_instruction = "READ LOGS and CODE to find the crash/error source."
                constraint_instruction = "CONSTRAINT: Ensure the fix addresses the specific error."

            failed_task_context = json.dumps(failed_task, indent=2)
            logger.info(f"--- Architect: Entering Recovery Mode (Verification={is_verification}) for Task {failed_task.get('description')} ---")
        
        system_prompt = system_prompt.replace("{mode}", mode).replace("{goal_instruction}", goal_instruction).replace("{diagnosis_instruction}", diagnosis_instruction).replace("{failed_task_context}", failed_task_context)
        
        if failed_task:
             system_prompt += f"\n\n{constraint_instruction}"
        
        user_prompt = f"Mission: {mission_title}\nDescription: {mission_desc}\n\nStart your exploration."
        if failed_task:
             user_prompt = f"Mission: {mission_title}\n\nCRITICAL: The task '{failed_task['description']}' FAILED. Please diagnose and fix it."
        
        messages = [HumanMessage(content=user_prompt)]
        
        # 3. Agent Loop
        final_tasks = []
        final_thoughts = []
        final_impl_plan = ""
        
        thinking_token_usage = 0
        THINKING_BUDGET = 2000 # Approx tokens (~8000 chars) allowed before warning
        
        for i in range(20): # Max 20 turns of exploration
            res = self.copilot.act(system_prompt.replace("{tech_stack}", tech_stack).replace("{global_context}", global_context).replace("{mission_context}", json.dumps(current_mission.get("mission_context", []), indent=2)), messages, tools, active_node="architect")
            
            if res["error"]:
                 return {"status": "failed", "logs": [f"Architect Error: {res['error']}"]}
            
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            if ai_msg.tool_calls:
                # 0. Log the thought process if any
                if ai_msg.content:
                    self.copilot.emit_thought(ai_msg.content, "architect")

                # RESET Budget on Tool Call
                thinking_token_usage = 0
                
                # Execute Tools (Exploration)
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]
                    
                    self.copilot.emit_thought(f"Checking {tool_name}...", "architect")
                    
                    selected_tool = next((t for t in tools if t.name == tool_name), None)
                    tool_result = "Tool not found"
                    if selected_tool:
                        try:
                            tool_result = selected_tool.invoke(args)
                        except Exception as e:
                            tool_result = f"Error: {e}"
                            
                    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))
            else:
                # Track Budget
                content_text = ai_msg.content
                if content_text:
                     # Log content for debugging
                     logger.info(f"Architect Thoughts: {content_text[:200]}...")
                     # Approx token count
                     thinking_token_usage += len(content_text) // 4
                     
                # Check Budget
                if thinking_token_usage > THINKING_BUDGET:
                    messages.append(HumanMessage(content="SYSTEM WARNING: You have exceeded the Thinking Budget without taking action. You MUST call a tool (like 'list_files') or output the Final JSON Plan immediately."))
                    thinking_token_usage = 0 # Reset to give a chance to react, or keep high to warn again? 
                    # Resetting allows it to process the warning. If it ignores, it builds up again.
                
                # Final Answer? Check if it's JSON

                try:
                    # Clean markdown
                    cleaned = content_text.replace("```json", "").replace("```", "").strip()
                    data = json.loads(cleaned)
                    
                    # Accept 'tasks' or 'plan' for robustness
                    extracted_tasks = data.get("tasks") or data.get("plan")
                    
                    if extracted_tasks:
                        final_tasks = extracted_tasks
                        final_thoughts = data.get("thoughts", [])
                        final_impl_plan = data.get("implementation_plan", "")
                        break # Success!
                except:
                    pass
            
            # Injection: Force completion if running out of turns
            if i == 18:
                 messages.append(HumanMessage(content="SYSTEM WARNING: You are running out of turns. You MUST output the Final JSON Plan immediately."))
                 
        if not final_tasks:
             # Fallback or Error
             return {"status": "failed", "logs": ["Architect failed to produce a valid JSON plan after exploration."]}
             
        # 4. Success -> Update State
        # Enrich tasks
        for step in final_tasks:
            step["mission_id"] = current_mission["id"]
            step["completed"] = False
            
        master_plan = state.get("plan", [])
        
        if failed_task:
            # Recovery Mode: Insert tasks AFTER the failed task to ensure immediate execution
            # Find failed task index
            insert_idx = len(master_plan) # Default append
            for i, t in enumerate(master_plan):
                if t["id"] == failed_task["id"]:
                    insert_idx = i + 1
                    break
            
            # Insert the new tasks
            master_plan[insert_idx:insert_idx] = final_tasks
            # Also reset failed_task in state? 
            # Ideally the router or developer clears it next time? 
            # Or we return it as None in the update dict?
            # LangGraph updates are merges. To clear, we might need to set it to None explicitly if defined in state?
            # We'll rely on the fact that next time Developer runs, status="coding".
            # Architect Node doesn't clear "failed_task" from State directly unless we return `failed_task: None`.
            # Let's try to return `failed_task: None`.
            
        else:
            # Normal Planning: Append
            master_plan.extend(final_tasks)

        
        current_mission["status"] = "in_progress"
        current_mission["implementation_plan"] = final_impl_plan
        # Maintain tasks in memory state as well
        current_mission["tasks"] = final_tasks 
        
        # --- PERSISTENCE: Save initial tasks to file ---
        self._save_mission_tasks(startup_id, current_mission["id"], final_tasks)
        
        return {
            "plan": master_plan,
            "current_mission": current_mission,
            "status": "coding",
            "logs": [f"Architect: Designed {len(final_tasks)} tasks for '{mission_title}'."],
            "failed_task": None # Clear failure context so we don't loop in recovery mode
        }

    def _save_mission_tasks(self, startup_id, mission_id, tasks):
        """Updates missions.json with the generated tasks list."""
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
                     m["tasks"] = tasks # Save the list of tasks
                     updated = True
                     break
            
             if updated:
                 # 3. Write
                 self.docker_manager.write_file(startup_id, save_path, json.dumps(data, indent=2))
                 logger.info(f"Architect Persistence: Saved {len(tasks)} tasks for Mission {mission_id}.")
             else:
                 logger.warning(f"Architect Persistence: Mission {mission_id} not found.")
                 
        except Exception as e:
            logger.error(f"Architect Failed to save tasks: {e}")
