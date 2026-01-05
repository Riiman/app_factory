import logging
import json
import os
from ..agents.core import V3CoPilot
from ...manager import DockerManager
from ...context import ContextManager
from ..tools import V3Tools
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage

logger = logging.getLogger(__name__)

class V3Diagnostician:
    """
    Diagnostician Agent: Analyzes failed tasks and provides root cause diagnosis.
    
    Unlike Architect (which plans) or Developer (which executes), the Diagnostician
    focuses solely on understanding WHY a task failed and providing actionable guidance.
    
    Key Features:
    - Has read-only tools (can investigate but not modify)
    - Analyzes execution history to identify patterns
    - Returns diagnosis + guidance (not new tasks)
    - Prevents infinite loops by seeing what was already tried
    """
    
    def __init__(self, log_callback=None):
        self.copilot = V3CoPilot(use_thinking=True, log_callback=log_callback)
        self.docker_manager = DockerManager()
        self.context_manager = None
        
    def diagnostician_node(self, state):
        """
        Analyzes a failed task and returns diagnosis.
        
        Input (from state):
          - failed_task: The task that failed (with failed_attempts, last_error)
          - current_mission: Mission context
          
        Output:
          - diagnosis: Root cause analysis
          - guidance: Specific suggestions
          - status: "diagnosed" or "needs_replanning"
        """
        startup_id = state.get("startup_id")
        failed_task = state.get("failed_task")
        current_mission = state.get("current_mission")
        
        if not failed_task:
            return {"status": "failed", "logs": ["Diagnostician Error: No failed task provided."]}
        
        logger.info(f"--- V3 Diagnostician: Analyzing '{failed_task['description']}' ---")
        
        # Initialize context manager
        self.context_manager = ContextManager(self.docker_manager, startup_id)
        
        # Get READ-ONLY tools
        tools_factory = V3Tools(self.docker_manager, startup_id)
        tools = tools_factory.get_tool_list(read_only=True)
        
        # Extract failure history
        failed_attempts = failed_task.get("failed_attempts", [])
        last_error = failed_task.get("last_error", {})
        task_context = failed_task.get("task_context", [])
        
        # Build system prompt
        system_prompt = """
# ROLE & IDENTITY
You are a Senior Debugging Specialist. Your job is to DIAGNOSE failures, not create tasks or fix code.

# YOUR MISSION
A Developer tried to complete a task but failed after multiple attempts. You must:
1. **Analyze** what went wrong
2. **Identify** the root cause (not just symptoms)
3. **Provide** specific guidance for fixing it

# TOOLS AVAILABLE
You have READ-ONLY tools:
- `read_file` - Check file contents (use line ranges for large files!)
- `search_files` - Find code patterns (returns line numbers)
- `list_files` - Explore structure
- `run_shell` - Run diagnostic commands (npm list, grep, cat, etc.)
- `search_web` - Look up error messages
- `read_logs` - Check application logs

You CANNOT modify files or run tests. Your job is ANALYSIS, not EXECUTION.

# CRITICAL RULES
1. **DO NOT** suggest "read the file" if Developer already read it
2. **DO NOT** create new tasks - provide insights
3. **DO** identify patterns in failed attempts
4. **DO** suggest DIFFERENT approaches than what was tried
5. **DO** explain WHY previous attempts failed
6. **DO** use your tools to verify assumptions before diagnosing

# OUTPUT FORMAT
After your analysis, return JSON:
{
    "diagnosis": "Clear explanation of what's wrong",
    "root_cause": "The underlying issue (not symptoms)",
    "what_developer_tried": ["List of approaches already attempted"],
    "why_it_failed": "Specific reason each approach didn't work",
    "guidance": "Specific steps to fix (not generic 'read file')",
    "needs_replanning": false  // true if task approach is fundamentally wrong
}

# EXAMPLE BAD OUTPUT
{
    "guidance": "Read backend/tests/setup.js"  ← Developer already did this!
}

# EXAMPLE GOOD OUTPUT
{
    "diagnosis": "Test is failing because beforeEach doesn't reset candidate_rankings array",
    "root_cause": "The __PG_TEST_STATE.candidate_rankings array is not being cleared between tests",
    "what_developer_tried": [
        "Read setup.js to check beforeEach",
        "Read pg.js mock to see arrays",
        "Modified beforeEach to add reset logic"
    ],
    "why_it_failed": "Developer added reset for candidates array but missed candidate_rankings",
    "guidance": "In setup.js beforeEach, add: __PG_TEST_STATE.candidate_rankings = []",
    "needs_replanning": false
}

# WHEN TO SET needs_replanning = true
Only if the task's fundamental approach is wrong. Examples:
- Task says "use library X" but library X doesn't exist
- Task requires feature Y but codebase doesn't support it
- Task assumes architecture Z but project uses different architecture

If it's just a bug or missing code, keep needs_replanning = false.
"""
        
        # Build context from failed attempts
        attempts_summary = self._build_attempts_summary(failed_attempts)
        execution_logs = "\n".join(task_context[-20:]) if task_context else "No execution logs available"
        
        user_prompt = f"""
Task Description: {failed_task['description']}

Task Logic/Details: {failed_task.get('logic', 'N/A')}

Failed Attempts Summary:
{attempts_summary}

Last Error:
{json.dumps(last_error, indent=2)}

Recent Execution Logs:
{execution_logs}

---

Please analyze this failure. Use your tools to investigate if needed, then provide your diagnosis in JSON format.
"""
        
        # Agent loop with tools
        messages = [HumanMessage(content=user_prompt)]
        MAX_TURNS = 30
        diagnosis_data = None
        
        for turn in range(MAX_TURNS):
            res = self.copilot.act(system_prompt, messages, tools=tools, active_node="diagnostician")
            
            if res.get("error"):
                logger.warning(f"Diagnostician LLM Error: {res['error']}")
                break
            
            ai_msg = res["content"]
            messages.append(ai_msg)
            
            # If tool calls, execute them
            if ai_msg.tool_calls:
                if ai_msg.content:
                    self.copilot.emit_thought(ai_msg.content, "diagnostician")
                
                for tool_call in ai_msg.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]
                    
                    self.copilot.emit_thought(f"Investigating: {tool_name}({args})", "diagnostician")
                    
                    selected_tool = next((t for t in tools if t.name == tool_name), None)
                    tool_result = "Tool not found"
                    if selected_tool:
                        try:
                            tool_result = selected_tool.invoke(args)
                        except Exception as e:
                            tool_result = f"Error: {e}"
                    
                    messages.append(ToolMessage(content=str(tool_result), tool_call_id=tool_id))
            else:
                # No tool calls - check for final diagnosis
                content_text = ai_msg.content if hasattr(ai_msg, 'content') else str(ai_msg)
                
                # Try to parse JSON diagnosis
                diagnosis_data = self._parse_diagnosis(content_text)
                if diagnosis_data:
                    break
        
        if not diagnosis_data:
            # Fallback if no valid diagnosis
            diagnosis_data = {
                "diagnosis": "Unable to complete diagnosis within turn limit",
                "root_cause": "Analysis incomplete",
                "guidance": "Halting for user review.",
                "needs_replanning": True
            }
        
        # Determine next status (Stop on failure instead of Architect)
        next_status = "failed" if diagnosis_data.get("needs_replanning") else "diagnosed"
        
        logger.info(f"Diagnostician: {diagnosis_data.get('diagnosis', 'No diagnosis')}")
        
        return {
            "diagnosis": diagnosis_data,
            "status": next_status,
            "logs": [f"Diagnostician: {diagnosis_data['diagnosis']}"],
            "failed_task": failed_task  # Pass through for Developer to see
        }
    
    def _build_attempts_summary(self, failed_attempts):
        """Build readable summary of what was tried."""
        if not failed_attempts:
            return "No detailed attempt history available."
        
        summary = []
        for attempt in failed_attempts:
            summary.append(f"Attempt {attempt.get('attempt_number', '?')}:")
            summary.append(f"  Action: {attempt.get('action', 'unknown')}")
            summary.append(f"  Command: {attempt.get('command', 'N/A')}")
            
            error = attempt.get('error', {})
            summary.append(f"  Error Type: {error.get('error_type', 'Unknown')}")
            if error.get('error_message'):
                summary.append(f"  Error Message: {error.get('error_message')}")
            if error.get('file'):
                summary.append(f"  Location: {error.get('file')}:{error.get('line', '?')}")
            summary.append("")
        
        return "\n".join(summary)
    
    def _parse_diagnosis(self, ai_message):
        """Extract JSON diagnosis from LLM response."""
        content = ai_message if isinstance(ai_message, str) else (ai_message.content if hasattr(ai_message, 'content') else str(ai_message))
        
        # Try to extract JSON
        try:
            # Remove markdown code blocks
            cleaned = content.replace("```json", "").replace("```", "").strip()
            
            # Try to find JSON object
            start = cleaned.find("{")
            end = cleaned.rfind("}") + 1
            
            if start != -1 and end > start:
                json_str = cleaned[start:end]
                data = json.loads(json_str)
                
                # Validate required fields
                if "diagnosis" in data and "guidance" in data:
                    return data
        except Exception as e:
            logger.warning(f"Failed to parse diagnosis JSON: {e}")
        
        return None
