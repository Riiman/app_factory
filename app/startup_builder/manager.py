import docker
import os
import time

class DockerManager:
    def __init__(self):
        try:
            # Force local socket for Linux environment to avoid SSH hangs
            self.client = docker.DockerClient(base_url='unix://var/run/docker.sock')
        except Exception:
            try:
                # Fallback to env
                self.client = docker.from_env()
            except Exception as e:
                print(f"Error initializing Docker client: {e}")
                self.client = None

        # Fix: Initialize base_work_dir
        base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.base_work_dir = os.path.join(base_path, 'temp_workspaces')
        if not os.path.exists(self.base_work_dir):
            try:
                os.makedirs(self.base_work_dir, exist_ok=True)
            except Exception as e:
                print(f"Error creating base_work_dir: {e}")

    def get_container_name(self, startup_id, container_name=None):
        """
        Returns the container name for a startup.
        If container_name is provided, returns it.
        Otherwise queries the database.
        Finally generates a default name (for backward compatibility).
        """
        if container_name:
            return container_name
            
        try:
            from app.models import Startup
            startup = Startup.query.get(startup_id)
            if startup and startup.container_name:
                return startup.container_name
        except Exception as e:
            print(f"Error fetching container name from DB: {e}")
            
        # Fallback: Check for running containers with matching volume mount
        # This handles cases where DB update failed or is lagging
        try:
            if self.client:
                target_path = f"temp_workspaces/{startup_id}"
                containers = self.client.containers.list() # Running only
                for c in containers:
                    for mount in c.attrs.get("Mounts", []):
                        source = mount.get("Source", "")
                        if target_path in source:
                            print(f"Recovered container {c.name} via volume check for {startup_id}")
                            return c.name
        except Exception as e:
            print(f"Volume fallback search failed: {e}")
            
        return f"startup_dev_{startup_id}"
    
    def generate_container_name(self):
        """Generates a unique random container name."""
        import uuid
        random_suffix = uuid.uuid4().hex[:12]
        return f"startup_dev_{random_suffix}"

    def ensure_container(self, startup_id, stack_type="MERN", container_name=None):
        """
        Ensures a dev container is running for the startup.
        stack_type: MERN, Python-Data, NextJS
        container_name: Optional existing container name from database
        Returns: dict with status, container_id, ports, and container_name
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Use provided container_name or generate a new one
        # Use provided container_name or try to find existing one
        if not container_name:
            # Try to recover an existing container name (Volume Check / DB Check via ID)
            # checking DB is redundant here if caller passed None, but Volume Check is vital.
            recovered_name = self.get_container_name(startup_id)
            try:
                # Check if this recovered name actually refers to a running/existing container
                self.client.containers.get(recovered_name)
                container_name = recovered_name
                print(f"ensure_container: Recovered existing container {container_name}")
            except:
                # If not found, THEN generate new random name
                container_name = self.generate_container_name()
                print(f"ensure_container: Generated new container name {container_name}")
        
        # Check if running
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                container.start()
            
            # Get ports
            container.reload()
            ports = container.attrs['NetworkSettings']['Ports']
            return {
                "status": "running", 
                "container_id": container.id, 
                "ports": ports,
                "container_name": container_name
            }
        except docker.errors.NotFound:
            # Create new container
            try:
                # Force Universal Stack (V3 Architecture)
                # We ignore the requested stack_type for the image, but keep it for metadata if needed.
                stack_dir = os.path.join(os.path.dirname(__file__), 'stacks', 'Universal')
                image_tag = "startup_builder_universal"
                
                # Build the image
                print(f"Building Universal Image...")
                self.client.images.build(path=stack_dir, tag=image_tag)

                # Create workspace directory on host
                workspace_path = os.path.join(self.base_work_dir, str(startup_id))
                os.makedirs(workspace_path, exist_ok=True)
                print(f"Using workspace at: {workspace_path}")

                container = self.client.containers.run(
                    image_tag,
                    command="tail -f /dev/null", # Keep alive
                    detach=True,
                    name=container_name,
                    volumes={workspace_path: {'bind': '/app', 'mode': 'rw'}},
                    working_dir="/app",
                    ports={'3000/tcp': None, '8000/tcp': None, '8888/tcp': None}, # Allow mapping for various ports
                    environment={'HOST': '0.0.0.0'}
                )
                # Reload to get ports
                container.reload()
                ports = container.attrs['NetworkSettings']['Ports']
                
                # We no longer do auto-init or auto-start here.
                # The Agent is now responsible for checking project state and running commands.
                
                return {
                    "status": "created", 
                    "container_id": container.id, 
                    "ports": ports,
                    "container_name": container_name
                }
            except Exception as e:
                return {"error": f"Failed to create container: {str(e)}"}
        except Exception as e:
            return {"error": f"Error checking container: {str(e)}"}

    def stop_container(self, startup_id, container_name=None):
        """
        Stops a container.
        container_name: Optional container name from database
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Use provided container_name or fall back to old naming
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            return {"status": "stopped"}
        except docker.errors.NotFound:
            return {"status": "not_found"}
        except Exception as e:
            return {"error": str(e)}
    
    def cleanup_container(self, container_name):
        """
        Stops and removes a container by name.
        Returns: dict with status
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        try:
            container = self.client.containers.get(container_name)
            if container.status == 'running':
                container.stop()
            container.remove()
            return {"status": "removed"}
        except docker.errors.NotFound:
            return {"status": "not_found"}
        except Exception as e:
            return {"error": str(e)}

    def run_command(self, startup_id, command, container_name=None, detach=False):
        """
        Runs a command inside the container.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Execute command
            if detach:
                sanitized_cmd = command.replace("'", "'\\''") 
                cmd_str = f"nohup bash -c '{sanitized_cmd}' > /dev/null 2>&1 &"
                
                container.exec_run(
                    ["bash", "-c", cmd_str],
                    workdir="/app",
                    user="root" # Always root if requested? Or simple default
                )
                return {
                    "exit_code": 0,
                    "output": "Command started in background."
                }
            else:
                # Use list format to avoid quoting issues
                # Run as root to allow installs
                exit_code, output = container.exec_run(
                    ["bash", "-c", command],
                    workdir="/app",
                    user="root" 
                )
                return {
                    "exit_code": exit_code,
                    "output": output.decode('utf-8')
                }
        except docker.errors.NotFound:
            return {"error": "Container not found"}
        except Exception as e:
            return {"error": str(e)}

    def list_files(self, startup_id, path=".", container_name=None):
        """
        Lists files in the container directory.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Use ls -F to distinguish directories
            # -1 forces one entry per line, -A includes hidden files (except . and ..)
            exit_code, output = container.exec_run(
                f"ls -1FA '{path}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                print(f"Error listing files at {path}: {output.decode('utf-8')}")
                # If directory doesn't exist or is empty, return empty list instead of error if possible
                # But ls returns error if dir doesn't exist.
                return {"error": f"Error listing files: {output.decode('utf-8')}"}
            
            raw_output = output.decode('utf-8')
            files = []
            for line in raw_output.splitlines():
                line = line.strip()
                if not line: continue
                
                is_dir = line.endswith('/')
                name = line[:-1] if is_dir else line
                
                # Check Hidden Folders
                if name in ["node_modules", ".git", "__pycache__", "artifacts"]:
                    continue
                
                files.append({
                    "name": name,
                    "type": "directory" if is_dir else "file",
                    "path": os.path.join(path, name) if path != "." else name
                })
                
            if not files:
                 return {"files": [], "info": "Directory is empty (or contains only hidden files)."}
            return {"files": files}
            
        except Exception as e:
            return {"error": str(e)}

    def search_files(self, startup_id, query, path=".", container_name=None):
        """
        Searches for a string pattern in files using grep.
        Returns: dict with matches or error.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Use grep -rnC 2 to get recursive, line numbers, and context
            # -I ignores binary files
            # --exclude-dir to skip node_modules, .git, artifacts
            cmd = f"grep -rnC 2 -I --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=artifacts '{query}' '{path}'"
            
            exit_code, output = container.exec_run(
                f"bash -c \"{cmd}\"",
                workdir="/app"
            )
            
            # grep returns 1 if no matches found, which is not an error for us
            if exit_code > 1:
                return {"error": f"Error searching files: {output.decode('utf-8')}"}
                
            return {"output": output.decode('utf-8')}
            
        except Exception as e:
            return {"error": str(e)}

    def read_file(self, startup_id, path, container_name=None):
        """
        Reads file content from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
                
            exit_code, output = container.exec_run(
                f"cat '{path}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Error reading file: {output.decode('utf-8')}"}
                
            return {"content": output.decode('utf-8')}
            
        except Exception as e:
            return {"error": str(e)}

    def read_file_base64(self, startup_id, path, container_name=None):
        """
        Reads binary file content from the container encoded as base64.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Use base64 command inside container to ensure clean transfer
            cmd = f"cat '{path}' | base64 -w 0"
            exit_code, output = container.exec_run(f"bash -c \"{cmd}\"", workdir="/app")
            
            if exit_code != 0:
                return {"error": f"Error reading file: {output.decode('utf-8')}"}
            
            return {"content_base64": output.decode('utf-8').strip()}
            
        except Exception as e:
            return {"error": str(e)}

    def replace_in_file(self, startup_id, path, target_text, replacement_text, container_name=None):
        """
        Replaces exact target_text with replacement_text in the file.
        Safety Checks:
        - Target must exist.
        - Target must be unique (appear exactly once).
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # 1. Read File
            exit_code, output = container.exec_run(f"cat '{path}'", workdir="/app")
            if exit_code != 0:
                return {"error": f"Read failed: {output.decode('utf-8')}"}
            
            content = output.decode('utf-8')
            
            # 2. Safety Checks
            count = content.count(target_text)
            if count == 0:
                # Try to be helpful: check if it's a whitespace issue
                # Normalize spaces (simple check)
                if target_text.strip() in content:
                    return {"error": "Target not found (exact match failed, but stripped match found. Check indentation)."}
                return {"error": "Target text not found in file."}
            elif count > 1:
                return {"error": f"Ambiguous target: Code block found {count} times. Include more context."}
            
            # 3. Apply Replacement
            new_content = content.replace(target_text, replacement_text)
            
            # 4. Write Back (reuse write_file logic but avoid circular dep if possible, or just reimplement)
            import base64
            encoded_content = base64.b64encode(new_content.encode('utf-8')).decode('utf-8')
            cmd = f"echo '{encoded_content}' | base64 -d > '{path}'"
            
            exit_code, output = container.exec_run(f"bash -c \"{cmd}\"", workdir="/app")
            
            if exit_code != 0:
                 return {"error": f"Write failed: {output.decode('utf-8')}"}
                 
            return {"status": "success"}
            
        except Exception as e:
            return {"error": str(e)}

    def write_file(self, startup_id, path, content, container_name=None):
        """
        Writes content to a file in the container using base64 encoding.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # METHOD UPDATE: Use put_archive for robust large file writing
            import io
            import tarfile
            
            # Ensure path is absolute within /app if relative
            if not path.startswith("/"):
                path = os.path.join("/app", path)
                
            dirname = os.path.dirname(path)
            basename = os.path.basename(path)
            
            # 1. Create directory if needed (still use exec for mkdir, low risk)
            # -p creates parents and no error if exists
            container.exec_run(f"mkdir -p '{dirname}'", workdir="/app", user="root")

            # 2. Create Tar Stream
            tar_stream = io.BytesIO()
            with tarfile.open(fileobj=tar_stream, mode='w') as tar:
                data = content.encode('utf-8')
                info = tarfile.TarInfo(name=basename)
                info.size = len(data)
                info.mtime = int(time.time())
                tar.addfile(info, io.BytesIO(data))
            
            tar_stream.seek(0)
            
            # 3. Put Archive
            # extracts into 'dirname'
            container.put_archive(path=dirname, data=tar_stream)
                
            return {"status": "success"}
            
        except Exception as e:
            return {"error": str(e)}

    def get_container_logs(self, startup_id, container_name=None):
        """
        Fetches logs from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            # Fetch logs (stdout and stderr)
            logs = container.logs(stdout=True, stderr=True, tail=200)
            return {"logs": logs.decode('utf-8')}
        except docker.errors.NotFound:
            return {"error": "Container not found"}
        except Exception as e:
            return {"error": str(e)}
    def copy_from_container(self, startup_id, src_path, dest_path, container_name=None):
        """Copies files from container to host, excluding heavy directories."""
        if not self.client:
            return False
        
        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            
            # Use tar inside container to stream files with excludes
            # This avoids transferring node_modules over the socket
            excludes = [
                "--exclude='node_modules'",
                "--exclude='.git'",
                "--exclude='dist'",
                "--exclude='build'",
                "--exclude='__pycache__'",
                "--exclude='.DS_Store'",
                "--exclude='coverage'",
                "--exclude='.next'"
            ]
            exclude_str = " ".join(excludes)
            
            # Create tar stream command
            # We tar to stdout (-)
            # -C changes directory
            # . is the target (relative to -C)
            # We assume src_path is a directory. If it's a file, this might need adjustment, 
            # but for indexing we usually copy the whole app dir.
            
            # Ensure src_path ends with / if it's a dir, or handle it. 
            # Safest is to assume src_path is the root dir to copy.
            
            cmd = f"tar -cf - {exclude_str} -C {src_path} ."
            
            # exec_run with stream=True returns a generator
            exit_code, output_stream = container.exec_run(cmd, stream=True)
            
            # We can't easily check exit_code immediately with stream=True in all docker SDK versions/configs,
            # but we can read the stream.
            
            import tarfile
            import io
            
            # Read the stream into a BytesIO object (in-memory)
            # CAUTION: If the project is huge (sans node_modules), this might consume memory.
            # But without node_modules it should be small (MBs).
            tar_data = io.BytesIO()
            for chunk in output_stream:
                tar_data.write(chunk)
            tar_data.seek(0)
            
            # Extract
            with tarfile.open(fileobj=tar_data) as tar:
                tar.extractall(path=dest_path)
                
            return True
        except Exception as e:
            print(f"Error copying from container: {e}")
            return False

    def start_server(self, startup_id, container_name=None, start_command=None):
        """
        Starts the application server in the background.
        Detects package.json or requirements.txt to determine start command.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}

            # 1. Determine Start Command
            if start_command:
                start_cmd = start_command
            else:
                start_cmd = "npm start" # DefaultFallback

                # A. Check for mobile/package.json (Expo/React Native)
                exit_code, output = container.exec_run("cat mobile/package.json", workdir="/app")
                is_expo = False
                if exit_code == 0:
                    try:
                        pkg = json.loads(output.decode('utf-8'))
                        if "dependencies" in pkg and "expo" in pkg["dependencies"]:
                            is_expo = True
                            # Enforce Web port 3000 for consistency
                            start_cmd = "cd mobile && npx expo start --web --port 3000"
                    except: pass
                
                if not is_expo:
                    # B. Check for root package.json
                    exit_code, output = container.exec_run("cat package.json", workdir="/app")
                    if exit_code == 0:
                        import json
                        try:
                            pkg = json.loads(output.decode('utf-8'))
                            if "scripts" in pkg and "dev" in pkg["scripts"]:
                                start_cmd = "npm run dev"
                            elif "scripts" in pkg and "start" in pkg["scripts"]:
                                start_cmd = "npm start"
                        except:
                            pass
                    else:
                        # C. Check for python
                        exit_code, _ = container.exec_run("ls app.py", workdir="/app")
                        if exit_code == 0:
                            start_cmd = "python app.py"
                        else:
                            exit_code, _ = container.exec_run("ls main.py", workdir="/app")
                            if exit_code == 0:
                                start_cmd = "python main.py"
                            else:
                                # Flask specific check
                                exit_code, _ = container.exec_run("ls wsgi.py", workdir="/app")
                                if exit_code == 0:
                                    start_cmd = "gunicorn --bind 0.0.0.0:8000 wsgi:app"

            print(f"Starting server with command: {start_cmd}")

            # 2. Run in background using nohup
            # We redirect output to app.log and save PID
            full_cmd = f"nohup {start_cmd} > app.log 2>&1 & echo $! > server.pid"
            
            exit_code, output = container.exec_run(
                f"bash -c '{full_cmd}'",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Failed to start server: {output.decode('utf-8')}"}
                
            return {"status": "started", "command": start_cmd, "pid": output.decode('utf-8').strip()}

        except Exception as e:
            return {"error": str(e)}

    def ensure_app_running(self, startup_id, container_name=None, start_command=None):
        """
        Ensures the application server is running inside the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
            
        # 1. Check if running (check PID)
        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            
            # Check for server.pid
            exit_code, output = container.exec_run("cat server.pid", workdir="/app")
            if exit_code == 0:
                pid = output.decode('utf-8').strip()
                # Check if process exists
                check_exit, _ = container.exec_run(f"ps -p {pid}", workdir="/app")
                if check_exit == 0:
                     return {"status": "running", "pid": pid}
                else:
                    # Stale PID file
                    container.exec_run("rm server.pid", workdir="/app")
            
            # Not running, start it
            print(f"App not running for {startup_id}. Auto-starting...")
            return self.start_server(startup_id, container_name, start_command)
            
        except Exception as e:
            return {"error": str(e)}

    def stop_server(self, startup_id, container_name=None):
        """
        Stops the application server using the saved PID.
        """
        if not self.client:
            return {"error": "Docker not available"}

        # Query database for container name if not provided
        if not container_name:
            container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}

            # Read PID
            exit_code, output = container.exec_run("cat server.pid", workdir="/app")
            if exit_code != 0:
                return {"status": "not_running", "message": "No server.pid found"}
            
            pid = output.decode('utf-8').strip()
            if not pid.isdigit():
                 return {"status": "error", "message": "Invalid PID file"}

            # Kill process
            exit_code, output = container.exec_run(f"kill {pid}", workdir="/app")
            
            # Remove PID file
            container.exec_run("rm server.pid", workdir="/app")
            
            return {"status": "stopped", "pid": pid}

        except Exception as e:
            return {"error": str(e)}

    def start_background_process(self, startup_id, alias, command, container_name=None):
        """
        Starts a process in the background, tracks PID, and redirects logs.
        Stores state in /tmp/process_manager.json inside the container.
        """
        if not self.client:
            return {"error": "Docker not available"}

        if not container_name:
            container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}

            log_file = f"/tmp/{alias}.log"
            state_file = "/tmp/process_manager.json"
            
            # 1. Ensure State File Exists (Atomic-ish)
            # We use a single bash command to create if missing
            container.exec_run(f"bash -c \"[ ! -f {state_file} ] && echo '{{}}' > {state_file}\"", workdir="/app")
            
            # 2. Check overlap
            exit_code, output = container.exec_run(f"cat {state_file}", workdir="/app")
            import json
            state = {}
            if exit_code == 0:
                 try:
                    state = json.loads(output.decode('utf-8'))
                 except:
                    # corrupted, reset
                    state = {}
            
            if alias in state:
                pid = state[alias]
                # Check if actually running
                check_exit, _ = container.exec_run(f"ps -p {pid}", workdir="/app")
                if check_exit == 0:
                     return {"error": f"Process '{alias}' is already running (PID: {pid}). Stop it first."}
                else:
                    # Stale entry, cleanup
                    del state[alias]
            
            # 3. Run Command
            # We explicitly use setsid or nohup to ensure it doesn't die with the shell
            sanitized_cmd = command.replace("'", "'\\''") 
            full_cmd = f"nohup bash -c '{sanitized_cmd}' > {log_file} 2>&1 & echo $!"
            
            exit_code, output = container.exec_run(
                ["bash", "-c", full_cmd],
                workdir="/app"
            )
            
            if exit_code != 0:
                 return {"error": f"Failed to start process: {output.decode('utf-8')}"}
                 
            pid = output.decode('utf-8').strip()
            if not pid.isdigit():
                 return {"error": f"Failed to get PID. Output: {pid}"}
            
            # 4. Save State
            state[alias] = pid
            save_cmd = f"echo '{json.dumps(state)}' > {state_file}"
            container.exec_run(["bash", "-c", save_cmd], workdir="/app")
            
            return {
                "status": "started", 
                "alias": alias, 
                "pid": pid, 
                "log_file": log_file,
                "message": f"Process started with PID {pid}."
            }
            
        except Exception as e:
            return {"error": str(e)}

    def stop_background_process(self, startup_id, alias, container_name=None):
        """
        Stops a background process by alias and cleans up logs.
        """
        if not self.client:
            return {"error": "Docker not available"}

        if not container_name:
            container_name = self.get_container_name(startup_id)

        try:
            container = self.client.containers.get(container_name)
            state_file = "/tmp/process_manager.json"
            
            # Read State
            exit_code, output = container.exec_run(f"cat {state_file}", workdir="/app")
            if exit_code != 0:
                return {"error": "No process manager state found."}
                
            import json
            try:
                state = json.loads(output.decode('utf-8'))
            except:
                return {"error": "Corrupt process manager state."}
                
            if alias not in state:
                 return {"error": f"Process '{alias}' not found."}
                 
            pid = state[alias]
            
            # Kill
            container.exec_run(f"kill -9 {pid}", workdir="/app")
            
            # Remove from State
            del state[alias]
            save_cmd = f"echo '{json.dumps(state)}' > {state_file}"
            container.exec_run(["bash", "-c", save_cmd], workdir="/app")
            
            # Cleanup Log
            log_file = f"/tmp/{alias}.log"
            container.exec_run(f"rm -f {log_file}", workdir="/app")
            
            return {"status": "stopped", "alias": alias, "pid": pid, "message": "Process stopped and logs cleaned."}
            
        except Exception as e:
            return {"error": str(e)}

    def read_background_process_logs(self, startup_id, alias, lines=20, container_name=None):
        """
        Reads the tail of the log file for an alias.
        """
        if not self.client:
            return {"error": "Docker not available"}

        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            log_file = f"/tmp/{alias}.log"
            
            exit_code, output = container.exec_run(f"tail -n {lines} {log_file}", workdir="/app")
            
            if exit_code != 0:
                 return {"error": f"Could not read logs (Process might not exist): {output.decode('utf-8')}"}
            
            return {"logs": output.decode('utf-8')}
            
        except Exception as e:
            return {"error": str(e)}

    def list_background_processes(self, startup_id, container_name=None):
        if not self.client:
            return {"error": "Docker not available"}

        if not container_name:
            container_name = self.get_container_name(startup_id)
            
        try:
            container = self.client.containers.get(container_name)
            state_file = "/tmp/process_manager.json"
            
            exit_code, output = container.exec_run(f"cat {state_file}", workdir="/app")
            if exit_code != 0:
                return {"processes": []}
                
            import json
            state = json.loads(output.decode('utf-8'))
            return {"processes": list(state.keys())}
            
        except Exception as e:
            return {"error": str(e)}


class Linter:
    def __init__(self, docker_manager):
        self.docker_manager = docker_manager

    def lint_file(self, startup_id, file_path):
        """
        Runs the appropriate linter based on file extension.
        Returns: {"passed": bool, "errors": list[str]}
        """
        if file_path.endswith(".js") or file_path.endswith(".ts") or file_path.endswith(".jsx") or file_path.endswith(".tsx"):
            return self.run_eslint(startup_id, file_path)
        elif file_path.endswith(".py"):
            return self.run_flake8(startup_id, file_path)
        else:
            return {"passed": True, "errors": []}

    def run_eslint(self, startup_id, file_path):
        # Check for existing config
        check_config = self.docker_manager.run_command(startup_id, "ls eslint.config.js")
        config_flag = ""
        
        if check_config.get("exit_code") != 0:
            # No config found, use default in /tmp
            default_config_path = "/tmp/eslint.config.js"
            # Create default config if not exists
            # We use a simple check to avoid overwriting if it exists (though overwriting is fine for tmp)
            create_config_cmd = "echo 'module.exports = [{files: [\"**/*.js\", \"**/*.ts\", \"**/*.jsx\", \"**/*.tsx\"], rules: {\"no-unused-vars\": \"warn\", \"no-undef\": \"error\"}}];' > " + default_config_path
            self.docker_manager.run_command(startup_id, create_config_cmd)
            config_flag = f"--config {default_config_path}"
            
        cmd = f"eslint {config_flag} {file_path}"
        result = self.docker_manager.run_command(startup_id, cmd)
        
        if result.get("exit_code") == 0:
            return {"passed": True, "errors": []}
        else:
            return {"passed": False, "errors": result.get("output", "").splitlines()}

    def run_flake8(self, startup_id, file_path):
        cmd = f"flake8 {file_path}"
        result = self.docker_manager.run_command(startup_id, cmd)
        
        if result.get("exit_code") == 0:
            return {"passed": True, "errors": []}
        else:
            return {"passed": False, "errors": result.get("output", "").splitlines()}
