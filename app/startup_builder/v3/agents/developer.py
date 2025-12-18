import logging
import json
from ..agents.core import V3CoPilot
from ...manager import DockerManager

logger = logging.getLogger(__name__)

class V3Developer:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=False, log_callback=log_callback) # Execution mode = fast
        self.docker_manager = DockerManager() # Reuse V2 Infrastructure

    def developer_node(self, state):
        """
        The Developer Node for LangGraph.
        Executes the current task in the plan.
        """
        current_plan = state.get("plan", [])
        startup_id = state.get("startup_id")
        
        # 1. Find the next pending task
        # Simplified: We assume Orchestrator sets 'current_task' or we find the first non-done.
        # Let's iterate.
        next_task = None
        for task in current_plan:
            if not task.get("completed"):
                next_task = task
                break
        
        if not next_task:
            return {"status": "verification", "logs": ["All tasks implemented."]}
            
        logger.info(f"--- V3 Developer: Working on '{next_task['description']}' ---")
        
        # 2. Generate Execution Steps
        # We ask the CoPilot to write the code.
        
        system_prompt = """You are a Senior Full-Stack Developer (Expert Level).
        Your job is to EXECUTE the given task with PRODUCTION-QUALITY code.
        
        CRITICAL RULES:
        1. NO PLACEHOLDERS. Do NOT write comments like "<!-- form fields -->". Write the ACTUAL code.
        2. COMPLETE IMPLEMENTATION. If creating a login page, write the full HTML/CSS/JS.
        3. MODERN & PREMIUM. Use clean, modern styling (e.g., flexbox, gradients, rounded corners).
        4. ROBUST. Handle edge cases where obvious. 
        
        OUTPUT FORMAT (JSON):
        {
            "action": "write_file", // or "command"
            "file": "path/to/file",
            "content": "Full, complete file content...",
            "command": "shell command if action is command"
        }
        """
        
        user_prompt = f"Task: {next_task['description']}\nDetails: {next_task.get('content_sketch', '')}"
        
        result = self.copilot.think_and_plan(system_prompt, user_prompt, active_node="developer") # Reuse thought wrapper for JSON
        
        logs = []
        if result["error"]:
            logs.append(f"Developer Error: {result['error']}")
            # Mark failed? Or retry?
            return {"status": "failed", "logs": logs}
            
        try:
            execution_step = json.loads(result["content"])
            action = execution_step.get("action")
            
            if action == "write_file":
                file_path = execution_step["file"]
                content = execution_step["content"]
                self.docker_manager.write_file(startup_id, file_path, content)
                logs.append(f"Developer: Wrote {file_path}")
                
            elif action == "command":
                cmd = execution_step["command"]
                out = self.docker_manager.run_command(startup_id, cmd)
                logs.append(f"Developer: Ran '{cmd}'. Exit: {out.get('exit_code')}")
                
            # Mark task as done in the plan (Local update, Orchestrator will save)
            next_task["completed"] = True
            
            # Loop back to see if more tasks exist?
            # Or return to Orchestrator to save state?
            # Let's return to Orchestrator to checkpoint.
            
            return {
                "plan": current_plan, # Updated with completed=True
                "status": "coding", # Continue coding loop logic
                "logs": logs
            }
            
        except Exception as e:
            return {"status": "failed", "logs": [f"Execution Error: {e}"]}
