import logging
import json
from ..agents.core import V3CoPilot
from ...manager import DockerManager
from ...context import ContextManager
from ..tools import V3Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

logger = logging.getLogger(__name__)

class V3Developer:
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=False, log_callback=log_callback) # Execution mode = fast
        self.docker_manager = DockerManager() # Reuse V2 Infrastructure
        # Startup ID is not available in __init__ usually, but we need it for ContextManager.
        # But ContextManager takes startup_id in __init__.
        # We should instantiate ContextManager inside developer_node where we have startup_id.
        self.context_manager = None

    def developer_node(self, state):
        """
        The Developer Node for LangGraph.
        Executes the current task in the plan.
        """
        current_plan = state.get("plan", [])
        startup_id = state.get("startup_id")
        current_mission_id = state.get("current_mission_id")
        missions = state.get("missions", [])
        
        # 1. Find the next pending task FOR THIS MISSION
        next_task = None
        for task in current_plan:
            # Check mission ownership + status
            if task.get("mission_id") == current_mission_id and not task.get("completed"):
                next_task = task
                break
        
        if not next_task:
            # No more tasks for this mission!
            # Mark mission as complete
            for m in missions:
                if m["id"] == current_mission_id:
                    m["status"] = "completed"
            
            return {
                "status": "done_mission", # Router will pick next mission
                "missions": missions,
                "logs": [f"Mission {current_mission_id} Complete!"]
            }
            
        # 1.5 Setup ContextManager
        if not self.context_manager or self.context_manager.startup_id != startup_id:
            self.context_manager = ContextManager(self.docker_manager, startup_id)
            
        # 1.6 Retrieve Local Context (RAG)
        local_context = self.context_manager.retrieve_local_context(next_task['description'])
        state["local_context"] = local_context
        
        logger.info(f"--- V3 Developer: Working on '{next_task['description']}' ---")
        
        # 2. Setup Tools
        tools_factory = V3Tools(self.docker_manager, startup_id)
        tools = tools_factory.get_tool_list()
        
        # 3. System Prompt
        system_prompt = """You are a Senior Full-Stack Developer (Expert Level).
        Your job is to EXECUTE the given task with PRODUCTION-QUALITY code.
        
        YOU HAVE ACCESS TO TOOLS:
        - read_file: READ a file before modifying it.
        - write_file: Write the complete file content.
        - run_shell: Run commands like 'npm install'.
        - list_files: Check directory structure.
        
        STRATEGY:
        1. Explore relevant files if needed.
        2. Write/Update the code (Full Implementation).
        3. Verify checks passed if applicable.
        
        When you are done, just output the final confirmation message.
        """
        
        user_prompt = f"Task: {next_task['description']}\nDetails: {next_task.get('content_sketch', '')}\n\nLocal Context:\n{local_context}"
        
        messages = [HumanMessage(content=user_prompt)]
        
        # 4. Tool Loop (Max 10 turns to prevent infinite loops)
        executed_actions = []
        for i in range(10):
            res = self.copilot.act(system_prompt, messages, tools, active_node="developer")
            
            if res["error"]:
                 return {"status": "failed", "logs": [f"CoPilot Error: {res['error']}"]}
            
            ai_msg = res["content"]
            messages.append(ai_msg) # Add AI response to history
            
            # Check for tool calls
            if ai_msg.tool_calls:
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]
                    
                    self.copilot.emit_thought(f"Invoking {tool_name}...", "developer")
                    
                    # Execute locally (since we have the bound functions in `tools` list)
                    # We need to find the matching tool instance
                    selected_tool = next((t for t in tools if t.name == tool_name), None)
                    
                    tool_result = "Error: Tool not found"
                    if selected_tool:
                        try:
                            # Invoke the tool
                            tool_result = selected_tool.invoke(args)
                        except Exception as e:
                            tool_result = f"Tool Execution Error: {str(e)}"
                    
                    # Append ToolMessage
                    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))
                    executed_actions.append(f"Ran {tool_name}")
            else:
                # No tool calls -> Final Answer
                break
                
        # Mark task as done
        next_task["completed"] = True
        
        summary = f"Completed task: {next_task['description']} via tools."
        new_global_context = self.context_manager.update_global_context(state.get("global_context", ""), summary)
            
        return {
            "plan": current_plan,
            "status": "coding",
            "logs": [f"Developer Loop: Completed {next_task['description']}"],
            "local_context": local_context,
            "global_context": new_global_context
        }

