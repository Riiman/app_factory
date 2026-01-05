"""
Safety Coordinator for V4 Autonomous System

Unified interface for all safety systems.
Coordinates circuit breakers, resource monitoring, cost tracking, and strategy memory.
"""

import logging
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass

from .circuit_breakers import CircuitBreakerCoordinator, CircuitBreakerConfig, CircuitBreakerOpen
from .resource_monitor import ResourceMonitor, ResourceUsage
from .cost_tracker import CostTracker, CostBudget
from ..knowledge.strategy_memory import StrategyMemory

logger = logging.getLogger(__name__)


@dataclass
class SafetyStatus:
    """Overall safety status"""
    safe: bool
    violations: List[str]
    warnings: List[str]
    resource_usage: Optional[ResourceUsage]
    cost_stats: Dict[str, Any]
    circuit_breaker_status: Dict[str, Any]


class SafetyCoordinator:
    """
    Coordinates all safety systems for autonomous code generation.
    
    Provides unified interface for:
    - Circuit breakers (prevent infinite loops)
    - Resource monitoring (track CPU/memory/time)
    - Cost tracking (manage LLM budgets)
    - Strategy memory (prevent retrying failures)
    """
    
    def __init__(
        self,
        circuit_config: Optional[CircuitBreakerConfig] = None,
        cost_budget: Optional[CostBudget] = None
    ):
        self.circuit_breakers = CircuitBreakerCoordinator(circuit_config)
        self.resource_monitor = ResourceMonitor()
        self.cost_tracker = CostTracker(cost_budget)
        self.strategy_memory = StrategyMemory()
        
        self.task_active = False
    
    def start_task(self) -> None:
        """Initialize safety systems for a new task"""
        self.circuit_breakers.start_task()
        self.resource_monitor.start()
        self.cost_tracker.reset()
        self.strategy_memory.clear()
        self.task_active = True
        
        logger.info("Safety systems initialized for new task")
    
    def check_tool_call(self, tool_name: str, args: dict) -> Tuple[bool, str]:
        """
        Check if a tool call should be allowed.
        
        Returns:
            (allowed, reason)
        """
        # Check circuit breaker
        blocked, reason = self.circuit_breakers.check_tool_call(tool_name, args)
        if blocked:
            return False, f"Circuit breaker: {reason}"
        
        # Check strategy memory
        blocked, reason = self.strategy_memory.is_blocked(tool_name, args)
        if blocked:
            return False, f"Strategy blocked: {reason}"
        
        return True, ""
    
    def record_tool_call(self, tool_name: str, args: dict, result: str) -> None:
        """Record a tool call"""
        self.circuit_breakers.record_tool_call(tool_name, args, result)
    
    def record_tool_failure(
        self,
        tool_name: str,
        args: dict,
        error_type: str,
        error_message: str,
        attempt_number: int
    ) -> None:
        """Record a failed tool call"""
        self.strategy_memory.record_failure(
            tool_name, args, error_type, error_message, attempt_number
        )
    
    def record_llm_call(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        purpose: str = "unknown"
    ) -> float:
        """
        Record an LLM call.
        
        Returns:
            cost in USD
        """
        cost = self.cost_tracker.record_call(model, input_tokens, output_tokens, purpose)
        self.circuit_breakers.record_llm_call(cost)
        return cost
    
    def check_safety(self) -> SafetyStatus:
        """
        Check all safety constraints.
        
        Returns comprehensive safety status.
        """
        violations = []
        warnings = []
        
        # Check circuit breakers
        cb_blocked, cb_violations = self.circuit_breakers.check_all()
        if cb_blocked:
            violations.extend(cb_violations)
        
        # Check cost budget
        within_budget, budget_msg = self.cost_tracker.check_budget()
        if not within_budget:
            violations.append(budget_msg)
        
        # Get resource usage
        resource_usage = self.resource_monitor.get_usage()
        resource_warnings = self.resource_monitor.get_warnings(resource_usage)
        warnings.extend(resource_warnings)
        
        # Get cost stats
        cost_stats = self.cost_tracker.get_stats()
        
        # Get circuit breaker status
        cb_status = self.circuit_breakers.get_status()
        
        return SafetyStatus(
            safe=len(violations) == 0,
            violations=violations,
            warnings=warnings,
            resource_usage=resource_usage,
            cost_stats=cost_stats,
            circuit_breaker_status=cb_status
        )
    
    def get_strategy_guidance(self) -> str:
        """Get LLM guidance about blocked strategies"""
        return self.strategy_memory.get_llm_guidance()
    
    def get_status_summary(self) -> str:
        """Get human-readable status summary"""
        status = self.check_safety()
        
        parts = []
        
        # Safety status
        if status.safe:
            parts.append("✅ All safety checks passed")
        else:
            parts.append(f"⚠️ {len(status.violations)} safety violation(s)")
            for violation in status.violations:
                parts.append(f"  - {violation}")
        
        # Warnings
        if status.warnings:
            parts.append(f"\n⚡ {len(status.warnings)} warning(s)")
            for warning in status.warnings:
                parts.append(f"  - {warning}")
        
        # Resource usage
        if status.resource_usage:
            ru = status.resource_usage
            parts.append(f"\n📊 Resources:")
            parts.append(f"  - Memory: {ru.memory_mb:.1f}MB")
            parts.append(f"  - CPU: {ru.cpu_percent:.1f}%")
            parts.append(f"  - Time: {ru.elapsed_seconds:.1f}s")
        
        # Cost
        parts.append(f"\n💰 Cost: ${status.cost_stats['total_cost']:.4f}")
        parts.append(f"  - Calls: {status.cost_stats['total_calls']}")
        parts.append(f"  - Remaining: ${status.cost_stats['remaining_budget']:.2f}")
        
        return "\n".join(parts)
    
    def reset(self) -> None:
        """Reset all safety systems"""
        self.circuit_breakers.reset_all()
        self.resource_monitor.reset()
        self.cost_tracker.reset()
        self.strategy_memory.clear()
        self.task_active = False
        
        logger.info("All safety systems reset")
