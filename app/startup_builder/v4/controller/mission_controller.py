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
    
    def plan_mission(
        self,
        mission_id: str,
        mission_type: str,
        description: str,
        priority: MissionPriority = MissionPriority.MEDIUM,
        context: Optional[Dict[str, Any]] = None
    ) -> MissionPlan:
        """
        Plan a mission execution.
        
        Args:
            mission_id: Unique mission identifier
            mission_type: Type of mission
            description: Mission description
            priority: Mission priority
            context: Additional context
            
        Returns:
            Mission plan
        """
        context = context or {}
        
        logger.info(f"Planning mission {mission_id}: {mission_type}")
        
        # Select strategy
        strategy = None
        if self.strategy_selector:
            strategy = self.strategy_selector.select_strategy(
                mission_type,
                description,
                context
            )
        
        # Query similar missions from knowledge base
        similar_missions = []
        if self.knowledge_base:
            similar_missions = self.knowledge_base.query_similar(
                mission_type,
                description,
                k=3,
                success_only=True
            )
        
        # Break down into tasks (simplified)
        tasks = self._plan_tasks(mission_type, description, context, similar_missions)
        
        # Estimate resources
        estimated_time = strategy.estimated_time if strategy else 120.0
        estimated_cost = strategy.estimated_cost if strategy else 1.0
        
        plan = MissionPlan(
            mission_id=mission_id,
            mission_type=mission_type,
            description=description,
            priority=priority,
            strategy=strategy,
            tasks=tasks,
            estimated_time=estimated_time,
            estimated_cost=estimated_cost,
            metadata={
                "planned_at": datetime.utcnow().isoformat(),
                "similar_missions": len(similar_missions),
                **context
            }
        )
        
        logger.info(f"Mission plan created: {len(tasks)} tasks, ~{estimated_time:.0f}s, ~${estimated_cost:.2f}")
        
        return plan
    
    def execute_mission(
        self,
        plan: MissionPlan,
        executor_callback: Optional[Any] = None
    ) -> MissionResult:
        """
        Execute a mission plan.
        
        Args:
            plan: Mission plan to execute
            executor_callback: Callback to actual executor (V3 orchestrator)
            
        Returns:
            Mission result
        """
        logger.info(f"Executing mission {plan.mission_id}")
        
        self.active_missions[plan.mission_id] = plan
        
        start_time = datetime.utcnow()
        
        # Initialize safety if available
        if self.safety_coordinator:
            self.safety_coordinator.start_task()
        
        # Execute (would call V3 orchestrator here)
        # For now, simulate execution
        success = True
        tasks_completed = len(plan.tasks)
        tasks_failed = 0
        quality_score = 8.5
        error_message = None
        
        # If executor callback provided, use it
        if executor_callback:
            try:
                result = executor_callback(plan)
                success = result.get('success', True)
                tasks_completed = result.get('tasks_completed', len(plan.tasks))
                tasks_failed = result.get('tasks_failed', 0)
                quality_score = result.get('quality_score', 8.5)
                error_message = result.get('error_message')
            except Exception as e:
                logger.error(f"Execution failed: {e}")
                success = False
                error_message = str(e)
        
        # Calculate execution time
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Record outcome
        if self.strategy_selector and plan.strategy:
            self.strategy_selector.record_outcome(
                plan.mission_type,
                plan.strategy.strategy_type,
                success
            )
        
        # Record in knowledge base
        if self.knowledge_base:
            if success:
                self.knowledge_base.record_success(
                    mission_type=plan.mission_type,
                    task_description=plan.description,
                    approach=plan.strategy.name if plan.strategy else "default",
                    execution_time=execution_time,
                    quality_score=quality_score
                )
            else:
                self.knowledge_base.record_failure(
                    mission_type=plan.mission_type,
                    task_description=plan.description,
                    approach=plan.strategy.name if plan.strategy else "default",
                    error_message=error_message or "Unknown error",
                    execution_time=execution_time
                )
        
        # Create result
        result = MissionResult(
            mission_id=plan.mission_id,
            status=MissionStatus.COMPLETED if success else MissionStatus.FAILED,
            success=success,
            execution_time=execution_time,
            actual_cost=plan.estimated_cost,  # Would track actual cost
            quality_score=quality_score,
            tasks_completed=tasks_completed,
            tasks_failed=tasks_failed,
            error_message=error_message
        )
        
        # Clean up
        del self.active_missions[plan.mission_id]
        self.completed_missions.append(result)
        
        logger.info(f"Mission {plan.mission_id} completed: {success} ({execution_time:.1f}s)")
        
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
