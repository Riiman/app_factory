"""
V4 Task Executor Workflow

Executes individual tasks by:
1. Using LLM to generate the specific Action (Tool Call) based on Task Logic.
2. Executing the Action with V4 Safety & Healing.
3. Verifying the result.
"""

import logging
import json
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime

from ..llm.copilot import V4CoPilot
from ..tools.v4_tools import V4Tools
from ..agents.executor import V4Executor
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)


class TaskExecutor:
    """
    Executes individual tasks with V4 safety and healing.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.executor = V4Executor(startup_id)
        self.tools = V4Tools(startup_id)
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
        
        logger.info(f"TaskExecutor initialized for startup {startup_id}")
    
    def solve_and_execute(
        self,
        task: Dict[str, Any],
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Solves a high-level Task by generating and executing code.
        """
        task_desc = task.get("description", "Unknown Task")
        task_logic = task.get("logic", "")
        task_action = task.get("action", "") # Hint from Planner (e.g. write_file)
        
        logger.info(f"TaskExecutor: Solving '{task_desc}'")
        self.copilot.emit_thought(f"⚙️ Executing: {task_desc}", "executor")

        # 1. Build Prompt for Coder
        system_prompt = self._build_coder_prompt(task, context)
        
        # 2. Get Tool List
        all_tools = self.tools.get_tool_list()
        
        # 3. LLM Generation (Single Turn for now, or Loop?)
        # V4 Philosophy: Atomic Tasks should be solvable in 1-2 turns.
        # We try up to 3 turns to get a valid tool call.
        
        messages = [HumanMessage(content=f"Task: {task_desc}\nLogic: {task_logic}\nAction Hint: {task_action}\n\nPerform the task.")]
        
        success = False
        final_result = None
        
        for turn in range(3):
            res = self.copilot.act(system_prompt, messages, all_tools, active_node="executor")
            
            if res["error"]:
                logger.error(f"Executor LLM Error: {res['error']}")
                break
                
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            if ai_msg.content:
                self.copilot.emit_thought(ai_msg.content, "executor")
            
            if ai_msg.tool_calls:
                # We have a tool call!
                # Execute it using V4Executor (which has retry/healing)
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    
                    self.copilot.emit_thought(f"Running {tool_name}...", "executor")
                    
                    # Map tool name to function logic if needed? 
                    # V4Executor expects tool_name + tool_func.
                    # We need to find the tool_func from all_tools.
                    tool_obj = next((t for t in all_tools if t.name == tool_name), None)
                    
                    if not tool_obj:
                         final_result = {"success": False, "error": f"Tool {tool_name} not found"}
                         continue

                    # Execute
                    exec_res = self.executor.execute_tool(
                        tool_name=tool_name,
                        tool_func=tool_obj.invoke, # invoke? or func? LangChain tools have .invoke
                        args=args
                    )
                    
                    result_str = str(exec_res.get("result", exec_res.get("error", "Unknown")))
                    
                    if exec_res["success"]:
                        success = True
                        final_result = exec_res
                        # We assume atomic task = 1 successful tool call closes it.
                        break
                    else:
                        # Feed failure back to LLM
                         from langchain_core.messages import ToolMessage
                         messages.append(ToolMessage(content=f"Tool Failed: {result_str}", tool_call_id=tool_call["id"]))
                
                if success:
                    break
        
        if success:
            return {"status": "success", "result": final_result}
        else:
            return {"status": "failed", "error": "Failed to execute task after 3 turns"}

    def _build_coder_prompt(self, task, context) -> str:
        return f"""You are a Senior V4 Code Executor.
Your goal is to IMPLEMENT the given task precisely.

# TASK
Description: {task.get('description')}
Logic: {task.get('logic')}

# CONSTRAINTS
1. Use the provided tools.
2. If writing a file, ensure it is complete.
3. If running a command, ensure safety.

# CONTEXT
{json.dumps(context or {}, indent=2)}
"""

    def get_stats(self) -> Dict[str, Any]:
        """Get task executor statistics"""
        return {
            'startup_id': self.startup_id,
            'executor': self.executor.get_stats()
        }
