"""
Knowledge Base for V4 Autonomous System

Records and retrieves execution history, patterns, and learnings.
"""

import logging
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass, asdict

from .vector_store import VectorStore
from .pattern_library import PatternLibrary, PatternType

logger = logging.getLogger(__name__)


@dataclass
class Execution:
    """Represents a task execution"""
    mission_type: str
    task_description: str
    approach: str
    success: bool
    execution_time: float
    quality_score: float
    error_message: Optional[str] = None
    timestamp: str = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()


class KnowledgeBase:
    """
    Central knowledge base for the autonomous system.
    
    Responsibilities:
    1. Record successful executions
    2. Record failed executions
    3. Store and retrieve code patterns
    4. Query similar missions
    5. Learn from history
    """
    
    def __init__(self, persist_directory: Optional[str] = None):
        self.vector_store = VectorStore(persist_directory)
        self.pattern_library = PatternLibrary()
        logger.info("Knowledge base initialized")
    
    def record_success(
        self,
        mission_type: str,
        task_description: str,
        approach: str,
        execution_time: float,
        quality_score: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record a successful execution.
        
        Args:
            mission_type: Type of mission (e.g., "api_endpoint", "react_component")
            task_description: Description of the task
            approach: The approach that worked
            execution_time: Time taken in seconds
            quality_score: Quality score (0-10)
            metadata: Additional metadata
            
        Returns:
            True if recorded successfully
        """
        execution = Execution(
            mission_type=mission_type,
            task_description=task_description,
            approach=approach,
            success=True,
            execution_time=execution_time,
            quality_score=quality_score
        )
        
        # Generate unique ID
        exec_id = self._generate_id(mission_type, task_description, execution.timestamp)
        
        # Prepare content for vector search
        content = f"""
Mission: {mission_type}
Task: {task_description}
Approach: {approach}
Quality: {quality_score}/10
Time: {execution_time}s
"""
        
        # Prepare metadata
        meta = {
            "mission_type": mission_type,
            "success": True,
            "quality_score": quality_score,
            "execution_time": execution_time,
            "timestamp": execution.timestamp,
            **(metadata or {})
        }
        
        # Store in vector database
        success = self.vector_store.add(exec_id, content, meta)
        
        if success:
            logger.info(f"Recorded successful execution: {mission_type}")
        
        return success
    
    def record_failure(
        self,
        mission_type: str,
        task_description: str,
        approach: str,
        error_message: str,
        execution_time: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record a failed execution.
        
        Args:
            mission_type: Type of mission
            task_description: Description of the task
            approach: The approach that failed
            error_message: Error message
            execution_time: Time taken before failure
            metadata: Additional metadata
            
        Returns:
            True if recorded successfully
        """
        execution = Execution(
            mission_type=mission_type,
            task_description=task_description,
            approach=approach,
            success=False,
            execution_time=execution_time,
            quality_score=0.0,
            error_message=error_message
        )
        
        # Generate unique ID
        exec_id = self._generate_id(mission_type, task_description, execution.timestamp)
        
        # Prepare content
        content = f"""
Mission: {mission_type}
Task: {task_description}
Approach: {approach}
Error: {error_message}
Time: {execution_time}s
"""
        
        # Prepare metadata
        meta = {
            "mission_type": mission_type,
            "success": False,
            "error_message": error_message,
            "execution_time": execution_time,
            "timestamp": execution.timestamp,
            **(metadata or {})
        }
        
        # Store in vector database
        success = self.vector_store.add(exec_id, content, meta)
        
        if success:
            logger.info(f"Recorded failed execution: {mission_type}")
        
        return success
    
    def query_similar(
        self,
        mission_type: str,
        task_description: str,
        k: int = 5,
        success_only: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Query for similar successful missions.
        
        Args:
            mission_type: Type of mission
            task_description: Description of the task
            k: Number of results
            success_only: Only return successful executions
            
        Returns:
            List of similar executions
        """
        query = f"Mission: {mission_type}\nTask: {task_description}"
        
        where = {"success": True} if success_only else None
        
        results = self.vector_store.query(query, n_results=k, where=where)
        
        logger.info(f"Found {len(results)} similar executions for {mission_type}")
        
        return results
    
    def get_pattern(self, pattern_name: str) -> Optional[str]:
        """Get a code pattern by name"""
        pattern = self.pattern_library.get_pattern(pattern_name)
        return pattern.template if pattern else None
    
    def fill_pattern(self, pattern_name: str, values: Dict[str, str]) -> Optional[str]:
        """Fill a pattern template with values"""
        return self.pattern_library.fill_pattern(pattern_name, values)
    
    def search_patterns(self, query: str) -> List[str]:
        """Search for patterns"""
        patterns = self.pattern_library.search_patterns(query)
        return [p.name for p in patterns]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics"""
        return {
            "total_executions": self.vector_store.count(),
            "pattern_library": self.pattern_library.get_stats()
        }
    
    def _generate_id(self, mission_type: str, task_description: str, timestamp: str) -> str:
        """Generate unique ID for execution"""
        content = f"{mission_type}:{task_description}:{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()
    
    def persist(self):
        """Persist the knowledge base to disk"""
        self.vector_store.persist()
