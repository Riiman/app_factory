"""
Vector Store for V4 Knowledge Base

Uses ChromaDB for semantic search of code patterns and solutions.
"""

import logging
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class VectorStore:
    """
    Vector database for semantic search.
    
    Uses ChromaDB (already used in V3 Librarian) for storing and retrieving
    code patterns, solutions, and execution history.
    """
    
    def __init__(self, persist_directory: Optional[str] = None):
        self.persist_directory = persist_directory or os.path.join(
            os.getcwd(), ".v4_knowledge"
        )
        self.client = None
        self.collection = None
        self._initialize()
    
    def _initialize(self):
        """Initialize ChromaDB client and collection"""
        try:
            import chromadb
            from chromadb.config import Settings
            
            # Create client
            self.client = chromadb.Client(Settings(
                chroma_db_impl="duckdb+parquet",
                persist_directory=self.persist_directory
            ))
            
            # Get or create collection
            self.collection = self.client.get_or_create_collection(
                name="v4_knowledge",
                metadata={"description": "V4 autonomous system knowledge base"}
            )
            
            logger.info(f"Vector store initialized at {self.persist_directory}")
            
        except ImportError:
            logger.warning("ChromaDB not available - vector store disabled")
            self.client = None
            self.collection = None
    
    def add(
        self,
        id: str,
        content: str,
        metadata: Dict[str, Any],
        embedding: Optional[List[float]] = None
    ) -> bool:
        """
        Add an item to the vector store.
        
        Args:
            id: Unique identifier
            content: Text content to store
            metadata: Metadata dict
            embedding: Optional pre-computed embedding
            
        Returns:
            True if successful
        """
        if not self.collection:
            return False
        
        try:
            self.collection.add(
                ids=[id],
                documents=[content],
                metadatas=[metadata],
                embeddings=[embedding] if embedding else None
            )
            return True
        
        except Exception as e:
            logger.error(f"Failed to add to vector store: {e}")
            return False
    
    def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Query the vector store.
        
        Args:
            query_text: Text to search for
            n_results: Number of results to return
            where: Optional metadata filter
            
        Returns:
            List of results with id, content, metadata, distance
        """
        if not self.collection:
            return []
        
        try:
            results = self.collection.query(
                query_texts=[query_text],
                n_results=n_results,
                where=where
            )
            
            # Format results
            formatted = []
            for i in range(len(results['ids'][0])):
                formatted.append({
                    'id': results['ids'][0][i],
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i] if 'distances' in results else None
                })
            
            return formatted
        
        except Exception as e:
            logger.error(f"Failed to query vector store: {e}")
            return []
    
    def get_by_id(self, id: str) -> Optional[Dict[str, Any]]:
        """Get item by ID"""
        if not self.collection:
            return None
        
        try:
            result = self.collection.get(ids=[id])
            if result['ids']:
                return {
                    'id': result['ids'][0],
                    'content': result['documents'][0],
                    'metadata': result['metadatas'][0]
                }
            return None
        
        except Exception as e:
            logger.error(f"Failed to get from vector store: {e}")
            return None
    
    def delete(self, id: str) -> bool:
        """Delete item by ID"""
        if not self.collection:
            return False
        
        try:
            self.collection.delete(ids=[id])
            return True
        
        except Exception as e:
            logger.error(f"Failed to delete from vector store: {e}")
            return False
    
    def count(self) -> int:
        """Get total count of items"""
        if not self.collection:
            return 0
        
        try:
            return self.collection.count()
        except:
            return 0
    
    def persist(self):
        """Persist the database to disk"""
        if self.client:
            try:
                self.client.persist()
            except:
                pass
