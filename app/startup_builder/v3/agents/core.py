import os
import json
import logging
from typing import List, Dict, Any, Optional
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# --- Sequential Thinking Schema (Optimized for V3) ---
SEQUENTIAL_THINKING_SCHEMA = {
    "name": "sequential_thinking",
    "description": "A tool for thinking through problems step-by-step before acting.",
    "parameters": {
        "type": "object",
        "properties": {
            "thought": {
                "type": "string",
                "description": "The thinking process. Be concise and logical."
            },
            "needs_more_thinking": {
                "type": "boolean",
                "description": "True if you need another thought step before the final answer."
            }
        },
        "required": ["thought", "needs_more_thinking"]
    }
}

class V3CoPilot:
    """
    The Brain of V3.
    Hard-wired to Azure OpenAI.
    Features:
    - Fast Sequential Thinking (limited turns)
    - Streaming Thoughts (via callback/logs)
    """
    def __init__(self, use_thinking=True, log_callback=None):
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
        self.use_thinking = use_thinking
        self.log_callback = log_callback # Function(content, node)

        if self.api_key and self.endpoint:
            self.llm = AzureChatOpenAI(
                azure_deployment=self.deployment_name,
                api_version=self.api_version,
                openai_api_key=self.api_key,
                azure_endpoint=self.endpoint,
                temperature=0.2,
                max_tokens=4000,
            )
        else:
            logger.error("Azure OpenAI Credentials Missing!")
            self.llm = None

    def emit_thought(self, content: str, node: str = "unknown"):
        """Emits a thought to the UI via callback."""
        from app.startup_builder.v3.logger import log_event
        
        # Log to file
        log_event("THOUGHT", content, node)

        if self.log_callback:
            # Prepend Agent Name for UI Clarity
            display_content = f"[{node.upper()}] {content}" if node and node != "unknown" else content
            self.log_callback(display_content, node)
        else:
            logger.info(f"Thinking ({node}): {content}")

    def ask(self, system_prompt: str, user_prompt: str, tools: List[Dict] = None) -> Dict:
        """
        Main entry point for asking the LLM.
        Handles thinking loop via tool calling if enabled.
        """
        if not self.llm:
            return {"error": "LLM not initialized"}

        self.emit_thought("Sending request to Azure OpenAI...", "unknown")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        # Simple invocation for now (MVP V3)
        return self.llm.invoke(messages)

    def think_and_plan(self, system_prompt: str, user_prompt: str, active_node: str = "planner", local_context: str = "", global_context: str = "") -> Dict:
        """
        Specialized method for the Planning Phase.
        Forces a structured JSON output with reasoning.
        """
        
        self.emit_thought("Analyzing requirements...", active_node)
        
        # Inject Context if available
        if global_context:
            system_prompt += f"\n\nGLOBAL PROJECT CONTEXT (HISTORY):\n{global_context}"
            
        if local_context:
            system_prompt += f"\n\nLOCAL TASK CONTEXT (RELEVANT FILES):\n{local_context}"
        
        json_llm = self.llm.bind(response_format={"type": "json_object"})
        
        messages = [
            SystemMessage(content=system_prompt + "\n\nRETURN JSON ONLY."),
            HumanMessage(content=user_prompt)
        ]
        
        try:
            self.emit_thought("Generating structure...", active_node)
            res = json_llm.invoke(messages)
            
            # Parse to extract thoughts for UI immediate feedback
            try:
                content_json = json.loads(res.content)
                if "thoughts" in content_json:
                    for thought in content_json["thoughts"]:
                        self.emit_thought(thought, active_node)
            except:
                pass

            return {"content": res.content, "error": None}
        except Exception as e:
            error_str = str(e).lower()
            if "content_filter" in error_str or "content management policy" in error_str or "400" in error_str:
                self.emit_thought("Azure Content Filter triggered. Retrying with simplified prompt...", active_node)
                try:
                    # Retry with stripped/simplified prompt
                    simple_schema_prompt = "Analyze the request and provide a JSON plan with 'thoughts' and 'plan'."
                    simple_messages = [
                        SystemMessage(content=simple_schema_prompt + "\n\nRETURN JSON ONLY."),
                        HumanMessage(content=user_prompt[:500] + "... (truncated)") # Truncate potential trigger
                    ]
                    res = json_llm.invoke(simple_messages)
                    return {"content": res.content, "error": None}
                except Exception as e2:
                     return {"content": None, "error": f"Content Filter blocked retry: {e2}"}
            
            self.emit_thought(f"Error: {e}", active_node)
            return {"content": None, "error": str(e)}

    def act(self, system_prompt: str, messages: List[Any], tools: List[Any], active_node: str = "unknown") -> Dict:
        """
        Executes the LLM with tool binding.
        Returns the raw AIMessage (which might contain tool_calls).
        """
        if not self.llm:
            return {"error": "LLM not initialized"}
            
        # Bind Tools
        llm_with_tools = self.llm.bind_tools(tools)
        
        # Construct Messages
        # Only add system prompt if it's the start (heuristically) 
        # But actually, 'messages' arg should contain the full history including HumanMessage.
        # So we just prepend SystemMessage.
        full_history = [SystemMessage(content=system_prompt)] + messages
        
        try:
            res = llm_with_tools.invoke(full_history)
            return {"content": res, "error": None}
        except Exception as e:
            error_str = str(e).lower()
            if "content_filter" in error_str or "content management policy" in error_str or "400" in error_str:
                # self.emit_thought("Azure Content Filter triggered in Act. Retrying with sanitized context...", active_node)
                try:
                    # Retry with CLEAN context - Reset to Original Prompt
                    # We discard the intermediate broken tool chain to avoid "ToolCall without ToolMessage" errors.
                    # messages[0] is the HumanMessage with Local Context & Goals.
                    sanitized_history = [
                        SystemMessage(content=system_prompt), # Keep the instructions
                        messages[0] # Keep the original request
                    ]
                    res = llm_with_tools.invoke(sanitized_history)
                    return {"content": res, "error": None}
                except Exception as e2:
                    return {"content": None, "error": f"Content Filter blocked retry: {e2}"}

            return {"content": None, "error": str(e)}

