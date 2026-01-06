
import os
import glob
import subprocess
import logging
import hashlib
import re
from typing import List, Dict, Any, Optional

try:
    import chromadb
except ImportError:
    chromadb = None

# Tree Sitter Imports
try:
    from tree_sitter import Language, Parser
    import tree_sitter_python as tspython
    import tree_sitter_javascript as tsjavascript
    TS_AVAILABLE = True
except ImportError:
    TS_AVAILABLE = False

from .graph import DependencyGraph

logger = logging.getLogger(__name__)

class Librarian:
    def __init__(self, workspace_root: str, db_path: str = "artifacts/chroma_db"):
        self.workspace_root = workspace_root
        self.db_path = os.path.join(workspace_root, db_path)
        self.client = None
        self.collection = None
        self.graph = DependencyGraph() 
        self._init_db()
        self.parsers = {}
        if TS_AVAILABLE:
            self._init_parsers()

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

    def _init_parsers(self):
        try:
            # Python
            py_lang = Language(tspython.language())
            self.parsers["python"] = Parser(py_lang)
            
            # Javascript
            js_lang = Language(tsjavascript.language())
            self.parsers["javascript"] = Parser(js_lang)
            
            logger.info("Librarian: Tree-Sitter Parsers Initialized.")
        except Exception as e:
            logger.error(f"Failed to init Tree-Sitter Parsers: {e}")
            self.parsers = {}

    def index_workspace(self):
        """
        Scans workspace, chunks code for Vector DB, AND builds Dependency Graph (AST).
        """
        if not self.collection:
            logger.warning("Librarian: DB not init, skipping Vector Indexing.")
        
        logger.info(f"TS_AVAILABLE: {TS_AVAILABLE}")
        logger.info("Librarian: Starting Indexing (Vector + Graph [Tree-Sitter])...")
        
        # 1. Gather Files
        files = self._get_all_files()
        self.graph.clear() 
        
        # 2. Process Files
        ids = []
        documents = []
        metadatas = []
        
        for fpath in files:
            content = self._read_file(fpath)
            if not content:
                continue
            
            # A. Build Graph (AST Parsing)
            if TS_AVAILABLE and self.parsers:
                self._analyze_file_ast(fpath, content)
            else:
                logger.warning("Fallback to Regex Parser")
                self._parse_dependencies_regex(fpath, content) # Fallback
            
            # B. Vector Indexing (Chunks)
            if self.collection:
                chunks = self._chunk_code(content, fpath)
                for i, chunk in enumerate(chunks):
                    chunk_id = hashlib.md5(f"{fpath}_{i}_{chunk[:20]}".encode()).hexdigest()
                    ids.append(chunk_id)
                    documents.append(chunk)
                    metadatas.append({"source": fpath, "chunk_index": i})

        # 3. Upsert to Chroma
        if self.collection and ids:
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
            
        logger.info(f"Librarian: Indexed {len(ids)} chunks. Graph has {len(self.graph.nodes)} nodes.")

    def resolve_context(self, query: str, target_file: str = None) -> str:
        """
        Hyper-Context Retrieval.
        """
        context_parts = []
        if query:
            semantic_hits = self.query(query, n_results=3) 
            context_parts.append(f"=== SEMANTIC SEARCH: '{query}' ===\n{semantic_hits}")
            
        if target_file:
            if not target_file.startswith("/"):
                candidates = [n for n in self.graph.nodes if target_file in n and n.startswith("/")] 
                if candidates:
                    target_file = candidates[0] 
            
            if target_file in self.graph.nodes:
                context_parts.append(f"=== TARGET FILE CONTEXT: {os.path.basename(target_file)} ===")
                content = self._read_file(target_file)
                context_parts.append(f"File: {target_file}\n```\n{content}\n```")
                
                related = self.graph.get_related_files(target_file)
                if related:
                    context_parts.append(f"\n--- RELATED ENTITIES (Dependencies & Definitions) ---")
                    for rel_id in related:
                        meta = self.graph.nodes.get(rel_id, {})
                        rtype = meta.get("type", "FILE")
                        
                        if rtype == "FILE":
                            rel_content = self._read_file(rel_id)
                            context_parts.append(f"Imported File: {os.path.basename(rel_id)}\n```\n{rel_content[:800]}...\n```")
                        else:
                            parts = rel_id.split("::")
                            if len(parts) > 1 and target_file in parts[0]:
                                continue
                            context_parts.append(f"Related {rtype}: {rel_id}")
        
        return "\n\n".join(context_parts)

    def _analyze_file_ast(self, fpath: str, content: str):
        self.graph.add_typed_node(fpath, self.graph.NodeType.FILE)
        try:
            if fpath.endswith(".py"):
                self._analyze_python(fpath, content)
            elif fpath.endswith(('.js', '.jsx', '.ts', '.tsx')):
                self._analyze_js(fpath, content)
        except Exception as e:
            logger.warning(f"AST Parse failed for {fpath}: {e}")

    def _analyze_python(self, fpath: str, content: str):
        parser = self.parsers.get("python")
        if not parser: return
        
        tree = parser.parse(bytes(content, "utf8"))
        cursor = tree.walk()
        
        while True:
            node = cursor.node
            ntype = node.type
            # logger.info(f"Node Type: {ntype}")
            
            if ntype in ["import_statement", "import_from_statement"]:
                stmt_text = content[node.start_byte:node.end_byte]
                imports = re.findall(r'(?:from|import)\s+([\w\.]+)', stmt_text)
                base_dir = os.path.dirname(fpath)
                for imp in imports:
                    module_name = imp.split('.')[0]
                    sibling = os.path.join(base_dir, f"{module_name}.py")
                    if os.path.exists(sibling):
                        self.graph.add_edge(fpath, sibling)
                    pkg_init = os.path.join(base_dir, module_name, "__init__.py")
                    if os.path.exists(pkg_init):
                        self.graph.add_edge(fpath, pkg_init)

            elif ntype == "function_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    func_name = content[name_node.start_byte:name_node.end_byte]
                    node_id = f"FUNC:{fpath}::{func_name}"
                    self.graph.add_typed_node(node_id, self.graph.NodeType.FUNCTION)
                    self.graph.add_edge(fpath, node_id)
            
            elif ntype == "class_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    class_name = content[name_node.start_byte:name_node.end_byte]
                    node_id = f"CLASS:{fpath}::{class_name}"
                    self.graph.add_typed_node(node_id, self.graph.NodeType.CLASS)
                    self.graph.add_edge(fpath, node_id)

            if cursor.goto_first_child():
                continue
            while not cursor.goto_next_sibling():
                if not cursor.goto_parent():
                    return

    def _analyze_js(self, fpath: str, content: str):
        parser = self.parsers.get("javascript")
        if not parser: return
        
        tree = parser.parse(bytes(content, "utf8"))
        base_dir = os.path.dirname(fpath)
        cursor = tree.walk()
        while True:
            node = cursor.node
            ntype = node.type
            
            if ntype in ["import_statement", "export_statement"]:
                stmt_text = content[node.start_byte:node.end_byte]
                refs = re.findall(r'[\'"]([^\'"]+)[\'"]', stmt_text)
                for ref in refs:
                    if ref.startswith("."):
                        try:
                            abs_ref = os.path.normpath(os.path.join(base_dir, ref))
                            for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                                candidate = abs_ref + ext
                                if os.path.exists(candidate):
                                    self.graph.add_edge(fpath, candidate)
                                    break
                        except: pass

            elif ntype in ["function_declaration", "generator_function_declaration"]:
                name_node = node.child_by_field_name("name")
                if name_node:
                    func_name = content[name_node.start_byte:name_node.end_byte]
                    node_id = f"FUNC:{fpath}::{func_name}"
                    self.graph.add_typed_node(node_id, self.graph.NodeType.FUNCTION)
                    self.graph.add_edge(fpath, node_id)

            elif ntype == "class_declaration":
                name_node = node.child_by_field_name("name")
                if name_node:
                    class_name = content[name_node.start_byte:name_node.end_byte]
                    node_id = f"CLASS:{fpath}::{class_name}"
                    self.graph.add_typed_node(node_id, self.graph.NodeType.CLASS)
                    self.graph.add_edge(fpath, node_id)
            
            if cursor.goto_first_child():
                continue
            while not cursor.goto_next_sibling():
                if not cursor.goto_parent():
                    return

    def _parse_dependencies_regex(self, fpath: str, content: str):
        self.graph.add_node(fpath)
        base_dir = os.path.dirname(fpath)
        if fpath.endswith(".py"):
            imports = re.findall(r'^(?:from|import)\s+([\w\.]+)', content, re.MULTILINE)
            for imp in imports:
                module_name = imp.split('.')[0]
                sibling = os.path.join(base_dir, f"{module_name}.py")
                if os.path.exists(sibling):
                    self.graph.add_edge(fpath, sibling)
                pkg_init = os.path.join(base_dir, module_name, "__init__.py")
                if os.path.exists(pkg_init):
                    self.graph.add_edge(fpath, pkg_init) 
        elif fpath.endswith(('.js', '.ts', '.jsx', '.tsx')):
            refs = re.findall(r'(?:from|require\()\s*[\'"]([^\'"]+)[\'"]', content)
            for ref in refs:
                if ref.startswith('.'):
                    try:
                        abs_ref = os.path.normpath(os.path.join(base_dir, ref))
                        for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                            candidate = abs_ref + ext
                            if os.path.exists(candidate):
                                self.graph.add_edge(fpath, candidate)
                                break
                    except: pass
    
    def query(self, query_text: str, n_results: int = 5) -> str:
        if not self.collection: return "DB Not Init"
        results = self.collection.query(query_texts=[query_text], n_results=n_results)
        output = ""
        if results['documents']:
            docs = results['documents'][0]
            metas = results['metadatas'][0]
            for doc, meta in zip(docs, metas):
                output += f"\nFile: {meta['source']}\n```\n{doc}\n```\n"
        return output

    def get_file_tree(self) -> str:
        tree_str = ""
        for root, dirs, files in os.walk(self.workspace_root):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', 'venv', '__pycache__', 'dist', 'build', 'artifacts']]
            level = root.replace(self.workspace_root, '').count(os.sep)
            indent = ' ' * 4 * (level)
            tree_str += f"{indent}{os.path.basename(root)}/\n"
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if f.startswith('.'): continue
                tree_str += f"{subindent}{f}\n"
        return tree_str

    def find_references(self, symbol: str) -> str:
        cmd = ["grep", "-r", "-n", symbol, self.workspace_root]
        exclude_flags = ["--exclude-dir=node_modules", "--exclude-dir=.git", "--exclude-dir=__pycache__"]
        try:
            full_cmd = cmd + exclude_flags
            result = subprocess.run(full_cmd, capture_output=True, text=True, cwd=self.workspace_root)
            return result.stdout[:2000] if result.returncode == 0 else "No references found."
        except: return "Grep failed."

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
        except: return ""

    def _chunk_code(self, content: str, fpath: str) -> List[str]:
        chunk_size = 1000
        overlap = 200
        chunks = []
        start = 0
        while start < len(content):
            end = start + chunk_size
            chunk = content[start:end]
            lbl = f"# Source: {fpath}\n{chunk}"
            chunks.append(lbl)
            start += (chunk_size - overlap)
        return chunks
