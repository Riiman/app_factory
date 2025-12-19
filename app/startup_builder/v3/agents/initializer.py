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
           - **DECOMPOSITION**: If a Feature is complex (e.g., "Auth" includes Login, Signup, Dashboard), break it down into multiple sequential Missions.
           - **TRACEABILITY**: Each Mission must include the `feature_id` of the Feature it belongs to.
           
        OUTPUT JSON:
        {
            "tech_stack": "Name of stack",
            "missions": [
                {
                    "id": 0,
                    "title": "Initialize Environment",
                    "description": "Setup project structure for [tech_stack]...",
                    "status": "pending",
                    "feature_id": null
                },
                {
                    "id": 1,
                    "title": "Implement [Feature Name] - Part 1",
                    "description": "Detailed description...",
                    "status": "pending",
                    "feature_id": "uuid-of-feature"
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
            
            # --- MISSION ENFORCEMENT: Mission 0 MUST be Init Env ---
            init_mission = {
                "id": 0,
                "title": "Initialize Environment",
                "description": "Install dependencies (e.g., package.json, requirements.txt) and initialize the shell project structure.",
                "status": "pending"
            }
            
            if not missions:
                missions = [init_mission]
            else:
                first_mission = missions[0]
                # Check if vaguely similar (LLM might phrase it differently)
                is_init = "init" in first_mission["title"].lower() or "setup" in first_mission["title"].lower()
                
                if not is_init:
                    # Prepend
                    missions.insert(0, init_mission)
                    # Re-index
                    for i, m in enumerate(missions):
                        m["id"] = i
                else:
                    # Ensure exact title/description match or trust LLM? 
                    # Let's ensure ID is 0
                    if first_mission["id"] != 0:
                         # Re-index all
                         for i, m in enumerate(missions):
                            m["id"] = i
            
            logs = [f"Initializer: Selected Stack -> {tech_stack}", f"Initializer: Created {len(missions)} missions."]
            
            # --- PERSISTENCE: Save to file ---
            try:
                from ...manager import DockerManager
                docker_manager = DockerManager()
                startup_id = state.get("startup_id")
                
                mission_data = {
                    "tech_stack": tech_stack,
                    "missions": missions,
                    "generated_at": str(import_time())
                }
                
                save_path = "artifacts/missions.json"
                docker_manager.write_file(startup_id, save_path, json.dumps(mission_data, indent=2))
                logs.append(f"Initializer: Saved missions to {save_path}")
                
            except Exception as e:
                logger.error(f"Failed to save missions to file: {e}")
                logs.append(f"Initializer Warning: Failed to save persistence file: {e}")
            
            return {
                "tech_stack": tech_stack,
                "status": "routed", # Special status to let router pick next
                "logs": logs,
                # "missions": [] # NO LONGER IN STATE
            }
            
        except Exception as e:
            return {"status": "failed", "logs": [f"Initializer Parse Error: {e}"]}

def import_time():
    import time
    return time.time()
