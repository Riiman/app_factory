import asyncio
import json
import redis.asyncio as redis
import jwt # Added PyJWT
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

from app.websocket.notification_manager import NotificationManager, get_notification_manager

# --- Constants ---
REDIS_CHANNEL = "dashboard-notifications"

# --- Setup Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- FastAPI App ---
app = FastAPI(title="Dashboard Notification WebSocket Server")

# --- Flask App Context for DB Access ---
from app import create_app
flask_app = create_app()
flask_app_context = flask_app.app_context()
flask_app_context.push()

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Redis Pub/Sub Listener ---
async def redis_listener(manager: NotificationManager):
    """Listens to a Redis channel and broadcasts messages to WebSocket clients."""
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(REDIS_CHANNEL)
    logger.info(f"Subscribed to Redis channel: {REDIS_CHANNEL}")
    
    while True:
        try:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                logger.info(f"Received message from Redis: {message['data']}")
                print(f"DEBUG: WS Server received from Redis: {message['data']}")
                # The data from redis-py pubsub is a string, so we need to parse it
                try:
                    data_dict = json.loads(message['data'])
                    await manager.broadcast(data_dict)
                except json.JSONDecodeError:
                    logger.error(f"Could not decode JSON from Redis message: {message['data']}")
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
                    print(f"DEBUG: Broadcast Error: {e}")
            await asyncio.sleep(0.01) # Prevent tight loop
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
            await asyncio.sleep(5) # Wait before retrying connection

# --- FastAPI Startup Event ---
@app.on_event("startup")
async def startup_event():
    """On startup, create a background task for the Redis listener."""
    manager = get_notification_manager()
    # Using asyncio.create_task to run the listener in the background
    asyncio.create_task(redis_listener(manager))


# --- WebSocket Endpoint ---
import os
from dotenv import load_dotenv

load_dotenv()

# --- JWT Configuration ---
# In a real app, load this from the same config source as Flask
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-please-change') 
JWT_ALGORITHM = "HS256"

@app.websocket("/ws/dashboard-notifications")
async def dashboard_websocket(
    websocket: WebSocket,
    token: str = None,
    manager: NotificationManager = Depends(get_notification_manager)
):
    # 1. Authenticate
    if not token:
        logger.warning("Connection attempt without token.")
        await websocket.close(code=4001) # Close with error
        return

    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub") # Assuming 'sub' holds user_id
        # Role might be in 'claims' or 'role' depending on how it was encoded
        # Let's assume a simple structure for now or just use user_id
        # If we need role, we might need to fetch it or decode it if present
        # user_role = payload.get("role", "user") 
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired.")
        await websocket.close(code=4001)
        return
    except jwt.InvalidTokenError:
        logger.warning("Invalid token.")
        await websocket.close(code=4001)
        return

    # 2. Determine Rooms
    # Subscribe to user room by default
    rooms = [f"user_{user_id}"]
    
    if payload.get("role") == "admin":
        rooms.append("admin")

    await manager.connect(websocket, rooms)
    try:
        while True:
            # Handle incoming messages (e.g., subscriptions)
            data_str = await websocket.receive_text()
            try:
                data = json.loads(data_str)
                message_type = data.get("type")
                
                if message_type == "subscribe":
                    startup_id = data.get("startup_id")
                    if startup_id:
                        manager.subscribe(websocket, f"startup_{startup_id}")
                        
                        # --- Send Initial Env Status (Regression Fix) ---
                        try:
                            # Use DockerManager to check status
                            # We are inside async function, but DockerManager is sync.
                            # For now, running sync is okay as it's quick, or we could offload to thread.
                            # Since we have flask_app_context globally, we can use DB if needed inside DockerManager.
                            
                            # Note: We need to ensure we fall back to 'stopped' if anything fails
                            status_payload = {'status': 'stopped'}
                            
                            # We need to run this in the threadpool to avoid blocking the event loop
                            def get_status_sync():
                                d_mgr = DockerManager()
                                # Reuse get_container_name (uses DB)
                                c_name = d_mgr.get_container_name(startup_id)
                                try:
                                    container = d_mgr.client.containers.get(c_name)
                                    if container.status == 'running':
                                        ports = container.attrs['NetworkSettings']['Ports']
                                        return {
                                            'status': 'running',
                                            'container_id': container.id,
                                            'ports': ports
                                        }
                                except Exception:
                                    pass
                                return {'status': 'stopped'}

                            # Run sync code in executor
                            loop = asyncio.get_event_loop()
                            status_payload = await loop.run_in_executor(None, get_status_sync)
                            
                            # Send to client
                            await websocket.send_json({
                                "type": "env_status",
                                "data": status_payload
                            })
                            
                        except Exception as e:
                            logger.error(f"Error sending initial env_status: {e}")
                            print(f"DEBUG: Error sending initial env_status: {e}")
                
                elif message_type == "unsubscribe":
                    startup_id = data.get("startup_id")
                    if startup_id:
                        manager.unsubscribe(websocket, f"startup_{startup_id}")
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# --- Terminal WebSocket ---
from app.startup_builder.manager import DockerManager
import docker
import threading

