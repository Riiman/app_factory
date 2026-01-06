"""
Strategic Planner for V4 Agent

Creates high-level strategic plans (5-10 tasks) and saves them to markdown.
"""

import os
import logging
from typing import Dict, Any, List
from datetime import datetime

from ..llm.copilot import V4CoPilot
from ..prompting.architect_prompts import ArchitectPromptEnhancer

logger = logging.getLogger(__name__)


class StrategicPlanner:
    """
    Creates high-level strategic plans for missions.
    
    Output: strategic_plan.md with 5-10 high-level tasks
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.copilot = V4CoPilot(use_thinking=True, log_callback=log_callback)
        self.prompt_enhancer = ArchitectPromptEnhancer()
    
    def create_strategic_plan(
        self,
        mission: Dict[str, Any],
        context_cache_summary: Dict[str, Any],
        workspace_path: str
    ) -> str:
        """
        Creates high-level strategic plan and saves to markdown.
        
        Args:
            mission: Mission data (title, description, type)
            context_cache_summary: Minimal project context
            workspace_path: Path to workspace for saving plan
            
        Returns:
            Path to strategic_plan.md
        """
        mission_title = mission.get("title", "Unknown Mission")
        mission_desc = mission.get("description", "")
        
        logger.info(f"StrategicPlanner: Creating strategic plan for '{mission_title}'")
        
        # Build prompt for strategic planning
        system_prompt = self._build_strategic_prompt(mission, context_cache_summary)
        
        user_prompt = f"""
Mission: {mission_title}

{mission_desc}

Create a strategic plan with 5-10 high-level tasks. Each task should represent a major milestone or feature.

Output format:
# Strategic Plan: [Mission Title]

## Phase 1: [Phase Name]
- **Task 1**: [High-level task description]
- **Task 2**: [High-level task description]

## Phase 2: [Phase Name]
- **Task 3**: [High-level task description]
...

IMPORTANT: Keep tasks high-level. Each task will be decomposed into 10-20 atomic tasks later.
"""
        
        # Get strategic plan from LLM
        messages = []
        plan_markdown = None
        
        for turn in range(5):
            res = self.copilot.ask(system_prompt, user_prompt)
            
            if hasattr(res, 'content'):
                content = res.content
            else:
                content = str(res)
            
            # Extract markdown plan
            if "# Strategic Plan" in content:
                plan_markdown = content
                break
            
            # If no plan yet, ask for it
            user_prompt = "Please provide the strategic plan in markdown format as requested."
        
        if not plan_markdown:
            logger.error("Failed to generate strategic plan")
            plan_markdown = f"# Strategic Plan: {mission_title}\n\n## Phase 1: Setup\n- **Task 1**: Initial setup\n"
        
        # Save to file
        plan_path = os.path.join(workspace_path, "artifacts", "strategic_plan.md")
        os.makedirs(os.path.dirname(plan_path), exist_ok=True)
        
        with open(plan_path, 'w', encoding='utf-8') as f:
            f.write(plan_markdown)
        
        logger.info(f"Strategic plan saved to: {plan_path}")
        
        return plan_path
    
    def _build_strategic_prompt(self, mission: Dict[str, Any], context_summary: Dict[str, Any]) -> str:
        """Build system prompt for strategic planning"""
        return f"""
# STRATEGIC PLANNER - V4 AGENT

## Your Role
You are a Senior Technical Architect creating HIGH-LEVEL strategic plans.

## Project Context
- Total Files: {context_summary.get('total_files', 0)}
- Tech Stack: {context_summary.get('tech_stack', 'Unknown')}
- Key Files: {', '.join(context_summary.get('key_files', [])[:5])}

## Your Task
Create a strategic plan with 5-10 HIGH-LEVEL tasks that will be decomposed later.

## Guidelines
1. **Think in phases**: Setup, Core Features, Integration, Testing
2. **Each task = 1 major milestone** (e.g., "Implement user authentication")
3. **Don't specify implementation details** (those come in decomposition)
4. **Focus on WHAT to build**, not HOW to build it
5. **Order tasks logically** (dependencies first)

## Output Format
Markdown with clear phases and tasks. Use this structure:

