import logging
import json
from ..agents.core import V3CoPilot

logger = logging.getLogger(__name__)

class V3Planner:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=True, log_callback=log_callback)

    def plan_node(self, state):
        """
        The Planner Node for LangGraph.
        Analyzes the mission and updates the plan.
        """
        # 1. Get Active Mission
        missions = state.get("missions", [])
        current_mission_id = state.get("current_mission_id")
        
        active_mission = next((m for m in missions if m["id"] == current_mission_id), None)
        
        if not active_mission:
             return {"logs": ["Planner Error: No active mission found."]}
             
        mission_title = active_mission["title"]
        mission_desc = active_mission["description"]
        tech_stack = state.get("tech_stack", "General")
        
        logger.info(f"--- V3 Planner: Analyzing '{mission_title}' ---")
        
        system_prompt = """You are the Lead Architect & Planner for a Code Studio.
        Your goal is to break down the Active Mission into atomic, executable coding tasks.
        
        TECH STACK: {tech_stack}
        
        CRITICAL:
        1. Sequential Logic: Build dependencies correctly.
        2. Granularity: Each task must be a single file write or a focused command.
        3. DETAIL: The 'description' and 'content_sketch' must be VERY detailed.
        
        OUTPUT FORMAT (JSON):
        {
            "thoughts": ["analyzing...", "deciding..."],
            "plan": [
                {
                    "id": 1,
                    "description": "Initialize Node.js project",
                    "action": "command", 
                    "command": "npm init -y"
                }
            ]
        }
        """
        
        user_prompt = f"Active Mission: {mission_title}\nDescription: {mission_desc}\nStatus: {state.get('status')}"
        
        codebase_analysis = state.get("codebase_analysis")
        if codebase_analysis:
             user_prompt += f"\n\nCODEBASE CONTEXT (File Tree & Config):\n{codebase_analysis}\n\nINSTRUCTION: Use existing files where possible. Do not create duplicates."
        
        # 2. Sequential Thinking & Planning (One-Shot)
        result = self.copilot.think_and_plan(system_prompt.replace("{tech_stack}", tech_stack), user_prompt, active_node="planner")
        
        if result["error"]:
            logger.error(f"Planner Error: {result['error']}")
            return {"status": "failed", "logs": [f"Planner Failed: {result['error']}"]}
            
        try:
            content = json.loads(result["content"])
            new_plan_steps = content.get("plan", [])
            thoughts = content.get("thoughts", [])
            
            # Enrich tasks with mission_id
            for step in new_plan_steps:
                step["mission_id"] = current_mission_id
                step["completed"] = False
            
            # Append to master plan
            # We assume 'plan' in state is the MASTER list of all tasks from all missions
            master_plan = state.get("plan", [])
            master_plan.extend(new_plan_steps)
            
            # Update Mission status to 'in_progress' (reflected in state by orchestrator?)
            # Actually, we should update the specific mission's status in the list.
            for m in missions:
                if m["id"] == current_mission_id:
                     m["status"] = "in_progress"
            
            return {
                "plan": master_plan,
                "missions": missions, # Update status
                "thoughts": thoughts,
                "status": "coding", # Proceed to execution
                "logs": [f"Planner: Designed {len(new_plan_steps)} tasks for '{mission_title}'."]
            }
        except Exception as e:
            return {"status": "failed", "logs": [f"Plan Parsing Error: {e}"]}
