"""
Auto Test Generator for V4 Verification System

Automatically generates unit tests for code using LLM.
"""

import logging
from typing import Dict, Any, Optional, List
from langchain_core.messages import HumanMessage
from ...llm.copilot import V4CoPilot

logger = logging.getLogger(__name__)


class AutoTestGenerator:
    """
    Automatically generates unit tests for code using V4 Agent intelligence.
    """
    
    def __init__(self, log_callback=None):
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
    
    def generate_tests(
        self,
        code: str,
        file_path: str,
        language: str = "python",
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate unit tests for the given code using LLM.
        """
        context = context or {}
        
        logger.info(f"Generating tests for {file_path} ({language})")
        self.copilot.emit_thought(f"🧪 creating tests for {file_path}...", "verifier")
        
        # Build Prompt
        system_prompt = self._build_test_prompt(language, file_path)
        
        user_prompt = f"""
CODE TO TEST ({file_path}):
```
{code}
```

ADDITIONAL CONTEXT:
{str(context)}

Please generate a complete, runnable test file.
"""
        messages = [HumanMessage(content=user_prompt)]
        
        # Execute LLM
        # typically 1 turn is enough for test generation
        res = self.copilot.act(system_prompt, messages, tools=[], active_node="verifier")
        
        if res["error"]:
            logger.error(f"Test Gen Error: {res['error']}")
            return f"# Error generating tests: {res['error']}"
            
        content = res["content"].content
        
        # Extract code block
        import re
        code_blocks = re.findall(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL)
        if code_blocks:
            return code_blocks[0]
            
        # Fallback: return full content if no blocks
        return content

    def _build_test_prompt(self, language: str, file_path: str) -> str:
        framework = "pytest" if language == "python" else "jest"
        
        return f"""You are a QA Automation Expert.
Your goal is to write robust Unit Tests for the provided code.

Target Language: {language}
Target Framework: {framework}
Target File: {file_path}

# REQUIREMENTS
1. Cover happy paths AND edge cases.
2. Mock external dependencies (DB, API, FileSystem) where appropriate.
3. Use clear test names.
4. Output ONLY the test code inside a code block.
5. Ensure imports are correct relative to the file path.
"""
