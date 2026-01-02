
import os
import glob
import subprocess
import logging
import hashlib
from typing import List, Dict, Any

try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    chromadb = None

logger = logging.getLogger(__name__)

class Librarian:
    def __init__(self, workspace_root: str, db_path: str = "artifacts/chroma_db"):
        self.workspace_root = workspace_root
        self.db_path = os.path.join(workspace_root, db_path)
        self.client = None
        self.collection = None
        self._init_db()

    def _init_db(self):
        if not chromadb:
            logger.warning("ChromaDB not installed. Librarian will be disabled.")
            return
            
        try:
            # simple local persistence
            self.client = chromadb.PersistentClient(path=self.db_path)
            self.collection = self.client.get_or_create_collection(name="codebase_v1")
        except Exception as e:
            logger.error(f"Failed to init ChromaDB: {e}")

    def index_workspace(self):
        """
        Scans workspace, chunks code, and updates the vector DB.
        This is a 'naive' indexer: it wipes and rebuilds or just upserts.
        For MVP, we'll list all files, chunk them, and upsert.
        """
        if not self.collection:
            return

        logger.info("Librarian: Starting Indexing...")
        
        # 1. Gather Files
        files = self._get_all_files()
        
        # 2. Chunk & Embed
        ids = []
        documents = []
        metadatas = []
        
        for fpath in files:
            content = self._read_file(fpath)
            if not content:
                continue
                
            chunks = self._chunk_code(content, fpath)
            for i, chunk in enumerate(chunks):
                chunk_id = hashlib.md5(f"{fpath}_{i}_{chunk[:20]}".encode()).hexdigest()
                ids.append(chunk_id)
                documents.append(chunk)
                metadatas.append({"source": fpath, "chunk_index": i})

        if not ids:
            logger.info("Librarian: No code found to index.")
            return

        # 3. Upsert to Chroma (Batched? Chroma handles it mostly, but let's batch for safety)
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            batch_ids = ids[i:i+batch_size]
            batch_docs = documents[i:i+batch_size]
            batch_meta = metadatas[i:i+batch_size]
            
            self.collection.upsert(
                ids=batch_ids,
                documents=batch_docs,
                metadatas=batch_meta
            )
            
        logger.info(f"Librarian: Indexed {len(ids)} chunks.")

    def query(self, query_text: str, n_results: int = 5) -> str:
        """
        Semantic Search. Returns formatted string of relevant code.
        """
        if not self.collection:
            return "Librarian Error: DB not initialized."

        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        # Format results
        output = f"--- Relevant Code for: '{query_text}' ---\n"
        
        docs = results['documents'][0]
        metas = results['metadatas'][0]
        distances = results['distances'][0] if 'distances' in results else [0]*len(docs)
        
        for doc, meta, dist in zip(docs, metas, distances):
            # dist is distance, lower is better. 
            # If distance is too high (low relevance), maybe skip?
            # Chroma default L2. 
            
            output += f"\nFile: {meta['source']}\n"
            output += f"```\n{doc}\n```\n"
            
        return output

    def get_file_tree(self) -> str:
        """
        Returns a clean recursive file tree for Global Context.
        """
        # We can use the native 'tree' command if active, or just python walk
        # Python walk is safer as tree might not be installed
        tree_str = ""
        for root, dirs, files in os.walk(self.workspace_root):
            # Filter ignore dirs
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', 'dist', 'build']]
            
            level = root.replace(self.workspace_root, '').count(os.sep)
            indent = ' ' * 4 * (level)
            tree_str += f"{indent}{os.path.basename(root)}/\n"
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f.startswith('.'): continue
                tree_str += f"{subindent}{f}\n"
                
        return tree_str

    def find_references(self, symbol: str) -> str:
        """
        Uses grep to find usages of a symbol.
        """
        cmd = ["grep", "-r", "-n", symbol, self.workspace_root]
        # Exclude common noise dirs
        exclude_flags = ["--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=__pycache__"]
        
        try:
            # We assume a linux environment with grep
            # If standard grep, flags might vary. 
            # Safest is just simple grep and python filtering, but grep -r is standard.
            full_cmd = cmd + exclude_flags
            result = subprocess.run(
                full_cmd, 
                capture_output=True, 
                text=True,
                cwd=self.workspace_root  # Run from root
            )
            
            if result.returncode == 0:
                # Truncate if too long
                lines = result.stdout.splitlines()
                if len(lines) > 20:
                    return "\n".join(lines[:20]) + f"\n... ({len(lines)-20} more matches)"
                return result.stdout
            else:
                return "No references found."
        except Exception as e:
            return f"Error running grep: {e}"

    def _get_all_files(self) -> List[str]:
        all_files = []
        for root, dirs, files in os.walk(self.workspace_root):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', 'dist', 'build', 'artifacts']]
            for f in files:
                if f.startswith('.'): continue
                if f.endswith(('.py', '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.md', '.json')):
                    all_files.append(os.path.join(root, f))
        return all_files

    def _read_file(self, path: str) -> str:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except:
            return ""

    def _chunk_code(self, content: str, fpath: str) -> List[str]:
        """
        Naive chunker: Split by 
        - Python: 'def ', 'class '
        - JS: 'function ', 'class ', 'const ' (if it has =>)
        
        Better: Just split by paragraphs or fixed size overlap. 
        For Code, fixed size with overlap is often more robust than naive regex parsing 
        which misses many patterns.
        Let's do Fixed Size for MVP stability: 1000 chars with 200 overlap.
        """
        chunk_size = 1000
        overlap = 200
        
        chunks = []
        start = 0
        while start < len(content):
            end = start + chunk_size
            chunk = content[start:end]
            
            # Prepend filename to chunk so LLM knows where it comes from even in isolation
            labeled_chunk = f"# Source: {fpath}\n{chunk}"
            chunks.append(labeled_chunk)
            
            start += (chunk_size - overlap)
            
        return chunks
