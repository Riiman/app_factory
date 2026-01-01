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
           - CRITICAL: Map each mission to its corresponding feature_id from the INPUT features list.
           
        OUTPUT JSON:
        {
            "tech_stack": "Name of stack",
            "ui_theme": { ... },
            "missions": [
                {
                    "id": 0,
                    "title": "Initialize Environment & Theme",
                    "description": "Setup project structure...",
                    "status": "pending",
                    "feature_id": null
                },
                {
                    "id": 1,
                    "title": "Build User Authentication",
                    "description": " Implement login/signup...",
                    "status": "pending",
                    "feature_id": "UUID-FROM-INPUT-FEATURES"
                }
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
            
            landing_page_mission = {
                "id": 1,
                "title": "Build Landing Page",
                "description": "Create a high-conversion Landing Page using content from 'artifacts/project_context.json' (Product Description & Evaluation). Must include: Hero Section, Feature Highlights, About, and CTA. Ensure it is responsive and uses the defined theme.",
                "status": "pending",
                "feature_id": None # Not a specific feature
            }
            
            if not missions:
                missions = [init_mission, landing_page_mission]
            else:
                 # Check/Fix Mission 0
                 if missions[0]["id"] != 0:
                     missions.insert(0, init_mission)
                     
                 # Check if Landing Page exists (simple heuristic by title)
                 has_landing = any("landing" in m["title"].lower() for m in missions)
                 if not has_landing:
                      missions.insert(1, landing_page_mission)
                      
                 # Reindex
                 for i, m in enumerate(missions): m["id"] = i

            # --- DETERMINISTIC FEATURE MAPPING ---
            # Don't rely on LLM for UUIDs. Map them by name similarity.
            input_features = product_context.get("features", [])
            if input_features:
                logger.info("Initializer: Mapping missions to features via fuzzy match...")
                import difflib
                
                # Helper to normalize strings for comparison
                def normalize(s): return s.lower().replace("build", "").replace("implement", "").strip()
                
                for m in missions:
                    if m["id"] == 0: continue # Skip Init
                    
                    m_title = normalize(m["title"])
                    best_match = None
                    best_score = 0.0
                    
                    for f in input_features:
                        f_name = normalize(f["name"])
                        # Simple Jaccard-like or SequenceMatcher
                        score = difflib.SequenceMatcher(None, m_title, f_name).ratio()
                        
                        if score > 0.4 and score > best_score: # Threshold
                            best_match = f
                            best_score = score
                            
                    if best_match:
                         m["feature_id"] = best_match["id"]
                         logger.info(f"Mapped Mission '{m['title']}' -> Feature '{best_match['name']}' ({best_match['id']})")
                    else:
                         m["feature_id"] = None
            
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
                
                # 3. Save Project Context (Critical for Architect)
                # Moved to root to prevent scaffolding conflicts
                ctx_path = "/app/project_context.json"
                docker_manager.write_file(startup_id, ctx_path, json.dumps(product_context, indent=2))
                logs.append(f"Initializer: Saved Project Context to {ctx_path}")
                
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
