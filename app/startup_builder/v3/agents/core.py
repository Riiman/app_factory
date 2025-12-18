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
            self.log_callback(content, node)
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

    def think_and_plan(self, system_prompt: str, user_prompt: str, active_node: str = "planner") -> Dict:
        """
        Specialized method for the Planning Phase.
        Forces a structured JSON output with reasoning.
        """
        
        self.emit_thought("Analyzing requirements...", active_node)
        
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
            self.emit_thought(f"Error: {e}", active_node)
            return {"content": None, "error": str(e)}
