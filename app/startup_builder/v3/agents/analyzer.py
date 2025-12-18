import logging
import json
from ...manager import DockerManager
from ...context import ContextManager

logger = logging.getLogger(__name__)

class V3Analyzer:
    def __init__(self):
        self.docker_manager = DockerManager()
        self.context_manager = None


    def analyze_node(self, state):
        """
        Analyzer Node: Scans the codebase to ground the planner.
        """
        startup_id = state.get("startup_id")
        logger.info(f"--- V3 Analyzer: Scanning codebase for {startup_id} ---")
        
        # 1. Build Ignore List
        # We start with logical defaults
        ignore_patterns = [
            "node_modules", 
            "__pycache__", 
            ".git", 
            "dist", 
            "build", 
            ".next", 
            "coverage", 
            ".venv", 
            "env", 
            "venv",
            "artifacts" # Ignore agent artifacts
        ]
        
        # 2. Construct Find Command
        # find . -path ./node_modules -prune -o -path ./__pycache__ -prune ... -o -print
        prune_args = []
        for pat in ignore_patterns:
            prune_args.append(f"-path '*/{pat}*'")
            
        # Join with -o (OR)
        # Check: find . \( -path '*/node_modules*' -o -path '*/__pycache__*' \) -prune -o -print
        # Simplified for busybox/standard linux find
        ignore_clause = " -o ".join(prune_args)
        
        # Command: listing structure (limit depth to avoid noise, e.g. 5)
        cmd = f"find . -maxdepth 5 \\( {ignore_clause} \\) -prune -o -print"
        
        result = self.docker_manager.run_command(startup_id, cmd)
        
        file_tree = ""
        if result.get("exit_code") == 0:
            lines = result["output"].strip().splitlines()
            # Sort for stability
            lines.sort()
            
            # Enrich with summaries
            if not self.context_manager or self.context_manager.startup_id != startup_id:
                self.context_manager = ContextManager(self.docker_manager, startup_id)
            
            summaries = self.context_manager.get_file_summaries()
            
            enriched_lines = []
            for line in lines[:500]: # Cap at 500
                 # line is relative path, e.g. "./src/app.tsx" or "src/app.tsx" or "./package.json"
                 clean_path = line.replace("./", "")
                 if clean_path in summaries:
                     enriched_lines.append(f"{clean_path}  # {summaries[clean_path]}")
                 else:
                     enriched_lines.append(line)

            file_tree = "\n".join(enriched_lines)
            if len(lines) > 500:
                file_tree += "\n...(truncated)..."
        else:
            file_tree = "(Empty or Error listing files)"
            
        # 3. Read Key Config Files
        key_files_content = ""
        for config_file in ["package.json", "requirements.txt", "tsconfig.json"]:
             # Check if exists in tree
             if config_file in file_tree:
                 fres = self.docker_manager.read_file(startup_id, config_file)
                 if not fres.get("error"):
                     content = fres["content"]
                     # Compact it locally? JSON removal of whitespace?
                     # Just strict truncation for now.
                     if len(content) > 1000:
                         content = content[:1000] + "...(truncated)"
                     key_files_content += f"\n--- {config_file} ---\n{content}\n"
        
        analysis = f"""
### Project Structure
{file_tree}

### Key Configurations
{key_files_content}
"""
        return {
            "status": "planning", # Done analyzing, move to planning
            "codebase_analysis": analysis,
            "logs": ["Analyzer: Scanned codebase structure and config key files."]
        }
