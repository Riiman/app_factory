"""
Context-Aware Code Generator for V4 Autonomous System

Generates code with awareness of existing codebase context.
"""

import logging
from typing import Dict, List, Any, Optional
import os
import re

logger = logging.getLogger(__name__)


class ContextAwareGenerator:
    """
    Context-aware code generator.
    
    Analyzes existing codebase to generate code that:
    - Follows existing patterns and conventions
    - Reuses existing utilities and helpers
    - Maintains consistent style
    - Avoids duplicating functionality
    """
    
    def __init__(self, workspace_path: str):
        self.workspace_path = workspace_path
        self.code_patterns = {}
        self.existing_utilities = []
        self.style_guide = {}
        
        # Analyze workspace on initialization
        self._analyze_workspace()
    
    def _analyze_workspace(self):
        """Analyze existing codebase for patterns"""
        if not os.path.exists(self.workspace_path):
            logger.warning(f"Workspace path does not exist: {self.workspace_path}")
            return
        
        try:
            # Detect patterns
            self._detect_patterns()
            
            # Find utilities
            self._find_utilities()
            
            # Infer style guide
            self._infer_style()
            
            logger.info(f"Analyzed workspace: {len(self.code_patterns)} patterns, {len(self.existing_utilities)} utilities")
        
        except Exception as e:
            logger.error(f"Failed to analyze workspace: {e}")
    
    def _detect_patterns(self):
        """Detect common code patterns in workspace"""
        # Look for common patterns like:
        # - API endpoint structure
        # - Component structure
        # - Error handling patterns
        # - Import patterns
        
        patterns = {
            'api_endpoint': [],
            'react_component': [],
            'error_handler': [],
            'import_style': []
        }
        
        # Walk through files
        for root, dirs, files in os.walk(self.workspace_path):
            # Skip node_modules, .git, etc.
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.next']]
            
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.py')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                            # Detect API endpoints
                            if 'router.' in content or 'app.' in content:
                                patterns['api_endpoint'].append(file_path)
                            
                            # Detect React components
                            if 'React' in content or 'useState' in content:
                                patterns['react_component'].append(file_path)
                            
                            # Detect error handlers
                            if 'try' in content and 'catch' in content:
                                patterns['error_handler'].append(file_path)
                    
                    except Exception as e:
                        logger.debug(f"Could not read {file_path}: {e}")
        
        self.code_patterns = patterns
    
    def _find_utilities(self):
        """Find existing utility functions"""
        utility_dirs = ['utils', 'helpers', 'lib', 'common']
        
        for root, dirs, files in os.walk(self.workspace_path):
            # Check if we're in a utility directory
            if any(util_dir in root for util_dir in utility_dirs):
                for file in files:
                    if file.endswith(('.js', '.ts', '.py')):
                        file_path = os.path.join(root, file)
                        self.existing_utilities.append(file_path)
    
    def _infer_style(self):
        """Infer code style from existing files"""
        # Sample a few files to infer style
        sample_files = []
        
        for root, dirs, files in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__']]
            
            for file in files:
                if file.endswith(('.js', '.jsx', '.ts', '.tsx', '.py')):
                    sample_files.append(os.path.join(root, file))
                    if len(sample_files) >= 10:
                        break
            
            if len(sample_files) >= 10:
                break
        
        # Analyze style
        indent_styles = []
        quote_styles = []
        
        for file_path in sample_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Detect indentation
                    lines = content.split('\n')
                    for line in lines[:50]:  # Check first 50 lines
                        if line.startswith('  ') and not line.startswith('    '):
                            indent_styles.append(2)
                        elif line.startswith('    '):
                            indent_styles.append(4)
                    
                    # Detect quote style
                    single_quotes = content.count("'")
                    double_quotes = content.count('"')
                    quote_styles.append('single' if single_quotes > double_quotes else 'double')
            
            except Exception as e:
                logger.debug(f"Could not analyze {file_path}: {e}")
        
        # Determine most common style
        if indent_styles:
            self.style_guide['indent'] = max(set(indent_styles), key=indent_styles.count)
        else:
            self.style_guide['indent'] = 2
        
        if quote_styles:
            self.style_guide['quotes'] = max(set(quote_styles), key=quote_styles.count)
        else:
            self.style_guide['quotes'] = 'single'
    
    def generate_with_context(
        self,
        task_description: str,
        file_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate code with awareness of existing codebase.
        
        Args:
            task_description: What to generate
            file_type: Type of file (api_endpoint, react_component, etc.)
            context: Additional context
            
        Returns:
            Generated code
        """
        context = context or {}
        
        # Get relevant patterns
        similar_files = self.code_patterns.get(file_type, [])
        
        # Build context-aware prompt
        prompt_context = f"""
Generate code for: {task_description}

Existing codebase context:
- Style: {self.style_guide.get('indent', 2)} space indent, {self.style_guide.get('quotes', 'single')} quotes
- Similar files: {len(similar_files)} found
- Available utilities: {len(self.existing_utilities)} utility files
"""
        
        if similar_files:
            prompt_context += f"\nExample pattern from: {similar_files[0]}"
        
        if self.existing_utilities:
            prompt_context += f"\nUtilities available in: {', '.join([os.path.basename(u) for u in self.existing_utilities[:3]])}"
        
        # This would call LLM with context-aware prompt
        # For now, return template
        
        logger.info(f"Generating {file_type} with context awareness")
        
        return prompt_context
    
    def suggest_reusable_code(self, task_description: str) -> List[str]:
        """Suggest existing code that can be reused"""
        suggestions = []
        
        # Search utilities for relevant functions
        keywords = task_description.lower().split()
        
        for util_file in self.existing_utilities:
            try:
                with open(util_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Simple keyword matching
                    if any(keyword in content.lower() for keyword in keywords):
                        suggestions.append(util_file)
            
            except Exception as e:
                logger.debug(f"Could not read {util_file}: {e}")
        
        return suggestions[:5]  # Top 5 suggestions
