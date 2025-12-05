import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import AzureOpenAIEmbeddings
from langchain_community.vectorstores import Chroma
import shutil

class MemoryManager:
    def __init__(self, startup_id):
        self.startup_id = startup_id
        self.persist_directory = f"./chroma_db/{startup_id}"
        self._init_embeddings()
        
    def _init_embeddings(self):
        self.embeddings = AzureOpenAIEmbeddings(
            azure_deployment=os.environ.get("AZURE_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002"),
            openai_api_version=os.environ.get("AZURE_API_VERSION", "2023-05-15"),
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        )
        
    def index_codebase(self, root_path):
        """Indexes the codebase at root_path."""
        print(f"Indexing codebase at {root_path}...")
        
        # Load documents
        # We use a glob to include common code files
        loader = DirectoryLoader(
            root_path, 
            glob="**/*.{py,js,jsx,ts,tsx,html,css,md,json}", 
            loader_cls=TextLoader,
            show_progress=True,
            use_multithreading=True
        )
        
        try:
            docs = loader.load()
            
            # Defensive filtering: Exclude node_modules and other artifacts
            # even if they were copied (e.g. if tar exclude failed or manual copy happened)
            filtered_docs = []
            for doc in docs:
                source = doc.metadata.get("source", "")
                if "node_modules" in source or ".git" in source or "dist/" in source or "build/" in source:
                    continue
                filtered_docs.append(doc)
            docs = filtered_docs
            
        except Exception as e:
            print(f"Error loading docs: {e}")
            return

        if not docs:
            print("No documents found to index.")
            return

        # Split documents
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            add_start_index=True
        )
        splits = text_splitter.split_documents(docs)
        
        # Create/Update Vector Store
        # We delete existing db to ensure fresh index (simple approach)
        if os.path.exists(self.persist_directory):
            shutil.rmtree(self.persist_directory)
            
        self.vectorstore = Chroma.from_documents(
            documents=splits,
            embedding=self.embeddings,
            persist_directory=self.persist_directory
        )
        print(f"Indexed {len(splits)} chunks.")

    def retrieve(self, query, k=5):
        """Retrieves relevant code snippets."""
        if not os.path.exists(self.persist_directory):
            return []
            
        vectorstore = Chroma(
            persist_directory=self.persist_directory, 
            embedding_function=self.embeddings
        )
        
        docs = vectorstore.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]

class RetryBudget:
    def __init__(self, max_retries=3):
        self.max_retries = max_retries
        self.attempts = {} # Key: (goal, state), Value: count

    def check_budget(self, goal, state):
        key = (goal, state)
        count = self.attempts.get(key, 0)
        if count >= self.max_retries:
            return False
        return True

    def consume_budget(self, goal, state):
        key = (goal, state)
        self.attempts[key] = self.attempts.get(key, 0) + 1
        return self.attempts[key]
    
    def reset_budget(self, goal, state):
        key = (goal, state)
        if key in self.attempts:
            del self.attempts[key]
