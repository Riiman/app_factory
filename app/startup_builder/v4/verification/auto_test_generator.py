"""
Auto Test Generator for V4 Verification System

Automatically generates unit tests for code using LLM.
"""

import logging
from typing import Dict, Any, Optional, List
from langchain_core.messages import HumanMessage
from ..llm.copilot import V4CoPilot

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

    def generate_verification_script(self, goal: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a runtime verification script (Shell/Python) based on the goal.
        e.g., "Check if server is running on port 3000" -> `curl -f http://localhost:3000`
        e.g., "Check if Login UI renders" -> Python script using browser tool (mocked or real)
        """
        logger.info(f"Generating verification script for: {goal}")
        
        system_prompt = """You are a DevOps & QA Engineer.
Your job is to write a self-contained SCRIPT to verify if a goal was accomplished.

CRITICAL: HANDLING LONG-RUNNING PROCESSES
If the verification requires a server (e.g., "Check if app runs on port 3000"), you MUST run it in the background, wait, check, and then KILL it.
Do NOT just run `npm start` or it will block forever.

Pattern for Server Checks (Bash):
```bash
# 1. Start in background
npm run start &
SERVER_PID=$!

# 2. Robust Wait (Poll until ready)
# CRITICAL: Adjust RETRIES based on expected startup time (e.g., 60 for Java/Spring, 15 for Node/Flask)
echo "Waiting for server..."
RETRIES=30 
while [ $RETRIES -gt 0 ]; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "Server is UP!"
        break
    fi
    sleep 1
    RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
    echo "Timeout waiting for server."
    kill $SERVER_PID
    exit 1
fi

# 3. Perform Check
curl -f http://localhost:3000
EXIT_CODE=$?

# 4. Clean up
kill $SERVER_PID
exit $EXIT_CODE
```

TYPES OF CHECKS:
1. **Server/API**: Use the Pattern above. Use `curl` or `wget`.
2. **UI/Frontend**: Use `node` script with `puppeteer` (mocked) or simple `curl` if SSR.
3. **Logic**: Write a small Python script to import the module and run the function.

OUTPUT FORMAT:
- If use shell: ```bash ... ```
- If use python: ```python ... ```
"""
        user_prompt = f"Goal to Verify: {goal}\nContext: {str(context)}"
        
        res = self.copilot.act(system_prompt, [HumanMessage(content=user_prompt)], tools=[], active_node="verifier")
        content = res["content"].content
        
        # Extract code
        import re
        code_blocks = re.findall(r"```(?:\w+)?\n(.*?)```", content, re.DOTALL)
        return code_blocks[0] if code_blocks else content

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
