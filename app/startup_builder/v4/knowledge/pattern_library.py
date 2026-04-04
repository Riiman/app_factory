"""
Pattern Library for V4 Knowledge Base

Stores and retrieves common code patterns.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Types of code patterns"""
    REST_API = "rest_api"
    REACT_COMPONENT = "react_component"
    DATABASE_MODEL = "database_model"
    AUTH_FLOW = "authentication"
    ERROR_HANDLER = "error_handler"
    VALIDATION = "validation"
    MIDDLEWARE = "middleware"
    UTILITY = "utility"


@dataclass
class CodePattern:
    """Represents a reusable code pattern"""
    name: str
    pattern_type: PatternType
    template: str
    variables: List[str]
    description: str
    success_rate: float = 1.0
    usage_count: int = 0
    metadata: Dict[str, Any] = None


class PatternLibrary:
    """
    Library of common code patterns.
    
    Provides templates for frequently used code structures.
    """
    
    def __init__(self):
        self.patterns: Dict[str, CodePattern] = {}
        self._load_builtin_patterns()
    
    def _load_builtin_patterns(self):
        """Load built-in patterns"""
        
        # REST API Endpoint Pattern
        self.add_pattern(CodePattern(
            name="express_rest_endpoint",
            pattern_type=PatternType.REST_API,
            template="""
// {description}
router.{method}('{path}', async (req, res) => {
    try {
        // Extract parameters
        const {{ {params} }} = req.{param_source};
        
        // Business logic
        {business_logic}
        
        // Send response
        res.status({success_code}).json({{
            success: true,
            data: result
        }});
    } catch (error) {
        console.error('Error in {path}:', error);
        res.status(500).json({{
            success: false,
            error: error.message
        }});
    }
});
""",
            variables=["method", "path", "params", "param_source", "business_logic", "success_code", "description"],
            description="Express.js REST API endpoint with error handling"
        ))
        
        # React Component Pattern
        self.add_pattern(CodePattern(
            name="react_functional_component",
            pattern_type=PatternType.REACT_COMPONENT,
            template="""
import React, {{ useState, useEffect }} from 'react';

interface {name}Props {{
    {props}
}}

export const {name}: React.FC<{name}Props> = ({{ {prop_names} }}) => {{
    // State
    {state_declarations}
    
    // Effects
    {effects}
    
    // Handlers
    {handlers}
    
    return (
        <div className="{class_name}">
            {jsx_content}
        </div>
    );
}};
""",
            variables=["name", "props", "prop_names", "state_declarations", "effects", "handlers", "class_name", "jsx_content"],
            description="React functional component with TypeScript"
        ))
        
        # Database Model Pattern
        self.add_pattern(CodePattern(
            name="sqlalchemy_model",
            pattern_type=PatternType.DATABASE_MODEL,
            template="""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base

class {model_name}(Base):
    __tablename__ = '{table_name}'
    
    id = Column(Integer, primary_key=True)
    {columns}
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    {relationships}
    
    def __repr__(self):
        return f"<{model_name}(id={{self.id}})>"
""",
            variables=["model_name", "table_name", "columns", "relationships"],
            description="SQLAlchemy database model with timestamps"
        ))
        
        # Error Handler Pattern
        self.add_pattern(CodePattern(
            name="error_handler_middleware",
            pattern_type=PatternType.ERROR_HANDLER,
            template="""
// Global error handler middleware
export const errorHandler = (err, req, res, next) => {{
    console.error('Error:', err);
    
    // Determine status code
    const statusCode = err.statusCode || 500;
    
    // Format error response
    const response = {{
        success: false,
        error: {{
            message: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && {{ stack: err.stack }})
        }}
    }};
    
    res.status(statusCode).json(response);
}};
""",
            variables=[],
            description="Express.js error handler middleware"
        ))
        
        logger.info(f"Loaded {len(self.patterns)} built-in patterns")
    
    def add_pattern(self, pattern: CodePattern):
        """Add a pattern to the library"""
        self.patterns[pattern.name] = pattern
    
    def get_pattern(self, name: str) -> Optional[CodePattern]:
        """Get a pattern by name"""
        return self.patterns.get(name)
    
    def get_patterns_by_type(self, pattern_type: PatternType) -> List[CodePattern]:
        """Get all patterns of a specific type"""
        return [p for p in self.patterns.values() if p.pattern_type == pattern_type]
    
    def search_patterns(self, query: str) -> List[CodePattern]:
        """Search patterns by name or description"""
        query_lower = query.lower()
        return [
            p for p in self.patterns.values()
            if query_lower in p.name.lower() or query_lower in p.description.lower()
        ]
    
    def fill_pattern(self, pattern_name: str, values: Dict[str, str]) -> Optional[str]:
        """Fill a pattern template with values"""
        pattern = self.get_pattern(pattern_name)
        if not pattern:
            return None
        
        try:
            return pattern.template.format(**values)
        except KeyError as e:
            logger.error(f"Missing variable {e} for pattern {pattern_name}")
            return None
    
    def record_usage(self, pattern_name: str, success: bool):
        """Record pattern usage and update success rate"""
        pattern = self.get_pattern(pattern_name)
        if not pattern:
            return
        
        # Update usage count
        pattern.usage_count += 1
        
        # Update success rate (moving average)
        if success:
            pattern.success_rate = (
                (pattern.success_rate * (pattern.usage_count - 1) + 1.0) / 
                pattern.usage_count
            )
        else:
            pattern.success_rate = (
                (pattern.success_rate * (pattern.usage_count - 1)) / 
                pattern.usage_count
            )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get library statistics"""
        return {
            'total_patterns': len(self.patterns),
            'by_type': {
                pt.value: len(self.get_patterns_by_type(pt))
                for pt in PatternType
            },
            'most_used': sorted(
                self.patterns.values(),
                key=lambda p: p.usage_count,
                reverse=True
            )[:5],
            'highest_success': sorted(
                [p for p in self.patterns.values() if p.usage_count > 0],
                key=lambda p: p.success_rate,
                reverse=True
            )[:5]
        }
