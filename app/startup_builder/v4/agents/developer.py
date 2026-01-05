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
from ..planning import TaskPlanner

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
    - Task planning (structured execution with context tracking)
    """
    
    def __init__(self, startup_id: str, log_callback=None):
        self.startup_id = startup_id
        self.log_callback = log_callback
        
        # Core V4 components (built-in)
        self.safety = SafetyCoordinator()
        self.healer = SelfHealer()
        self.planner = TaskPlanner()  # NEW: Task planning
        
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
        Execute a task with built-in safety, healing, and planning.
        
        Args:
            task: Task dictionary with description, action, type, etc.
            
        Returns:
            Execution result with plan summary
        """
        self.current_task = task
        self.execution_start_time = datetime.utcnow()
        
        # Start safety tracking
        self.safety.start_task()
        
        # Create execution plan
        task_type = task.get('type', 'general')
        task_description = task.get('description', 'Unknown task')
        
        # --- Tailwind Context Injection ---
        if "tailwind" in task_description.lower():
            task_description += "\n\n[Context] IMPORTANT: Verify Tailwind version (v3 vs v4). V4 has different configuration handling. Check docs if unsure."
        # ----------------------------------
        
        logger.info(f"Creating plan for: {task_description}")
        
        # --- Librarian Integration: Retrieve Context ---
        if self.knowledge:
            try:
                similar_tasks = self.knowledge.query_similar(task_type, task_description, k=3)
                if similar_tasks:
                    guidance = "\n\n## 📚 Strategy Guidance from Librarian:\n"
                    for item in similar_tasks:
                        meta = item['metadata']
                        guidance += f"- [Success] {meta['task_description']}: Used approach '{meta.get('approach', 'unknown')}'\n"
                    
                    logger.info(f"Librarian provided {len(similar_tasks)} relevant insights")
                    
                    # Inject guidance into task description so Planner/LLM sees it
                    task_description += guidance
            except Exception as e:
                logger.warning(f"Failed to retrieve context from Librarian: {e}")
        # -----------------------------------------------

        plan = self.planner.create_plan(task_description, task_type)
        
        logger.info(f"Executing task with {len(plan)} steps")
        logger.info(f"\n{self.planner.get_plan_summary()}")
        
        try:
            # Execute plan step by step
            result = self._execute_with_plan(task)
            
            # Record success in knowledge base
            if self.knowledge and result.get('success'):
                self._record_success(task, result)
            
            # Add plan summary to result
            result['plan_summary'] = self.planner.get_plan_summary()
            result['context'] = {
                'working_directory': self.planner.context.working_directory,
                'temp_files': self.planner.context.temp_files,
                'created_files': self.planner.context.created_files
            }
            
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
                    
                    result['plan_summary'] = self.planner.get_plan_summary()
                    return result
                    
                except Exception as retry_error:
                    logger.error(f"Retry after healing failed: {retry_error}")
            
            # Record failure in knowledge base
            if self.knowledge:
                self._record_failure(task, str(e))
            
            # Return failure result with plan
            return {
                'success': False,
                'error': str(e),
                'healing_attempted': healing_result is not None,
                'healing_success': healing_result.success if healing_result else False,
                'plan_summary': self.planner.get_plan_summary()
            }
    
    def _execute_with_plan(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task following the plan"""
        
        results = []
        
        while True:
            next_step = self.planner.get_next_step()
            if not next_step:
                break
            
            logger.info(f"Executing step {next_step.id}: {next_step.description}")
            self.planner.start_step(next_step.id)
            
            try:
                # Execute step (placeholder - would call actual tools)
                step_result = self._execute_step(next_step, task)
                
                # Mark as completed
                self.planner.complete_step(
                    next_step.id,
                    notes=step_result.get('notes'),
                    changes=step_result.get('changes', [])
                )
                
                results.append(step_result)
                
            except Exception as e:
                logger.error(f"Step {next_step.id} failed: {e}")
                self.planner.fail_step(next_step.id, str(e))
                raise
        
        return {
            'success': True,
            'message': 'Task completed with plan',
            'steps_completed': len([s for s in self.planner.plan if s.status == 'completed']),
            'total_steps': len(self.planner.plan)
        }
    
    def _execute_step(self, step, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single plan step"""
        
        # Placeholder implementation
        # In real implementation, this would:
        # 1. Determine what action to take based on step description
        # 2. Call appropriate tools
        # 3. Update context (working dir, temp files, etc.)
        # 4. Return results
        
        return {
            'success': True,
            'notes': f'Step {step.id} executed',
            'changes': []
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
        
        # --- Search on Initialization Failure ---
        # If this is an initialization/import error, search for solutions
        error_lower = str(error).lower()
        if any(x in error_lower for x in ["importerror", "modulenotfounderror", "initializ", "config", "tailwind"]):
            # We need to access tools to search. V4Developer doesn't hold reference to V4Tools instance directly 
            # (MissionExecutor creates them both).
            # But we can instantiate V4Tools here temporarily or rely on Healer finding it?
            # actually `SelfHealer` has strategies. I should really add a `SearchStrategy` to `SelfHealer`.
            # BUT, for now, to stick to the plan `developer.py` modification:
            # I can't easily call `search_internet` because I don't have the tool instance.
            # I will instantiate V4Tools temporarily.
            from ..tools import V4Tools
            tools = V4Tools(self.startup_id)
            search_tool = tools.create_search_internet()
            
            logger.info("Triggering auto-search for solution...")
            try:
                # Search for the error text
                query = f"Fix {type(error).__name__} {str(error)[:100]}"
                if "tailwind" in error_lower:
                    query += " tailwind v4"
                
                search_result = search_tool.invoke({"query": query})
                
                # Append findings to failure context for the healer to use
                failure.context['search_findings'] = search_result
                logger.info(f"Auto-search found info: {len(search_result)} chars")
            except Exception as e:
                logger.warning(f"Auto-search failed: {e}")
        # ----------------------------------------
        
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
