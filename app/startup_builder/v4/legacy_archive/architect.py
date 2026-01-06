"""
V4 Architect Agent

Pure V4 implementation for mission planning and strategy.
"""

import logging
from typing import Dict, Any, List, Optional

from ..controller import MissionController, StrategySelector, MissionPriority
from ..prompting import HierarchicalPromptBuilder, ArchitectPromptEnhancer
from ..knowledge import KnowledgeBase

logger = logging.getLogger(__name__)


class V4Architect:
    """
    V4 Architect Agent - Mission planning with intelligence.
    
    Features:
    - Mission planning with V4 controller
    - Strategy selection based on history
    - Enhanced prompting for better plans
    - Learning from past missions
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        
        # Core components
        self.strategy_selector = StrategySelector()
        self.controller = MissionController(strategy_selector=self.strategy_selector)
        
        # Optional components
        self.prompter = None
        self.knowledge = None
        
        self._initialize_optional_components()
        
        logger.info(f"V4Architect initialized for startup {startup_id}")
    
    def _initialize_optional_components(self):
        """Initialize optional components"""
        import os
        
        # Enhanced prompting
        if os.getenv("USE_V4_PROMPTING", "false").lower() == "true":
            try:
                self.prompter = HierarchicalPromptBuilder()
                logger.info("Enhanced prompting enabled")
            except Exception as e:
                logger.warning(f"Failed to initialize prompter: {e}")
        
        # Knowledge base
        if os.getenv("USE_V4_KNOWLEDGE", "false").lower() == "true":
            try:
                self.knowledge = KnowledgeBase(
                    persist_directory=f".v4_knowledge/{self.startup_id}"
                )
                logger.info("Knowledge base enabled")
            except Exception as e:
                logger.warning(f"Failed to initialize knowledge base: {e}")
    
    def plan_mission(
        self,
        mission_id: str,
        mission_type: str,
        description: str,
        priority: str = "medium",
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Plan a mission with strategy selection.
        
        Args:
            mission_id: Unique mission identifier
            mission_type: Type of mission (api_endpoint, ui_component, etc.)
            description: Mission description
            priority: Priority level (low, medium, high, critical)
            context: Additional context
            
        Returns:
            Mission plan
        """
        context = context or {}
        
        # Convert priority string to enum
        priority_map = {
            "low": MissionPriority.LOW,
            "medium": MissionPriority.MEDIUM,
            "high": MissionPriority.HIGH,
            "critical": MissionPriority.CRITICAL
        }
        priority_enum = priority_map.get(priority.lower(), MissionPriority.MEDIUM)
        
        # Query similar missions if knowledge base available
        if self.knowledge:
            similar = self.knowledge.query_similar(
                mission_type=mission_type,
                task_description=description,
                k=3,
                success_only=True
            )
            
            if similar:
                context['similar_missions'] = similar
                logger.info(f"Found {len(similar)} similar successful missions")
        
        # Plan mission with controller
        plan = self.controller.plan_mission(
            mission_id=mission_id,
            mission_type=mission_type,
            description=description,
            priority=priority_enum,
            context=context
        )
        
        logger.info(f"Mission planned: {len(plan.tasks)} tasks, strategy: {plan.strategy.name}")
        
        return {
            'mission_id': plan.mission_id,
            'strategy': {
                'type': plan.strategy.strategy_type,
                'name': plan.strategy.name,
                'confidence': plan.strategy.confidence
            },
            'tasks': plan.tasks,
            'estimated_time': plan.estimated_time,
            'estimated_cost': plan.estimated_cost,
            'priority': priority
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get planning statistics"""
        
        stats = {
            'controller': self.controller.get_stats(),
            'strategy_selector': self.strategy_selector.get_stats()
        }
        
        if self.knowledge:
            stats['knowledge'] = self.knowledge.get_stats()
        
        return stats
