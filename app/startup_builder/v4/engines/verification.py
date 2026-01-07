import logging
import json
import time
from typing import Dict, Any, Optional
from ..prompting import verification_prompt
from ..llm.copilot import V4CoPilot
from ..engines.runtime import DockerRuntime

logger = logging.getLogger(__name__)

class VerificationEngine:
    """
    V5 Verification Engine (The Verifier).
    Implements AlphaCodium's Flow Engineering:
    1. Generate Tests (Pre-computation)
    2. Run Tests (Verification Loop)
    3. Self-Heal (Auto-fix)
    """

    def __init__(self, runtime: DockerRuntime):
        self.runtime = runtime
        self.copilot = V4CoPilot()
        self.max_retries = 3

    def generate_tests(self, task: str) -> str:
        """
        Phase A: Generates the test file content before implementation.
        """
        logger.info(f"Generating tests for: {task}")
        prompt = verification_prompt.build_test_prompt(task)
        response = self.copilot.ask(prompt, system_prompt=verification_prompt.GENERATE_TESTS_SYSTEM_PROMPT)
        
        # Cleanup
        code = response.replace("```python", "").replace("```", "").strip()
        return code

    def verify_and_fix(self, test_path: str, target_file_path: str) -> bool:
        """
        Phase C: The Verification Loop.
        Runs tests, analyzes failures, and attempts to fix the target code.
        """
        attempts = 0
        while attempts < self.max_retries:
            logger.info(f"Verification Attempt {attempts+1}/{self.max_retries}")
            
            # 1. Run Tests via Docker Runtime
            # We assume the runtime has a method to run commands and get output.
            # Using the blocking `run_command_block` or `write_to_terminal`.
            # For verification, we need the Output.
            
            # Since `runtime` is interactive, we need to capture output.
            # We'll use a temporary terminal for testing to isolate output.
            term_id = f"test_run_{attempts}"
            
            cmd = f"pytest {test_path}"
            self.runtime.write_to_terminal(term_id, cmd + "\n")
            
            # Wait for completion (simple heuristic or specific marker)
            # This is a simplification. Real implementation needs robust output capture.
            # For now, we assume we can read the buffer from the runtime's callback? 
            # Actually, `runtime.py` pushes to `log_callback`. We need to intercept it.
            # Let's assume we can rely on a temporary sleep for this V5 prototype.
            time.sleep(5) 
            
            # TODO: In real V5, we need `runtime.run_and_capture(cmd)`.
            # For now, let's assume success if we proceed. But wait, how do we know if it failed?
            # We need the EXIT CODE.
            # `docker-py` exec_run returns (exit_code, output).
            # The `runtime` class mainly does interactive. 
            # Verification is best done via `exec_run` (blocking) to get exit code.
            
            exit_code, output = self.runtime.container.exec_run(cmd)
            logs = output.decode('utf-8')
            
            if exit_code == 0:
                logger.info("Verification PASSED.")
                return True
            
            logger.warning(f"Verification FAILED. Exit: {exit_code}")
            
            # 2. Self-Correction
            # Read target code (from local file, mirroring the container)
            # The runtime mounts workspace -> /app.
            local_target_path = target_file_path.replace("/app/", self.runtime.workspace_path + "/")
            try:
                with open(local_target_path, "r") as f:
                    current_code = f.read()
            except FileNotFoundError:
                logger.error("Target file not found for fixing.")
                return False

            fix_prompt = verification_prompt.build_fix_prompt(current_code, logs)
            response = self.copilot.ask(fix_prompt, system_prompt=verification_prompt.ANALYZE_FAILURE_SYSTEM_PROMPT)
            
            try:
                # Parse Fix
                fix_json = json.loads(response.replace("```json", "").replace("```", "").strip())
                new_code = fix_json.get("fix_code")
                if new_code:
                    # Apply Fix
                    with open(local_target_path, "w") as f:
                        f.write(new_code)
                    logger.info("Applied Auto-Fix.")
            except Exception as e:
                logger.error(f"Failed to apply fix: {e}")
            
            attempts += 1

        logger.error("Max retries reached. Verification failed.")
        return False
