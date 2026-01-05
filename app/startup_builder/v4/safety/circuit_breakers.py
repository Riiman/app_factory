"""
Circuit Breakers for V4 Autonomous System

Prevents infinite loops, resource exhaustion, and runaway costs through
multiple circuit breaker implementations.
"""

import time
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from collections import deque
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking calls
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breakers"""
    max_identical_calls: int = 3
    max_consecutive_failures: int = 5
    max_calls_per_task: int = 50
    max_cost_usd: float = 5.0
    max_time_seconds: int = 300
    max_memory_mb: int = 2048
    reset_timeout_seconds: int = 60


class ToolCallCircuitBreaker:
    """
    Prevents infinite loops from repeated tool calls.
    
    Blocks when:
    - Same tool called 3+ times with identical arguments
    - Tool fails 5+ times consecutively
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.call_history: deque = deque(maxlen=20)
        self.consecutive_failures: Dict[str, int] = {}
        self.state = CircuitState.CLOSED
        self.last_failure_time: Optional[float] = None
    
    def record_call(self, tool_name: str, args: dict, result: str) -> None:
        """Record a tool call for tracking"""
        call_signature = self._make_signature(tool_name, args)
        timestamp = time.time()
        
        # Store in history
        self.call_history.append({
            'signature': call_signature,
            'tool_name': tool_name,
            'result': result,
            'timestamp': timestamp
        })
        
        # Track failures
        is_failure = self._is_failure(result)
        if is_failure:
            self.consecutive_failures[tool_name] = self.consecutive_failures.get(tool_name, 0) + 1
            self.last_failure_time = timestamp
        else:
            self.consecutive_failures[tool_name] = 0
    
    def should_block(self, tool_name: str, args: dict) -> Tuple[bool, str]:
        """
        Check if this call should be blocked.
        
        Returns:
            (should_block, reason)
        """
        # Check if circuit is open
        if self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time and (time.time() - self.last_failure_time) > self.config.reset_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker entering HALF_OPEN state for {tool_name}")
            else:
                return True, f"Circuit breaker is OPEN for {tool_name}"
        
        call_signature = self._make_signature(tool_name, args)
        
        # Check for identical recent calls
        recent_calls = list(self.call_history)[-10:]
        identical_count = sum(1 for call in recent_calls if call['signature'] == call_signature)
        
        if identical_count >= self.config.max_identical_calls:
            self.state = CircuitState.OPEN
            reason = f"Tool '{tool_name}' called {identical_count} times with identical arguments"
            logger.warning(f"Circuit breaker OPEN: {reason}")
            return True, reason
        
        # Check for consecutive failures
        failure_count = self.consecutive_failures.get(tool_name, 0)
        if failure_count >= self.config.max_consecutive_failures:
            self.state = CircuitState.OPEN
            reason = f"Tool '{tool_name}' failed {failure_count} times consecutively"
            logger.warning(f"Circuit breaker OPEN: {reason}")
            return True, reason
        
        return False, ""
    
    def reset(self) -> None:
        """Reset the circuit breaker"""
        self.state = CircuitState.CLOSED
        self.consecutive_failures.clear()
        self.call_history.clear()
        logger.info("Circuit breaker reset to CLOSED state")
    
    def _make_signature(self, tool_name: str, args: dict) -> str:
        """Create unique signature for a tool call"""
        try:
            args_str = json.dumps(args, sort_keys=True)
            return f"{tool_name}:{hash(args_str)}"
        except:
            return f"{tool_name}:{str(args)}"
    
    def _is_failure(self, result: str) -> bool:
        """Determine if a result indicates failure"""
        result_lower = result.lower()
        failure_indicators = [
            'error:', 'failed', 'exception', 'traceback',
            'command failed', 'not found', 'invalid'
        ]
        return any(indicator in result_lower for indicator in failure_indicators)


class LLMCallCircuitBreaker:
    """
    Prevents excessive LLM API calls and costs.
    
    Blocks when:
    - More than 50 LLM calls per task
    - Total cost exceeds $5 per task
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.call_count = 0
        self.total_cost = 0.0
        self.state = CircuitState.CLOSED
    
    def record_call(self, cost: float) -> None:
        """Record an LLM call"""
        self.call_count += 1
        self.total_cost += cost
    
    def should_block(self) -> Tuple[bool, str]:
        """Check if LLM calls should be blocked"""
        if self.call_count >= self.config.max_calls_per_task:
            self.state = CircuitState.OPEN
            return True, f"LLM call limit reached ({self.call_count} calls)"
        
        if self.total_cost >= self.config.max_cost_usd:
            self.state = CircuitState.OPEN
            return True, f"Cost limit reached (${self.total_cost:.2f})"
        
        return False, ""
    
    def reset(self) -> None:
        """Reset the circuit breaker"""
        self.call_count = 0
        self.total_cost = 0.0
        self.state = CircuitState.CLOSED
    
    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics"""
        return {
            'call_count': self.call_count,
            'total_cost': self.total_cost,
            'remaining_calls': self.config.max_calls_per_task - self.call_count,
            'remaining_budget': self.config.max_cost_usd - self.total_cost
        }


