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
        self.last_snapshot = {}
        
    def observe_state(self, goal: str, feedback: Optional[Dict[str, Any]] = None, cycle_memory: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Measure the current state of the system relative to the goal.
        
        Args:
            goal: The reference signal (what we want).
            feedback: Error signal from previous cycle (optional).
            cycle_memory: Persistent RAM for the current cycle loop.
            
        Returns:
            ContextSnapshot: The measured state (y).
        """
        logger.info(f"🔭 Sensors: Observing state for goal '{goal}'")
        
        # 1. Physical Measurement (Index the Filesystem)
        self.librarian.index_workspace()
        
        # 1b. Update Context Cache (Brain's Long-term Memory)
        # We perform a lightweight scan to update the persistent cache
        tech_stack = self.librarian.detect_tech_stack()
        files = self.librarian.get_all_files()
        
        # Calculate relative paths for cleaner context
        rel_files = [os.path.relpath(f, self.workspace_root) for f in files]
        
        # Minimal context save - we rely on Chroma for heavy lifting
        # But ContextCache needs metadata for the prompt
        context_data = {
            "metadata": {
                "total_files": len(files),
                "tech_stack": tech_stack,
                "indexed_at": "now"
            },
            "file_summaries": {f: "Indexed" for f in files}, # Placeholder
            "file_tree": rel_files
        }
        self.context_cache.save_context(context_data)
        
        # 2. Focused Reading (Resolve relevant context)
        focused_context = self.librarian.resolve_context(goal)
        
        # 3. Global Reading (Broad summary)
        global_summary = self.context_cache.get_summary()
        
        return {
            "focused_context": focused_context,
            "global_summary": global_summary,
            "file_list": rel_files, # Explicit file map for "Resume" logic
            "feedback": feedback
        }
        
        # 4. Integrate Feedback (If previous measure failed)
        error_context = None
        if feedback:
            logger.info("🔭 Sensors: Integrating previous error feedback")
            error_context = feedback
            
        # 5. Change Detection (Did we move?)
        from datetime import datetime
        timestamp = datetime.utcnow().isoformat()
        
        files_hash = self.librarian.get_workspace_hash()
        changes_detected = []
        if self.last_snapshot:
             diff = set(files_hash.items()) - set(self.last_snapshot.items())
             if diff:
                 changes_detected = [f"{k} (Modified)" for k,v in diff]
        
        self.last_snapshot = files_hash
            
        return {
            "focused_context": focused_context,
            "global_summary": global_summary,
            "feedback_context": error_context,
            "changes_since_last_cycle": changes_detected,
            "goal": goal,
            "timestamp": timestamp
        }
