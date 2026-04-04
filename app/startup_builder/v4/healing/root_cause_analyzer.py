"""
Root Cause Analyzer for V4 Self-Healing System

Analyzes failures to determine root cause and suggest fixes.
"""

import re
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """Categories of errors"""
    SYNTAX = "syntax"
    TYPE = "type"
    IMPORT = "import"
    DEPENDENCY = "dependency"
    CONFIGURATION = "configuration"
    LOGIC = "logic"
    RUNTIME = "runtime"
    NETWORK = "network"
    PERMISSION = "permission"
    RESOURCE = "resource"
    UNKNOWN = "unknown"


class FixCategory(Enum):
    """Categories of fixes"""
    DIRECT = "direct"           # Apply known fix
    INCREMENTAL = "incremental" # Fix in small steps
    ALTERNATIVE = "alternative" # Try different approach
    REGENERATE = "regenerate"   # Regenerate from scratch


@dataclass
class Diagnosis:
    """Result of root cause analysis"""
    root_cause: str
    error_category: ErrorCategory
    fix_category: FixCategory
    confidence: float  # 0.0 to 1.0
    evidence: List[str]
    suggestions: List[str]
    metadata: Dict[str, Any]


class ErrorPattern:
    """Represents a known error pattern"""
    
    def __init__(
        self,
        name: str,
        pattern: str,
        category: ErrorCategory,
        fix_category: FixCategory,
        root_cause: str,
        suggestions: List[str]
    ):
        self.name = name
        self.pattern = re.compile(pattern, re.IGNORECASE)
        self.category = category
        self.fix_category = fix_category
        self.root_cause = root_cause
        self.suggestions = suggestions
    
    def matches(self, error_message: str) -> bool:
        """Check if error message matches this pattern"""
        return bool(self.pattern.search(error_message))


