"""
V4 Task Executor Workflow

Executes individual tasks with safety and healing.
"""

import logging
from typing import Dict, Any, Callable, Optional
from datetime import datetime

from ..agents import V4Executor
from ..tools import V4Tools

logger = logging.getLogger(__name__)


class TaskExecutor:
    """
    Executes individual tasks with V4 safety and healing.
    
    Flow:
    1. Validate task
    2. Execute with V4Executor
    3. Verify result
    4. Report metrics
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        self.executor = V4Executor(startup_id)
        self.tools = V4Tools(startup_id)
        
        logger.info(f"TaskExecutor initialized for startup {startup_id}")
    
    def execute_task(
        self,
        task_type: str,
        task_data: Dict[str, Any],
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Execute a single task.
        
        Args:
            task_type: Type of task (run_shell, update_file, etc.)
            task_data: Task parameters
            max_retries: Maximum retry attempts
            
        Returns:
            Task result
        """
        start_time = datetime.utcnow()
        
        logger.info(f"Executing task: {task_type}")
        
        try:
            # Get tool function
            tool_func = self._get_tool_function(task_type)
            
            if not tool_func:
                return {
                    'success': False,
                    'error': f"Unknown task type: {task_type}"
                }
            
            # Execute with V4Executor (includes safety and retry)
            result = self.executor.execute_tool(
                tool_name=task_type,
                tool_func=tool_func,
                args=task_data,
                max_retries=max_retries
            )
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Add metrics
            result['metrics'] = {
                'execution_time': execution_time,
                'task_type': task_type
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                'success': False,
                'error': str(e),
                'metrics': {
                    'execution_time': execution_time,
                    'task_type': task_type
                }
            }
    
    def _get_tool_function(self, task_type: str) -> Optional[Callable]:
        """Get tool function by type"""
        
        tool_map = {
            'run_shell': self.tools.create_run_shell(),
            'update_file': self.tools.create_update_file(),
            'read_file': self.tools.create_read_file(),
            'list_files': self.tools.create_list_files()
        }
        
        return tool_map.get(task_type)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get task executor statistics"""
        return {
            'startup_id': self.startup_id,
            'executor': self.executor.get_stats()
        }
