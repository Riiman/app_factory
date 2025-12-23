import logging
from .core import V3CoPilot
from langchain_core.messages import HumanMessage

logger = logging.getLogger(__name__)

class V3Reflector:
    def __init__(self, log_callback=None):
        # We generally don't need 'thinking' for the reflector itself, 
        # as it IS the thinking process. Fast inference is preferred.
        self.copilot = V3CoPilot(use_thinking=False, log_callback=log_callback)
        
    def reflect(self, current_task: dict, failed_command: str, error_log: str, attempt_count: int) -> str:
        """
        Analyzes a failure and provides a course correction.
        """
        logger.info(f"--- V3 Reflector: Analyzing failure for '{current_task.get('description')}' ---")
        
        system_prompt = """You are the Senior Systems Debugger (Reflector).
your goal is to DIAGNOSE why a command failed and provide a SPECIFIC FIX.

ROLE:
- You do NOT execute commands.
- You do NOT write code. 
- You ONLY analyze logs and provide a "System Hint" to the Developer.

INPUT:
- Task: What the Developer was trying to do.
- Command: The exact command that failed.
- Error: The stdout/stderr from the failure.

DIAGNOSIS STRATEGY (The Reflexion Pattern):
1. Check Exit Codes (e.g., 127 = Command Not Found, 1 = General Error).
2. Check for "Did you mean..." suggestions in the error.
3. Check for Environment Mismatches (e.g., v1 vs v2 binaries).
4. Check for Syntax Errors.

OUTPUT FORMAT:
Return a single concise message starting with "DEBUGGER HINT:".
Example:
"DEBUGGER HINT: The command 'docker-compose' was not found (Exit 127). The server likely uses the modern 'docker compose' plugin. Try running 'docker compose up' instead."
"""
        
        user_prompt = f"""
        TASK: {current_task.get('description')}
        
        FAILED COMMAND:
        {failed_command}
        
        ERROR LOGS:
        {error_log}
        
        ATTEMPT: {attempt_count}
        
        Analyze this and provide a fix.
        """
        
        messages = [HumanMessage(content=user_prompt)]
        
        # Execute
        res = self.copilot.act(system_prompt, messages, tools=[], active_node="reflector")
        
        if res["error"]:
            logger.error(f"Reflector failed: {res['error']}")
            return "DEBUGGER HINT: Analysis failed. Try a different approach."
            
        return res["content"].content
