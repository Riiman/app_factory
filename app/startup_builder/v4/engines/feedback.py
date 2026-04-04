"""
V4 Feedback Engine - The Monitor.

Responsible for measuring the Error (e) after actuation.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class FeedbackLoop:
    """
    The Feedback Monitor of the Agentic Control Loop.
    
    Role: Analyze execution results to determine next state.
    """
    
    class LoopDecision:
        def __init__(self, success: bool, reason: str = ""):
            self.success = success
            self.reason = reason

    def analyze_result(self, execution_result: Dict[str, Any], goal: str, cycle_memory: Dict[str, Any] = None) -> 'LoopDecision':
        """
        Analyze the result of the actuation.
        
        Returns:
            LoopDecision: STOP (Success) or RETRY (Error).
        """
        logger.info("⚖️ Feedback: Analyzing execution result")
        
        success = execution_result.get("success", False)
        
        if success:
            return self.LoopDecision(True, "Goal achieved successfully.")
        
        # If failed, extract error signal
        error = execution_result.get("error", "Unknown failure")
        logs = execution_result.get("logs", [])
        
        # Structure the error for the AI Planner
        failed_steps = [res for res in logs if not res.get("success")]
        if failed_steps:
             primary_failure = failed_steps[0]
             step_desc = primary_failure.get("step", {}).get("description", "Unknown Step")
             
             # Enrich error message
             error = f"Step Failed: '{step_desc}'. \nError Details: {primary_failure.get('error')}"
             if primary_failure.get("output"):
                 error += f"\nCommand Output: {primary_failure.get('output')}"
        
        logger.warning(f"Feedback: Error detected - {error}")
        
        # Store analysis in RAM
        if cycle_memory is not None:
             cycle_memory['last_analysis'] = {
                "status": "FAILED",
                "reason": error,
                "failed_step_count": len(failed_steps),
                "total_steps": len(logs)
            }
        
        return self.LoopDecision(False, error)
