import os
import logging
import json
from typing import Dict, Any, List
from ..prompting import scaffolding_prompt
from ..llm.copilot import V4CoPilot
from ..engines.runtime import DockerRuntime

logger = logging.getLogger(__name__)

class ScaffoldingEngine:
    """
    V5 Scaffolding Engine (The Architect).
    Enforces 'Software Company' patterns:
    1. Modular Architecture (Services/Routes/Models)
    2. Golden Skeleton Generation
    3. Tech Stack Confirmation
    """

    def __init__(self, runtime: DockerRuntime):
        self.runtime = runtime
        self.copilot = V4CoPilot()

    def generate_skeleton(self, requirement: str) -> Dict[str, Any]:
        """
        Generates the initial project structure based on requirements.
        Returns the specific file map.
        """
        logger.info(f"Generating scaffolding for: {requirement}")
        
        # 1. Select Tech Stack (Simplified for now - we assume Python/Flask for stability)
        # Future: Use LLM to select stack.
        
        # 2. Get LLM Plan
        prompt = scaffolding_prompt.build_prompt(requirement)
        response = self.copilot.ask(prompt, system_prompt=scaffolding_prompt.SYSTEM_PROMPT)
        
        # 3. Parse JSON response
        try:
            # Clean md fences if present
            cleaned_json = response.replace("```json", "").replace("```", "").strip()
            plan = json.loads(cleaned_json)
        except json.JSONDecodeError:
            logger.error("Failed to parse Scaffolding JSON. Using fallback.")
            # Fallback simple skeleton
            plan = {
                "files": {
                    "app.py": "# Entry point\nfrom flask import Flask\napp = Flask(__name__)\n",
                    "requirements.txt": "flask\npytest\n"
                }
            }

        return plan

    def apply_skeleton(self, plan: Dict[str, Any]):
        """
        Writes the skeleton files to the workspace via Docker Runtime.
        """
        files = plan.get("files", {})
        
        for rel_path, content in files.items():
            # We use the Runtime to write files (simulating 'echo content > file')
            # For large content, this echo method is fragile. 
            # Ideally, self.runtime should have a 'write_file' method.
            # Since runtime.py didn't implementing file write, we use 'cat' via stdin or simpler:
            # We can write to the LOCAL workspace path because it is mounted!
            
            # Since Runtime mounts {workspace_path} -> /app, we can write locally.
            dest_path = os.path.join(self.runtime.workspace_path, rel_path)
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            with open(dest_path, "w") as f:
                f.write(content)
            
            logger.info(f"Scaffolded: {rel_path}")

        logger.info("Scaffolding Complete.")
