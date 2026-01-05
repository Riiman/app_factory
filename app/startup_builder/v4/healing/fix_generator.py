"""
Fix Generator for V4 Self-Healing System

Generates fix strategies based on diagnosis.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

from .root_cause_analyzer import Diagnosis, ErrorCategory, FixCategory

logger = logging.getLogger(__name__)


class StrategyType(Enum):
    """Types of fix strategies"""
    DIRECT = "direct"
    INCREMENTAL = "incremental"
    ALTERNATIVE = "alternative"
    REGENERATE = "regenerate"


@dataclass
class FixStrategy:
    """Represents a fix strategy"""
    strategy_type: StrategyType
    description: str
    confidence: float
    steps: List[str]
    metadata: Dict[str, Any]


class FixGenerator:
    """
    Generates fix strategies based on diagnosis.
    
    Provides multiple strategies ordered by confidence:
    1. Direct Fix: Apply known fix pattern (high confidence)
    2. Incremental Fix: Fix in small steps (medium confidence)
    3. Alternative Approach: Try different method (low confidence)
    4. Regenerate: Start from scratch (fallback)
    """
    
    def generate_strategies(self, diagnosis: Diagnosis, context: Dict[str, Any]) -> List[FixStrategy]:
        """
        Generate fix strategies based on diagnosis.
        
        Args:
            diagnosis: Root cause diagnosis
            context: Additional context (code, task, etc.)
            
        Returns:
            List of fix strategies ordered by confidence
        """
        strategies = []
        
        # Generate strategies based on fix category
        if diagnosis.fix_category == FixCategory.DIRECT:
            strategies.append(self._generate_direct_fix(diagnosis, context))
        
        elif diagnosis.fix_category == FixCategory.INCREMENTAL:
            strategies.append(self._generate_incremental_fix(diagnosis, context))
        
        elif diagnosis.fix_category == FixCategory.ALTERNATIVE:
            strategies.append(self._generate_alternative_fix(diagnosis, context))
        
        # Always add regenerate as fallback
        strategies.append(self._generate_regenerate_strategy(diagnosis, context))
        
        return strategies
    
    def _generate_direct_fix(self, diagnosis: Diagnosis, context: Dict[str, Any]) -> FixStrategy:
        """Generate direct fix strategy"""
        
        steps = []
        
        # Port in use
        if diagnosis.error_category == ErrorCategory.NETWORK and "port" in diagnosis.root_cause.lower():
            port = self._extract_port(context.get("error_message", ""))
            steps = [
                f"Check if port {port} is in use: `lsof -i :{port}` or `netstat -ano | grep {port}`",
                f"Kill the process using the port OR use a different port",
                "Retry the operation"
            ]
        
        # Module not found
        elif diagnosis.error_category == ErrorCategory.IMPORT:
            module = self._extract_module_name(context.get("error_message", ""))
            steps = [
                f"Install missing module: `pip install {module}` or `npm install {module}`",
                "Verify installation: Check if module is in requirements.txt/package.json",
                "Retry the import"
            ]
        
        # Syntax error
        elif diagnosis.error_category == ErrorCategory.SYNTAX:
            steps = [
                "Review the syntax error location (file:line:column)",
                "Fix the syntax issue (missing colon, bracket, etc.)",
                "Validate syntax: Run Python parser or linter",
                "Retry execution"
            ]
        
        # File not found
        elif diagnosis.error_category == ErrorCategory.CONFIGURATION:
            file_path = context.get("file", "the file")
            steps = [
                f"Create missing file/directory: {file_path}",
                "Verify path is correct",
                "Check file permissions if needed",
                "Retry the operation"
            ]
        
        # Generic direct fix
        else:
            steps = diagnosis.suggestions + ["Retry the operation"]
        
        return FixStrategy(
            strategy_type=StrategyType.DIRECT,
            description=f"Apply direct fix for {diagnosis.error_category.value} error",
            confidence=diagnosis.confidence,
            steps=steps,
            metadata={"diagnosis": diagnosis.root_cause}
        )
    
    def _generate_incremental_fix(self, diagnosis: Diagnosis, context: Dict[str, Any]) -> FixStrategy:
        """Generate incremental fix strategy"""
        
        steps = [
            "Isolate the failing component",
            "Create minimal test case",
            "Fix the specific issue",
            "Validate the fix",
            "Integrate back into full code",
            "Test end-to-end"
        ]
        
        return FixStrategy(
            strategy_type=StrategyType.INCREMENTAL,
            description="Fix the issue incrementally in small steps",
            confidence=diagnosis.confidence * 0.8,  # Slightly lower confidence
            steps=steps,
            metadata={"diagnosis": diagnosis.root_cause}
        )
    
    def _generate_alternative_fix(self, diagnosis: Diagnosis, context: Dict[str, Any]) -> FixStrategy:
        """Generate alternative approach strategy"""
        
        steps = []
        
        # Dependency conflict
        if diagnosis.error_category == ErrorCategory.DEPENDENCY:
            steps = [
                "Research alternative libraries/packages",
                "Update dependencies to compatible versions",
                "Use virtual environment to isolate",
                "Test with new dependencies"
            ]
        
        # Network/port issues
        elif diagnosis.error_category == ErrorCategory.NETWORK:
            steps = [
                "Try a different port number",
                "Use a different network configuration",
                "Check if service can run on different interface",
                "Test connectivity"
            ]
        
        # Generic alternative
        else:
            steps = [
                "Research alternative approaches",
                "Implement using different method/library",
                "Test the alternative solution",
                "Validate it solves the problem"
            ]
        
        return FixStrategy(
            strategy_type=StrategyType.ALTERNATIVE,
            description="Try an alternative approach to solve the problem",
            confidence=diagnosis.confidence * 0.6,  # Lower confidence
            steps=steps,
            metadata={"diagnosis": diagnosis.root_cause}
        )
    
    def _generate_regenerate_strategy(self, diagnosis: Diagnosis, context: Dict[str, Any]) -> FixStrategy:
        """Generate regenerate strategy (fallback)"""
        
        steps = [
            "Analyze what went wrong in the original approach",
            "Enhance the prompt with failure context",
            "Regenerate the code from scratch",
            "Apply lessons learned from the failure",
            "Validate the new implementation"
        ]
        
        return FixStrategy(
            strategy_type=StrategyType.REGENERATE,
            description="Regenerate the code from scratch with enhanced context",
            confidence=0.5,  # Medium confidence (fallback)
            steps=steps,
            metadata={
                "diagnosis": diagnosis.root_cause,
                "failure_context": diagnosis.evidence
            }
        )
    
    def _extract_port(self, error_message: str) -> str:
        """Extract port number from error message"""
        import re
        match = re.search(r':(\d{4,5})', error_message)
        return match.group(1) if match else "XXXX"
    
    def _extract_module_name(self, error_message: str) -> str:
        """Extract module name from error message"""
        import re
        
        # Try "No module named 'xxx'"
        match = re.search(r"No module named ['\"]([^'\"]+)['\"]", error_message)
        if match:
            return match.group(1)
        
        # Try "ModuleNotFoundError: xxx"
        match = re.search(r"ModuleNotFoundError:\s*(\w+)", error_message)
        if match:
            return match.group(1)
        
        return "UNKNOWN_MODULE"
