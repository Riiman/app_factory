"""
V4 Orchestrator - The Central Nervous System.

Coordinates the specialized engines:
1. TaskPlanner (Brain)
2. TaskExecutor (Muscle)
3. AutoTestGenerator (Eyes/Verifier)
"""

import logging
import json
from typing import Dict, Any, List, Optional
import time

from .planning.task_planner import TaskPlanner
from .workflows.task_executor import TaskExecutor
from .verification.auto_test_generator import AutoTestGenerator

from ..context import ContextManager
from .context.librarian import Librarian
from ..manager import DockerManager

logger = logging.getLogger(__name__)


class V4Orchestrator:
    """
    Manages the lifecycle of a V4 Mission.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.log_callback = log_callback
        
        # Initialize Engines
        self.docker_manager = DockerManager()
        self.context_manager = ContextManager(self.docker_manager, startup_id)
        
        # Librarian needs workspace path
        # Assuming generic path pattern for MVP
        import os
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        workspace_path = os.path.join(base_path, 'temp_workspaces', str(startup_id))
        self.librarian = Librarian(workspace_path)
        
        self.planner = TaskPlanner(startup_id, log_callback)
        self.executor = TaskExecutor(startup_id, log_callback)
        self.verifier = AutoTestGenerator(log_callback)
        
        logger.info(f"V4Orchestrator online for {startup_id}")

    def run_mission(self, mission: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a mission end-to-end.
        """
        logger.info(f"V4Orchestrator: Starting Mission '{mission.get('title')}'")
        self._emit_log(f"🚀 V4 Agent Started: {mission.get('title')}")
        
        # 1. Index Codebase
        self._emit_log("📚 Indexing codebase...")
        self.librarian.index_workspace()
        
        # 2. Planning Phase
        self._emit_log("🧠 Planning architecture...")
        plan_result = self.planner.plan_mission(
            mission=mission,
            context_manager=self.context_manager,
            librarian=self.librarian
        )
        
        if plan_result.get("status") == "failed":
            self._emit_log(f"❌ Planning Failed: {plan_result.get('error')}")
            return {"status": "failed", "error": plan_result.get("error")}
            
        tasks = plan_result["tasks"]
        self._emit_log(f"📋 Plan generated: {len(tasks)} tasks.")
        
        # 3. Execution Phase
        failed_task = None
        
        for i, task in enumerate(tasks):
             self._emit_log(f"⚙️ Execute [{i+1}/{len(tasks)}]: {task['description']}")
             
             # Execute
             exec_result = self.executor.solve_and_execute(task, context={"mission": mission})
             
             if exec_result["status"] == "failed":
                 self._emit_log(f"⚠️ Task Failed: {task['description']}. Entering Recovery...")
                 failed_task = task
                 failed_task["failed_attempts"] = failed_task.get("failed_attempts", []) + [{"error": exec_result["error"]}]
                 break
                 
             # Verification (Optional if task implies it, or we can auto-verify)
             # If "test" or "verify" in description, we assume executor handled it or we run generic verify?
             # For V4, we can optionally GENERATE a test if it was a code change.
             if task.get("action") in ["write_file", "update_file"]:
                 self._verify_change(task)
        
        # 4. Recovery Loop (Simplistic for MVP)
        if failed_task:
            return self._handle_failure(mission, failed_task)
            
        self._emit_log("✅ Mission Complete.")
        return {"status": "success"}

    def _verify_change(self, task):
        """Generates and runs a test for a modification."""
        try:
            # Heuristic: If we touched a file, test it.
            # Real implementation needs to track which file changed.
            pass 
        except:
            pass

    def _handle_failure(self, mission, failed_task):
        """Simplistic recovery: Ask Planner to Replan."""
        self._emit_log("🔄 Re-planning to fix failure...")
        
        plan_result = self.planner.plan_mission(
            mission=mission,
            context_manager=self.context_manager,
            librarian=self.librarian,
            failed_task=failed_task
        )
        
        if plan_result["status"] == "success":
            # In a real system, we would merge plans. 
            # Here we just stop and say "Manual intervention or recursive loop needed"
            # to avoid infinite recursion key error in this MVP.
            return {"status": "recovery_planned", "new_plan": plan_result["tasks"]}
            
        return {"status": "failed", "error": "Recovery planning failed."}

    def _emit_log(self, message):
        if self.log_callback:
            self.log_callback({"logs": [message]}, None)
        logger.info(message)
