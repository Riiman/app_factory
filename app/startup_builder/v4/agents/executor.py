"""
V4 Executor Agent

Low-level execution with built-in safety and retry logic.
"""

import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime

from ..safety import SafetyCoordinator
from ..healing import SelfHealer, Failure

logger = logging.getLogger(__name__)


class V4Executor:
    """
    V4 Executor Agent - Low-level execution with safety.
    
    Features:
    - Tool execution with safety checks
    - Automatic retry on failure
    - Resource monitoring
    - Healing integration
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        
        # Core components
        self.safety = SafetyCoordinator()
        self.healer = SelfHealer()
        
        # Execution state
        self.current_tool = None
        self.execution_count = 0
        
        logger.info(f"V4Executor initialized for startup {startup_id}")
    
    def execute_tool(
        self,
        tool_name: str,
        tool_func: Callable,
        args: Dict[str, Any],
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Execute a tool with safety checks and retry logic.
        
        Args:
            tool_name: Name of the tool
            tool_func: Tool function to execute
            args: Tool arguments
            max_retries: Maximum retry attempts
            
        Returns:
            Execution result
        """
        self.current_tool = tool_name
        self.execution_count += 1
        
        logger.info(f"Executing tool: {tool_name} (attempt 1/{max_retries})")
        
        # Check safety before execution
        allowed, reason = self.safety.check_tool_call(tool_name, args)
        
        if allowed and reason:
            logger.warning(f"Safety Warning: {reason}")
        
        if not allowed:
            logger.warning(f"Tool blocked by safety: {reason}")
            
            # Try to get healing guidance
            healing_result = self._get_healing_guidance(tool_name, args, reason)
            
            return {
                'success': False,
                'blocked': True,
                'reason': reason,
                'healing_guidance': healing_result.suggested_fix if healing_result else None
            }
        
        # Execute with retry logic
        for attempt in range(max_retries):
            try:
                # Execute tool
                result = tool_func(**args)
                
                # Record success
                self.safety.record_tool_call(tool_name, args, "success")
                
                logger.info(f"Tool executed successfully: {tool_name}")
                
                return {
                    'success': True,
                    'result': result,
                    'attempts': attempt + 1
                }
                
            except Exception as e:
                logger.error(f"Tool execution failed (attempt {attempt + 1}/{max_retries}): {e}")
                
                # Record failure
                self.safety.record_tool_call(tool_name, args, "error")
                
                # Try to heal
                healing_result = self._attempt_healing(tool_name, args, e)
                
                if healing_result and healing_result.success and attempt < max_retries - 1:
                    # Apply healing and retry
                    logger.info("Applying healing guidance and retrying...")
                    
                    # Modify args based on healing (if applicable)
                    # For now, just retry with same args
                    continue
                
                # Last attempt failed
                if attempt == max_retries - 1:
                    return {
                        'success': False,
                        'error': str(e),
                        'attempts': max_retries,
                        'healing_attempted': healing_result is not None,
                        'healing_guidance': healing_result.suggested_fix if healing_result else None
                    }
        
        # Should not reach here
        return {
            'success': False,
            'error': 'Max retries exceeded'
        }
    
    def _attempt_healing(
        self,
        tool_name: str,
        args: Dict[str, Any],
        error: Exception
    ) -> Optional[Any]:
        """Attempt to heal from error"""
        
        failure = Failure(
            error_message=str(error),
            error_type=type(error).__name__,
            tool_name=tool_name
        )
        
        try:
            healing_result = self.healer.heal(failure, args)
            logger.info(f"Healing confidence: {healing_result.diagnosis.confidence}")
            return healing_result
        except Exception as e:
            logger.error(f"Healing failed: {e}")
            return None
    
    def _get_healing_guidance(
        self,
        tool_name: str,
        args: Dict[str, Any],
        blocked_reason: str
    ) -> Optional[Any]:
        """Get healing guidance for blocked tool"""
        
        failure = Failure(
            error_message=f"Blocked: {blocked_reason}",
            error_type="SafetyBlock",
            tool_name=tool_name
        )
        
        try:
            return self.healer.heal(failure, args)
        except Exception as e:
            logger.error(f"Failed to get healing guidance: {e}")
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get execution statistics"""
        
        return {
            'safety': self.safety.get_stats(),
            'total_executions': self.execution_count,
            'startup_id': self.startup_id
        }
