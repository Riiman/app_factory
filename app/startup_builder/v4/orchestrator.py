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

    def run_cycle(self, goal: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Execute the Control Loop for a specific Goal.
        
        Cycle:
        1. Explore (Measure y)
        2. Plan (Calculate u)
        3. Execute (Apply u)
        4. Feedback (Measure e)
        """
        self._emit_log(f"🚀 Starting Control Cycle for: {goal}")
        
        attempt = 0
        feedback = None
        
        while attempt < max_retries:
            cycle_id = f"cycle_{attempt+1}"
            self._emit_log(f"\n🔄 Cycle {attempt+1}/{max_retries}")
            
            try:
                # 1. EXPLORE (Sensors)
                self._emit_log("🔭 Exploring current state...")
                current_state = self.sensors.observe_state(goal, feedback)
                
                # 2. PLAN (Controller)
                self._emit_log("🧠 Planning correction...")
                micro_plan = self.controller.calculate_correction(goal, current_state)
                
                if not micro_plan:
                    self._emit_log("❌ Controller failed to generate plan.")
                    return {"status": "failed", "error": "Planning failed"}
                
                # 3. EXECUTE (Actuator)
                self._emit_log(f"💪 Applying {len(micro_plan)} adjustments...")
                execution_result = self.actuator.apply_control(micro_plan)
                
                # 4. FEEDBACK (Monitor)
                decision = self.monitor.measure_error(execution_result, goal)
                
                if decision["status"] == "SUCCESS":
                    self._emit_log("✅ Goal Achieved! System Stable.")
                    return {"status": "success", "attempts": attempt+1}
                else:
                    self._emit_log(f"⚠️ Residual Error: {decision.get('error_summary')}")
                    feedback = {
                         "last_error": decision.get("error_summary"),
                         "logs": decision.get("detailed_logs"),
                         "failed_plan": micro_plan
                    }
                    attempt += 1
            
            except Exception as e:
                logger.error(f"Cycle crashed: {e}")
                self._emit_log(f"❌ Critical System Error: {e}")
                return {"status": "error", "error": str(e)}
        
        self._emit_log("❌ Start-up Failed: Max retries exceeded.")
        return {"status": "failed", "error": "Max retries exceeded"}

    def run_mission(self, mission: Dict[str, Any]) -> Dict[str, Any]:
        """Legacy Wrapper: Runs a mission by feeding its description to the Control Loop."""
        return self.run_cycle(mission.get("description", "Unknown Goal"))

    def _emit_log(self, message):
        if self.log_callback:
            self.log_callback(message)
        logger.info(message)
