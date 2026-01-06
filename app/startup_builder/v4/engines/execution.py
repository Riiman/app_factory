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
        
    def execute_plan(self, micro_plan: List[Dict[str, Any]], cycle_memory: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute the micro-plan (Apply Control Signal).
        
        Args:
            micro_plan: List of steps to execute.
            cycle_memory: Persistent RAM for the current cycle loop.
            
        Returns:
            ExecutionResult: The outcome of the actuation.
        """
        logger.info(f"💪 Actuator: Applying {len(micro_plan)} steps")
        
        results = []
        failed = False
        error = None
        
        # Track history in RAM
        if cycle_memory is not None:
            if 'execution_history' not in cycle_memory:
                cycle_memory['execution_history'] = []
        
        for step in micro_plan:
            self._emit_log(f"⚙️ Executing: {step.get('description', 'Unknown Step')}")
            
            try:
                step_type = step.get("type")
                
                if step_type == "command":
                    res = self._run_command(step["command"])
                elif step_type == "file":
                    res = self._update_file(step["path"], step["content"])
                    # LIVING FILE LIST: Update memory immediately
                    if res["success"] and cycle_memory is not None:
                        if "file_list" in cycle_memory:
                            # Normalize to ensure "app.py" and "./app.py" match
                            import os
                            # We assume paths are relative to workspace root as per prompt convention
                            # But tool handles absolute. Let's rely on the input string to match the list's format (relative)
                            # Best verify: clean the path
                            norm_path = os.path.normpath(step["path"])
                            if norm_path not in cycle_memory["file_list"] and step["path"] not in cycle_memory["file_list"]:
                                cycle_memory["file_list"].append(step["path"])
                elif step_type == "message":
                    # Action: Just speak
                    res = {"success": True, "output": step.get("content")}
                else:
                    res = {"success": False, "error": f"Unknown step type: {step_type}"}
                
                # Tag result with step metadata for Feedback Loop
                res['step'] = step
                results.append(res)
                
                # Store in RAM
                if cycle_memory is not None:
                    cycle_memory['execution_history'].append({
                        "step": step,
                        "result": res
                    })
                
                if not res["success"]:
                    failed = True
                    # Enhanced error reporting
                    error = f"Step '{step.get('description')}' failed: {res.get('error')}"
                    if res.get('output'): 
                         error += f"\nOutput: {res.get('output')}"
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