@app.websocket("/ws/terminal")
async def terminal_websocket(
    websocket: WebSocket,
    startup_id: int, # Query param
    token: str = None
):
    # 1. Authenticate (Reuse logic or simplify)
    if not token:
        await websocket.close(code=4001)
        return

    try:
        jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    
    manager = DockerManager()
    container_name = manager.get_container_name(startup_id)
    
    try:
        container = manager.client.containers.get(container_name)
        if container.status != 'running':
            container.start()
            
        # Create exec instance
        exec_id = manager.client.api.exec_create(
            container.id,
            cmd="/bin/bash",
            stdin=True,
            tty=True,
            environment={"TERM": "xterm"}
        )['Id']
        
        # Start exec and get raw socket
        sock = manager.client.api.exec_start(
            exec_id,
            detach=False,
            tty=True,
            socket=True
        )
        # Note: sock is likely a raw socket or a wrapper
        
    except Exception as e:
        await websocket.send_text(f"Error starting terminal: {e}")
        await websocket.close()
        return

    # Background thread to read from Docker -> WebSocket
    loop = asyncio.get_event_loop()
    
    def read_from_docker():
        try:
            while True:
                data = sock.read(4096)
                if not data:
                    break
                # Send to WS
                asyncio.run_coroutine_threadsafe(
                    websocket.send_json({'data': data.decode('utf-8', errors='ignore')}),
                    loop
                )
        except Exception as e:
            logger.error(f"Terminal read error: {e}")
        finally:
            try:
                sock.close()
            except:
                pass

    reader_thread = threading.Thread(target=read_from_docker)
    reader_thread.daemon = True
    reader_thread.start()

    try:
        while True:
            # Read from WebSocket -> Docker
            msg_str = await websocket.receive_text()
            try:
                msg = json.loads(msg_str)
                
                # Handle resize
                if msg.get('type') == 'resize':
                    rows = msg.get('rows', 24)
                    cols = msg.get('cols', 80)
                    try:
                        manager.client.api.exec_resize(exec_id, height=rows, width=cols)
                    except Exception as resize_err:
                        logger.error(f"Resize error: {resize_err}")
                
                # Handle input
                elif msg.get('type') == 'input':
                    input_data = msg.get('data', '')
                    if input_data:
                        data_bytes = input_data.encode('utf-8')
                        # Write to socket
                        if hasattr(sock, 'sendall'):
                            sock.sendall(data_bytes)
                        else:
                            os.write(sock.fileno(), data_bytes)
                            
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Terminal WS error: {e}")
    finally:
        # Cleanup
        try:
            sock.close()
        except:
            pass
        # Reader thread will exit when sock is closed (read returns empty)

# --- Main Entry Point ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
