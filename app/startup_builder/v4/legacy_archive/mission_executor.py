"""
V4 Mission Executor Workflow

Orchestrates mission execution using V4 agents.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

from ..agents import V4Architect, V4Developer, V4Executor
from ..tools import V4Tools
from ..controller import MissionPriority

logger = logging.getLogger(__name__)


class MissionExecutor:
    """
    Executes missions using V4 agents.
    
    Flow:
    1. Plan with V4Architect
    2. Execute tasks with V4Developer
    3. Verify with V4Executor
    4. Report results
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        
        # Initialize V4 agents
        self.architect = V4Architect(startup_id)
        self.developer = V4Developer(startup_id)
        self.executor = V4Executor(startup_id)
        self.tools = V4Tools(startup_id)
        
        logger.info(f"MissionExecutor initialized for startup {startup_id}")
    
    def execute_mission(
        self,
        mission_id: str,
        mission_type: str,
        description: str,
        priority: str = "medium",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a complete mission.
        
        Args:
            mission_id: Unique mission identifier
            mission_type: Type of mission
            description: Mission description
            priority: Priority level
            context: Additional context
            
        Returns:
            Mission result
        """
        start_time = datetime.utcnow()
        context = context or {}
        
        logger.info(f"Starting mission: {mission_id} - {description}")
        
        try:
            # Step 1: Plan with Architect
            logger.info("Step 1: Planning mission...")
            plan = self.architect.plan_mission(
                mission_id=mission_id,
                mission_type=mission_type,
                description=description,
                priority=priority,
                context=context
            )
            
            logger.info(f"Plan created: {len(plan['tasks'])} tasks, strategy: {plan['strategy']['name']}")
            
            # Step 2: Execute tasks with Developer
            logger.info("Step 2: Executing tasks...")
            execution_results = []
            
            for i, task in enumerate(plan['tasks']):
                logger.info(f"Executing task {i+1}/{len(plan['tasks'])}: {task.get('description', 'Unknown')}")
                
                result = self.developer.execute_task(task)
                execution_results.append(result)
                
                # Stop if task failed and no healing
                if not result.get('success') and not result.get('healing_success'):
                    logger.error(f"Task {i+1} failed, stopping mission")
                    break
            
            # Calculate success
            successful_tasks = sum(1 for r in execution_results if r.get('success'))
            total_tasks = len(execution_results)
            success_rate = successful_tasks / total_tasks if total_tasks > 0 else 0
            
            # Step 3: Calculate metrics
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Step 4: Get stats
            developer_stats = self.developer.get_stats()
            architect_stats = self.architect.get_stats()
            
            # Build result
            result = {
                'mission_id': mission_id,
                'success': success_rate >= 0.8,  # 80% success threshold
                'plan': plan,
                'execution_results': execution_results,
                'metrics': {
                    'total_tasks': total_tasks,
                    'successful_tasks': successful_tasks,
                    'failed_tasks': total_tasks - successful_tasks,
                    'success_rate': success_rate,
                    'execution_time': execution_time,
                    'strategy': plan['strategy']['name']
                },
                'stats': {
                    'developer': developer_stats,
                    'architect': architect_stats
                }
            }
            
            logger.info(f"Mission completed: {success_rate:.0%} success rate in {execution_time:.1f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Mission execution failed: {e}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'mission_id': mission_id,
                'success': False,
                'error': str(e),
                'metrics': {
                    'execution_time': execution_time
                }
            }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get executor statistics"""
        return {
            'startup_id': self.startup_id,
            'architect': self.architect.get_stats(),
            'developer': self.developer.get_stats(),
            'executor': self.executor.get_stats()
        }
