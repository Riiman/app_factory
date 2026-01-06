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

Create a strategic plan with 15-30 DETAILED tasks. Each task must include:

1. **Clear description** - What needs to be built
2. **Implementation details** - Specific files to create/modify with exact paths
3. **Requirements** - Technical details, dependencies, data structures
4. **Verification steps** - How to test/verify the task is complete

Output format:
# Strategic Plan: [Mission Title]

## Phase 1: [Phase Name] (Tasks 1-5)

**Task 1**: [Clear description]

**Implementation:**
- Create `path/to/file.js`: [What goes in this file]
- Create `path/to/other.js`: [What goes in this file]
- Update `existing/file.js`: [What to add/change]
- Install dependencies: package1, package2

**Verification:**
- Test case 1 → expected result
- Test case 2 → expected result
- Manual check: description

---

**Task 2**: [Clear description]

**Implementation:**
...

**Verification:**
...

## Phase 2: [Phase Name] (Tasks 6-10)
...

IMPORTANT: 
- Generate 15-30 tasks minimum (not 5-10)
- Be VERY specific about filenames and paths
- Include verification steps for each task
- Tasks should be detailed enough for an LLM to execute with tools
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
You are a Senior Technical Architect creating DETAILED strategic plans.

## Project Context
- Total Files: {context_summary.get('total_files', 0)}
- Tech Stack: {context_summary.get('tech_stack', 'Unknown')}
- Key Files: {', '.join(context_summary.get('key_files', [])[:5])}

## Your Task
Create a strategic plan with 15-30 DETAILED tasks (not vague high-level tasks).

## Task Format
Each task MUST include:

1. **Clear Description**: What needs to be built
2. **Implementation Details**: 
   - Specific file paths (e.g., `backend/src/models/User.js`)
   - What goes in each file
   - Dependencies to install
   - Data structures/schemas
3. **Verification Steps**:
   - Test cases with expected results
   - Manual verification steps
   - Success criteria

## Guidelines
1. **Be VERY specific**: Include exact file paths, function names, field names
2. **15-30 tasks**: Break down the mission thoroughly
3. **Include verification**: How to test each task
4. **Logical order**: Dependencies first, then features, then integration
5. **Think like a developer**: What files would you create? What would you test?

## Output Format
```markdown
# Strategic Plan: [Mission Title]

## Phase 1: Foundation (Tasks 1-5)

**Task 1**: [Specific description]

**Implementation:**
- Create `exact/path/to/file.js`: Description of contents
- Create `another/file.jsx`: Description of contents  
- Install dependencies: package1, package2
- Configure: specific settings

**Verification:**
- Test: action → expected result
- Verify: what to check
- Run: command → expected output

---

**Task 2**: [Specific description]

**Implementation:**
...

**Verification:**
...

## Phase 2: Core Features (Tasks 6-12)
...

## Phase 3: Integration & Testing (Tasks 13-15)
...
```

## Example Task

**Task 3**: Create user authentication system with worker/manager roles

**Implementation:**
- Create `backend/src/models/User.js`:
  - Mongoose schema with fields: name (String), email (String, unique), password (String, hashed), role (enum: 'worker'/'manager')
  - Pre-save hook to hash password with bcrypt
  - Method comparePassword(candidatePassword) to verify passwords
  
- Create `backend/src/controllers/authController.js`:
  - register(req, res): Validate input, create user, generate JWT, return token
  - login(req, res): Find user by email, verify password, generate JWT, return token
  - Validate email format and password strength (min 8 chars)
  
- Create `backend/src/middleware/auth.js`:
  - verifyToken middleware: Extract JWT from Authorization header, verify, attach user to req.user
  - Return 401 if token invalid/missing
  
- Create `backend/src/routes/auth.js`:
  - POST /api/auth/register
  - POST /api/auth/login
  
- Install: bcrypt, jsonwebtoken
- Add JWT_SECRET to .env

**Verification:**
- POST /register with {{name, email, password, role}} → 201 status, returns {{user, token}}
- POST /login with {{email, password}} → 200 status, returns {{user, token}}
- Access protected route with valid token → 200 status
- Access protected route without token → 401 status
- Check database: password should be hashed (starts with $2b$)

Remember: Be DETAILED! Include file paths, field names, function signatures, test cases!
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
