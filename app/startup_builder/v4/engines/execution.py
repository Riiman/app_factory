"""
V4 Execution Engine - The Actuator.

Responsible for applying the Control Signal (u) to the Physical Plant (Codebase).
"""

import logging
from typing import Dict, Any, List

from ..agents.executor import V4Executor
from ..tools.v4_tools import V4Tools

logger = logging.getLogger(__name__)

class TaskExecutor:
    """
    The Actuator of the Agentic Control Loop.
    
    Role: Apply the micro-plan to the codebase.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.executor = V4Executor(startup_id)
        self.tools = V4Tools(startup_id)
        self.log_callback = log_callback
        
    def apply_control(self, micro_plan: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute the micro-plan (Apply Control Signal).
        
        Args:
            micro_plan: List of steps to execute.
            
        Returns:
            ExecutionResult: The outcome of the actuation.
        """
        logger.info(f"💪 Actuator: Applying {len(micro_plan)} steps")
        
        results = []
        failed = False
        error = None
        
        for step in micro_plan:
            self._emit_log(f"⚙️ Executing: {step.get('description', 'Unknown Step')}")
            
            try:
                step_type = step.get("type")
                
                if step_type == "command":
                    res = self._run_command(step["command"])
                elif step_type == "file":
                    res = self._update_file(step["path"], step["content"])
                else:
                    res = {"success": False, "error": f"Unknown step type: {step_type}"}
                
                results.append(res)
                
                if not res["success"]:
                    failed = True
                    error = res.get("error", "Unknown error")
                    break
                    
            except Exception as e:
                failed = True
                error = str(e)
                results.append({"success": False, "error": error})
                break
        
        return {
            "success": not failed,
            "steps_completed": len(results),
            "total_steps": len(micro_plan),
            "error": error,
            "logs": results
        }
    
    def _run_command(self, command: str) -> Dict[str, Any]:
        tool = next((t for t in self.tools.get_tool_list() if t.name == "run_shell"), None)
        if not tool: return {"success": False, "error": "Tool not found"}
        
        # Tool returns a string, we need to parse it or trust V4Executor to wrap it?
        # V4Executor returns dict. Let's use V4Executor directly?
        # Actually TaskExecutor in v4 used V4Executor.execute_tool
        
        # Let's use the tool invoke directly for simplicity in this engine or wrap via executor
        res_str = tool.invoke({"command": command})
        
        # Heuristic success check
        success = "❌" not in res_str and "Error:" not in res_str
        return {"success": success, "output": res_str, "error": res_str if not success else None}

    def _update_file(self, path: str, content: str) -> Dict[str, Any]:
        tool = next((t for t in self.tools.get_tool_list() if t.name == "update_file"), None)
        if not tool: return {"success": False, "error": "Tool not found"}
        
        res_str = tool.invoke({"path": path, "content": content})
        success = "❌" not in res_str
        return {"success": success, "output": res_str, "error": res_str if not success else None}

    def _emit_log(self, msg):
        if self.log_callback:
            self.log_callback(msg)
