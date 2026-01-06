"""
V4 Task Planner - The Brain of the Agentic System.

Responsible for:
1. Understanding the Mission (via Context & Librarian)
2. Strategic Planning (Tree-of-Thoughts / Heuristic)
3. Generating a Dependency-Aware Implementation Plan (JSON)
4. Recovery Planning (Diagnosing failures and replanning)
"""

import logging
import json
import uuid
from typing import Dict, List, Optional, Any

from langchain_core.messages import HumanMessage
from ..llm.copilot import V4CoPilot
from ..prompting.architect_prompts import ArchitectPromptEnhancer
# from ...context import ContextManager # Dependency injection preferred

logger = logging.getLogger(__name__)

class TaskPlanner:
    """
    Dedicated Planning Engine for V4.
    Replaces the monolithic V3 Architect.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        # We reuse V3CoPilot for now as the LLM Interface
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
        self.prompt_enhancer = ArchitectPromptEnhancer()
        
    def plan_mission(
        self, 
        mission: Dict[str, Any],
        context_manager: Any, # Typed as ContextManager
        librarian: Any,       # Typed as Librarian
        failed_task: Optional[Dict[str, Any]] = None,
        tech_stack: str = "General"
    ) -> Dict[str, Any]:
        """
        Generates a comprehensive plan for the given mission.
        """
        mission_title = mission.get("title", "Unknown Mission")
        logger.info(f"TaskPlanner: Starting planning for '{mission_title}' (Recovery={bool(failed_task)})")

        # 1. Gather Context
        project_rules = context_manager.get_global_context()
        summaries = context_manager.get_file_summaries()
        file_tree_raw = librarian.get_file_tree()
        
        # Build Semantic Context
        # We can perform a fresh query if needed
        semantic_context = librarian.query(f"{mission_title} {mission.get('description', '')}")
        
        # Format File Tree with Purpose
        summary_text = "\n".join([f"- {k}: {v}" for k,v in summaries.items() if v])
        file_tree = f"{file_tree_raw}\n\n=== FILE PURPOSE INDEX ===\n{summary_text}"
        
        # 2. Build Enhanced Prompt
        system_prompt = self.prompt_enhancer.build_enhanced_architect_prompt(
            mission=mission,
            failed_task=failed_task,
            global_context=project_rules,
            semantic_context=semantic_context,
            file_tree=file_tree,
            tech_stack=tech_stack
        )
        
        # 3. Prepare User Prompt
        if failed_task:
            user_prompt = f"Mission: {mission_title}\n\nCRITICAL: The task '{failed_task['description']}' FAILED. Please diagnose and fix it."
        else:
            user_prompt = f"Mission: {mission_title}\nDescription: {mission.get('description')}\n\nStart your exploration and planning."

        # 4. Agent Loop (Exploration -> Planning)
        # We allow a few turns for "Thinking" and "Exploration" (reading files)
        # before forcing the JSON output.
        
        messages = [HumanMessage(content=user_prompt)]
        tools = [] # We need to pass tools! 
        # Ideally we should get tools from V3Tools or V4Tools.
        # For now, let's assume the caller configures tools or we pass them in?
        # To avoid circular imports, we might need to instantiate V3Tools here or get them passed.
        # Let's instantiate V3Tools for now as done in Architect.
        from ...v3.tools import V3Tools
        from ...manager import DockerManager
        
        dm = DockerManager() # or get from context_manager if available? context_manager has it.
        # context_manager.docker_manager is likely available
        tools_factory = V3Tools(dm, self.startup_id)
        tools = tools_factory.get_tool_list()

        MAX_TURNS = 15
        final_plan = None
        
        self.copilot.emit_thought(f"🧠 TaskPlanner: Analyzing '{mission_title}'...", "planner")

        for i in range(MAX_TURNS):
            res = self.copilot.act(system_prompt, messages, tools, active_node="planner")
            
            if res["error"]:
                logger.error(f"Planner LLM Error: {res['error']}")
                self.copilot.emit_thought(f"Planner Error: {res['error']}", "planner")
                break
                
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            # Emit thought
            if ai_msg.content:
                # logger.info(f"Planner Thought: {ai_msg.content[:100]}...")
                self.copilot.emit_thought(ai_msg.content, "planner")

            if ai_msg.tool_calls:
                # Execute Checks (Read Files, etc - Exploration)
                for tool_call in ai_msg.tool_calls:
                     # Reuse developer/architect tool loop logic?
                     # For brevity, implementing simple execution here
                     tool_name = tool_call["name"]
                     args = tool_call["args"]
                     tool_id = tool_call["id"]
                     
                     selected_tool = next((t for t in tools if t.name == tool_name), None)
                     if selected_tool:
                         try:
                             self.copilot.emit_thought(f"Checking {tool_name}...", "planner")
                             tool_res = selected_tool.invoke(args)
                             messages.append(json.dumps(str(tool_res))) # ToolMessage simplified
                             # ACTUALLY we need proper ToolMessage for LangChain
                             from langchain_core.messages import ToolMessage
                             messages.append(ToolMessage(content=str(tool_res), tool_call_id=tool_id))
                         except Exception as e:
                             from langchain_core.messages import ToolMessage
                             messages.append(ToolMessage(content=f"Error: {e}", tool_call_id=tool_id))
            else:
                # No tools -> Potential Final Answer
                # Parse JSON
                try:
                    text = ai_msg.content
                    cleaned = text.replace("```json", "").replace("```", "").strip()
                    if "{" in cleaned and "}" in cleaned:
                        data = json.loads(cleaned)
                        if "tasks" in data:
                            final_plan = data["tasks"]
                            # Enrich tasks
                            for t in final_plan:
                                t["id"] = str(uuid.uuid4())
                                t["mission_id"] = mission.get("id")
                            break
                except:
                    pass
            
            if i == MAX_TURNS - 3:
                 messages.append(HumanMessage(content="SYSTEM WARNING: You are running out of turns. Please output the JSON plan now."))

        if not final_plan:
            return {"status": "failed", "error": "Failed to generate JSON plan"}
            
        return {
            "status": "success",
            "tasks": final_plan,
            "thoughts": "Plan generated successfully."
        }
