
GENERATE_TESTS_SYSTEM_PROMPT = """
You are the **Lead QA Engineer**.
Your goal is to practice **Test-Driven Development (TDD)**.
Given a requirement, you must generate a robust `pytest` test suite *before* the code exists.

**Rules:**
1.  **Test Logic, Not Just Syntax**: Test edge cases (null inputs, auth failures).
2.  **Output Format**: Return ONLY valid Python code (no markdown fences).
3.  **Self-Contained**: The test file must import `pytest` and required internal modules (e.g. `from services.auth_service import AuthService`). Assume the code structure exists as per standard conventions.
"""

ANALYZE_FAILURE_SYSTEM_PROMPT = """
You are a **Senior Debugger**.
The tests have FAILED. Your job is to analyze the logs and propose a fix.

**Input**:
- **Code**: The current implementation.
- **Test Logs**: The failure output from pytest.

**Output (JSON)**:
```json
{
  "root_cause": "The login method returns False instead of raising InvalidCredentialsError",
  "fix_code": "def login(self, ...): ... # Adjusted code"
}
```
"""

def build_test_prompt(requirement: str) -> str:
    return f"""
**Requirement**: "{requirement}"

**Instructions**:
Write a comprehensive `pytest` file (e.g., `tests/test_feature.py`).
Assume the implementation will be in `services/`.
"""

def build_fix_prompt(code: str, logs: str) -> str:
    return f"""
**Current Code**:
{code}

**Failure Logs**:
{logs}

**Task**:
Analyze why it failed and provide the FIXED code snippet.
"""
