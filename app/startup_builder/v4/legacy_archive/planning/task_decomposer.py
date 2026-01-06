"""
Task Decomposer for V4 Agent

Breaks high-level tasks into 10-20 atomic tasks.
Each atomic task = 1 file operation (create/update/delete/command).
"""

import os
import json
import logging
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime

from ..llm.copilot import V4CoPilot

logger = logging.getLogger(__name__)


@dataclass
class AtomicTask:
    """Single atomic operation"""
    id: str
    action: str  # create_file, update_file, run_command
    file_path: str = None
    content: str = None  # Full file content or code snippet
    command: str = None
    description: str = ""
    dependencies: List[str] = None  # IDs of tasks that must complete first
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []


class TaskDecomposer:
    """
    Decomposes high-level tasks into atomic tasks.
    
    Input: High-level task (e.g., "Implement user authentication")
    Output: 10-20 atomic tasks (each = 1 file operation)
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
    
    def decompose_task(
        self,
        high_level_task: Dict[str, Any],
        context_cache_summary: Dict[str, Any],
        workspace_path: str
    ) -> List[AtomicTask]:
        """
        Decompose high-level task into atomic tasks.
        
        Args:
            high_level_task: Task from strategic plan
            context_cache_summary: Project context
            workspace_path: Path to workspace
            
        Returns:
            List of atomic tasks
        """
        task_desc = high_level_task.get("description", "")
        task_id = high_level_task.get("id", "unknown")
        
        logger.info(f"TaskDecomposer: Decomposing '{task_desc}'")
        
        # Build decomposition prompt
        system_prompt = self._build_decomposition_prompt(context_cache_summary)
        
        user_prompt = f"""
High-Level Task: {task_desc}

FIRST: Use read_context_cache("strategic_plan") to see the full strategic plan and understand:
- What tasks have been completed (✅)
- What tasks are in progress (🔄)
- Dependencies between tasks
- Overall project structure

Then break this task down into 10-20 ATOMIC tasks. Each atomic task must be ONE of:
1. create_file: Create a new file with complete content
2. update_file: Modify an existing file (add/change code)
3. run_command: Execute a shell command

Output JSON array:
```json
[
  {{
    "id": "atomic_1",
    "action": "create_file",
    "file_path": "backend/src/routes/auth.js",
    "content": "const express = require('express');\\n...",
    "description": "Create authentication routes",
    "dependencies": []
  }},
  {{
    "id": "atomic_2",
    "action": "update_file",
    "file_path": "backend/src/app.js",
    "content": "app.use('/api/auth', authRoutes);",
    "description": "Register auth routes in main app",
    "dependencies": ["atomic_1"]
  }}
]
```

CRITICAL:
- READ strategic_plan FIRST to avoid duplicating completed work
- Each task = 1 file operation
- Provide COMPLETE file content for create_file
- Provide EXACT code to add for update_file
- Order tasks logically (dependencies first)
- Generate 10-20 tasks minimum
"""
        
        # Get atomic tasks from LLM
        atomic_tasks = []
        
        for attempt in range(3):
            res = self.copilot.ask(system_prompt, user_prompt)
            
            if hasattr(res, 'content'):
                content = res.content
            else:
                content = str(res)
            
            # Extract JSON
            try:
                # Find JSON array in response
                start = content.find('[')
                end = content.rfind(']') + 1
                
                if start != -1 and end > start:
                    json_str = content[start:end]
                    tasks_data = json.loads(json_str)
                    
                    # Convert to AtomicTask objects
                    for i, task_data in enumerate(tasks_data):
                        atomic_tasks.append(AtomicTask(
                            id=f"{task_id}_atomic_{i+1}",
                            action=task_data.get("action", "create_file"),
                            file_path=task_data.get("file_path"),
                            content=task_data.get("content"),
                            command=task_data.get("command"),
                            description=task_data.get("description", ""),
                            dependencies=task_data.get("dependencies", [])
                        ))
                    
                    break
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse atomic tasks JSON (attempt {attempt+1}): {e}")
                continue
        
        if not atomic_tasks:
            logger.error(f"Failed to decompose task: {task_desc}")
            # Create fallback atomic task
            atomic_tasks = [AtomicTask(
                id=f"{task_id}_atomic_1",
                action="run_command",
                command="echo 'Task decomposition failed'",
                description=f"Fallback for: {task_desc}"
            )]
        
        # Save atomic tasks to file
        atomic_plan_path = os.path.join(workspace_path, "artifacts", f"{task_id}_atomic_plan.json")
        os.makedirs(os.path.dirname(atomic_plan_path), exist_ok=True)
        
        with open(atomic_plan_path, 'w', encoding='utf-8') as f:
            json.dump([asdict(t) for t in atomic_tasks], f, indent=2)
        
        logger.info(f"Decomposed into {len(atomic_tasks)} atomic tasks. Saved to: {atomic_plan_path}")
        
        return atomic_tasks
    
    def _build_decomposition_prompt(self, context_summary: Dict[str, Any]) -> str:
        """Build system prompt for task decomposition"""
        return f"""
# TASK DECOMPOSER - V4 AGENT

## Your Role
You are a Senior Developer breaking down high-level tasks into ATOMIC operations.

## Project Context
- Total Files: {context_summary.get('total_files', 0)}
- Tech Stack: {context_summary.get('tech_stack', 'Unknown')}
- Key Files: {', '.join(context_summary.get('key_files', [])[:5])}

## IMPORTANT: Strategic Plan Available
Use read_context_cache("strategic_plan") to see:
- Overall mission plan
- Completed tasks (✅)
- In-progress tasks (🔄)
- Task dependencies

This helps you avoid duplicating work and understand context!

## Atomic Task Definition
An atomic task is ONE of:
1. **create_file**: Create a new file with COMPLETE content
2. **update_file**: Modify existing file (add/change specific code)
3. **run_command**: Execute a shell command (npm install, mkdir, etc.)

## Guidelines
1. **Read strategic plan FIRST**: Use read_context_cache("strategic_plan")
2. **Be specific**: Exact file paths, complete code
3. **One operation per task**: Don't combine create + update
4. **Order matters**: List dependencies explicitly
5. **Complete code**: For create_file, provide FULL file content
6. **Precise updates**: For update_file, provide EXACT code to add
7. **Generate 10-20+ tasks**: Break it down thoroughly

## Example Decomposition

High-level: "Implement user authentication"

Atomic tasks:
1. create_file: backend/src/models/User.js (full Mongoose schema)
2. create_file: backend/src/routes/auth.js (login/register routes)
3. create_file: backend/src/middleware/auth.js (JWT verification)
4. update_file: backend/src/app.js (register auth routes)
5. create_file: backend/src/controllers/authController.js (auth logic)
6. run_command: npm install jsonwebtoken bcrypt
7. create_file: frontend/src/components/Login.jsx (login form)
8. create_file: frontend/src/components/Register.jsx (register form)
9. create_file: frontend/src/services/authService.js (API calls)
10. update_file: frontend/src/App.jsx (add auth routes)
11. create_file: frontend/src/context/AuthContext.jsx (auth state)
12. update_file: frontend/src/index.js (wrap with AuthProvider)

Remember: READ strategic_plan FIRST, then ATOMIC = 1 file operation. Be thorough!
"""
