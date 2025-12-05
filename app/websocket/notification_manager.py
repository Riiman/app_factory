import asyncio
import logging
from typing import List, Dict
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class NotificationManager:
    def __init__(self):
        # Store connections as a dictionary: WebSocket -> Set[str] (rooms)
        self.active_connections: Dict[WebSocket, set] = {}

    async def connect(self, websocket: WebSocket, rooms: List[str]):
        await websocket.accept()
        self.active_connections[websocket] = set(rooms)
        logger.info(f"New connection established. Rooms: {rooms}")

    def disconnect(self, websocket: WebSocket):
        try:
            if websocket in self.active_connections:
                del self.active_connections[websocket]
        except KeyError:
            logger.warning("Attempted to disconnect non-existent websocket from NotificationManager.")
        logger.info("Connection closed.")

    async def broadcast(self, message_data: Dict):
        """
        Broadcasts a message to relevant connections based on rooms.
        Expects message_data to contain 'rooms' key (list of strings) and 'payload' (actual data).
        If 'rooms' is missing or empty, it could default to broadcast-all or no-op.
        Let's assume strict room targeting.
        """
        target_rooms = set(message_data.get("rooms", []))
        payload = message_data.get("payload", message_data) # Fallback if structure differs
        
        # If no rooms specified, maybe it's a system-wide broadcast? 
        # For safety, let's require 'global' room for that, or just handle explicit targets.
        if not target_rooms:
            logger.warning("Broadcast called with no target rooms. Message dropped.")
            return

        send_coroutines = []
        for connection, client_rooms in self.active_connections.items():
            # Check intersection: if client is in ANY of the target rooms
            if not client_rooms.isdisjoint(target_rooms):
                try:
                    send_coroutines.append(connection.send_json(payload))
                except RuntimeError as e:
                    logger.error(f"Error preparing to send to websocket: {e}")

        if send_coroutines:
            results = await asyncio.gather(*send_coroutines, return_exceptions=True)
            logger.info(f"Broadcasted message to {len(send_coroutines)} clients. Rooms: {target_rooms}")
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Error during broadcast: {result}")


# Create a singleton instance to be shared across the app
notification_manager = NotificationManager()

def get_notification_manager() -> NotificationManager:
    return notification_manager
