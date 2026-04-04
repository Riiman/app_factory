"""
Strategy Selector for V4 Autonomous System

Selects the best strategy for a given mission based on context and history.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class StrategyType(Enum):
    """Types of execution strategies"""
    DIRECT = "direct"                   # Direct implementation
    INCREMENTAL = "incremental"         # Build incrementally
    MULTI_PASS = "multi_pass"          # Multiple refinement passes
    PATTERN_BASED = "pattern_based"    # Use existing patterns
    REGENERATE = "regenerate"          # Start from scratch


@dataclass
class Strategy:
    """Represents an execution strategy"""
    strategy_type: StrategyType
    name: str
    description: str
    confidence: float  # 0.0 to 1.0
    estimated_time: float  # in seconds
    estimated_cost: float  # in USD
    prerequisites: List[str]
    metadata: Dict[str, Any]


class StrategySelector:
    """
    Selects the best execution strategy for a mission.
    
    Considers:
    - Mission type and complexity
    - Historical success rates
    - Available resources
    - Time constraints
    - Cost constraints
    """
    
    def __init__(self, knowledge_base=None):
        self.knowledge_base = knowledge_base
        self.strategy_stats = {}  # Track success rates per strategy
    
    def select_strategy(
        self,
        mission_type: str,
        mission_description: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Strategy:
        """
        Select the best strategy for a mission.
        
        Args:
            mission_type: Type of mission (e.g., "api_endpoint", "react_component")
            mission_description: Description of the mission
            context: Additional context (complexity, constraints, etc.)
            
        Returns:
            Best strategy to use
        """
        context = context or {}
        
        # Generate candidate strategies
        candidates = self._generate_candidates(mission_type, mission_description, context)
        
        # Score each strategy
        scored = []
        for strategy in candidates:
            score = self._score_strategy(strategy, mission_type, context)
            scored.append((score, strategy))
        
        # Sort by score (highest first)
        scored.sort(reverse=True, key=lambda x: x[0])
        
        best_strategy = scored[0][1] if scored else self._get_default_strategy()
        
        logger.info(f"Selected strategy: {best_strategy.name} (confidence: {best_strategy.confidence:.2f})")
        
        return best_strategy
    
    def _generate_candidates(
        self,
        mission_type: str,
        mission_description: str,
        context: Dict[str, Any]
    ) -> List[Strategy]:
        """Generate candidate strategies"""
        candidates = []
        
        complexity = context.get('complexity', 'medium')
        has_patterns = context.get('has_patterns', False)
        
        # Direct strategy (for simple tasks)
        if complexity == 'low':
            candidates.append(Strategy(
                strategy_type=StrategyType.DIRECT,
                name="Direct Implementation",
                description="Implement directly in one pass",
                confidence=0.8,
                estimated_time=60.0,
                estimated_cost=0.5,
                prerequisites=[],
                metadata={"complexity": "low"}
            ))
        
        # Pattern-based strategy (if patterns available)
        if has_patterns:
            candidates.append(Strategy(
                strategy_type=StrategyType.PATTERN_BASED,
                name="Pattern-Based Generation",
                description="Use existing code patterns",
                confidence=0.9,
                estimated_time=45.0,
                estimated_cost=0.3,
                prerequisites=["pattern_library"],
                metadata={"uses_patterns": True}
            ))
        
        # Incremental strategy (for medium complexity)
        if complexity in ['medium', 'high']:
            candidates.append(Strategy(
                strategy_type=StrategyType.INCREMENTAL,
                name="Incremental Build",
                description="Build in small validated chunks",
                confidence=0.85,
                estimated_time=120.0,
                estimated_cost=1.0,
                prerequisites=[],
                metadata={"complexity": complexity}
            ))
        
        # Multi-pass strategy (for high quality requirements)
        if context.get('quality_required', False) or complexity == 'high':
            candidates.append(Strategy(
                strategy_type=StrategyType.MULTI_PASS,
                name="Multi-Pass Refinement",
                description="Generate through multiple refinement passes",
                confidence=0.95,
                estimated_time=180.0,
                estimated_cost=1.5,
                prerequisites=[],
                metadata={"passes": 4}
            ))
        
        # Regenerate strategy (fallback)
        candidates.append(Strategy(
            strategy_type=StrategyType.REGENERATE,
            name="Regenerate from Scratch",
            description="Start fresh with enhanced context",
            confidence=0.7,
            estimated_time=90.0,
            estimated_cost=0.8,
            prerequisites=[],
            metadata={"fallback": True}
        ))
        
        return candidates
    
    def _score_strategy(
        self,
        strategy: Strategy,
        mission_type: str,
        context: Dict[str, Any]
    ) -> float:
        """
        Score a strategy based on multiple factors.
        
        Returns:
            Score (0.0 to 1.0)
        """
        score = strategy.confidence
        
        # Adjust for historical success rate
        if mission_type in self.strategy_stats:
            stats = self.strategy_stats[mission_type].get(strategy.strategy_type.value, {})
            if stats.get('attempts', 0) > 0:
                success_rate = stats.get('successes', 0) / stats['attempts']
                score = (score + success_rate) / 2  # Average with historical
        
        # Adjust for time constraints
        max_time = context.get('max_time_seconds', 300)
        if strategy.estimated_time > max_time:
            score *= 0.5  # Penalize if too slow
        
        # Adjust for cost constraints
        max_cost = context.get('max_cost_usd', 5.0)
        if strategy.estimated_cost > max_cost:
            score *= 0.5  # Penalize if too expensive
        
        # Boost pattern-based if patterns available
        if strategy.strategy_type == StrategyType.PATTERN_BASED:
            score *= 1.2  # 20% boost for using patterns
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _get_default_strategy(self) -> Strategy:
        """Get default fallback strategy"""
        return Strategy(
            strategy_type=StrategyType.DIRECT,
            name="Default Direct Implementation",
            description="Standard direct implementation",
            confidence=0.7,
            estimated_time=90.0,
            estimated_cost=0.8,
            prerequisites=[],
            metadata={"default": True}
        )
    
    def record_outcome(
        self,
        mission_type: str,
        strategy_type: StrategyType,
        success: bool
    ):
        """Record strategy outcome for learning"""
        if mission_type not in self.strategy_stats:
            self.strategy_stats[mission_type] = {}
        
        strategy_key = strategy_type.value
        if strategy_key not in self.strategy_stats[mission_type]:
            self.strategy_stats[mission_type][strategy_key] = {
                'attempts': 0,
                'successes': 0
            }
        
        stats = self.strategy_stats[mission_type][strategy_key]
        stats['attempts'] += 1
        if success:
            stats['successes'] += 1
        
        logger.info(f"Recorded {strategy_type.value} outcome for {mission_type}: {success}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get strategy statistics"""
        return {
            "mission_types": len(self.strategy_stats),
            "total_attempts": sum(
                sum(s['attempts'] for s in stats.values())
                for stats in self.strategy_stats.values()
            ),
            "by_mission_type": self.strategy_stats
        }
