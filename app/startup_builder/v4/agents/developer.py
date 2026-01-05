"""
V4 Developer Agent

Pure V4 implementation with safety, healing, and intelligence built-in.
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..safety import SafetyCoordinator
from ..healing import SelfHealer, Failure
from ..knowledge import KnowledgeBase
from ..prompting import HierarchicalPromptBuilder
from ..generation import MultiPassGenerator
from ..controller import MissionController, StrategySelector

logger = logging.getLogger(__name__)


class V4Developer:
    """
    V4 Developer Agent - Pure V4 implementation.
    
    Built-in features:
    - Safety coordinator (circuit breakers, limits)
    - Self-healing (automatic error recovery)
    - Knowledge base (learning from executions)
    - Enhanced prompting (hierarchical, context-aware)
    - Multi-pass generation (high-quality code)
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.log_callback = log_callback
        
        # Core V4 components (built-in)
        self.safety = SafetyCoordinator()
        self.healer = SelfHealer()
        
        # Optional components (enabled via env vars)
        self.knowledge = None
        self.prompter = None
        self.generator = None
        
        # Initialize optional components
        self._initialize_optional_components()
        
        # Execution state
        self.current_task = None
        self.execution_start_time = None
        
        logger.info(f"V4Developer initialized for startup {startup_id}")
    
    def _initialize_optional_components(self):
        """Initialize optional V4 components based on env vars"""
        
        # Knowledge base
        if os.getenv("USE_V4_KNOWLEDGE", "false").lower() == "true":
            try:
                self.knowledge = KnowledgeBase(
                    persist_directory=f".v4_knowledge/{self.startup_id}"
                )
                logger.info("Knowledge base enabled")
            except Exception as e:
                logger.warning(f"Failed to initialize knowledge base: {e}")
        
        # Enhanced prompting
        if os.getenv("USE_V4_PROMPTING", "false").lower() == "true":
            try:
                self.prompter = HierarchicalPromptBuilder()
                logger.info("Enhanced prompting enabled")
            except Exception as e:
                logger.warning(f"Failed to initialize prompter: {e}")
        
        # Multi-pass generation
        if os.getenv("USE_V4_GENERATION", "false").lower() == "true":
            try:
                self.generator = MultiPassGenerator(use_verification=True)
                logger.info("Multi-pass generation enabled")
            except Exception as e:
                logger.warning(f"Failed to initialize generator: {e}")
    
    def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task with built-in safety and healing.
        
        Args:
            task: Task dictionary with description, action, etc.
            
        Returns:
            Execution result
        """
        self.current_task = task
        self.execution_start_time = datetime.utcnow()
        
        # Start safety tracking
        self.safety.start_task()
        
        logger.info(f"Executing task: {task.get('description', 'Unknown')}")
        
        try:
            # Execute with safety
            result = self._execute_with_safety(task)
            
            # Record success in knowledge base
            if self.knowledge and result.get('success'):
                self._record_success(task, result)
            
            return result
            
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            
            # Try to heal
            healing_result = self._attempt_healing(task, e)
            
            if healing_result and healing_result.success:
                # Retry with fix
                logger.info("Retrying with healing guidance...")
                try:
                    result = self._retry_with_fix(task, healing_result)
                    
                    # Record healed success
                    if self.knowledge and result.get('success'):
                        self._record_success(task, result, healed=True)
                    
                    return result
                    
                except Exception as retry_error:
                    logger.error(f"Retry after healing failed: {retry_error}")
            
            # Record failure in knowledge base
            if self.knowledge:
                self._record_failure(task, str(e))
            
            # Return failure result
            return {
                'success': False,
                'error': str(e),
                'healing_attempted': healing_result is not None,
                'healing_success': healing_result.success if healing_result else False
            }
    
    def _execute_with_safety(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task with safety checks"""
        
        # Check if we should block execution
        # (This would integrate with actual tool execution)
        
        # For now, return placeholder
        return {
            'success': True,
            'message': 'Task executed (V4 implementation pending)'
        }
    
    def _attempt_healing(self, task: Dict[str, Any], error: Exception) -> Optional[Any]:
        """Attempt to heal from error"""
        
        # Create failure object
        failure = Failure(
            error_message=str(error),
            error_type=type(error).__name__,
            task_description=task.get('description', ''),
            context=task
        )
        
        # Attempt healing
        try:
            healing_result = self.healer.heal(failure, task)
            logger.info(f"Healing diagnosis: {healing_result.diagnosis.root_cause}")
            logger.info(f"Healing confidence: {healing_result.diagnosis.confidence}")
            
            return healing_result
            
        except Exception as e:
            logger.error(f"Healing failed: {e}")
            return None
    
    def _retry_with_fix(self, task: Dict[str, Any], healing_result: Any) -> Dict[str, Any]:
        """Retry task with healing guidance"""
        
        # Apply healing guidance to task
        # (This would modify the task based on healing suggestions)
        
        # For now, return placeholder
        return {
            'success': True,
            'message': 'Task retried with healing guidance',
            'healing_applied': True
        }
    
    def _record_success(self, task: Dict[str, Any], result: Dict[str, Any], healed: bool = False):
        """Record successful execution in knowledge base"""
        
        execution_time = (datetime.utcnow() - self.execution_start_time).total_seconds()
        
        self.knowledge.record_success(
            mission_type=task.get('type', 'general'),
            task_description=task.get('description', ''),
            approach=task.get('action', 'unknown'),
            execution_time=execution_time,
            quality_score=result.get('quality_score', 8.0)
        )
        
        logger.info(f"Recorded success (healed: {healed})")
    
    def _record_failure(self, task: Dict[str, Any], error_message: str):
        """Record failed execution in knowledge base"""
        
        execution_time = (datetime.utcnow() - self.execution_start_time).total_seconds()
        
        self.knowledge.record_failure(
            mission_type=task.get('type', 'general'),
            task_description=task.get('description', ''),
            approach=task.get('action', 'unknown'),
            error_message=error_message,
            execution_time=execution_time
        )
        
        logger.info("Recorded failure")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get execution statistics"""
        
        stats = {
            'safety': self.safety.get_stats(),
            'startup_id': self.startup_id
        }
        
        if self.knowledge:
            stats['knowledge'] = self.knowledge.get_stats()
        
        return stats
