import logging

logger = logging.getLogger(__name__)

class LSPHandler:
    def __init__(self, docker_manager, startup_id):
        self.docker_manager = docker_manager
        self.startup_id = startup_id
        
    def check_syntax(self, file_path: str) -> dict:
        """
        Quick syntax check.
        Returns {"valid": bool, "error": str}
        """
        if file_path.endswith(".py"):
            # python -m py_compile
            cmd = f"python3 -m py_compile '{file_path}'"
            result = self.docker_manager.run_command(self.startup_id, cmd)
            if result.get("exit_code") == 0:
                return {"valid": True}
            return {"valid": False, "error": result.get("output", "")}
            
        elif file_path.endswith(".js") or file_path.endswith(".ts") or file_path.endswith(".jsx") or file_path.endswith(".tsx"):
            # node --check (only works for JS mostly, TS needs tsc)
            # For MVP, assume we have a build step or similar.
            # Let's try to use esbuild if available or just basic syntax check via node
            if file_path.endswith(".ts") or file_path.endswith(".tsx"):
                 # Try tsc --noEmit
                 # Assuming tsconfig.json exists
                 cmd = f"npx tsc --noEmit '{file_path}'"
            else:
                 cmd = f"node --check '{file_path}'"
            
            result = self.docker_manager.run_command(self.startup_id, cmd)
            if result.get("exit_code") == 0:
                return {"valid": True}
            return {"valid": False, "error": result.get("output", "")}
            
        return {"valid": True} # Unknown type, assume valid

    def lint(self, file_path: str) -> dict:
        """
        Runs linter.
        """
        # Reuse the existing Linter logic logic from manager.py if accessible, 
        # or re-implement simple calls here.
        # Since we are moving to Sidecar, we can call the commands directly.
        
        if file_path.endswith(".py"):
             cmd = f"flake8 '{file_path}'"
        elif file_path.endswith(".js") or file_path.endswith(".ts"):
             cmd = f"npx eslint '{file_path}'"
        else:
            return {"valid": True, "errors": []}
            
        result = self.docker_manager.run_command(self.startup_id, cmd)
        if result.get("exit_code") == 0:
            return {"valid": True, "errors": []}
        
        return {"valid": False, "errors": result.get("output", "").splitlines()}
