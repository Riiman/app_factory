"""
Unit Test Validator for V4 Verification System

Validates code by running unit tests.
"""

import logging
import subprocess
import tempfile
import os
from typing import List
from dataclasses import dataclass

from .base_validator import BaseValidator, ValidationIssue, Severity

logger = logging.getLogger(__name__)


class UnitTestValidator(BaseValidator):
    """
    Validates code by running unit tests.
    
    Looks for test files and runs them to ensure code works correctly.
    """
    
    def validate(self, code: str, file_path: str, language: str) -> List[ValidationIssue]:
        """Run unit tests and return issues"""
        issues = []
        
        if language != "python":
            logger.info(f"Unit test validation not supported for {language}")
            return issues
        
        # Check if this is a test file
        if "test_" in file_path or "_test.py" in file_path:
            # Run the test file
            test_result = self._run_tests(code, file_path)
            if test_result:
                issues.extend(test_result)
        
        return issues
    
    def _run_tests(self, code: str, file_path: str) -> List[ValidationIssue]:
        """Run tests and collect failures"""
        issues = []
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Run pytest on the file
                result = subprocess.run(
                    ['python', '-m', 'pytest', temp_file, '-v', '--tb=short'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode != 0:
                    # Parse test failures
                    issues.append(ValidationIssue(
                        severity=Severity.ERROR,
                        message=f"Unit tests failed",
                        file=file_path,
                        line=0,
                        column=0,
                        suggestion="Fix failing tests"
                    ))
            
            finally:
                # Clean up
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
        
        except subprocess.TimeoutExpired:
            issues.append(ValidationIssue(
                severity=Severity.ERROR,
                message="Unit tests timed out (>30s)",
                file=file_path,
                line=0,
                column=0,
                suggestion="Optimize slow tests"
            ))
        
        except Exception as e:
            logger.error(f"Unit test validation failed: {e}")
        
        return issues
