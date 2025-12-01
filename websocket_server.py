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
                # The data from redis-py pubsub is a string, so we need to parse it
                try:
                    data_dict = json.loads(message['data'])
                    await manager.broadcast(data_dict)
                except json.JSONDecodeError:
                    logger.error(f"Could not decode JSON from Redis message: {message['data']}")
                except Exception as e:
                    logger.error(f"Error broadcasting message: {e}")
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
    # Ideally, we query the DB to get the user's startups.
    # For now, we'll subscribe to:
    # - 'user_{user_id}'
    # - 'admin' (if we can verify they are admin)
    # - 'startup_{id}' (we need to know which startups they belong to)
    
    # Since we can't easily query the DB here without setting up async SQLAlchemy,
    # we will rely on the 'user_{user_id}' room for user-specific updates.
    # AND we will assume the frontend/backend logic will handle startup updates 
    # by sending to 'user_{user_id}' OR we blindly subscribe to 'startup_{id}' if passed?
    # No, that's insecure.
    
    # BETTER APPROACH for this context:
    # Subscribe to `user_{user_id}`.
    # If the user is an admin (we need to know), subscribe to `admin`.
    
    # Let's try to decode role from token if possible. 
    # If not, we might need to fetch it.
    # For this implementation, let's assume the token has 'role' or we treat everyone as user.
    # If we really need startup rooms, the backend should publish to 'user_{id}' for each member.
    # OR we can try to connect to the DB.
    
    # Let's stick to:
    # rooms = [f"user_{user_id}"]
    # if payload.get("role") == "admin": rooms.append("admin")
    
    rooms = [f"user_{user_id}"]
    
    # Check for admin role in token claims (adjust key based on actual JWT structure)
    # Flask-JWT-Extended usually puts claims in 'sub' (if it's a dict) or separate.
    # If 'sub' is just ID, we might need to look elsewhere.
    # Let's assume standard claims or 'role' key.
    if payload.get("role") == "admin":
        rooms.append("admin")
        
    # TODO: Fetch user's startups and add f"startup_{startup_id}" to rooms.
    # For now, we will rely on the backend publishing to 'user_{id}' for specific updates
    # OR the backend publishing to 'startup_{id}' and we miss it if we don't subscribe.
    # To fix this without DB access here:
    # The backend could publish to 'user_{id}' for every user in the startup.
    # That puts the burden on the backend to know the members.
    # That is actually a cleaner separation.
    
    await manager.connect(websocket, rooms)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# --- Main Entry Point ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
