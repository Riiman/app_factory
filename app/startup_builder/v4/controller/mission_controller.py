"""
Mission Controller for V4 Autonomous System

Strategic orchestration layer for mission planning and execution.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

logger = logging.getLogger(__name__)


class MissionStatus(Enum):
    """Mission execution status"""
    PENDING = "pending"
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MissionPriority(Enum):
    """Mission priority levels"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


@dataclass
class MissionPlan:
    """Represents a mission execution plan"""
    mission_id: str
    mission_type: str
    description: str
    priority: MissionPriority
    strategy: Optional[Any] = None  # Strategy object
    tasks: List[Dict[str, Any]] = field(default_factory=list)
    estimated_time: float = 0.0
    estimated_cost: float = 0.0
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MissionResult:
    """Result of mission execution"""
    mission_id: str
    status: MissionStatus
    success: bool
    execution_time: float
    actual_cost: float
    quality_score: float
    tasks_completed: int
    tasks_failed: int
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class MissionController:
    """
    Strategic mission controller.
    
    Responsibilities:
    1. Mission planning and prioritization
    2. Resource allocation
    3. Strategy selection
    4. Execution monitoring
    5. Failure handling and escalation
    """
    
    def __init__(
        self,
        strategy_selector=None,
        knowledge_base=None,
        safety_coordinator=None
    ):
        self.strategy_selector = strategy_selector
        self.knowledge_base = knowledge_base
        self.safety_coordinator = safety_coordinator
        
        self.active_missions: Dict[str, MissionPlan] = {}
        self.completed_missions: List[MissionResult] = []
        self.mission_queue: List[MissionPlan] = []
    
    def plan_iterative_product_build(
        self,
        mission_id: str,
        product_name: str,
        product_description: str,
        features: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]] = None
    ) -> MissionPlan:
        """
        Plan an iterative product build (Feature by Feature).
        Creates a 'Parent Mission' containing 'Child Tasks' where each task is a full Feature Build.
        """
        context = context or {}
        logger.info(f"Planning Iterative Build for {product_name} ({len(features)} features)")
        
        # 1. Create Ordered Task List from Features
        # Each feature becomes a high-level task for the V4 Orchestrator
        tasks = []
        
        # Task 0: Project Initialization (if needed)
        # We assume the first feature might drive this, or we add an explicit init task.
        # For now, let's map features directly.
        
        for i, feature in enumerate(features):
            f_name = feature.get("name", f"Feature {i+1}")
            f_goal = feature.get("description", "")
            
            # Construct a rich goal for the Orchestrator
            rich_goal = f"Implement Feature: {f_name}. Requirements: {f_goal}"
            if i == 0:
                rich_goal += " Note: This is the first feature. Initialize the project structure if missing."
            else:
                rich_goal += " Note: Integrate with existing codebase."
                
            tasks.append({
                "id": f"feature_{i+1}",
                "description": rich_goal,
                "type": "feature_build",
                "status": "pending",
                "feature_metadata": feature # Store raw feature data
            })
            
        return MissionPlan(
            mission_id=mission_id,
            mission_type="iterative_product_build",
            description=f"Build Product: {product_name}",
            priority=MissionPriority.HIGH,
            tasks=tasks,
            estimated_time=len(tasks) * 300.0, # 5 mins per feature
            estimated_cost=len(tasks) * 0.5,
            metadata={
                "product_name": product_name,
                "total_features": len(features),
                **context
            }
        )

    def plan_mission(
        self,
        mission_id: str,
        mission_type: str,
        description: str,
        priority: MissionPriority = MissionPriority.MEDIUM,
        context: Optional[Dict[str, Any]] = None
    ) -> MissionPlan:
        """
        Plan a single mission execution.
        """
        context = context or {}
        
        logger.info(f"Planning mission {mission_id}: {mission_type}")
        
        # Fallback to simple planning if not product build
        # ... logic ...
        
        # Simple heuristic task breakdown
        tasks = [
            {
                "id": "task_1",
                "description": description, # Just map description to one big task for V4 cycle
                "type": "implementation",
                "status": "pending"
            }
        ]
        
        return MissionPlan(
            mission_id=mission_id,
            mission_type=mission_type,
            description=description,
            priority=priority,
            tasks=tasks,
            metadata=context
        )
    
    def execute_mission(
        self,
        plan: MissionPlan,
        executor_callback: Optional[Any] = None,
        on_task_start: Optional[Any] = None,
        on_task_complete: Optional[Any] = None
    ) -> MissionResult:
        """
        Execute a mission plan task-by-task.
        Propagates `executor_callback` (V4 Orchestrator Cycle) to each task.
        Supports callbacks for external state sync (e.g., Database updates).
        """
        logger.info(f"Executing mission {plan.mission_id} ({len(plan.tasks)} tasks)")
        
        self.active_missions[plan.mission_id] = plan
        start_time = datetime.utcnow()
        
        tasks_completed = 0
        tasks_failed = 0
        error_message = None
        
        # Iterate through tasks (Iterative Build)
        for i, task in enumerate(plan.tasks):
            logger.info(f"👉 Starting Task {i+1}/{len(plan.tasks)}: {task['description']}")
            
            # Update status
            task['status'] = 'in_progress'
            
            # Notify Start
            if on_task_start:
                try:
                    on_task_start(task)
                except Exception as e:
                    logger.error(f"on_task_start callback failed: {e}")
            
            success = False
            if executor_callback:
                try:
                    # Execute the V4 Cycle for this Task's Goal
                    result = executor_callback(task['description'])
                    
                    if result.get("status") == "success":
                        success = True
                    else:
                        success = False
                        error_message = result.get("error", "Unknown error")
                        
                except Exception as e:
                    logger.error(f"Task Execution Error: {e}")
                    error_message = str(e)
                    success = False
            else:
                # Simulation Mode
                success = True
            
            # Record Result
            if success:
                task['status'] = 'completed'
                tasks_completed += 1
                logger.info(f"✅ Task {i+1} Completed")
            else:
                task['status'] = 'failed'
                tasks_failed += 1
                logger.error(f"❌ Task {i+1} Failed: {error_message}")
                
            # Notify Completion
            if on_task_complete:
                try:
                    on_task_complete(task, success)
                except Exception as e:
                    logger.error(f"on_task_complete callback failed: {e}")

            if not success:
                # Break on build failure
                break
        
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        final_success = (tasks_failed == 0 and tasks_completed > 0)
        
        result = MissionResult(
            mission_id=plan.mission_id,
            status=MissionStatus.COMPLETED if final_success else MissionStatus.FAILED,
            success=final_success,
            execution_time=execution_time,
            actual_cost=0.0,
            quality_score=10.0 if final_success else 0.0,
            tasks_completed=tasks_completed,
            tasks_failed=tasks_failed,
            error_message=error_message
        )
        
        del self.active_missions[plan.mission_id]
        self.completed_missions.append(result)
        return result
    
    def _plan_tasks(
        self,
        mission_type: str,
        description: str,
        context: Dict[str, Any],
        similar_missions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Plan tasks for a mission.
        
        This would use LLM to break down the mission.
        For now, return a simple task list.
        """
        # Simple heuristic task breakdown
        tasks = [
            {
                "id": "task_1",
                "description": f"Implement {description}",
                "type": "implementation",
                "status": "pending"
            },
            {
                "id": "task_2",
                "description": "Verify implementation",
                "type": "verification",
                "status": "pending"
            }
        ]
        
        return tasks
    
    def get_stats(self) -> Dict[str, Any]:
        """Get controller statistics"""
        total_missions = len(self.completed_missions)
        successful = sum(1 for m in self.completed_missions if m.success)
        
        return {
            "active_missions": len(self.active_missions),
            "completed_missions": total_missions,
            "success_rate": successful / total_missions if total_missions > 0 else 0.0,
            "average_execution_time": sum(m.execution_time for m in self.completed_missions) / total_missions if total_missions > 0 else 0.0,
            "average_quality_score": sum(m.quality_score for m in self.completed_missions) / total_missions if total_missions > 0 else 0.0,
            "total_cost": sum(m.actual_cost for m in self.completed_missions)
        }
