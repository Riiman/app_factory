"""
Lint Validator

Validates code quality using pylint/flake8.
"""

import logging
import time
import tempfile
import os
import subprocess
from typing import Optional
from ..verification_engine import LayerResult, ValidationIssue, Severity

logger = logging.getLogger(__name__)


class LintValidator:
    """Validates code quality using linters"""
    
    def __init__(self):
        self.has_flake8 = self._check_tool("flake8")
        self.has_pylint = self._check_tool("pylint")
    
    def _check_tool(self, tool: str) -> bool:
        """Check if a tool is available"""
        try:
            subprocess.run([tool, '--version'], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def supports_language(self, language: str) -> bool:
        """Check if this validator supports the language"""
        return language.lower() in ["python", "py"] and (self.has_flake8 or self.has_pylint)
    
    def validate(self, code: str, file_path: str, language: str) -> LayerResult:
        """Validate code quality"""
        start_time = time.time()
        
        if not (self.has_flake8 or self.has_pylint):
            return LayerResult(
                layer_name="Lint",
                passed=True,
                issues=[],
                execution_time=time.time() - start_time,
                metadata={"skipped": True, "reason": "no linters available"}
            )
        
        issues = []
        
        # Write code to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        try:
            # Run flake8 if available
            if self.has_flake8:
                issues.extend(self._run_flake8(temp_file, file_path))
            
            # Run pylint if available (only if flake8 not available or found no issues)
            elif self.has_pylint:
                issues.extend(self._run_pylint(temp_file, file_path))
            
            # Filter to only errors and warnings
            error_count = len([i for i in issues if i.severity in [Severity.ERROR, Severity.CRITICAL]])
            
            return LayerResult(
                layer_name="Lint",
                passed=error_count == 0,
                issues=issues,
                execution_time=time.time() - start_time
            )
        
        finally:
            # Clean up temp file
            if os.path.exists(temp_file):
                os.unlink(temp_file)
    
    def _run_flake8(self, temp_file: str, file_path: str) -> list:
        """Run flake8 and parse results"""
        issues = []
        
        try:
            result = subprocess.run(
                ['flake8', temp_file, '--max-line-length=120'],
                capture_output=True,
                text=True
            )
            
            # Parse flake8 output: file:line:col: code message
            for line in result.stdout.split('\n'):
                if line.strip() and ':' in line:
                    parts = line.split(':', 3)
                    if len(parts) >= 4:
                        try:
                            line_no = int(parts[1])
                            col = int(parts[2])
                            message = parts[3].strip()
                            
                            # Determine severity based on error code
                            severity = Severity.WARNING
                            if message.startswith('E') or message.startswith('F'):
                                severity = Severity.ERROR
                            
                            issues.append(ValidationIssue(
                                layer="Lint",
                                severity=severity,
                                message=message,
                                file=file_path,
                                line=line_no,
                                column=col,
                                suggestion="Fix linting issue"
                            ))
                        except (ValueError, IndexError):
                            pass
        
        except Exception as e:
            logger.error(f"flake8 failed: {e}")
        
        return issues
    
    def _run_pylint(self, temp_file: str, file_path: str) -> list:
        """Run pylint and parse results"""
        issues = []
        
        try:
            result = subprocess.run(
                ['pylint', temp_file, '--output-format=text'],
                capture_output=True,
                text=True
            )
            
            # Parse pylint output
            for line in result.stdout.split('\n'):
                if line.strip() and ':' in line and not line.startswith('*'):
                    # pylint format: file:line:col: severity: message
                    parts = line.split(':', 3)
                    if len(parts) >= 3:
                        try:
                            line_no = int(parts[1])
                            message = parts[2].strip() if len(parts) == 3 else parts[3].strip()
                            
                            # Determine severity
                            severity = Severity.INFO
                            if 'error' in message.lower():
                                severity = Severity.ERROR
                            elif 'warning' in message.lower():
                                severity = Severity.WARNING
                            
                            issues.append(ValidationIssue(
                                layer="Lint",
                                severity=severity,
                                message=message,
                                file=file_path,
                                line=line_no,
                                suggestion="Fix linting issue"
                            ))
                        except (ValueError, IndexError):
                            pass
        
        except Exception as e:
            logger.error(f"pylint failed: {e}")
        
        return issues
