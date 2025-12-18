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
        mission = state.get("mission")
        current_plan = state.get("plan", [])
        
        logger.info(f"--- V3 Planner: Analyzing '{mission}' ---")
        
        # 1. Context Gathering (Inner Loop)
        # For V3 Speed, we assume the Orchestrator has populated basic context or we fetch it briefly.
        # Let's assume we have a clean slate or existing plan.
        
        system_prompt = """You are the Lead Architect & Planner for a Code Studio.
        Your goal is to break down the User's Mission into atomic, executable coding tasks.
        
        CRITICAL:
        1. Sequential Logic: Build dependencies correctly (e.g., install -> config -> app).
        2. Granularity: Each task must be a single file write or a focused command.
        3. DETAIL: The 'description' and 'content_sketch' must be VERY detailed.
           - Bad: "Create login page"
           - Good: "Create login.html with email/password inputs, a submit button, and a modern blue CSS card layout."
        
        OUTPUT FORMAT (JSON):
        {
            "thoughts": ["analyzing...", "deciding..."],
            "plan": [
                {
                    "id": 1,
                    "description": "Initialize Node.js project",
                    "action": "command", 
                    "command": "npm init -y"
                },
                {
                    "id": 2,
                    "description": "Create server.js",
                    "action": "write_file",
                    "file": "server.js",
                    "content_sketch": "Express server with /health endpoint"
                }
            ]
        }
        """
        
        user_prompt = f"Mission: {mission}\nCurrent Status: {state.get('status')}"
        
        # 2. Sequential Thinking & Planning (One-Shot)
        result = self.copilot.think_and_plan(system_prompt, user_prompt, active_node="planner")
        
        if result["error"]:
            logger.error(f"Planner Error: {result['error']}")
            return {"status": "failed", "logs": [f"Planner Failed: {result['error']}"]}
            
        try:
            content = json.loads(result["content"])
            new_plan = content.get("plan", [])
            thoughts = content.get("thoughts", [])
            
            # Update state
            # If we already have a plan, we might need to merge or replace.
            # V3 MVP: Replace/Append.
            
            return {
                "plan": new_plan,
                "thoughts": thoughts,
                "status": "coding", # Proceed to execution
                "logs": [f"Planner: Designed {len(new_plan)} tasks."]
            }
        except Exception as e:
            return {"status": "failed", "logs": [f"Plan Parsing Error: {e}"]}
