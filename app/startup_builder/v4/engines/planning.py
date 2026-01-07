"""
V4 Planning Engine - The Controller.

Responsible for calculating the Control Signal (Micro-Plan) to reduce the error 
between Goal (r) and State (y).
"""

import logging
import json
from typing import Dict, Any, List, Optional
from langchain_core.messages import HumanMessage

from ..llm.copilot import V4CoPilot
from ..prompting.architect_prompts import ArchitectPromptEnhancer

logger = logging.getLogger(__name__)

class StrategicPlanner:
    """
    The Controller of the Agentic Control Loop.
    
    Role: Calculate the correction needed (Micro-Plan) based on error.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
        self.prompt_enhancer = ArchitectPromptEnhancer()
        
    def create_micro_plan(self, goal: str, current_state: Dict[str, Any], feedback: Optional[Any] = None, cycle_memory: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Calculate the control signal (Micro-Plan) to reduce error.
        
        Args:
            goal: The Reference (r).
            current_state: The Measured State (y).
            feedback: Error signal from previous cycle (optional).
            cycle_memory: Persistent RAM for the current cycle loop.
            
        Returns:
            MicroPlan: List of atomic actions (u).
        """
        logger.info(f"🧠 Controller: Calculating correction for '{goal}'")
        
        # Unpack State
        focused_context = current_state.get("focused_context", "")
        global_summary = current_state.get("global_summary", {})
        file_list = current_state.get("file_list", [])
        
        # Format File Tree
        file_tree_str = "\n".join(file_list[:300]) # Cap at 300 files safe limit
        if len(file_list) > 300:
             file_tree_str += f"\n... ({len(file_list)-300} more files, consult librarian)"

        # Feedback can come from argument or state
        feedback_data = feedback or current_state.get("feedback_context")
        
        # 1. Build System Model (Prompt)
        system_prompt = self._build_controller_prompt(global_summary)
        
        # 2. Build Error Signal (User Prompt)
        user_prompt = f"""
GOAL (Set Point): {goal}

FILE STRUCTURE (Existing Files):
{file_tree_str}

CURRENT STATE (Focused Context):
{focused_context}

"""
        # Inject Memory into Prompt
        if cycle_memory:
            mem_str = json.dumps(cycle_memory, indent=2, default=str)
            user_prompt += f"""
CYCLE MEMORY (Scratchpad):
{mem_str}
"""

        if feedback_data:
            user_prompt += f"""
PREVIOUS ERROR (Feedback):
The previous attempt failed with:
{json.dumps(feedback_data, indent=2, default=str)}

CRITICAL: Adjust the plan to fix this error. Do not repeat the same mistake.
"""

        user_prompt += """
Generate a MICRO-PLAN (Control Signal) to achieve the Goal from the Current State.
Return a JSON array of steps. Each step must be Atomic.

Format:
```json
[
  {
    "type": "command",
    "command": "pip install flask",
    "description": "Install dependency"
  },
  {
    "type": "file",
    "path": "app.py",
    "content": "...",
    "description": "Create server file"
  },
  {
    "type": "message",
    "content": "The Code Studio logic is...",
    "description": "Answer the user"
  },
  {
    "type": "verification",
    "feature_context": "Implement feature X...",
    "description": "Verify implementation with AlphaCodium Flow"
  }
]
```

CRITICAL: If you are writing code for a feature, YOU MUST include a 'verification' step at the end to ensure it works.
"""
        
        # 3. Compute Control Signal (LLM Inference)
        messages = [HumanMessage(content=user_prompt)]
        
        # Retry loop for valid JSON
        for _ in range(3):
            try:
                res = self.copilot.ask(system_prompt, user_prompt)
                content = res.content if hasattr(res, 'content') else str(res)
                
                # Extract JSON
                micro_plan = self._extract_json(content)
                if micro_plan:
                    logger.info(f"🧠 Controller: Generated {len(micro_plan)} control steps")
                    return micro_plan
                else:
                    self.copilot.emit_thought(f"⚠️ Plan Generation Failed. Raw Output: {content[:500]}...", "planning")
            except Exception as e:
                logger.warning(f"Controller inference failed: {e}")
                self.copilot.emit_thought(f"⚠️ Controller Inference Error: {e}", "planning")
                
        # Use fallback if inference fails
        logger.error("Controller failed to generate valid plan")
        return []

    def _build_controller_prompt(self, summary: Dict[str, Any]) -> str:
        return f"""
You are the CONTROL SYSTEM for a software codebase.
Your job is to generate a MICRO-PLAN to transition the system from State A to State B.

## YOUR RESPONSIBILITY
- **Analyze the Goal vs State**: Determine what is missing or wrong.
- **Consult Memory**: Check `execution_history` to see what failed previously.
- **Output a Micro-Plan**: A sequence of atomic steps.
- **MANDATORY VERIFICATION**: The LAST step MUST be a verification command.
- **NO BLOCKING COMMANDS**: Do NOT run `npm start` or `python server.py` directly. They will hang the agent. Instead, ask the Verifier (via `generate_verification_script`) to create a safe check script that starts, checks, and kills the server.

## TOOLING
- `command`: Run shell commands (e.g., install packages, run tests).
- `file`: Create or update files.
- `message`: Communicate with the user (Answer questions, provide info).

## Project Context
- Files: {summary.get('total_files', 0)}
- Stack: {summary.get('tech_stack', 'Unknown')}
        """
        
    def _extract_json(self, text: str) -> Optional[List[Dict[str, Any]]]:
        from ..utils import JsonRepair
        try:
            return JsonRepair.parse(text)
        except:
            return None