class RootCauseAnalyzer:
    """
    Analyzes failures to determine root cause.
    
    Uses two-level approach:
    1. Pattern matching for known errors (fast, high confidence)
    2. Static analysis for unknown errors (slower, lower confidence)
    """
    
    def __init__(self):
        self.patterns = self._build_pattern_library()
    
    def analyze(
        self,
        error_message: str,
        error_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Diagnosis:
        """
        Analyze an error and determine root cause.
        
        Args:
            error_message: The error message
            error_type: Type of error (e.g., "SyntaxError", "PortInUse")
            context: Additional context (code, file, etc.)
            
        Returns:
            Diagnosis with root cause and fix suggestions
        """
        context = context or {}
        
        # Level 1: Pattern matching (fast path)
        for pattern in self.patterns:
            if pattern.matches(error_message):
                return Diagnosis(
                    root_cause=pattern.root_cause,
                    error_category=pattern.category,
                    fix_category=pattern.fix_category,
                    confidence=0.9,
                    evidence=[f"Matched pattern: {pattern.name}"],
                    suggestions=pattern.suggestions,
                    metadata={"pattern": pattern.name}
                )
        
        # Level 2: Heuristic analysis (slower path)
        return self._heuristic_analysis(error_message, error_type, context)
    
    def _build_pattern_library(self) -> List[ErrorPattern]:
        """Build library of known error patterns"""
        return [
            # Port/Network Errors
            ErrorPattern(
                name="port_in_use",
                pattern=r"(EADDRINUSE|address already in use|port.*already.*use)",
                category=ErrorCategory.NETWORK,
                fix_category=FixCategory.DIRECT,
                root_cause="Port is already in use by another process",
                suggestions=[
                    "Kill the process using the port",
                    "Use a different port number",
                    "Check if the same server is already running"
                ]
            ),
            
            # Module/Import Errors
            ErrorPattern(
                name="module_not_found",
                pattern=r"(ModuleNotFoundError|No module named|cannot import name)",
                category=ErrorCategory.IMPORT,
                fix_category=FixCategory.DIRECT,
                root_cause="Required module is not installed or not found",
                suggestions=[
                    "Install the missing module using pip/npm",
                    "Check if the module name is spelled correctly",
                    "Verify the module is in the correct path"
                ]
            ),
            
            # Syntax Errors
            ErrorPattern(
                name="syntax_error",
                pattern=r"(SyntaxError|invalid syntax|unexpected token)",
                category=ErrorCategory.SYNTAX,
                fix_category=FixCategory.DIRECT,
                root_cause="Code has syntax errors",
                suggestions=[
                    "Check for missing colons, parentheses, or brackets",
                    "Verify indentation is correct",
                    "Look for typos in keywords"
                ]
            ),
            
            # File Errors
            ErrorPattern(
                name="file_not_found",
                pattern=r"(FileNotFoundError|ENOENT|no such file or directory)",
                category=ErrorCategory.CONFIGURATION,
                fix_category=FixCategory.DIRECT,
                root_cause="Required file or directory does not exist",
                suggestions=[
                    "Create the missing file or directory",
                    "Check if the path is correct",
                    "Verify file permissions"
                ]
            ),
            
            # Permission Errors
            ErrorPattern(
                name="permission_denied",
                pattern=r"(PermissionError|EACCES|permission denied)",
                category=ErrorCategory.PERMISSION,
                fix_category=FixCategory.DIRECT,
                root_cause="Insufficient permissions to access resource",
                suggestions=[
                    "Check file/directory permissions",
                    "Run with appropriate user privileges",
                    "Verify ownership of files"
                ]
            ),
            
            # Type Errors
            ErrorPattern(
                name="type_error",
                pattern=r"(TypeError|type.*not.*support|cannot.*type)",
                category=ErrorCategory.TYPE,
                fix_category=FixCategory.DIRECT,
                root_cause="Type mismatch or incompatible operation",
                suggestions=[
                    "Check variable types match expected types",
                    "Add type conversion if needed",
                    "Verify function arguments are correct types"
                ]
            ),
            
            # Attribute Errors
            ErrorPattern(
                name="attribute_error",
                pattern=r"(AttributeError|has no attribute|object.*no.*attribute)",
                category=ErrorCategory.LOGIC,
                fix_category=FixCategory.INCREMENTAL,
                root_cause="Attempting to access non-existent attribute",
                suggestions=[
                    "Check if object has the attribute",
                    "Verify object is initialized correctly",
                    "Check for typos in attribute name"
                ]
            ),
            
            # Dependency Errors
            ErrorPattern(
                name="dependency_conflict",
                pattern=r"(version.*conflict|incompatible.*version|dependency.*error)",
                category=ErrorCategory.DEPENDENCY,
                fix_category=FixCategory.ALTERNATIVE,
                root_cause="Dependency version conflict",
                suggestions=[
                    "Update dependencies to compatible versions",
                    "Check dependency requirements",
                    "Use virtual environment to isolate dependencies"
                ]
            ),
            
            # Command Not Found
            ErrorPattern(
                name="command_not_found",
                pattern=r"(command not found|not recognized|is not.*command)",
                category=ErrorCategory.CONFIGURATION,
                fix_category=FixCategory.DIRECT,
                root_cause="Command or executable not found in PATH",
                suggestions=[
                    "Install the required tool/package",
                    "Add tool to PATH environment variable",
                    "Use full path to executable"
                ]
            ),
        ]
    
    def _heuristic_analysis(
        self,
        error_message: str,
        error_type: str,
        context: Dict[str, Any]
    ) -> Diagnosis:
        """Heuristic analysis for unknown errors"""
        
        # Categorize by error type
        category = self._categorize_error(error_type)
        
        # Determine fix category based on error category
        fix_category = self._determine_fix_category(category)
        
        # Extract key information
        evidence = self._extract_evidence(error_message, context)
        
        # Generate generic suggestions
        suggestions = self._generate_suggestions(category, error_message)
        
        return Diagnosis(
            root_cause=f"{error_type}: {error_message[:100]}",
            error_category=category,
            fix_category=fix_category,
            confidence=0.5,  # Lower confidence for heuristic analysis
            evidence=evidence,
            suggestions=suggestions,
            metadata={"analysis_type": "heuristic"}
        )
    
    def _categorize_error(self, error_type: str) -> ErrorCategory:
        """Categorize error by type"""
        error_type_lower = error_type.lower()
        
        if "syntax" in error_type_lower:
            return ErrorCategory.SYNTAX
        elif "type" in error_type_lower:
            return ErrorCategory.TYPE
        elif "import" in error_type_lower or "module" in error_type_lower:
            return ErrorCategory.IMPORT
        elif "file" in error_type_lower or "directory" in error_type_lower:
            return ErrorCategory.CONFIGURATION
        elif "permission" in error_type_lower or "access" in error_type_lower:
            return ErrorCategory.PERMISSION
        elif "network" in error_type_lower or "connection" in error_type_lower:
            return ErrorCategory.NETWORK
        elif "runtime" in error_type_lower:
            return ErrorCategory.RUNTIME
        else:
            return ErrorCategory.UNKNOWN
    
    def _determine_fix_category(self, error_category: ErrorCategory) -> FixCategory:
        """Determine fix category based on error category"""
        
        # Direct fixes for simple errors
        if error_category in [
            ErrorCategory.SYNTAX,
            ErrorCategory.IMPORT,
            ErrorCategory.CONFIGURATION,
            ErrorCategory.PERMISSION
        ]:
            return FixCategory.DIRECT
        
        # Incremental fixes for logic errors
        elif error_category in [ErrorCategory.LOGIC, ErrorCategory.TYPE]:
            return FixCategory.INCREMENTAL
        
        # Alternative approaches for complex errors
        elif error_category in [ErrorCategory.DEPENDENCY, ErrorCategory.NETWORK]:
            return FixCategory.ALTERNATIVE
        
        # Regenerate for unknown errors
        else:
            return FixCategory.REGENERATE
    
    def _extract_evidence(
        self,
        error_message: str,
        context: Dict[str, Any]
    ) -> List[str]:
        """Extract evidence from error and context"""
        evidence = []
        
        # Add error message snippet
        evidence.append(f"Error: {error_message[:200]}")
        
        # Add file/line if available
        if "file" in context:
            evidence.append(f"File: {context['file']}")
        if "line" in context:
            evidence.append(f"Line: {context['line']}")
        
        # Add code snippet if available
        if "code" in context and context["code"]:
            code_snippet = context["code"][:100]
            evidence.append(f"Code: {code_snippet}")
        
        return evidence
    
    def _generate_suggestions(
        self,
        category: ErrorCategory,
        error_message: str
    ) -> List[str]:
        """Generate generic suggestions based on category"""
        
        suggestions = {
            ErrorCategory.SYNTAX: [
                "Review code syntax carefully",
                "Check for missing colons, brackets, or parentheses",
                "Verify indentation is correct"
            ],
            ErrorCategory.TYPE: [
                "Check variable types",
                "Add type conversion if needed",
                "Verify function signatures"
            ],
            ErrorCategory.IMPORT: [
                "Install missing dependencies",
                "Check import paths",
                "Verify module names"
            ],
            ErrorCategory.CONFIGURATION: [
                "Check configuration files",
                "Verify file paths exist",
                "Review environment variables"
            ],
            ErrorCategory.PERMISSION: [
                "Check file permissions",
                "Run with appropriate privileges",
                "Verify resource access"
            ],
            ErrorCategory.NETWORK: [
                "Check network connectivity",
                "Verify ports are available",
                "Review firewall settings"
            ],
            ErrorCategory.UNKNOWN: [
                "Review error message carefully",
                "Search for similar errors online",
                "Try a different approach"
            ]
        }
        
        return suggestions.get(category, suggestions[ErrorCategory.UNKNOWN])
