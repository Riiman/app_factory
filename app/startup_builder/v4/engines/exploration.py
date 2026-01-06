"""
V4 Exploration Engine - The Sensors.

Responsible for measuring the "Live State" (y) of the codebase plant.
"""

import logging
from typing import Dict, Any, Optional

from ..context.librarian import Librarian
from ..context.context_cache import ContextCache

logger = logging.getLogger(__name__)

class ExplorationEngine:
    """
    The Sensors of the Agentic Control Loop.
    
    Role: Measure and report the current state of the codebase.
    """
    
    def __init__(self, startup_id: str, workspace_path: str):
        self.startup_id = startup_id
        self.librarian = Librarian(workspace_path)
        self.context_cache = ContextCache(workspace_path)
        
    def observe_state(self, goal: str, feedback: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Measure the current state of the system relative to the goal.
        
        Args:
            goal: The reference signal (what we want).
            feedback: Error signal from previous cycle (optional).
            
        Returns:
            ContextSnapshot: The measured state (y).
        """
        logger.info(f"🔭 Sensors: Observing state for goal '{goal}'")
        
        # 1. Physical Measurement (Index the Filesystem)
        self.librarian.index_workspace()
        
        # 2. Focused Reading (Resolve relevant context)
        focused_context = self.librarian.resolve_context(goal)
        
        # 3. Global Reading (Broad summary)
        global_summary = self.context_cache.get_summary()
        
        # 4. Integrate Feedback (If previous measure failed)
        error_context = None
        if feedback:
            logger.info("🔭 Sensors: Integrating previous error feedback")
            error_context = feedback
            
        return {
            "focused_context": focused_context,
            "global_summary": global_summary,
            "feedback_context": error_context,
            "goal": goal,
            "timestamp": "now" # TODO: Real timestamp
        }
