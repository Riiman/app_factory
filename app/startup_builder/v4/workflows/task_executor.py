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
        task_desc: str,
        task_logic: str = "",
        task_action: str = "",
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Solves a detailed Task by generating and executing code with multiple steps.
        """
        logger.info(f"TaskExecutor: Solving '{task_desc}'")
        self.copilot.emit_thought(f"⚙️ Executing: {task_desc}", "executor")

        # 1. Build Prompt for Coder
        system_prompt = self._build_coder_prompt(task_desc, context)
        
        # 2. Get Tool List
        all_tools = self.tools.get_tool_list()
        
        # 3. LLM Generation Loop
        messages = [HumanMessage(content=f"Task: {task_desc}\n\nPerform the task. Use tools to create files, run commands, and verify. When finished, reply with 'TASK_COMPLETED'.")]
        
        task_success = False
        final_result = None
        
        # Allow up to 20 turns for complex detailed tasks
        for turn in range(20):
            res = self.copilot.act(system_prompt, messages, all_tools, active_node="executor")
            
            if res["error"]:
                logger.error(f"Executor LLM Error: {res['error']}")
                break
                
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            # Check for completion signal
            if ai_msg.content and "TASK_COMPLETED" in ai_msg.content:
                task_success = True
                break
            
            if ai_msg.content:
                self.copilot.emit_thought(ai_msg.content, "executor")
            
            if ai_msg.tool_calls:
                # Execute tool calls
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    
                    self.copilot.emit_thought(f"Running {tool_name}...", "executor")
                    
                    tool_obj = next((t for t in all_tools if t.name == tool_name), None)
                    
                    if not tool_obj:
                         from langchain_core.messages import ToolMessage
                         messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found", tool_call_id=tool_call["id"]))
                         continue

                    # Execute
                    exec_res = self.executor.execute_tool(
                        tool_name=tool_name,
                        tool_func=tool_obj,
                        args=args
                    )
                    
                    result_str = str(exec_res.get("result", exec_res.get("error", "Unknown")))
                    
                    # Feed result back to LLM
                    from langchain_core.messages import ToolMessage
                    messages.append(ToolMessage(content=f"Tool Output: {result_str}", tool_call_id=tool_call["id"]))
            
            # If no tool calls and no completion signal, hint the user
            elif not ai_msg.tool_calls and "TASK_COMPLETED" not in ai_msg.content:
                 messages.append(HumanMessage(content="Please continue with tool calls or reply 'TASK_COMPLETED' if done."))
        
        if task_success:
            return {"status": "success", "result": "Task completed successfully"}
        else:
            return {"status": "failed", "error": "Task timed out or not completed explicitly"}

    def _build_coder_prompt(self, task_desc: str, context: Dict[str, Any]) -> str:
        return f"""You are a Senior V4 Code Executor.
Your goal is to IMPLEMENT the given detailed task precisely.

# TASK
{task_desc}

# CONTEXT
{json.dumps(context or {}, indent=2)}

# INSTRUCTIONS
1. **Read Strategic Plan**: Use `read_context_cache("strategic_plan")` first to understand context.
2. **Execute Step-by-Step**: Create files, run commands, update code.
3. **Verify**: Run tests or verification steps mentioned in the task.
4. **Completion**: When ALL parts of the task are done and verified, output "TASK_COMPLETED".

# TOOLS
Use `update_file` to create/edit files.
Use `run_shell` to run commands.
Use `read_file` to check content.
"""

    def get_stats(self) -> Dict[str, Any]:
        """Get task executor statistics"""
        return {
            'startup_id': self.startup_id,
            'executor': self.executor.get_stats()
        }
    
    def execute_atomic_task(self, atomic_task) -> Dict[str, Any]:
        """
        Execute a single atomic task WITHOUT LLM.
        
        Atomic task has complete instructions - just execute directly.
        """
        logger.info(f"[ATOMIC] Executing: {atomic_task.description}")
        
        try:
            if atomic_task.action == "create_file":
                return self._execute_create_file(atomic_task)
            elif atomic_task.action == "update_file":
                return self._execute_update_file(atomic_task)
            elif atomic_task.action == "run_command":
                return self._execute_run_command(atomic_task)
            else:
                return {"status": "failed", "error": f"Unknown action: {atomic_task.action}"}
        except Exception as e:
            logger.error(f"Atomic task execution failed: {e}")
            return {"status": "failed", "error": str(e)}
    
    def _execute_create_file(self, task) -> Dict[str, Any]:
        """Create a new file with content"""
        tool = next((t for t in self.tools.get_tool_list() if t.name == "update_file"), None)
        if not tool:
            return {"status": "failed", "error": "update_file tool not found"}
        
        # Tool expects 'path' not 'file_path'
        result = tool.invoke({"path": task.file_path, "content": task.content})
        return {"status": "success" if "✅" in str(result) else "failed", "result": result}
    
    def _execute_update_file(self, task) -> Dict[str, Any]:
        """Update an existing file"""
        tool = next((t for t in self.tools.get_tool_list() if t.name == "update_file"), None)
        if not tool:
            return {"status": "failed", "error": "update_file tool not found"}
        
        # Tool expects 'path' not 'file_path'
        result = tool.invoke({"path": task.file_path, "content": task.content})
        return {"status": "success" if "✅" in str(result) else "failed", "result": result}
    
    def _execute_run_command(self, task) -> Dict[str, Any]:
        """Execute a shell command"""
        tool = next((t for t in self.tools.get_tool_list() if t.name == "run_shell"), None)
        if not tool:
            return {"status": "failed", "error": "run_shell tool not found"}
        
        # Ensure command is not None
        if not task.command:
            return {"status": "failed", "error": "No command specified"}
        
        result = tool.invoke({"command": task.command})
        return {"status": "success" if "✅" in str(result) or "exit code 0" in str(result).lower() else "failed", "result": result}
