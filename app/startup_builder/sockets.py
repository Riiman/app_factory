from flask import request
from flask_socketio import emit, disconnect, join_room, leave_room
from app.extensions import socketio
from app.startup_builder.manager import DockerManager
import docker
import threading
import time

# Store active streams: sid -> {'sock': socket, 'thread': thread}
active_streams = {}

# Store builder subscriptions: startup_id -> set of session IDs
builder_subscriptions = {}

def read_stream(sid, sock):
    """
    Reads output from the container's PTY socket and emits it to the client.
    """
    try:
        while True:
            # Read raw bytes from the socket
            data = sock.read(4096)
            if not data:
                break
            
            # Emit to the specific client
            socketio.emit('output', {'data': data.decode('utf-8', errors='ignore')}, room=sid, namespace='/terminal')
    except Exception as e:
        print(f"Stream error for {sid}: {e}")
    finally:
        # Cleanup
        if sid in active_streams:
            del active_streams[sid]
        try:
            sock.close()
        except:
            pass

@socketio.on('connect', namespace='/terminal')
def connect():
    print(f'Client connected to terminal: {request.sid}')
    # No initial message needed, the shell will provide the prompt

@socketio.on('disconnect', namespace='/terminal')
def disconnect_client():
    print(f'Client disconnected: {request.sid}')
    sid = request.sid
    if sid in active_streams:
        stream = active_streams[sid]
        try:
            stream['sock'].close()
        except:
            pass
        del active_streams[sid]

@socketio.on('start_terminal', namespace='/terminal')
def start_terminal(data):
    startup_id = data.get('startup_id')
    if not startup_id:
        return
    
    sid = request.sid
    manager = DockerManager()
    container_name = manager.get_container_name(startup_id)
    
    try:
        container = manager.client.containers.get(container_name)
        if container.status != 'running':
            container.start()
            
        # Use low-level API to create an exec instance with PTY
        # This allows for a persistent, interactive shell session
        exec_id = manager.client.api.exec_create(
            container.id,
            cmd="/bin/bash",
            stdin=True,
            tty=True,
            environment={"TERM": "xterm"}
        )['Id']
        
        # Start the exec instance and get the raw socket
        sock = manager.client.api.exec_start(
            exec_id,
            detach=False,
            tty=True,
            socket=True
        )
        
        # Start a background thread to read from the socket
        thread = threading.Thread(target=read_stream, args=(sid, sock))
        thread.daemon = True
        thread.start()
        
        active_streams[sid] = {'sock': sock, 'thread': thread, 'exec_id': exec_id}
        
    except docker.errors.NotFound:
        emit('output', {'data': f'Container {container_name} not found. Please start the environment.\r\n'})
    except Exception as e:
        emit('output', {'data': f'Error starting terminal: {str(e)}\r\n'})

import os

# ... (imports)

@socketio.on('input', namespace='/terminal')
def handle_input(data):
    sid = request.sid
    input_data = data.get('data', '')
    
    if sid in active_streams:
        try:
            sock = active_streams[sid]['sock']
            data_bytes = input_data.encode('utf-8')
            
            # Try different methods to write to the socket/file
            if hasattr(sock, 'sendall'):
                sock.sendall(data_bytes)
            elif hasattr(sock, 'write'):
                try:
                    sock.write(data_bytes)
                    if hasattr(sock, 'flush'):
                        sock.flush()
                except Exception as e:
                    # If write fails (e.g. read-only file object), try os.write on fileno
                    if 'not writable' in str(e) and hasattr(sock, 'fileno'):
                        os.write(sock.fileno(), data_bytes)
                    else:
                        raise e
            elif hasattr(sock, 'fileno'):
                os.write(sock.fileno(), data_bytes)
            else:
                print(f"Error: Socket {sid} has no write method")
                
        except Exception as e:
            print(f"Error writing to terminal {sid}: {e}")
            emit('output', {'data': f'\r\nError: Connection lost ({str(e)}).\r\n'})

@socketio.on('resize', namespace='/terminal')
def handle_resize(data):
    sid = request.sid
    if sid not in active_streams:
        return
        
    rows = data.get('rows', 24)
    cols = data.get('cols', 80)
    exec_id = active_streams[sid].get('exec_id')
    
    if exec_id:
        try:
            manager = DockerManager()
            manager.client.api.exec_resize(exec_id, height=rows, width=cols)
        except Exception as e:
            print(f"Error resizing terminal {sid}: {e}")

# ============================================
# Builder Namespace - Environment Status Updates
# ============================================

@socketio.on('connect', namespace='/builder')
def builder_connect():
    print(f'Client connected to builder: {request.sid}')
    emit('connected', {'status': 'connected'})

@socketio.on('disconnect', namespace='/builder')
def builder_disconnect():
    sid = request.sid
    print(f'Client disconnected from builder: {sid}')
    
    # Remove from all subscriptions
    for startup_id in list(builder_subscriptions.keys()):
        if sid in builder_subscriptions[startup_id]:
            builder_subscriptions[startup_id].discard(sid)
            if not builder_subscriptions[startup_id]:
                del builder_subscriptions[startup_id]

@socketio.on('subscribe', namespace='/builder')
def subscribe_to_startup(data):
    startup_id = data.get('startup_id')
    if not startup_id:
        return
    
    sid = request.sid
    room = f"startup_{startup_id}"
    
    # Join the room for this startup
    join_room(room)
    
    # Track subscription
    if startup_id not in builder_subscriptions:
        builder_subscriptions[startup_id] = set()
    builder_subscriptions[startup_id].add(sid)
    
    print(f"Client {sid} subscribed to startup {startup_id}")
    
    # Send current status immediately
    from app.models import Startup
    startup = Startup.query.get(startup_id)
    if startup and startup.container_name:
        manager = DockerManager()
        try:
            container = manager.client.containers.get(startup.container_name)
            if container.status == 'running':
                ports = container.attrs['NetworkSettings']['Ports']
                emit('env_status', {
                    'status': 'running',
                    'container_id': container.id,
                    'ports': ports
                })
            else:
                emit('env_status', {'status': 'stopped'})
        except:
            emit('env_status', {'status': 'stopped'})
    else:
        emit('env_status', {'status': 'stopped'})

@socketio.on('unsubscribe', namespace='/builder')
def unsubscribe_from_startup(data):
    startup_id = data.get('startup_id')
    if not startup_id:
        return
    
    sid = request.sid
    room = f"startup_{startup_id}"
    
    # Leave the room
    leave_room(room)
    
    # Remove from tracking
    if startup_id in builder_subscriptions:
        builder_subscriptions[startup_id].discard(sid)
        if not builder_subscriptions[startup_id]:
            del builder_subscriptions[startup_id]
    
    print(f"Client {sid} unsubscribed from startup {startup_id}")