class TimeCircuitBreaker:
    """
    Prevents tasks from running too long.
    
    Blocks when:
    - Task execution exceeds 5 minutes
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.start_time: Optional[float] = None
        self.state = CircuitState.CLOSED
    
    def start(self) -> None:
        """Start timing"""
        self.start_time = time.time()
    
    def should_block(self) -> Tuple[bool, str]:
        """Check if time limit is exceeded"""
        if not self.start_time:
            return False, ""
        
        elapsed = time.time() - self.start_time
        if elapsed >= self.config.max_time_seconds:
            self.state = CircuitState.OPEN
            return True, f"Time limit exceeded ({elapsed:.1f}s / {self.config.max_time_seconds}s)"
        
        return False, ""
    
    def reset(self) -> None:
        """Reset the circuit breaker"""
        self.start_time = None
        self.state = CircuitState.CLOSED
    
    def get_elapsed(self) -> float:
        """Get elapsed time in seconds"""
        if not self.start_time:
            return 0.0
        return time.time() - self.start_time


class ResourceCircuitBreaker:
    """
    Prevents resource exhaustion.
    
    Blocks when:
    - Memory usage exceeds 2GB
    - CPU usage exceeds 90%
    """
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
    
    def should_block(self) -> Tuple[bool, str]:
        """Check if resource limits are exceeded"""
        try:
            import psutil
            
            # Check memory
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            
            if memory_mb >= self.config.max_memory_mb:
                self.state = CircuitState.OPEN
                return True, f"Memory limit exceeded ({memory_mb:.1f}MB / {self.config.max_memory_mb}MB)"
            
            # Check CPU (average over last second)
            cpu_percent = process.cpu_percent(interval=0.1)
            if cpu_percent >= 90:
                return True, f"CPU usage too high ({cpu_percent:.1f}%)"
            
        except ImportError:
            # psutil not available, skip resource checks
            pass
        except Exception as e:
            logger.warning(f"Resource check failed: {e}")
        
        return False, ""
    
    def reset(self) -> None:
        """Reset the circuit breaker"""
        self.state = CircuitState.CLOSED


class CircuitBreakerCoordinator:
    """
    Coordinates all circuit breakers for a task.
    
    Provides unified interface for checking and managing all safety constraints.
    """
    
    def __init__(self, config: Optional[CircuitBreakerConfig] = None):
        self.config = config or CircuitBreakerConfig()
        
        self.tool_breaker = ToolCallCircuitBreaker(self.config)
        self.llm_breaker = LLMCallCircuitBreaker(self.config)
        self.time_breaker = TimeCircuitBreaker(self.config)
        self.resource_breaker = ResourceCircuitBreaker(self.config)
    
    def start_task(self) -> None:
        """Start tracking a new task"""
        self.reset_all()
        self.time_breaker.start()
        logger.info("Circuit breakers initialized for new task")
    
    def record_tool_call(self, tool_name: str, args: dict, result: str) -> None:
        """Record a tool call"""
        self.tool_breaker.record_call(tool_name, args, result)
    
    def record_llm_call(self, cost: float) -> None:
        """Record an LLM call"""
        self.llm_breaker.record_call(cost)
    
    def check_tool_call(self, tool_name: str, args: dict) -> Tuple[bool, str]:
        """Check if a tool call should be blocked"""
        return self.tool_breaker.should_block(tool_name, args)
    
    def check_all(self) -> Tuple[bool, List[str]]:
        """
        Check all circuit breakers.
        
        Returns:
            (should_block, reasons)
        """
        violations = []
        
        # Check LLM limits
        llm_block, llm_reason = self.llm_breaker.should_block()
        if llm_block:
            violations.append(llm_reason)
        
        # Check time limit
        time_block, time_reason = self.time_breaker.should_block()
        if time_block:
            violations.append(time_reason)
        
        # Check resource limits
        resource_block, resource_reason = self.resource_breaker.should_block()
        if resource_block:
            violations.append(resource_reason)
        
        should_block = len(violations) > 0
        return should_block, violations
    
    def reset_all(self) -> None:
        """Reset all circuit breakers"""
        self.tool_breaker.reset()
        self.llm_breaker.reset()
        self.time_breaker.reset()
        self.resource_breaker.reset()
        logger.info("All circuit breakers reset")
    
    def get_status(self) -> Dict[str, Any]:
        """Get status of all circuit breakers"""
        return {
            'tool_breaker': {
                'state': self.tool_breaker.state.value,
                'call_history_size': len(self.tool_breaker.call_history),
                'consecutive_failures': dict(self.tool_breaker.consecutive_failures)
            },
            'llm_breaker': {
                'state': self.llm_breaker.state.value,
                **self.llm_breaker.get_stats()
            },
            'time_breaker': {
                'state': self.time_breaker.state.value,
                'elapsed_seconds': self.time_breaker.get_elapsed()
            },
            'resource_breaker': {
                'state': self.resource_breaker.state.value
            }
        }


class CircuitBreakerOpen(Exception):
    """Exception raised when a circuit breaker is open"""
    pass
