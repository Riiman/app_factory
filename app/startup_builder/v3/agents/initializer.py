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
        2. DESIGN UI THEME: Create a visual design system (Colors, Fonts, Radius) tailored to the product's industry and "vibe".
           - E.g., Medical -> Blue/Clean. Gaming -> Dark/Neon. Luxury -> Gold/Serif.
        3. CREATE MISSIONS: Break down the product into High-Level Missions.
           - Mission 0 MUST be "Initialize Environment & Theme" (install deps, setup structure, apply theme).
           - Subsequent Missions should correspond to Features.
           
        OUTPUT JSON:
        {
            "tech_stack": "Name of stack",
            "ui_theme": {
                "variant": "light/dark", 
                "primary": "#hexcode",
                "secondary": "#hexcode",
                "accent": "#hexcode",
                "fontHeading": "Inter/Roboto/Merriweather",
                "fontBody": "Inter/Roboto",
                "borderRadius": "0.5rem"
            },
            "missions": [
                {
                    "id": 0,
                    "title": "Initialize Environment & Theme",
                    "description": "Setup project structure, install dependencies, and configure tailwind/theme for [tech_stack].",
                    "status": "pending",
                    "feature_id": null
                },
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
            ui_theme = content.get("ui_theme", {})
            missions = content.get("missions", [])
            
            # --- MISSION ENFORCEMENT ---
            init_mission = {
                "id": 0,
                "title": "Initialize Environment & Theme",
                "description": "Install dependencies (e.g., package.json or requirements.txt), set up project structure, and configure the UI Theme (colors/fonts) based on artifacts/theme.json.",
                "status": "pending"
            }
            
            if not missions:
                missions = [init_mission]
            else:
                 # Check/Fix Mission 0
                 if missions[0]["id"] != 0:
                     missions.insert(0, init_mission)
                     for i, m in enumerate(missions): m["id"] = i

            logs = [f"Initializer: Selected Stack -> {tech_stack}", f"Initializer: Generated Theme -> {ui_theme.get('variant', 'standard')}", f"Initializer: Created {len(missions)} missions."]
            
            # --- PERSISTENCE ---
            try:
                from ...manager import DockerManager
                docker_manager = DockerManager()
                startup_id = state.get("startup_id")
                
                # 1. Save Missions
                mission_data = {
                    "tech_stack": tech_stack,
                    "missions": missions,
                    "generated_at": str(import_time())
                }
                
                # Ensure artifacts dir exists (idempotent)
                docker_manager.run_command(startup_id, "mkdir -p artifacts")
                
                save_path = "artifacts/missions.json"
                docker_manager.write_file(startup_id, save_path, json.dumps(mission_data, indent=2))
                logs.append(f"Initializer: Saved missions to {save_path}")
                
                # 2. Save Theme
                if ui_theme:
                     theme_path = "artifacts/theme.json"
                     docker_manager.write_file(startup_id, theme_path, json.dumps(ui_theme, indent=2))
                     logs.append(f"Initializer: Saved UI Theme to {theme_path}")
                
            except Exception as e:
                logger.error(f"Failed to save artifacts: {e}")
                logs.append(f"Initializer Warning: Failed to save artifacts: {e}")
            
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
