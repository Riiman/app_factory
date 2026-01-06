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
        
        # Define finish_task tool locally
        from langchain_core.tools import tool
        
        @tool
        def finish_task(summary: str = "Task finished") -> str:
            """
            Call this when the task is fully completed and verified.
            
            Args:
                summary: Brief summary of what was done.
            """
            return "Task Completed"

        # 2. Get Tool List and add finish_task
        all_tools = self.tools.get_tool_list() + [finish_task]
        
        # 3. LLM Generation Loop
        messages = [HumanMessage(content=f"Task: {task_desc}\n\nPerform the task using tools. When finished, you MUST call the `finish_task` tool.")]
        
        task_success = False
        final_result = None
        
        # Allow up to 40 turns for complex detailed tasks
        MAX_TURNS = 40
        for turn in range(MAX_TURNS):
            res = self.copilot.act(system_prompt, messages, all_tools, active_node="executor")
            
            if res["error"]:
                logger.error(f"Executor LLM Error: {res['error']}")
                break
                
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            if ai_msg.content:
                self.copilot.emit_thought(ai_msg.content, "executor")
            
            if ai_msg.tool_calls:
                # Execute tool calls
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    
                    # Handle finish_task specially
                    if tool_name == "finish_task":
                         task_success = True
                         final_result = args.get("summary", "Task finished")
                         self.copilot.emit_thought(f"✅ Task Completed: {final_result}", "executor")
                         break
                    
                    self.copilot.emit_thought(f"Running {tool_name}...", "executor")
                    
                    tool_obj = next((t for t in all_tools if t.name == tool_name), None)
                    
                    if not tool_obj:
                         from langchain_core.messages import ToolMessage
                         messages.append(ToolMessage(content=f"Error: Tool {tool_name} not found. Did you mean 'finish_task'?", tool_call_id=tool_call["id"]))
                         continue

                    # Execute normal tools
                    exec_res = self.executor.execute_tool(
                        tool_name=tool_name,
                        tool_func=tool_obj,
                        args=args
                    )
                    
                    result_str = str(exec_res.get("result", exec_res.get("error", "Unknown")))
                    
                    # Feed result back to LLM
                    from langchain_core.messages import ToolMessage
                    messages.append(ToolMessage(content=f"Tool Output: {result_str}", tool_call_id=tool_call["id"]))
                
                if task_success:
                    break
            
            # If no tool calls, nudge the user
            elif not ai_msg.tool_calls:
                 messages.append(HumanMessage(content="Please use tools to proceed, or call `finish_task` if done."))
            
            # Warning if nearing limit
            if turn == MAX_TURNS - 5:
                messages.append(HumanMessage(content=f"WARNING: You are approaching the turn limit ({MAX_TURNS}). Please verify your work and call `finish_task` soon."))
        
        if task_success:
            return {"status": "success", "result": final_result}
        else:
            return {"status": "failed", "error": "Task timed out. Did you forget to call `finish_task`?"}

    def _build_coder_prompt(self, task_desc: str, context: Dict[str, Any]) -> str:
        return f"""You are a Senior V4 Code Executor.
Your goal is to IMPLEMENT the given detailed task precisely.

# TASK
{task_desc}

# CONTEXT
{json.dumps(context or {}, indent=2)}

# INSTRUCTIONS
1. **Read Strategic Plan**: Use `read_context_cache("strategic_plan")` first.
2. **Execute Step-by-Step**: Create files, run commands, update code.
3. **Verify**: Run tests or verification steps mentioned in the task.
4. **Completion**: You MUST call `finish_task(summary="...")` when done.

# TOOLS
Use `update_file` to create/edit files.
Use `run_shell` to run commands.
Use `read_file` to check content.
Use `finish_task` when ALL parts are done.
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
