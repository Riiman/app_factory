import logging
import json
from ..agents.core import V3CoPilot

logger = logging.getLogger(__name__)

class V3Initializer:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=True, log_callback=log_callback)
        
    def initialize_node(self, state):
        """
        Runs ONCE at the start.
        1. Analyzes Product Features.
        2. Decides Tech Stack.
        3. Generates Mission List.
        """
        logger.info("--- V3 Initializer: Bootstrapping ---")
        
        # We expect 'product_context' to be passed in state by the route
        # product_context = { "name": "...", "description": "...", "features": [...] }
        product_context = state.get("product_context", {})
        
        # Fallback if empty (shouldn't happen in real usage)
        if not product_context:
            return {"status": "failed", "logs": ["Initializer Error: No Product Context found."]}
            
        system_prompt = """You are the Chief Technology Officer (CTO).
        Your job is to Initialize the Project Plan based on the Product Description and Features.
        
        GOALS:
        1. DECIDE TECH STACK: Choose the best modern stack (e.g., Next.js + Tailwind, or Python + React).
        2. CREATE MISSIONS: Break down the product into High-Level Missions.
           - Mission 0 MUST be "Initialize Environment" (install deps, setup structure).
           - Subsequent Missions should correspond to Features.
           
        OUTPUT JSON:
        {
            "tech_stack": "Name of stack",
            "missions": [
                {
                    "id": 0,
                    "title": "Initialize Environment",
                    "description": "Setup project structure for [tech_stack]...",
                    "status": "pending"
                },
                {
                    "id": 1,
                    "title": "Implement [Feature Name]",
                    "description": "Detailed description...",
                    "status": "pending"
                }
                ...
            ]
        }
        """
        
        user_prompt = f"Product: {product_context.get('name')}\nDescription: {product_context.get('description')}\nFeatures:\n{json.dumps(product_context.get('features', []), indent=2)}"
        
        result = self.copilot.think_and_plan(system_prompt, user_prompt, active_node="initializer")
        
        if result["error"]:
             return {"status": "failed", "logs": [f"Initializer Failed: {result['error']}"]}
        
        try:
            content = json.loads(result["content"])
            tech_stack = content.get("tech_stack", "Generic Web App")
            missions = content.get("missions", [])
            
            logs = [f"Initializer: Selected Stack -> {tech_stack}", f"Initializer: Created {len(missions)} missions."]
            
            return {
                "tech_stack": tech_stack,
                "missions": missions,
                "current_mission_id": None, # Will be picked by router
                "status": "routed", # Special status to let router pick next
                "logs": logs
            }
            
        except Exception as e:
            return {"status": "failed", "logs": [f"Initializer Parse Error: {e}"]}
