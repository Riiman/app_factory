"""
Chain-of-Thought Prompting for V4 Autonomous System

Encourages step-by-step reasoning before code generation.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ChainOfThoughtPrompt:
    """
    Chain-of-thought prompting to improve reasoning quality.
    
    Encourages the LLM to think through the problem step-by-step
    before generating code.
    """
    
    @staticmethod
    def get_cot_instruction() -> str:
        """Get chain-of-thought instruction"""
        return """
## 🧠 Thinking Process

Before writing code, think through the problem step-by-step:

1. **Understanding**: What is the core requirement? What problem am I solving?
2. **Design**: What is the high-level approach? What are the key components?
3. **Dependencies**: What existing code can I reuse? What libraries do I need?
4. **Implementation Plan**: Break down into sub-tasks. What order should I tackle them?
5. **Verification Strategy**: How will I test this? What could go wrong?

Use the following format:

<thinking>
[Your step-by-step reasoning here]
</thinking>

<implementation>
[Your code/commands here]
</implementation>
"""
    
    @staticmethod
    def get_cot_example() -> str:
        """Get chain-of-thought example"""
        return """
### Example

**Task:** Create a REST API endpoint for user authentication

<thinking>
1. Understanding: Need to create a POST /auth/login endpoint that accepts email/password and returns a JWT token
2. Design: Use Express.js router, bcrypt for password hashing, jsonwebtoken for JWT generation
3. Dependencies: Already have User model, need to import bcrypt and jwt
4. Implementation Plan:
   - Create route handler
   - Validate input (email, password)
   - Find user by email
   - Compare password with bcrypt
   - Generate JWT token
   - Return token or error
5. Verification: Test with curl, check token is valid, test invalid credentials
</thinking>

<implementation>
```javascript
// auth.routes.js
router.post('/login', async (req, res) => {
    // ... implementation
});
```
</implementation>
"""
    
    @staticmethod
    def wrap_with_cot(base_prompt: str) -> str:
        """
        Wrap a base prompt with chain-of-thought instructions.
        
        Args:
            base_prompt: The base system prompt
            
        Returns:
            Prompt with CoT instructions
        """
        return f"""{base_prompt}

{ChainOfThoughtPrompt.get_cot_instruction()}"""
    
    @staticmethod
    def extract_thinking(response: str) -> Optional[str]:
        """Extract thinking section from response"""
        import re
        match = re.search(r'<thinking>(.*?)</thinking>', response, re.DOTALL)
        return match.group(1).strip() if match else None
    
    @staticmethod
    def extract_implementation(response: str) -> Optional[str]:
        """Extract implementation section from response"""
        import re
        match = re.search(r'<implementation>(.*?)</implementation>', response, re.DOTALL)
        return match.group(1).strip() if match else None


class SelfCritiquePrompt:
    """
    Self-critique prompting for code quality improvement.
    
    Asks the LLM to review and improve its own code.
    """
    
    @staticmethod
    def get_critique_instruction() -> str:
        """Get self-critique instruction"""
        return """
## 🔍 Self-Review

After generating code, review it critically:

1. **Correctness**: Does it solve the problem correctly?
2. **Edge Cases**: What edge cases might break it?
3. **Error Handling**: Are errors handled properly?
4. **Performance**: Are there obvious performance issues?
5. **Maintainability**: Is it clean and readable?

If you find issues, provide an improved version.
"""
    
    @staticmethod
    def create_critique_prompt(code: str, task_description: str) -> str:
        """
        Create a prompt for self-critique.
        
        Args:
            code: The generated code
            task_description: Description of the task
            
        Returns:
            Critique prompt
        """
        return f"""Review the following code critically:

**Task:** {task_description}

**Code:**
```
{code}
```

{SelfCritiquePrompt.get_critique_instruction()}

Provide your critique and an improved version if needed.
"""
