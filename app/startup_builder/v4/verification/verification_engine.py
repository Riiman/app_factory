"""
Multi-Layer Verification Engine for V4 Autonomous System

Validates code through multiple layers before accepting it.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class Severity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    layer: str
    severity: Severity
    message: str
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None
    suggestion: Optional[str] = None


@dataclass
class LayerResult:
    """Result from a single validation layer"""
    layer_name: str
    passed: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    execution_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationResult:
    """Complete verification result from all layers"""
    passed: bool
    layer_results: List[LayerResult]
    failed_layer: Optional[str] = None
    critical_issues: List[ValidationIssue] = field(default_factory=list)
    quality_score: float = 0.0
    
    def get_summary(self) -> str:
        """Get human-readable summary"""
        if self.passed:
            return f"✅ All {len(self.layer_results)} validation layers passed (Quality: {self.quality_score:.1f}/10)"
        else:
            return f"❌ Verification failed at {self.failed_layer}: {len(self.critical_issues)} critical issue(s)"


class VerificationEngine:
    """
    Multi-layer verification engine.
    
    Validates code through multiple layers:
    1. Syntax validation
    2. Type checking
    3. Linting
    4. Unit tests
    5. Integration tests
    """
    
    def __init__(self):
        from .validators.syntax_validator import SyntaxValidator
        from .validators.type_validator import TypeValidator
        from .validators.lint_validator import LintValidator
        
        self.validators = [
            SyntaxValidator(),
            TypeValidator(),
            LintValidator(),
        ]
    
    def verify(self, code: str, file_path: str, language: str = "python") -> VerificationResult:
        """
        Run all verification layers.
        
        Args:
            code: Code to verify
            file_path: Path to the file
            language: Programming language
            
        Returns:
            VerificationResult with all layer results
        """
        layer_results = []
        critical_issues = []
        
        for validator in self.validators:
            # Skip if validator doesn't support this language
            if not validator.supports_language(language):
                continue
            
            # Run validation
            result = validator.validate(code, file_path, language)
            layer_results.append(result)
            
            # Collect critical issues
            critical_issues.extend([
                issue for issue in result.issues
                if issue.severity == Severity.CRITICAL or issue.severity == Severity.ERROR
            ])
            
            # Fail fast on critical errors
            if not result.passed and any(issue.severity == Severity.CRITICAL for issue in result.issues):
                return VerificationResult(
                    passed=False,
                    layer_results=layer_results,
                    failed_layer=result.layer_name,
                    critical_issues=critical_issues,
                    quality_score=self._calculate_quality(layer_results)
                )
        
        # All layers passed
        passed = all(r.passed for r in layer_results)
        
        return VerificationResult(
            passed=passed,
            layer_results=layer_results,
            failed_layer=None if passed else layer_results[-1].layer_name,
            critical_issues=critical_issues,
            quality_score=self._calculate_quality(layer_results)
        )
    
    def _calculate_quality(self, layer_results: List[LayerResult]) -> float:
        """Calculate overall quality score (0-10)"""
        if not layer_results:
            return 0.0
        
        # Start with perfect score
        score = 10.0
        
        # Deduct points for issues
        for result in layer_results:
            for issue in result.issues:
                if issue.severity == Severity.CRITICAL:
                    score -= 2.0
                elif issue.severity == Severity.ERROR:
                    score -= 1.0
                elif issue.severity == Severity.WARNING:
                    score -= 0.5
                elif issue.severity == Severity.INFO:
                    score -= 0.1
        
        return max(0.0, min(10.0, score))
