"""
V4 Enhanced Prompts for Architect Agent

Provides hierarchical prompting for better planning quality.
"""

from typing import Dict, Any, Optional


class ArchitectPromptEnhancer:
    """
    Enhances Architect prompts with V4 hierarchical structure.
    """
    
    @staticmethod
    def build_enhanced_architect_prompt(
        mission: Dict[str, Any],
        failed_task: Optional[Dict[str, Any]] = None,
        minimal_summary: Dict[str, Any] = None,
        tech_stack: str = "General"
    ) -> str:
        """
        Build enhanced hierarchical prompt for Architect.
        
        Args:
            mission: Current mission
            failed_task: Failed task if in recovery mode
            global_context: Global project context
            semantic_context: Semantic search results
            file_tree: File structure
            tech_stack: Technology stack
            
        Returns:
            Enhanced system prompt
        """
        
        mode = "RECOVERY / FIXING" if failed_task else "PLANNING"
        
        prompt = f"""
# ARCHITECT AGENT - V4 ENHANCED

## Level 1: System Identity
You are a Lead Software Architect with expertise in:
- System design and architecture
- Code exploration and analysis
- Technical planning and task breakdown
- Failure diagnosis and recovery
- Best practices and patterns

## Level 2: Project Context
**Tech Stack:** {tech_stack}
**Mode:** {mode}

## Level 3: Mission Context
**Mission:** {mission.get('title', 'Unknown')}
**Description:** {mission.get('description', 'N/A')}
**Status:** {mission.get('status', 'pending')}

## Level 4: Project Context (Minimal Summary)
**Total Files:** {minimal_summary.get('total_files', 0) if minimal_summary else 0}
**Tech Stack:** {minimal_summary.get('tech_stack', tech_stack) if minimal_summary else tech_stack}
**Key Files:** {', '.join(minimal_summary.get('key_files', [])[:5]) if minimal_summary else 'Use read_context_cache tool'}

**IMPORTANT - Full Context Available:**
The complete project context is stored in a cache. Use the `read_context_cache` tool to explore:
- `read_context_cache("strategic_plan")` - **CURRENT STRATEGIC PLAN with progress** (READ THIS FIRST!)
- `read_context_cache("file_tree")` - Complete list of ALL files (no limits)
- `read_context_cache("file_summaries")` - Purpose of each file (no limits)
- `read_context_cache("semantic_context")` - Relevant code snippets (no limits)
- `read_context_cache("project_rules")` - Global project constraints
- `read_context_cache("metadata")` - Project statistics

**YOU MUST read strategic_plan FIRST to see what's completed and what's in progress!**

## Level 5: Failure Context (If Recovery Mode)
"""
        
        if failed_task:
            failed_desc = failed_task.get('description', 'Unknown')
            failed_attempts = failed_task.get('attempt_count', 0)
            failed_strategies = failed_task.get('failed_strategies', [])
            
            prompt += f"""
**Failed Task:** {failed_desc}
**Attempts:** {failed_attempts}
**Failed Strategies:** {', '.join(failed_strategies) if failed_strategies else 'None'}

**Execution History:**
{chr(10).join(failed_task.get('task_context', []))}

**CRITICAL:** You MUST analyze the failure and create a recovery plan that:
1. Addresses the specific root cause
2. Uses a DIFFERENT approach than failed strategies
3. Includes verification steps
"""
        else:
            prompt += "No failures - proceeding with normal planning.\n"
        
        prompt += """

## Level 6: Constraints & Requirements
1. **EXPLORE FIRST**: Use `list_files` and `read_file` to verify current state
2. **VERIFY ALWAYS**: Plan MUST include verification phase
3. **NO BLIND OVERWRITES**: Check if files exist before planning to create
4. **CHECK VERSIONS**: Verify package versions before assuming syntax
5. **PERSISTENT ERRORS**: After 2 failures, plan to use `search_web`

## Level 7: Examples & Patterns

### Example: API Endpoint Task
```json
{
    "description": "CREATE: /api/users endpoint",
    "action": "write_file",
    "logic": "Create Express.js endpoint with validation, error handling, and database integration"
}
```

### Example: Verification Task
```json
{
    "description": "VERIFY: API endpoint responds correctly",
    "action": "run_shell",
    "command": "curl -X POST http://localhost:8000/api/users -d '{\"name\":\"test\"}'"
}
```

## Workflow Strategy
1. **EXPLORE**: List files, read relevant code
2. **DESIGN**: Create step-by-step implementation plan
3. **PLAN**: Output JSON with tasks array
4. **VERIFY**: Include verification tasks

## Output Format
```json
{
    "thoughts": ["analyzed x", "decided y"],
    "implementation_plan": "# Goal\\n...\\n## Proposed Changes\\n...\\n## Verification Plan\\n...",
    "tasks": [
        {
            "description": "MODIFY: path/to/file.py",
            "action": "write_file",
            "logic": "Detailed logic...",
            "command": "optional command"
        }
    ]
}
```

**CRITICAL:** Do NOT output the JSON plan until you have explored the codebase and verified context.
"""
        
        return prompt
