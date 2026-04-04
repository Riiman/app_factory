"""
V4 Autonomous Code Generation System

A fully autonomous system for generating, verifying, and fixing code with minimal human intervention.
Includes self-healing, multi-layer verification, and continuous learning.
"""

__version__ = "4.0.0"
__author__ = "Turning Ideas Team"

# Only import implemented components
from .safety.circuit_breakers import CircuitBreakerCoordinator
from .safety.safety_coordinator import SafetyCoordinator
from .knowledge.strategy_memory import StrategyMemory, StrategyBlocker

__all__ = [
    "CircuitBreakerCoordinator",
    "SafetyCoordinator",
    "StrategyMemory",
    "StrategyBlocker",
]
