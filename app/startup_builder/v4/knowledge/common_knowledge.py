"""
Common Knowledge Manager for V4.

Stores and retrieves official documentation and best practices
for common tools to prevent configuration drift.
"""

import os
import glob
from typing import List, Dict, Optional

class CommonKnowledge:
    """
    Manages access to common technical knowledge docs (text-based).
    """
    
    def __init__(self):
        # Locate the docs directory relative to this file
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.docs_dir = os.path.join(base_dir, "common_docs")
        self._cache = {}
    
    def search(self, query: str) -> str:
        """
        Search for knowledge based on a query (naive keyword match for MVP).
        """
        query = query.lower()
        results = []
        
        # Reload cache if empty
        if not self._cache:
            self._load_docs()
            
        for name, content in self._cache.items():
            if query in name or query in content.lower():
                # Extract relevant snippet or return full doc if small
                results.append(f"=== {name.upper()} ===\n{content}")
                
        if not results:
            return f"No common knowledge found for '{query}'."
            
        return "\n\n".join(results)

    def get_topics(self) -> List[str]:
        """List available topics."""
        if not self._cache:
            self._load_docs()
        return list(self._cache.keys())

    def _load_docs(self):
        """Load all .txt files from common_docs."""
        if not os.path.exists(self.docs_dir):
            return
            
        files = glob.glob(os.path.join(self.docs_dir, "*.txt"))
        for fpath in files:
            topic = os.path.basename(fpath).replace(".txt", "")
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    self._cache[topic] = f.read()
            except Exception as e:
                print(f"Error loading knowledge {fpath}: {e}")

# Singleton instance
_instance = CommonKnowledge()

def get_common_knowledge():
    return _instance
