import docker
import os
import time

class DockerManager:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            print(f"Error initializing Docker client: {e}")
            self.client = None

    def get_container_name(self, startup_id):
        return f"startup_dev_{startup_id}"

    def ensure_container(self, startup_id, stack_type="MERN"):
        """
        Ensures a dev container is running for the startup.
        stack_type: MERN, Python-Data, NextJS
        """
        if not self.client:
            return {"error": "Docker not available"}

        container_name = self.get_container_name(startup_id)
        
        # Check if running
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                container.start()
            
            # Get ports
            container.reload()
            ports = container.attrs['NetworkSettings']['Ports']
            return {"status": "running", "container_id": container.id, "ports": ports}
        except docker.errors.NotFound:
            # Create new container
            try:
                # Build Image based on stack
                stack_dir = os.path.join(os.path.dirname(__file__), 'stacks', stack_type)
                if not os.path.exists(stack_dir):
                    # Fallback to MERN if stack not found
                    stack_dir = os.path.join(os.path.dirname(__file__), 'stacks', 'MERN')
                
                image_tag = f"startup_builder_{stack_type.lower()}"
                
                # Build the image
                print(f"Building image for {stack_type}...")
                self.client.images.build(path=stack_dir, tag=image_tag)

                # Create a volume for persistence
                volume_name = f"startup_vol_{startup_id}"
                try:
                    self.client.volumes.get(volume_name)
                except docker.errors.NotFound:
                    self.client.volumes.create(name=volume_name)

                container = self.client.containers.run(
                    image_tag,
                    command="tail -f /dev/null", # Keep alive
                    detach=True,
                    name=container_name,
                    volumes={volume_name: {'bind': '/app', 'mode': 'rw'}},
                    working_dir="/app",
                    ports={'3000/tcp': None, '8000/tcp': None, '8888/tcp': None}, # Allow mapping for various ports
                    environment={'HOST': '0.0.0.0'}
                )
                # Reload to get ports
                container.reload()
                ports = container.attrs['NetworkSettings']['Ports']
                
                # We no longer do auto-init or auto-start here.
                # The Agent is now responsible for checking project state and running commands.
                
                return {"status": "created", "container_id": container.id, "ports": ports}
            except Exception as e:
                return {"error": f"Failed to create container: {str(e)}"}
        except Exception as e:
            return {"error": f"Error checking container: {str(e)}"}

    def stop_container(self, startup_id):
        if not self.client:
            return {"error": "Docker not available"}
            
        container_name = self.get_container_name(startup_id)
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            return {"status": "stopped"}
        except docker.errors.NotFound:
            return {"status": "not_found"}
        except Exception as e:
            return {"error": str(e)}

    def run_command(self, startup_id, command):
        """
        Runs a command inside the container.
        """
        if not self.client:
            return {"error": "Docker not available"}

        container_name = self.get_container_name(startup_id)
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            # Execute command
            exit_code, output = container.exec_run(
                f"bash -c '{command}'",
                workdir="/app"
            )
            return {
                "exit_code": exit_code,
                "output": output.decode('utf-8')
            }
        except docker.errors.NotFound:
            return {"error": "Container not found"}
        except Exception as e:
            return {"error": str(e)}

    def list_files(self, startup_id, path="."):
        """
        Lists files in the container directory.
        """
        if not self.client:
            return {"error": "Docker not available"}
        
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
                
                files.append({
                    "name": name,
                    "type": "directory" if is_dir else "file",
                    "path": os.path.join(path, name) if path != "." else name
                })
                
            return {"files": files}
            
        except Exception as e:
            return {"error": str(e)}

    def read_file(self, startup_id, path):
        """
        Reads file content from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
            
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

    def write_file(self, startup_id, path, content):
        """
        Writes content to a file in the container using base64 encoding.
        """
        if not self.client:
            return {"error": "Docker not available"}

        container_name = self.get_container_name(startup_id)
        try:
            container = self.client.containers.get(container_name)
            if container.status != 'running':
                return {"error": "Container not running"}
            
            import base64
            encoded_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
            
            # Ensure parent directory exists
            cmd = f"mkdir -p $(dirname {path}) && echo '{encoded_content}' | base64 -d > {path}"
            
            exit_code, output = container.exec_run(
                f"bash -c \"{cmd}\"",
                workdir="/app"
            )
            
            if exit_code != 0:
                return {"error": f"Error writing file: {output.decode('utf-8')}"}
                
            return {"status": "success"}
            
        except Exception as e:
            return {"error": str(e)}

    def get_container_logs(self, startup_id):
        """
        Fetches logs from the container.
        """
        if not self.client:
            return {"error": "Docker not available"}
            
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
    def copy_from_container(self, startup_id, src_path, dest_path):
        """Copies files from container to host."""
        if not self.client:
            return False
            
        container_name = self.get_container_name(startup_id)
        try:
            container = self.client.containers.get(container_name)
            
            # get_archive returns a stream of the tar archive
            bits, stat = container.get_archive(src_path)
            
            import tarfile
            import io
            
            # Write stream to a temporary tar file
            tar_stream = io.BytesIO()
            for chunk in bits:
                tar_stream.write(chunk)
            tar_stream.seek(0)
            
            # Extract tar file to destination
            with tarfile.open(fileobj=tar_stream) as tar:
                tar.extractall(path=dest_path)
                
            return True
        except Exception as e:
            print(f"Error copying from container: {e}")
            return False