```markdown
# Strategic Plan: [Mission Title]

## Phase 1: [Phase Name]
- **Task 1**: [Description]
- **Task 2**: [Description]

## Phase 2: [Phase Name]
- **Task 3**: [Description]
...
```

## Example
```markdown
# Strategic Plan: E-commerce Platform

## Phase 1: Foundation
- **Task 1**: Set up backend API structure (Node.js/Express)
- **Task 2**: Set up frontend framework (React with routing)

## Phase 2: Core Features
- **Task 3**: Implement user authentication system
- **Task 4**: Implement product catalog and search
- **Task 5**: Implement shopping cart functionality

## Phase 3: Integration & Testing
- **Task 6**: Integrate payment gateway
- **Task 7**: Add comprehensive error handling
- **Task 8**: Create end-to-end tests
```

Remember: Keep it HIGH-LEVEL. Details come later in decomposition.
"""
    
    def parse_strategic_plan(self, plan_path: str) -> List[Dict[str, Any]]:
        """
        Parse strategic_plan.md into structured tasks.
        
        Returns:
            List of high-level tasks with phase info
        """
        with open(plan_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tasks = []
        current_phase = "Unknown"
        task_id = 1
        
        for line in content.split('\n'):
            line = line.strip()
            
            # Detect phase headers
            if line.startswith('## Phase'):
                current_phase = line.replace('## Phase', '').strip()
            
            # Detect tasks
            elif line.startswith('- **Task'):
                # Extract task description
                # Format: - **Task 1**: Description
                parts = line.split('**:', 1)
                if len(parts) == 2:
                    description = parts[1].strip()
                    tasks.append({
                        "id": f"task_{task_id}",
                        "phase": current_phase,
                        "description": description,
                        "status": "pending"
                    })
                    task_id += 1
        
        logger.info(f"Parsed {len(tasks)} high-level tasks from strategic plan")
        return tasks
    
    def update_task_status(
        self,
        plan_path: str,
        task_id: str,
        status: str,
        atomic_tasks_completed: int = 0,
        atomic_tasks_total: int = 0,
        notes: str = ""
    ):
        """
        Update strategic_plan.md with task progress.
        
        Args:
            plan_path: Path to strategic_plan.md
            task_id: Task ID (e.g., "task_1")
            status: "in_progress", "completed", "failed"
            atomic_tasks_completed: Number of atomic tasks completed
            atomic_tasks_total: Total atomic tasks for this task
            notes: Additional notes or errors
        """
        with open(plan_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the task line and update it
        lines = content.split('\n')
        updated_lines = []
        task_num = task_id.replace('task_', '')
        
        for line in lines:
            if f'**Task {task_num}**:' in line:
                # Add status indicator
                if status == "in_progress":
                    status_emoji = "🔄"
                elif status == "completed":
                    status_emoji = "✅"
                elif status == "failed":
                    status_emoji = "❌"
                else:
                    status_emoji = "⏸️"
                
                # Update line with status
                if atomic_tasks_total > 0:
                    progress = f" {status_emoji} ({atomic_tasks_completed}/{atomic_tasks_total} atomic tasks)"
                else:
                    progress = f" {status_emoji}"
                
                # Remove old status if exists
                if "🔄" in line or "✅" in line or "❌" in line or "⏸️" in line:
                    # Remove old status
                    for emoji in ["🔄", "✅", "❌", "⏸️"]:
                        if emoji in line:
                            line = line.split(emoji)[0].rstrip()
                
                updated_lines.append(line + progress)
                
                # Add notes if provided
                if notes:
                    updated_lines.append(f"  > {notes}")
            else:
                updated_lines.append(line)
        
        # Write updated content
        with open(plan_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(updated_lines))
        
        logger.info(f"Updated {task_id} status to {status}")
    
    def append_execution_log(self, plan_path: str, message: str):
        """
        Append execution log to strategic_plan.md.
        
        Args:
            plan_path: Path to strategic_plan.md
            message: Log message to append
        """
        with open(plan_path, 'a', encoding='utf-8') as f:
            timestamp = datetime.now().strftime("%H:%M:%S")
            f.write(f"\n[{timestamp}] {message}")
