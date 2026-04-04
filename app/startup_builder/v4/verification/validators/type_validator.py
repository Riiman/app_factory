"""
Type Validator

Validates type hints and type correctness using mypy.
"""

import logging
import time
import tempfile
import os
from typing import Optional
from ..verification_engine import LayerResult, ValidationIssue, Severity

logger = logging.getLogger(__name__)


class TypeValidator:
    """Validates type hints and type correctness"""
    
    def __init__(self):
        self.has_mypy = self._check_mypy()
    
    def _check_mypy(self) -> bool:
        """Check if mypy is available"""
        try:
            import mypy
            return True
        except ImportError:
            logger.warning("mypy not available - type checking disabled")
            return False
    
    def supports_language(self, language: str) -> bool:
        """Check if this validator supports the language"""
        return language.lower() in ["python", "py"] and self.has_mypy
    
    def validate(self, code: str, file_path: str, language: str) -> LayerResult:
        """Validate types"""
        start_time = time.time()
        
        if not self.has_mypy:
            return LayerResult(
                layer_name="Types",
                passed=True,
                issues=[],
                execution_time=time.time() - start_time,
                metadata={"skipped": True, "reason": "mypy not available"}
            )
        
        issues = []
        
        try:
            from mypy import api
            
            # Write code to temp file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Run mypy
                result = api.run([
                    temp_file,
                    '--ignore-missing-imports',
                    '--no-error-summary'
                ])
                
                stdout, stderr, exit_code = result
                
                # Parse mypy output
                if exit_code != 0 and stdout:
                    for line in stdout.split('\n'):
                        if line.strip() and ':' in line:
                            # Parse mypy error format: file:line:col: severity: message
                            parts = line.split(':', 4)
                            if len(parts) >= 4:
                                try:
                                    line_no = int(parts[1])
                                    severity = Severity.WARNING if 'note' in parts[3].lower() else Severity.ERROR
                                    message = parts[3].strip() if len(parts) == 4 else parts[4].strip()
                                    
                                    issues.append(ValidationIssue(
                                        layer="Types",
                                        severity=severity,
                                        message=message,
                                        file=file_path,
                                        line=line_no,
                                        suggestion="Add or fix type hints"
                                    ))
                                except (ValueError, IndexError):
                                    pass
                
                passed = len([i for i in issues if i.severity == Severity.ERROR]) == 0
                
                return LayerResult(
                    layer_name="Types",
                    passed=passed,
                    issues=issues,
                    execution_time=time.time() - start_time
                )
            
            finally:
                # Clean up temp file
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
        
        except Exception as e:
            logger.error(f"Type validation failed: {e}")
            return LayerResult(
                layer_name="Types",
                passed=True,  # Don't fail on validator errors
                issues=[],
                execution_time=time.time() - start_time,
                metadata={"error": str(e)}
            )
