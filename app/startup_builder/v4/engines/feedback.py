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
    
    def measure_error(self, execution_result: Dict[str, Any], goal: str) -> Dict[str, Any]:
        """
        Analyze the result of the actuation.
        
        Returns:
            LoopDecision: STOP (Success) or RETRY (Error).
        """
        logger.info("⚖️ Feedback: Analyzing execution result")
        
        success = execution_result.get("success", False)
        
        if success:
            return {
                "status": "SUCCESS",
                "message": "Goal achieved successfully."
            }
        
        # If failed, extract error signal
        error = execution_result.get("error", "Unknown failure")
        logs = execution_result.get("logs", [])
        
        logger.warning(f"Feedback: Error detected - {error}")
        
        return {
            "status": "RETRY",
            "error_summary": error,
            "detailed_logs": logs
        }
