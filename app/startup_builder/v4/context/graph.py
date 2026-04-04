
import logging
from typing import Dict, List, Set, Optional

logger = logging.getLogger(__name__)

class DependencyGraph:
    """
    A lightweight, in-memory Directed Acyclic Graph (DAG) for file dependencies.
    Used to resolve 'Related Files' context for RAG.
    Ported to V4.
    """
    def __init__(self):
        # Adjacency List: { "source_file": set(["target_file1", "target_file2"]) }
        self.edges: Dict[str, Set[str]] = {}
        
        # Reverse Adjacency: { "target_file": set(["source_file1"]) }
        self.reverse_edges: Dict[str, Set[str]] = {}
        
        # Node Metadata: { "file_path": { "type": "python", "summary": "..." } }
        self.nodes: Dict[str, Dict] = {}

    class NodeType:
        FILE = "FILE"
        FUNCTION = "FUNCTION"
        CLASS = "CLASS"
        VARIABLE = "VARIABLE"

    def add_typed_node(self, node_id: str, node_type: str, metadata: Optional[Dict] = None):
        """Helper to register a typed node (e.g., FUNC:x.py::main)."""
        meta = metadata or {}
        meta["type"] = node_type
        self.add_node(node_id, meta)

    def add_node(self, file_path: str, metadata: Optional[Dict] = None):
        """Register a file node."""
        if file_path not in self.nodes:
            self.nodes[file_path] = metadata or {}
        elif metadata:
            self.nodes[file_path].update(metadata)

    def add_edge(self, source: str, target: str):
        """
        Register a dependency: Source imports Target.
        (e.g., 'auth.py' imports 'user.py')
        """
        # Ensure nodes exist
        self.add_node(source)
        self.add_node(target)
        
        # Forward Edge
        if source not in self.edges:
            self.edges[source] = set()
        self.edges[source].add(target)
        
        # Reverse Edge
        if target not in self.reverse_edges:
            self.reverse_edges[target] = set()
        self.reverse_edges[target].add(source)

    def get_related_files(self, file_path: str, hops: int = 1) -> List[str]:
        """
        Returns a list of related files (Upstream + Downstream) within 'hops' distance.
        """
        related = set()
        
        # Immediate Downstream (Imports)
        if file_path in self.edges:
            related.update(self.edges[file_path])
            
        # Immediate Upstream (Imported By)
        if file_path in self.reverse_edges:
            related.update(self.reverse_edges[file_path])
            
        return list(related)

    def clear(self):
        self.edges = {}
        self.reverse_edges = {}
        self.nodes = {}
