import random
import time
from datetime import datetime
from app import db
from app.models import MarketingContentItem, MarketingContentStatus

def publish_content(content_id):
    """
    Simulates publishing content to an external platform.
    """
    try:
        content_item = MarketingContentItem.query.get(content_id)
        if not content_item:
            return {"success": False, "error": "Content item not found"}

        # Simulate API latency
        time.sleep(1.5)

        content_item.status = MarketingContentStatus.PUBLISHED
        content_item.publish_date = datetime.utcnow()
        db.session.commit()

        return {"success": True, "item": content_item.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}

def simulate_metrics(content_id):
    """
    Generates random performance metrics for a published item.
    """
    try:
        content_item = MarketingContentItem.query.get(content_id)
        if not content_item:
            return {"success": False, "error": "Content item not found"}

        if content_item.status != MarketingContentStatus.PUBLISHED:
             return {"success": False, "error": "Cannot simulate metrics for unpublished content"}

        # Simulate metrics based on channel
        metrics = {}
        if content_item.channel == "LinkedIn":
            metrics = {
                "impressions": random.randint(100, 5000),
                "likes": random.randint(5, 500),
                "comments": random.randint(0, 50),
                "shares": random.randint(0, 20)
            }
        elif content_item.channel == "Twitter":
            metrics = {
                "impressions": random.randint(500, 10000),
                "likes": random.randint(10, 1000),
                "retweets": random.randint(2, 100),
                "replies": random.randint(0, 50)
            }
        elif content_item.channel == "Instagram":
             metrics = {
                "reach": random.randint(200, 8000),
                "likes": random.randint(20, 800),
                "saves": random.randint(1, 50),
                "comments": random.randint(0, 40)
            }
        else:
             metrics = {
                "views": random.randint(50, 2000),
                "clicks": random.randint(1, 100)
            }

        content_item.performance = metrics
        db.session.commit()

        return {"success": True, "item": content_item.to_dict()}
    except Exception as e:
        return {"success": False, "error": str(e)}
