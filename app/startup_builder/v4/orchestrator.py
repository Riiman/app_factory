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
    V4 Orchestrator - The Central Control System.
    
    Implements the Explore -> Plan -> Execute -> Feedback Control Loop.
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.log_callback = log_callback
        
        # Initialize Context Path
        import os
        current_file = os.path.abspath(__file__)
        app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
        if not os.path.exists(os.path.join(app_root, 'app')):
            app_root = '/home/ubuntu/app_factory' if os.path.exists('/home/ubuntu/app_factory') else app_root
        self.workspace_path = os.path.join(app_root, 'temp_workspaces', str(startup_id))
        
        # Initialize 4 Engines
        from .engines.exploration import ExplorationEngine
        from .engines.planning import StrategicPlanner
        from .engines.execution import TaskExecutor
        from .engines.feedback import FeedbackLoop
        
        self.sensors = ExplorationEngine(startup_id, self.workspace_path)
        self.controller = StrategicPlanner(startup_id, log_callback)
        self.actuator = TaskExecutor(startup_id, log_callback)
        self.monitor = FeedbackLoop()
        
        self._emit_log(f"System Online: Control Loop Ready for {startup_id}")

    def run_product_build(self, product_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        WORKFLOW: Complete Product Build.
        Iteratively builds features using the Control Loop.
        """
        features = product_context.get("features", [])
        self._emit_log(f"🏭 Starting Product Build Workflow: {len(features)} features")
        
        # WORKFLOW MEMORY (Long-term Context)
        workflow_memory = {
            "decisions": [],
            "completed_features": []
        }
        
        failed_features = []
        
        for i, feature in enumerate(features):
            f_name = feature.get("name", f"Feature {i+1}")
            f_id = feature.get("id")
            
            self._emit_log(f"\n👉 [Feature {i+1}/{len(features)}] {f_name}")
            
            # 1. Sync DB (IN_PROGRESS)
            if f_id: self._update_feature_status(f_id, "IN_PROGRESS")
            
            # 2. Run Control Loop
            # We construct a goal that includes the feature description and acceptance criteria
            goal = f"Implement Feature: {f_name}\nDescription: {feature.get('description')}\nCriteria: {feature.get('acceptance_criteria')}"
            
            result = self._run_control_loop(goal, max_retries=3, workflow_memory=workflow_memory)
            
            # 3. Handle Result
            if result["status"] == "success":
                if f_id: self._update_feature_status(f_id, "COMPLETED")
                workflow_memory["completed_features"].append(f_name)
                self._emit_log(f"✅ Feature '{f_name}' Completed")
            else:
                # Keep status as IN_PROGRESS (or PENDING?) for retry. 
                # User might want to debug.
                failed_features.append(f_name)
                self._emit_log(f"❌ Feature '{f_name}' Failed: {result.get('error')}")
                # We optionally continue to next feature or stop? 
                # Usually better to stop if dependencies exist, but for now we continue?
                # "Trigger cycle for each of them" implies sequence.
                # Let's continue, maybe next feature works.
                
        if failed_features:
            return {"status": "partial_success", "failed": failed_features}
        return {"status": "success"}

    def _update_feature_status(self, feature_id: int, status: str):
        """Helper to sync status to DB."""
        try:
             # This requires app context if running in Flask, which Orchestrator usually is.
             # We perform a local import to avoid circular dep issues at module level
             from app.extensions import db
             from app.models import Feature, FeatureStatus
             
             f = Feature.query.get(feature_id)
             if f:
                 if status == "IN_PROGRESS": f.status = FeatureStatus.IN_PROGRESS
                 elif status == "COMPLETED": f.status = FeatureStatus.COMPLETED
                 elif status == "PENDING": f.status = FeatureStatus.PENDING
                 db.session.commit()
        except Exception as e:
            logger.error(f"Failed to sync feature status {feature_id}: {e}")

    def _run_control_loop(self, goal: str, max_retries: int = 3, workflow_memory: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        ENGINE: The Core Control Loop.
        Explore -> Plan -> Execute -> Feedback.
        """
        self._emit_log(f"🚀 Control Cycle Start: {goal.splitlines()[0]}...")
        
        # CYCLE MEMORY (Short-term RAM)
        # We inject workflow_memory so Engines can see it.
        cycle_memory = {
            "execution_history": [],
            "workflow_context": workflow_memory or {}
        }
        
        attempt = 0
        feedback = None
        
        while attempt < max_retries:
            cycle_id = f"cycle_{attempt+1}"
            self._emit_log(f"🔄 Loop {attempt+1}/{max_retries}")
            
            try:
                # A. SENSORS (Explore)
                # Note: We updated Engines to accept cycle_memory
                state_snapshot = self.sensors.observe_state(goal, feedback=feedback, cycle_memory=cycle_memory)
                
                # B. CONTROLLER (Plan)
                # Updated method name to create_micro_plan
                micro_plan = self.controller.create_micro_plan(goal, state_snapshot, feedback=feedback, cycle_memory=cycle_memory)
                
                if not micro_plan:
                    self._emit_log("⚠️ No plan generated (Goal satisfied or confusion).")
                    # If goal satisfied, should be caught by feedback? 
                    # Or maybe planner returns empty if done. 
                    # Let's assume empty plan = verify? 
                    # For now, treat as failure or break?
                    # Let's fail for safety unless we have a "Done" signal.
                    return {"status": "failed", "error": "Empty Plan"}
                
                # C. ACTUATOR (Execute)
                # Updated method name to execute_plan
                execution_result = self.actuator.execute_plan(micro_plan, cycle_memory=cycle_memory)
                
                # D. MONITOR (Feedback)
                # Updated method name and return type
                loop_decision = self.monitor.analyze_result(execution_result, goal, cycle_memory=cycle_memory)
                
                if loop_decision.success:
                    self._emit_log("✅ Cycle Goal Achieved")
                    return {"status": "success", "cycles": attempt+1}
                else:
                    self._emit_log(f"⚠️ Variance Detected: {loop_decision.reason}")
                    feedback = {
                         "last_error": loop_decision.reason,
                         "failed_plan_step": len(micro_plan) # approximate
                    }
                    attempt += 1
            
            except Exception as e:
                logger.error(f"Cycle Exception: {e}")
                import traceback
                traceback.print_exc()
                self._emit_log(f"❌ System Exception: {e}")
                return {"status": "error", "error": str(e)}
        
        return {"status": "failed", "error": "Max retries exceeded"}

    def run_chat(self, user_message: str) -> Dict[str, Any]:
        """
        WORKFLOW: Chat / Advisor.
        Quick response, low retries, transient memory.
        """
        self._emit_log(f"💬 Chat Request: {user_message[:50]}...")
        # Goal is just to answer/act on the message
        return self._run_control_loop(user_message, max_retries=1)

    def run_feature(self, feature_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        WORKFLOW: Single Feature Build.
        Standard robust cycle with DB Sync.
        """
        description = feature_context.get("description", "")
        f_id = feature_context.get("feature_id")
        
        self._emit_log(f"🔨 Feature Request: {description[:50]}...")
        
        # 1. Sync DB (IN_PROGRESS) - Redundant but safe
        if f_id: self._update_feature_status(f_id, "IN_PROGRESS")
        
        # 2. Initialize Memory (Minimal for single feature)
        workflow_memory = {
            "decisions": [],
            "scope": "single_feature"
        }
        
        # 3. Run Loop
        result = self._run_control_loop(description, max_retries=3, workflow_memory=workflow_memory)
        
        # 4. Handle Result
        if result["status"] == "success":
             if f_id: self._update_feature_status(f_id, "COMPLETED")
             self._emit_log("✅ Feature Workflow Completed")
        else:
             self._emit_log(f"❌ Feature Workflow Failed: {result.get('error')}")
             
        return result

    def run_mission(self, mission_data: Dict[str, Any]) -> Dict[str, Any]:
        """Legacy Entry Point"""
        m_type = mission_data.get("type", "general")
        
        if m_type == "product_build":
             return self.run_product_build(mission_data)
        elif m_type == "feature_build":
             # Pass full context (including ID)
             return self.run_feature(mission_data)
        elif m_type == "chat":
             return self.run_chat(mission_data.get("description", ""))
        else:
             return self._run_control_loop(mission_data.get("description", "Unknown Task"))

    def _emit_log(self, message):
        if self.log_callback:
            self.log_callback(message)
        logger.info(message)
