"""
Self-Healer for V4 Autonomous System

Coordinates root cause analysis, fix generation, and fix application.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .root_cause_analyzer import RootCauseAnalyzer, Diagnosis
from .fix_generator import FixGenerator, FixStrategy, StrategyType

logger = logging.getLogger(__name__)


@dataclass
class Failure:
    """Represents a failure to heal"""
    error_message: str
    error_type: str
    file: Optional[str] = None
    line: Optional[int] = None
    code: Optional[str] = None
    tool_name: Optional[str] = None
    command: Optional[str] = None


@dataclass
class HealingResult:
    """Result of healing attempt"""
    success: bool
    strategy_used: Optional[FixStrategy]
    diagnosis: Diagnosis
    actions_taken: List[str]
    fixed_code: Optional[str] = None
    message: str = ""


class SelfHealer:
    """
    Self-healing coordinator.
    
    Orchestrates:
    1. Root cause analysis
    2. Fix strategy generation
    3. Fix application (via LLM or direct)
    4. Validation
    """
    
    def __init__(self):
        self.analyzer = RootCauseAnalyzer()
        self.generator = FixGenerator()
        self.max_healing_attempts = 3
    
    def heal(
        self,
        failure: Failure,
        context: Dict[str, Any],
        attempt_number: int = 1
    ) -> HealingResult:
        """
        Attempt to heal a failure.
        
        Args:
            failure: The failure to heal
            context: Additional context (task, code, etc.)
            attempt_number: Current attempt number
            
        Returns:
            HealingResult with success status and actions taken
        """
        
        logger.info(f"Self-healing attempt #{attempt_number} for {failure.error_type}")
        
        # Step 1: Analyze root cause
        diagnosis = self.analyzer.analyze(
            error_message=failure.error_message,
            error_type=failure.error_type,
            context={
                "file": failure.file,
                "line": failure.line,
                "code": failure.code,
                "tool_name": failure.tool_name,
                "command": failure.command,
                **context
            }
        )
        
        logger.info(f"Diagnosis: {diagnosis.root_cause} (confidence: {diagnosis.confidence:.2f})")
        
        # Step 2: Generate fix strategies
        strategies = self.generator.generate_strategies(diagnosis, context)
        
        logger.info(f"Generated {len(strategies)} fix strategies")
        
        # Step 3: Select and apply strategy
        # For now, we return the diagnosis and strategies for the Developer to apply
        # In a full implementation, this would attempt to apply fixes automatically
        
        if strategies:
            best_strategy = strategies[0]  # Highest confidence
            
            return HealingResult(
                success=True,  # Indicates we have a strategy
                strategy_used=best_strategy,
                diagnosis=diagnosis,
                actions_taken=[
                    f"Analyzed root cause: {diagnosis.root_cause}",
                    f"Generated {len(strategies)} fix strategies",
                    f"Recommended strategy: {best_strategy.description}"
                ],
                message=self._format_healing_guidance(diagnosis, best_strategy)
            )
        
        else:
            return HealingResult(
                success=False,
                strategy_used=None,
                diagnosis=diagnosis,
                actions_taken=[
                    f"Analyzed root cause: {diagnosis.root_cause}",
                    "No fix strategies could be generated"
                ],
                message=f"Unable to generate fix for: {diagnosis.root_cause}"
            )
    
    def _format_healing_guidance(self, diagnosis: Diagnosis, strategy: FixStrategy) -> str:
        """Format healing guidance for LLM"""
        
        guidance = f"""
## 🔧 SELF-HEALING GUIDANCE

**Root Cause:** {diagnosis.root_cause}
**Confidence:** {diagnosis.confidence:.0%}
**Category:** {diagnosis.error_category.value}

**Recommended Fix Strategy:** {strategy.description}

**Steps to Fix:**
{chr(10).join(f"{i+1}. {step}" for i, step in enumerate(strategy.steps))}

**Additional Suggestions:**
{chr(10).join(f"- {suggestion}" for suggestion in diagnosis.suggestions)}

**Evidence:**
{chr(10).join(f"- {evidence}" for evidence in diagnosis.evidence)}

Apply the recommended fix strategy above. If it doesn't work, try the next strategy.
"""
        
        return guidance
    
    def can_auto_heal(self, diagnosis: Diagnosis) -> bool:
        """Check if this error can be auto-healed without LLM"""
        
        # Direct fixes with high confidence can potentially be auto-healed
        return (
            diagnosis.confidence > 0.8 and
            diagnosis.error_category in [
                # ErrorCategory.NETWORK,  # Could auto-heal port issues
                # ErrorCategory.IMPORT,   # Could auto-install modules
                # ErrorCategory.CONFIGURATION  # Could auto-create files
            ]
        )
        # For now, return False - all healing goes through LLM
        # In future, implement direct auto-healing for simple cases
        return False
