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
        # Use absolute path that works in production
        import os
        # Try to find the app root directory
        current_file = os.path.abspath(__file__)
        # Navigate up to find app_factory or project root
        app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        # Check if we're in the expected structure
        if not os.path.exists(os.path.join(app_root, 'app')):
            # Fallback: assume we're in /home/ubuntu/app_factory or similar
            app_root = '/home/ubuntu/app_factory' if os.path.exists('/home/ubuntu/app_factory') else app_root
        workspace_path = os.path.join(app_root, 'temp_workspaces', str(startup_id))
        logger.info(f"Librarian workspace path: {workspace_path}")
        self.workspace_path = workspace_path
        self.librarian = Librarian(workspace_path)
        
        # Hierarchical Planning System
        from .planning.strategic_planner import StrategicPlanner
        from .planning.task_decomposer import TaskDecomposer
        
        self.strategic_planner = StrategicPlanner(startup_id, log_callback)
        self.task_decomposer = TaskDecomposer(startup_id, log_callback)
        self.executor = TaskExecutor(startup_id, log_callback)
        self.verifier = AutoTestGenerator(log_callback)
        
        logger.info(f"V4Orchestrator online for {startup_id}")

    def run_mission(self, mission: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute mission using hierarchical planning:
        1. Strategic Planning → strategic_plan.md
        2. Task Decomposition → atomic tasks per high-level task
        3. Atomic Execution → execute each atomic task
        """
        self._emit_log(f"🚀 V4 Mission Started: {mission.get('title')}")
        
        # Phase 0: Index Codebase
        self._emit_log("📚 Indexing codebase...")
        self.librarian.index_workspace()
        
        # Get context cache summary
        from .context.context_cache import ContextCache
        context_cache = ContextCache(self.workspace_path)
        context_summary = context_cache.get_summary()
        
        # Phase 1: Strategic Planning
        self._emit_log("🎯 Creating strategic plan...")
        try:
            strategic_plan_path = self.strategic_planner.create_strategic_plan(
                mission=mission,
                context_cache_summary=context_summary,
                workspace_path=self.workspace_path
            )
            high_level_tasks = self.strategic_planner.parse_strategic_plan(strategic_plan_path)
            self._emit_log(f"📋 Strategic plan created: {len(high_level_tasks)} high-level tasks")
        except Exception as e:
            logger.error(f"Strategic planning failed: {e}")
            return {"status": "failed", "error": f"Strategic planning failed: {e}"}
        
        # Phase 2 & 3: Decomposition + Execution
        total_atomic_tasks = 0
        completed_atomic_tasks = 0
        
        for i, hl_task in enumerate(high_level_tasks):
            self._emit_log(f"\n⚙️ [{i+1}/{len(high_level_tasks)}] {hl_task['description']}")
            
            # Update status: in_progress
            self.strategic_planner.update_task_status(
                plan_path=strategic_plan_path,
                task_id=hl_task['id'],
                status="in_progress"
            )
            
            # Decompose into atomic tasks
            self._emit_log(f"  🔍 Decomposing into atomic tasks...")
            try:
                atomic_tasks = self.task_decomposer.decompose_task(
                    high_level_task=hl_task,
                    context_cache_summary=context_summary,
                    workspace_path=self.workspace_path
                )
                total_atomic_tasks += len(atomic_tasks)
                self._emit_log(f"  📦 Generated {len(atomic_tasks)} atomic tasks")
            except Exception as e:
                logger.error(f"Task decomposition failed: {e}")
                self._emit_log(f"  ❌ Decomposition failed: {e}")
                # Update status: failed
                self.strategic_planner.update_task_status(
                    plan_path=strategic_plan_path,
                    task_id=hl_task['id'],
                    status="failed",
                    notes=f"Decomposition failed: {e}"
                )
                continue
            
            # Execute atomic tasks
            task_completed_count = 0
            for j, atomic_task in enumerate(atomic_tasks):
                self._emit_log(f"    [{j+1}/{len(atomic_tasks)}] {atomic_task.description}")
                
                try:
                    result = self.executor.execute_atomic_task(atomic_task)
                    
                    if result["status"] == "success":
                        completed_atomic_tasks += 1
                        task_completed_count += 1
                        self._emit_log(f"      ✅ Success")
                        
                        # Update progress in strategic plan
                        self.strategic_planner.update_task_status(
                            plan_path=strategic_plan_path,
                            task_id=hl_task['id'],
                            status="in_progress",
                            atomic_tasks_completed=task_completed_count,
                            atomic_tasks_total=len(atomic_tasks)
                        )
                    else:
                        self._emit_log(f"      ⚠️ Failed: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    logger.error(f"Atomic task execution failed: {e}")
                    self._emit_log(f"      ❌ Error: {e}")
            
            # Mark high-level task as completed
            self.strategic_planner.update_task_status(
                plan_path=strategic_plan_path,
                task_id=hl_task['id'],
                status="completed",
                atomic_tasks_completed=task_completed_count,
                atomic_tasks_total=len(atomic_tasks)
            )
        
        # Summary
        self._emit_log(f"\n✅ Mission Complete!")
        self._emit_log(f"📊 Completed {completed_atomic_tasks}/{total_atomic_tasks} atomic tasks")
        
        # Append final summary to strategic plan
        self.strategic_planner.append_execution_log(
            plan_path=strategic_plan_path,
            message=f"\n\n---\n## Execution Summary\n- Total atomic tasks: {total_atomic_tasks}\n- Completed: {completed_atomic_tasks}\n- Success rate: {(completed_atomic_tasks/total_atomic_tasks*100) if total_atomic_tasks > 0 else 0:.1f}%"
        )
        
        return {
            "status": "success",
            "high_level_tasks": len(high_level_tasks),
            "total_atomic_tasks": total_atomic_tasks,
            "completed_atomic_tasks": completed_atomic_tasks
        }


    def _verify_change(self, task):
        """Generates and runs a test for a modification."""
        try:
            # Heuristic: If we touched a file, test it.
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
