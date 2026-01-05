import logging
import json
import uuid
import os
from ..agents.core import V3CoPilot
from ...manager import DockerManager
from ...context import ContextManager
from ...v3.context.librarian import Librarian
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

        # --- CONTEXT MANAGER (V3) ---
        self.context_manager = ContextManager(self.docker_manager, startup_id)
        
        # 1. Project Rules (Memory)
        project_rules = self.context_manager.get_global_context()
        
        # 2. Key File Summaries (Purpose Index)
        summaries = self.context_manager.get_file_summaries()
        # Filter to top 50 relevant? Or just dump all (usually < 20 files in MVP)
        # Let's limit to ensuring we don't blow context.
        summary_text = "\n".join([f"- {k}: {v}" for k,v in summaries.items() if v])
             
        # 3. Mission History (State)
        history_str = "Project Just Started."
        missions = state.get("missions", [])
        completed_missions = [m for m in missions if m.get("status") == "completed"]
        
        if completed_missions:
             history = []
             for m in completed_missions:
                 history.append(f"Mission {m['id']} '{m['title']}': Completed.")
                 if m.get("mission_context"):
                      summary = "; ".join(m["mission_context"][-3:])
                      history.append(f"  - Summary: {summary}")
             history_str = "\n".join(history)
        
        # Merge All
        global_context = f"{project_rules}\n\nMission History:\n{history_str}"
        # Merge All
        global_context = f"{project_rules}\n\nMission History:\n{history_str}"
        failed_task = state.get("failed_task")
        
        # --- V3.1 SCRATCHPAD ---
        mission_scratchpad_list = state.get("mission_scratchpad", [])
        scratchpad_str = "No specific constraints."
        if mission_scratchpad_list:
             scratchpad_str = "\n".join([f"- {item}" for item in mission_scratchpad_list])

        # 1. Setup Tools (Read/List/Search)
        tools_factory = V3Tools(self.docker_manager, startup_id)
        # We want exploration tools. 
        # Ideally V3Tools gives us 'read_file', 'list_files', 'run_command' (formatted as tools)
        tools = tools_factory.get_tool_list() 
        # Note: writing files is generally NOT for the Architect, but 'act' might have access.
        # We can instruct it strictly NOT to write code, only explore.
        
        # --- LIBRARIAN INJECTION (V3) ---
        # Use the Librarian to get semantic context about the mission
        # We use the startup_id to target the correct isolated workspace
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        workspace_path = os.path.join(base_path, 'temp_workspaces', str(startup_id))
        
        lib = Librarian(workspace_path)
        lib.index_workspace() # Ensure fresh index
        semantic_context = lib.query(f"{mission_title} {mission_desc}")
        file_tree_raw = lib.get_file_tree()
        
        # Enhance File Tree with Purpose
        file_tree = f"{file_tree_raw}\n\n=== FILE PURPOSE INDEX ===\n{summary_text}"
        # --------------------------------
        
        # 2. System Prompt
        # 2. System Prompt
        system_prompt = """
# ROLE & IDENTITY
You are the Lead Architect. Your goal is to DESIGN a comprehensive technical plan to solve the given mission. 
You must EXPLORE the codebase first, then DESIGN the solution.

# MODE: {mode}

# CORE OPERATING RULES
1. **EXPLORE FIRST**: Do NOT guess file paths. Use `list_files` and `read_file` to verify the current state.
2. **VERIFY ALWAYS**: Your plan MUST include a final "Verification" phase.
3. **NO BLIND OVERWRITES**: Check if a file exists before planning to create it.
4. **PERSISTENT ERRORS**: If a task fails >2 times, you MUST plan to use `search_web` to diagnose (e.g., "npm build error X").
5. **CHECK VERSIONS**: Do NOT assume config syntax (e.g. Tailwind v3 vs v4). Check `package.json` or run `npm list <pkg>` first.
    - **TAILWIND WARNING**: If `tailwindcss@4` is installed, you MUST use `@import "tailwindcss";` in CSS and `@tailwindcss/postcss` in PostCSS. Do NOT use `@tailwind base` or the old `tailwindcss` plugin.

# PROJECT MEMORY & CONSTRAINTS (CRITICAL)
{mission_scratchpad}

# WORKFLOW STRATEGY
1. **DIAGNOSIS**: 
   - {diagnosis_instruction}
2. **DESIGN**:
   - Create a step-by-step implementation plan.
   - Group files by component.
3. **PLAN GENERATION**:
   - Output the Final JSON Plan.

# VERIFICATION STRATEGY (MANDATORY)
Every plan MUST end with a "Verification Phase".
- **Backend Tasks**: Plan to start the server (background) and use `run_shell` to `curl` the endpoint. Expect 200 OK.
- **Frontend Tasks**: Plan to use `run_ui_test`. Define the EXPECTED visual outcome (e.g. "Login Button should be visible").
- **Logic Tasks**: Write a small script (e.g. `verify_logic.py`) to assert the output.
- **Prohibition**: Do NOT create tasks like "Check if it works". You must specify HOW to check.

# MANDATORY STRATEGIES
## Rich Homepage & Navigation
- **CONTENT**: The Homepage (`/`) MUST be populated with real product content (Value Prop, Features, CTA) derived from `project_context.json`. NO "Welcome to Namespace" blank pages.
- **NAVIGATION**: You MUST plan a Global Navigation (e.g. `Navbar`) with links to all key pages (e.g. /login, /dashboard, /about).
- **COPY**: Use the `product_description` to write 3-4 sections of marketing copy.

## UI/UX Testing (If Frontend Involved)
- You MUST plan for **Automated UI Testing** using Playwright.
- Task 1: Setup Infrastructure (if missing).
    - `npm install -D @playwright/test`
    - `npx playwright install chromium`
    - **Create Config**: Create `playwright.config.ts` with `use: { screenshot: 'on' }` to ensure snapshots are captured.
- Task 2: Write Test Spec (`tests/<feature>.spec.ts`).
- Task 3: Run Test using `run_ui_test` tool.

## Launch & Preview (Strategy)
- **CONDITION**: Only generate `start_preview.sh` if this is the **LAST MISSION** (e.g., "Finalize", "Launch").
- **GOAL**: Ensure the **entire build is complete** before creating this script.
- **ACTION**: Generate `start_preview.sh` that kills ports 3000/8000 and starts the app deterministically.

# CONTEXT
## Global History
{global_context}

## Codebase Context (Semantic Search)
{semantic_context}

## File Structure
{file_tree}

## Mission Progress
{mission_context}

## Failure Context (If Recovery Mode)
# OUTPUT FORMAT (Last Message)
{
    "thoughts": ["analyzed x", "decided y"],
    "implementation_plan": "# Goal\\n...\\n## Proposed Changes\\n...\\n## Verification Plan\\n...",
    "tasks": [
        {
            "description": "MODIFY: app/startup_builder/v3/agents/architect.py",
            "action": "write_file", 
            "logic": "Detailed logic...",
            "command": "optional command"
        }
    ]
}

Constraint: Do NOT return the JSON plan until you have verified the context.
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
                constraint_instruction = "CONSTRAINT: Your plan MUST end with a task to RE-RUN the verification."
            else:
                goal_instruction = "DIAGNOSE the Runtime Failure and CREATE a Recovery Plan."
                diagnosis_instruction = "READ LOGS and CODE to find the crash/error source. If the error is obscure or version-related (like 'command not found' or argument errors), use `search_web` to find the correct usage."
                constraint_instruction = "CONSTRAINT: Ensure the fix addresses the specific error. Use Search if unsure."

            failed_task_context = json.dumps(failed_task, indent=2)
            
            # Extract Execution History for clearer context
            execution_history = "No history available."
            if "task_context" in failed_task and failed_task["task_context"]:
                # Join the list of log strings
                execution_history = "\n".join(failed_task["task_context"])
            
            logger.info(f"--- Architect: Entering Recovery Mode (Verification={is_verification}) for Task {failed_task.get('description')} ---")
        
        system_prompt = system_prompt.replace("{mode}", mode).replace("{goal_instruction}", goal_instruction).replace("{diagnosis_instruction}", diagnosis_instruction).replace("{failed_task_context}", failed_task_context)
        system_prompt = system_prompt.replace("{semantic_context}", semantic_context).replace("{file_tree}", file_tree)
        
        if failed_task:
             system_prompt += f"\n\n{constraint_instruction}"
             
             # STRATEGY TRACKING (V3)
             failed_strats = failed_task.get("failed_strategies", [])
             if failed_strats:
                 strat_list = "\n- ".join(failed_strats)
                 system_prompt += f"\n\nFAILED STRATEGIES (FORBIDDEN):\nThe following approaches have ALREADY FAILED. Do NOT use them:\n- {strat_list}"
             
             system_prompt += f"\n\nPREVIOUS ATTEMPTS (LOGS):\n{execution_history}\n\nCRITICAL: Analyze the above. Innovate."
        
        user_prompt = f"Mission: {mission_title}\nDescription: {mission_desc}\n\nStart your exploration."
        if failed_task:
             user_prompt = f"Mission: {mission_title}\n\nCRITICAL: The task '{failed_task['description']}' FAILED. Please diagnose and fix it."
        
        # 3. Agent Loop with Retry Strategy
        final_tasks = []
        final_thoughts = []
        final_impl_plan = ""
        
        MAX_RETRIES = 3
        
        for attempt in range(MAX_RETRIES):
            logger.info(f"Architect Planning Attempt {attempt + 1}/{MAX_RETRIES}")
            
            # Reset Conversation for each attempt
            messages = [HumanMessage(content=user_prompt)]
            if attempt > 0:
                 messages = [HumanMessage(content=user_prompt + f"\n\nSYSTEM NOTE: Previous attempt failed to output JSON. Please Focus on Plan Generation.")]
            
            thinking_token_usage = 0
            THINKING_BUDGET = 2000 
            
            attempt_success = False
            
            # Prepare System Prompt
            full_system_prompt = system_prompt.replace("{tech_stack}", tech_stack).replace("{global_context}", global_context).replace("{mission_context}", json.dumps(current_mission.get("mission_context", []), indent=2)).replace("{mission_scratchpad}", scratchpad_str)

            for i in range(20): # Max 20 turns of exploration per attempt
                # --- V3 CONTEXT VISIBILITY ---
                # context_debug = f"""
                # --- ARCHITECT CONTEXT ---
                # [SYSTEM PROMPT]
                # {full_system_prompt}
                # 
                # [USER PROMPT]
                # {user_prompt}
                # 
                # [MESSAGES (History)]
                # {json.dumps([m.content for m in messages if hasattr(m, 'content')], indent=2)}
                # -------------------------
                # """
                # self.copilot.emit_thought(context_debug, node="architect")

                res = self.copilot.act(full_system_prompt, messages, tools, active_node="architect")
                
                if res["error"]:
                     # If error, just log and break inner loop to trigger retry
                     logger.warning(f"Architect LLM Error (Attempt {attempt+1}): {res['error']}")
                     break 
                
                ai_msg = res["content"]
                messages.append(ai_msg)
                
                if ai_msg.tool_calls:
                    # 0. Log the thought process
                    if ai_msg.content:
                        self.copilot.emit_thought(ai_msg.content, "architect")
    
                    # RESET Budget on Tool Call
                    thinking_token_usage = 0
                    
                    # Execute Tools (Exploration)
                    for tool_call in ai_msg.tool_calls:
                        tool_name = tool_call["name"]
                        args = tool_call["args"]
                        tool_id = tool_call["id"]
                        
                        self.copilot.emit_thought(f"Checking {tool_name}... Args: {args}", "architect")
                        
                        selected_tool = next((t for t in tools if t.name == tool_name), None)
                        tool_result = "Tool not found"
                        if selected_tool:
                            try:
                                tool_result = selected_tool.invoke(args)
                                
                                # CENTRALIZED LOGGING
                                self._log_to_file(f"ARCHITECT EXECUTION: {tool_name}\nARGS: {args}")
                                log_res = str(tool_result)[:1000] + ("..." if len(str(tool_result)) > 1000 else "")
                                self._log_to_file(f"ARCHITECT RESULT: {log_res}")
                                
                            except Exception as e:
                                tool_result = f"Error: {e}"
                                self._log_to_file(f"ARCHITECT ERROR: {tool_name} -> {e}")
                                
                            # SNAPSHOT / VISION LOGIC
                                # 1. Try JSON Parsing
                                snapshots_found = []
                                text_output = str(tool_result)
                                try:
                                    if text_output.strip().startswith("{") and text_output.strip().endswith("}"):
                                        data = json.loads(text_output)
                                        if "snapshots" in data:
                                            snapshots_found = data["snapshots"]
                                            text_output = data.get("text_summary", str(data))
                                        elif "snapshot" in data:
                                            snapshots_found = [data["snapshot"]]
                                except: pass
                                
                                # 2. Regex Fallback
                                if not snapshots_found and "[SNAPSHOT]:" in text_output:
                                    try:
                                        snapshots_found = re.findall(r"\[SNAPSHOT\]: (.*)", text_output)
                                    except: pass
                                    
                                # 3. Inject Images & Trigger UI
                                if snapshots_found:
                                    self._log_to_file(f"ARCHITECT VISION: Found {len(snapshots_found)} snapshots.")
                                    for img_path in snapshots_found:
                                         # 1. Inject into history
                                         self._inject_image_to_history(messages, img_path.strip())
                                         
                                         # 2. Trigger UI Card
                                         self.copilot.emit_thought(f"[SNAPSHOT]: {img_path.strip()}", "architect")
                                         
                                # Use summary for the conversation history
                                tool_result = text_output
                                
                        messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))
                else:
                    # Track Budget
                    content_text = ai_msg.content
                    if content_text:
                         logger.info(f"Architect Thoughts: {content_text[:200]}...")
                         thinking_token_usage += len(content_text) // 4
                         
                    # Check Budget
                    if thinking_token_usage > THINKING_BUDGET:
                        messages.append(HumanMessage(content="SYSTEM WARNING: You have exceeded the Thinking Budget without taking action. You MUST call a tool (like 'list_files') or output the Final JSON Plan immediately."))
                        thinking_token_usage = 0 
                    
                    # Final Answer Check
                    try:
                        cleaned = content_text.replace("```json", "").replace("```", "").strip()
                        data = json.loads(cleaned)
                        
                        extracted_tasks = data.get("tasks") or data.get("plan")
                        
                        if extracted_tasks:
                            final_tasks = extracted_tasks
                            final_thoughts = data.get("thoughts", [])
                            final_impl_plan = data.get("implementation_plan", "")
                            attempt_success = True
                            break 
                    except:
                        pass
                
                # Injection: Force completion 
                if i == 18:
                     messages.append(HumanMessage(content="SYSTEM WARNING: You are running out of turns. You MUST output the Final JSON Plan immediately."))

            if attempt_success:
                break
                
        if not final_tasks:
             return {"status": "failed", "logs": [f"Architect failed to produce a valid JSON plan after {MAX_RETRIES} attempts."]}
             
        # 4. Success -> Update State
        # Enrich tasks
        for step in final_tasks:
            step["mission_id"] = current_mission["id"]
            step["completed"] = False
            step["id"] = str(uuid.uuid4()) # Assign unique ID
            
        master_plan = state.get("plan", [])
        
        if failed_task:
            # Recovery Mode: Replace the failed task with the recovery plan
            # Find failed task index
            failed_task_idx = -1
            for i, t in enumerate(master_plan):
                # Robust check for ID match
                if t.get("id") and t.get("id") == failed_task.get("id"):
                    failed_task_idx = i
                    break
            
            if failed_task_idx != -1:
                # REPLACE the failed task with the new tasks (Fix + Retry)
                # This prevents "Fix" -> "Retry" -> "Original Failed Task" (Duplicate) loops.
                master_plan[failed_task_idx:failed_task_idx+1] = final_tasks
            else:
                 # Fallback: Just append
                 master_plan.extend(final_tasks)
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
            "logs": [f"Architect: Designed {len(final_tasks)} tasks for '{mission_title}':"] + [f"- {t['description']}" for t in final_tasks],
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
                 self._log_to_file(f"ARCHITECT: Saved {len(tasks)} tasks for Mission {mission_id} to persistence.")
             else:
                 logger.warning(f"Architect Persistence: Mission {mission_id} not found.")
                 
        except Exception as e:
            logger.error(f"Architect Failed to save tasks: {e}")

    def _inject_image_to_history(self, messages, img_path: str):
        """
        Reads an image from the container, converts to base64, and appends a HumanMessage 
        to the history so the LLM can 'see' the UI.
        """
        try:
            # Check if context_manager is initialized
            if not self.context_manager:
                 logger.error("Cannot inject image: ContextManager not init")
                 return

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
        try:
            with open("/home/ubuntu/app_factory/agent_debug.log", "a") as f:
                import datetime
                f.write(f"[{datetime.datetime.now().isoformat()}] {message}\\n")
        except:
            pass
