import json
import logging
import redis
from flask import current_app

logger = logging.getLogger(__name__)

def publish_update(event_type: str, data: dict, rooms: list = None, channel: str = "dashboard-notifications"):
    """
    Publishes an update message to the Redis channel.
    
    Args:
        event_type (str): The type of event.
        data (dict): The data payload.
        rooms (list): List of rooms to target (e.g., ['admin', 'user_1', 'startup_5']).
        channel (str): The Redis channel.
    """
    try:
        from app.extensions import redis_client
        
        if not redis_client:
             logger.warning("Redis client not initialized in extensions.")
             return

        if rooms is None:
            rooms = []

        # Structure for the WebSocket server
        message = {
            "rooms": rooms,
            "payload": {
                "type": event_type,
                "data": data
            }
        }
        
        message_str = json.dumps(message)
        
        redis_client.publish(channel, message_str)
        logger.info(f"Published {event_type} to {channel} for rooms: {rooms}")
        
    except Exception as e:
        logger.error(f"Failed to publish update to Redis: {e}")
