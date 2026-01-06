"""
Context Cache Manager for V4 Agent

Stores full project context in a JSON file and provides minimal summaries
for LLM prompts, eliminating token limit issues.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ContextCache:
    """
    Manages project context storage and retrieval.
    
    Stores unlimited context in a JSON file and provides:
    - Minimal summaries for LLM prompts
    - On-demand section retrieval via tools
    """
    
    def __init__(self, workspace_root: str):
        self.workspace_root = workspace_root
        self.cache_path = os.path.join(workspace_root, "artifacts", "context_cache.json")
        self._ensure_artifacts_dir()
    
    def _ensure_artifacts_dir(self):
        """Ensure artifacts directory exists"""
        artifacts_dir = os.path.dirname(self.cache_path)
        os.makedirs(artifacts_dir, exist_ok=True)
    
    def save_context(self, context_data: Dict[str, Any]) -> None:
        """
        Save full context to cache file (no size limits).
        
        Args:
            context_data: Dictionary containing:
                - metadata: Project metadata (total_files, tech_stack, etc.)
                - file_tree: Complete list of all files
                - file_summaries: Purpose of each file
                - semantic_context: Semantic search results
                - project_rules: Global project constraints
                - dependency_graph: File dependency information
        """
        try:
            # Add timestamp
            context_data["cached_at"] = datetime.now().isoformat()
            
            # Write to file
            with open(self.cache_path, 'w', encoding='utf-8') as f:
                json.dump(context_data, f, indent=2)
            
            logger.info(f"Context cache saved: {self.cache_path}")
            logger.info(f"Cache size: {os.path.getsize(self.cache_path)} bytes")
        except Exception as e:
            logger.error(f"Failed to save context cache: {e}")
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get minimal summary for LLM prompt (< 1000 tokens).
        
        Returns:
            Minimal summary containing:
                - total_files: Number of files in project
                - key_files: Top 10 most important files
                - tech_stack: Technology stack
                - cache_available: Sections available in cache
        """
        try:
            if not os.path.exists(self.cache_path):
                return {
                    "error": "Context cache not available",
                    "cache_available": False
                }
            
            with open(self.cache_path, 'r', encoding='utf-8') as f:
                full_context = json.load(f)
            
            metadata = full_context.get("metadata", {})
            file_summaries = full_context.get("file_summaries", {})
            
            # Get top 10 key files (sorted by importance/size)
            key_files = list(file_summaries.keys())[:10]
            
            return {
                "total_files": metadata.get("total_files", 0),
                "tech_stack": metadata.get("tech_stack", "Unknown"),
                "indexed_at": metadata.get("indexed_at", "Unknown"),
                "key_files": key_files,
                "cache_available": True,
                "available_sections": [
                    "file_tree",
                    "file_summaries", 
                    "semantic_context",
                    "project_rules",
                    "metadata"
                ]
            }
        except Exception as e:
            logger.error(f"Failed to get context summary: {e}")
            return {
                "error": str(e),
                "cache_available": False
            }
    
    def get_section(self, section: str) -> Any:
        """
        Get specific section from cache.
        
        Args:
            section: Section name (file_tree, file_summaries, semantic_context, 
                    project_rules, metadata)
        
        Returns:
            Section data or error message
        """
        try:
            if not os.path.exists(self.cache_path):
                return {"error": "Context cache not available"}
            
            with open(self.cache_path, 'r', encoding='utf-8') as f:
                full_context = json.load(f)
            
            if section not in full_context:
                available = list(full_context.keys())
                return {
                    "error": f"Section '{section}' not found",
                    "available_sections": available
                }
            
            return full_context[section]
        except Exception as e:
            logger.error(f"Failed to get section '{section}': {e}")
            return {"error": str(e)}
    
    def get_file_summary(self, file_path: str) -> str:
        """
        Get summary for a specific file.
        
        Args:
            file_path: Path to file
        
        Returns:
            File summary or error message
        """
        try:
            summaries = self.get_section("file_summaries")
            if isinstance(summaries, dict) and "error" not in summaries:
                return summaries.get(file_path, f"No summary available for {file_path}")
            return "File summaries not available"
        except Exception as e:
            return f"Error: {e}"
    
    def search_files(self, pattern: str) -> List[str]:
        """
        Search for files matching a pattern.
        
        Args:
            pattern: Search pattern (substring match)
        
        Returns:
            List of matching file paths
        """
        try:
            file_tree = self.get_section("file_tree")
            if isinstance(file_tree, list):
                return [f for f in file_tree if pattern.lower() in f.lower()]
            return []
        except Exception as e:
            logger.error(f"Failed to search files: {e}")
            return []
