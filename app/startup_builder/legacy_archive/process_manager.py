import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class ProcessManager:
    """
    Middleware to handle command execution strategy (Sync vs Async).
    """
    def __init__(self, docker_manager):
        self.docker_manager = docker_manager
        # In-memory registry for this session (Note: Persisting this to DB/Redis is better for scaling, 
        # but for now we keep it simple as requested)
        self.active_jobs = {} 

    def run_smart(self, startup_id, command, timeout=5.0):
        """
        Executes a command with a "Try-Sync" strategy.
        1. Starts command detached.
        2. Waits up to `timeout` seconds.
        3. If finished -> Returns output (Sync).
        4. If running -> Returns Job ID (Async).
        """
        try:
            start_time = time.time()
            # 1. Start Process Detached
            import uuid
            job_id = f"job_{uuid.uuid4().hex[:8]}"
            alias = job_id # Use job_id as alias for DockerManager
            
            # Start via DockerManager's background process tool
            res = self.docker_manager.start_background_process(startup_id, alias, command)
            
            if res.get("error"):
                return {"error": res["error"]}
                
            pid = res.get("pid")
            
            # 2. Monitor Loop (Respecting Timeout)
            # We poll every 0.5s until timeout is reached
            
            while (time.time() - start_time) < timeout:
                try:
                    # Check State
                    # Use a robust check: if ps returns exit code 0, it exists.
                    # We avoid 'get_container_name' re-query overhead if possible, but manager needs id.
                    # We'll trust the manager caches or is fast enough, but wrap in specific try/except.
                    
                    container_name = self.docker_manager.get_container_name(startup_id)
                    container = self.docker_manager.client.containers.get(container_name)
                    
                    # Check State: explicitly request state code to detect ZOMBIES
                    # 'stat' returns state code (R, S, D, Z, T, etc.)
                    check = container.exec_run(f"ps -p {pid} -o stat=")
                    
                    if check.exit_code != 0:
                         # PID gone -> Finished
                         is_running = False
                    else:
                         # Process exists, but is it a zombie?
                         state_code = check.output.decode('utf-8').strip()
                         if "Z" in state_code: # Zombie
                             is_running = False
                         else:
                             is_running = True
                         
                except Exception as e:
                    logger.warning(f"PID Check Failed (Assuming still running): {e}")
                    is_running = True # Assume running on error to prevent premature success
                
                if not is_running:
                    # It finished!
                    logs = self.docker_manager.read_background_process_logs(startup_id, alias).get("logs", "")
                    
                    # Try to get exit code
                    exit_code = 0 # Default success if unknown (legacy behavior, but we prefer explicit)
                    try:
                        exit_file_path = f"/tmp/{alias}.exit"
                        exit_res = self.docker_manager.read_file(startup_id, exit_file_path)
                        if not exit_res.get("error"):
                             code_str = exit_res["content"].strip()
                             if code_str.isdigit():
                                 exit_code = int(code_str)
                    except:
                        pass
                    
                    self.docker_manager.stop_background_process(startup_id, alias)
                    
                    return {
                        "status": "completed",
                        "output": logs,
                        "exit_code": exit_code,
                        "duration": time.time() - start_time
                    }
                
                # Dynamic Polling: Slow down if waiting long
                elapsed = time.time() - start_time
                if elapsed < 5:
                     time.sleep(0.5)
                else:
                     time.sleep(2.0)
            
            # 3. Timeout Exceeded -> Background It
            logger.info(f"Command '{command}' exceeded timeout ({timeout}s). Moving to background (Job {job_id}).")
            
            current_logs = self.docker_manager.read_background_process_logs(startup_id, alias).get("logs", "")
            
            self.active_jobs[job_id] = {
                "job_id": job_id,
                "startup_id": startup_id,
                "alias": alias,
                "pid": pid,
                "command": command,
                "start_time": datetime.now().isoformat(),
                "status": "running"
            }
            
            return {
                "status": "background",
                "job_id": job_id,
                "pid": pid, # returning pid to avoid keyerror in tools
                "message": f"Command moved to background after {timeout}s.",
                "latest_output": current_logs[-2000:]
            }
            
        except Exception as e:
            return {"error": f"Smart Run Failed: {str(e)}"}

    def check_job(self, startup_id, job_id):
        """
        Checks the status of a specific background job.
        """
        job = self.active_jobs.get(job_id)
        if not job:
            return {"error": "Job not found in active registry."}
            
        alias = job["alias"]
        pid = job["pid"]
        
        try:
            container_name = self.docker_manager.get_container_name(startup_id)
            container = self.docker_manager.client.containers.get(container_name)
            check = container.exec_run(f"ps -p {pid}")
            is_running = (check.exit_code == 0)
            
            logs = self.docker_manager.read_background_process_logs(startup_id, alias, lines=50).get("logs", "")
            
            if is_running:
                return {
                    "status": "running",
                    "job_id": job_id,
                    "latest_logs": logs
                }
            else:
                # Finished
                del self.active_jobs[job_id]
                self.docker_manager.stop_background_process(startup_id, alias)
                return {
                    "status": "completed",
                    "job_id": job_id,
                    "output": logs
                }
                
        except Exception as e:
            return {"error": str(e)}
