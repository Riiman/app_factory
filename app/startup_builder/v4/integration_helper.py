"""
V4 Integration Helper for V3 Developer Agent

Provides easy integration of V4 components into V3 Developer.
"""

import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class V4IntegrationHelper:
    """
    Helper class to integrate V4 components with V3 Developer.
    
    Provides a simple interface to use:
    - Knowledge Base (learning from executions)
    - Enhanced Prompting (hierarchical prompts)
    - Multi-Pass Generation (iterative code generation)
    """
    
    def __init__(self, startup_id: str):
        self.startup_id = startup_id
        self.knowledge_base = None
        self.prompt_builder = None
        self.multi_pass_generator = None
        
        # Initialize components if enabled
        self._initialize_components()
    
    def _initialize_components(self):
        """Initialize V4 components"""
        
        # Knowledge Base
        if os.getenv("USE_V4_KNOWLEDGE", "false").lower() == "true":
            try:
                from ...v4.knowledge import KnowledgeBase
                self.knowledge_base = KnowledgeBase(
                    persist_directory=f".v4_knowledge/{self.startup_id}"
                )
                logger.info("V4 Knowledge Base initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Knowledge Base: {e}")
        
        # Enhanced Prompting
        if os.getenv("USE_V4_PROMPTING", "false").lower() == "true":
            try:
                from ...v4.prompting import HierarchicalPromptBuilder
                self.prompt_builder = HierarchicalPromptBuilder()
                logger.info("V4 Hierarchical Prompting initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Prompting: {e}")
        
        # Multi-Pass Generation
        if os.getenv("USE_V4_GENERATION", "false").lower() == "true":
            try:
                from ...v4.generation import MultiPassGenerator
                self.multi_pass_generator = MultiPassGenerator(use_verification=True)
                logger.info("V4 Multi-Pass Generation initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize Generation: {e}")
    
    def record_success(
        self,
        mission_type: str,
        task_description: str,
        approach: str,
        execution_time: float,
        quality_score: float
    ):
        """Record successful execution in knowledge base"""
        if self.knowledge_base:
            try:
                self.knowledge_base.record_success(
                    mission_type=mission_type,
                    task_description=task_description,
                    approach=approach,
                    execution_time=execution_time,
                    quality_score=quality_score
                )
                logger.info(f"Recorded success: {mission_type}")
            except Exception as e:
                logger.error(f"Failed to record success: {e}")
    
    def record_failure(
        self,
        mission_type: str,
        task_description: str,
        approach: str,
        error_message: str,
        execution_time: float
    ):
        """Record failed execution in knowledge base"""
        if self.knowledge_base:
            try:
                self.knowledge_base.record_failure(
                    mission_type=mission_type,
                    task_description=task_description,
                    approach=approach,
                    error_message=error_message,
                    execution_time=execution_time
                )
                logger.info(f"Recorded failure: {mission_type}")
            except Exception as e:
                logger.error(f"Failed to record failure: {e}")
    
    def query_similar_missions(
        self,
        mission_type: str,
        task_description: str,
        k: int = 3
    ) -> list:
        """Query similar successful missions"""
        if self.knowledge_base:
            try:
                return self.knowledge_base.query_similar(
                    mission_type=mission_type,
                    task_description=task_description,
                    k=k,
                    success_only=True
                )
            except Exception as e:
                logger.error(f"Failed to query similar missions: {e}")
        return []
    
    def build_enhanced_prompt(
        self,
        task: Dict[str, Any],
        mission: Dict[str, Any],
        project_info: Optional[Dict[str, Any]] = None,
        strategy_guidance: Optional[str] = None
    ) -> Optional[str]:
        """Build enhanced hierarchical prompt"""
        if self.prompt_builder:
            try:
                return self.prompt_builder.build_developer_prompt(
                    task=task,
                    mission=mission,
                    project_info=project_info,
                    strategy_guidance=strategy_guidance
                )
            except Exception as e:
                logger.error(f"Failed to build enhanced prompt: {e}")
        return None
    
    def generate_code_multipass(
        self,
        task_description: str,
        language: str = "python",
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """Generate code using multi-pass approach"""
        if self.multi_pass_generator:
            try:
                results = self.multi_pass_generator.generate(
                    task_description=task_description,
                    language=language,
                    context=context
                )
                
                # Return final pass code
                if results:
                    final_pass = results[-1]
                    if final_pass.success:
                        return final_pass.code
                
            except Exception as e:
                logger.error(f"Failed multi-pass generation: {e}")
        
        return None
    
    def get_code_pattern(self, pattern_name: str) -> Optional[str]:
        """Get a code pattern from knowledge base"""
        if self.knowledge_base:
            try:
                return self.knowledge_base.get_pattern(pattern_name)
            except Exception as e:
                logger.error(f"Failed to get pattern: {e}")
        return None
    
    def fill_pattern(self, pattern_name: str, values: Dict[str, str]) -> Optional[str]:
        """Fill a code pattern with values"""
        if self.knowledge_base:
            try:
                return self.knowledge_base.fill_pattern(pattern_name, values)
            except Exception as e:
                logger.error(f"Failed to fill pattern: {e}")
        return None
