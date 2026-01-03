import logging
from .core import V3CoPilot
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

class V3Reflector:
    def __init__(self, log_callback=None):
        # We generally don't need 'thinking' for the reflector itself, 
        # as it IS the thinking process. Fast inference is preferred.
        self.copilot = V3CoPilot(use_thinking=False, log_callback=log_callback)
        
    def reflect(self, current_task: dict, failed_command: str, error_log: str, attempt_count: int) -> dict:
        """
        Analyzes a failure and provides a structured JSON analysis.
        """
        logger.info(f"--- V3 Reflector: Analyzing failure for '{current_task.get('description')}' ---")
        
        system_prompt = """You are the Log Analyzer (Reflector).
your goal is to DIAGNOSE why a command failed and provide a STRUCTURED FIX.

ROLE:
- You do NOT execute commands.
- You do NOT write code. 
- You ONLY analyze logs and return a JSON object.

INPUT:
- Task: What the Developer was trying to do.
- Command: The exact command that failed.
- Error: The stdout/stderr from the failure.

OUTPUT FORMAT (JSON ONLY):
{
  "failure_type": "ImportError|SyntaxError|RuntimeError|Timeout|LogicError",
  "primary_error": "Brief description of the error (e.g., 'Module not found')",
  "suggested_fix": "Specific instruction on how to fix it (e.g., 'Run pip install')",
  "failed_strategy": "Name of the strategy that failed (e.g., 'Using TypeORM for Auth')",
  "confidence_score": 0.95
}
"""
        
        user_prompt = f"""
        TASK: {current_task.get('description')}
        FAILED COMMAND: {failed_command}
        ERROR LOGS (Last 2000 chars):
        {error_log[-2000:]}
        
        Analyze this and return the JSON.
        """
        
        messages = [HumanMessage(content=user_prompt)]
        
        # Execute
        res = self.copilot.act(system_prompt, messages, tools=[], active_node="reflector")
        
        import json
        try:
            content = res["content"].content
            # Clean markdown
            cleaned = content.replace("```json", "").replace("```", "").strip()
            data = json.loads(cleaned)
            return data
        except Exception as e:
            logger.error(f"Reflector JSON Parse Failed: {e}")
            return {
                "failure_type": "Unknown",
                "primary_error": "Could not parse analysis",
                "suggested_fix": "Check logs manually",
                "failed_strategy": "Unknown",
                "confidence_score": 0.0
            }
