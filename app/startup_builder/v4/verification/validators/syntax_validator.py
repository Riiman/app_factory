"""
Syntax Validator

Validates code syntax using AST parsing.
"""

import ast
import logging
import time
from typing import Optional
from ..verification_engine import LayerResult, ValidationIssue, Severity

logger = logging.getLogger(__name__)


class SyntaxValidator:
    """Validates code syntax"""
    
    def supports_language(self, language: str) -> bool:
        """Check if this validator supports the language"""
        return language.lower() in ["python", "py"]
    
    def validate(self, code: str, file_path: str, language: str) -> LayerResult:
        """Validate syntax"""
        start_time = time.time()
        issues = []
        
        try:
            # Parse Python code
            ast.parse(code)
            
            # Syntax is valid
            return LayerResult(
                layer_name="Syntax",
                passed=True,
                issues=[],
                execution_time=time.time() - start_time
            )
        
        except SyntaxError as e:
            # Syntax error found
            issues.append(ValidationIssue(
                layer="Syntax",
                severity=Severity.CRITICAL,
                message=f"Syntax error: {e.msg}",
                file=file_path,
                line=e.lineno,
                column=e.offset,
                suggestion="Fix the syntax error before proceeding"
            ))
            
            return LayerResult(
                layer_name="Syntax",
                passed=False,
                issues=issues,
                execution_time=time.time() - start_time
            )
        
        except Exception as e:
            # Other parsing error
            issues.append(ValidationIssue(
                layer="Syntax",
                severity=Severity.ERROR,
                message=f"Failed to parse code: {str(e)}",
                file=file_path,
                suggestion="Ensure code is valid Python"
            ))
            
            return LayerResult(
                layer_name="Syntax",
                passed=False,
                issues=issues,
                execution_time=time.time() - start_time
            )
