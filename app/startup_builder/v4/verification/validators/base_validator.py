"""
Base Validator for V4 Verification System
"""

from abc import ABC, abstractmethod
from typing import List
from dataclasses import dataclass
from enum import Enum


class Severity(Enum):
    """Issue severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Represents a validation issue"""
    severity: Severity
    message: str
    file: str
    line: int
    column: int
    suggestion: str = ""


class BaseValidator(ABC):
    """Base class for all validators"""
    
    @abstractmethod
    def validate(self, code: str, file_path: str, language: str) -> List[ValidationIssue]:
        """
        Validate code and return issues.
        
        Args:
            code: Code to validate
            file_path: Path to file
            language: Programming language
            
        Returns:
            List of validation issues
        """
        pass
