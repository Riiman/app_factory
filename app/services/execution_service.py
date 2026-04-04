import requests
from datetime import datetime
from app import db
from app.models import MarketingContentItem, MarketingContentStatus, MarketingSettings

def publish_content(content_id):
    """
    Publishes content via GetLate API.
    """
    try:
        print(f"Starting publish_content for content_id: {content_id}")
        content_item = MarketingContentItem.query.get(content_id)
        if not content_item:
            return {"success": False, "error": "Content item not found"}

        # Get startup and settings
        try:
            startup_id = content_item.calendar.campaign.startup_id
        except AttributeError as e:
            return {"success": False, "error": f"Invalid content hierarchy: {e}"}

        # Get API Key
        from flask import current_app
        api_key = current_app.config.get('GETLATE_API_KEY')
        if not api_key:
             return {"success": False, "error": "Server missing GetLate API Key"}

        # Get Profile ID
        profile_setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider='getlate_profile').first()
        if not profile_setting or not profile_setting.credentials or 'id' not in profile_setting.credentials:
             return {"success": False, "error": "GetLate Profile not initialized for this startup"}
        
        profile_id = profile_setting.credentials['id']

        # Construct Payload
        # Mapping: https://docs.getlate.dev/core/posts
        
        # Determine scheduling
        post_now = True
        scheduled_for = None
        
        if content_item.publish_date:
            today = datetime.utcnow().date()
            if content_item.publish_date > today:
                post_now = False
                # GetLate requires ISO8601 string
                # Since we only have Date, default to 09:00 UTC on that day
                # Or midnight? Let's do 09:00 AM which is reasonable for business posts
                dt = datetime.combine(content_item.publish_date, datetime.min.time().replace(hour=9))
                scheduled_for = dt.isoformat() + "Z" 

        payload = {
            "content": content_item.content_body or content_item.title,
            "postNow": post_now,
            "profileId": profile_id
            # "media": [] # TODO: specific media if added
        }
        
        if scheduled_for:
            payload["scheduledFor"] = scheduled_for
        
        # Omit platforms for now to default to all accounts in profile
        # (This avoids the need for specific accountIds until we support multi-channel properly)
        # if content_item.channel:
        #    payload["platforms"] = [content_item.channel.lower()] 

        url = "https://getlate.dev/api/v1/posts"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        print(f"Sending to GetLate: {payload}")
        resp = requests.post(url, headers=headers, json=payload)
        
        if resp.status_code not in [200, 201]:
             print(f"GetLate Publish Failed: {resp.text}")
             try:
                 err_data = resp.json()
                 # Check for detailed platform errors
                 if 'platformResults' in err_data:
                     errors = [p.get('error') for p in err_data['platformResults'] if p.get('status') == 'failed']
                     if errors:
                         return {"success": False, "error": f"Publish Failed: {'; '.join(errors)}"}
                 
                 # Check for top level error
                 if 'error' in err_data:
                     # If it's the JSON string case
                     if isinstance(err_data['error'], str) and 'Access token expired' in err_data['error']:
                         return {"success": False, "error": "LinkedIn connection expired. Please reconnect in Settings."}
                     return {"success": False, "error": f"GetLate Error: {err_data['error']}"}
             except:
                 pass
             return {"success": False, "error": f"GetLate Error: {resp.text}"}
        
        data = resp.json()
        
        # Check if "status" is failed even with 200/201 (some APIs do this)
        # The user's log showed success:false wrapped in failure? 
        # No, the user saw "Error from backend: GetLate Error: ...". This means status_code was NOT 200/201.
        
        external_id = data.get('_id') or data.get('postId') # standardized id
        
        # Update Status
        content_item.status = MarketingContentStatus.PUBLISHED
        content_item.publish_date = datetime.utcnow()
        
        # Store external ID for analytics
        # We can store it in 'performance' dict temporarily or add a column later
        # content_item.external_id = external_id 
        # Using metrics/performance field to store metadata for now
        if not content_item.performance: content_item.performance = {}
        content_item.performance['external_id'] = external_id
        
        db.session.commit()
        
        return {"success": True, "item": content_item.to_dict()}

    except Exception as e:
        print(f"Exception in publish_content: {e}")
        return {"success": False, "error": str(e)}

def simulate_metrics(content_id):
    """
    Fetches real metrics from GetLate API (renaming to fetch_metrics would be better but keeping sig).
    """
    try:
        content_item = MarketingContentItem.query.get(content_id)
        if not content_item:
            return {"success": False, "error": "Content item not found"}
            
        if not content_item.performance or 'external_id' not in content_item.performance:
             return {"success": False, "error": "No external ID found for analytics"}

        external_id = content_item.performance['external_id']
        
        # Get API Key
        from flask import current_app
        api_key = current_app.config.get('GETLATE_API_KEY')
        
        # Call Analytics API
        url = "https://getlate.dev/api/v1/analytics"
        params = {"postId": external_id}
        headers = {"Authorization": f"Bearer {api_key}"}
        
        resp = requests.get(url, headers=headers, params=params)
        
        if resp.status_code == 200:
            data = resp.json()
            # data structure: { analytics: { impressions: ... }, ... }
            analytics = data.get('analytics', {})
            
            # Update metrics
            # Merge with existing performance data (preserving external_id)
            current_perf = dict(content_item.performance)
            current_perf.update(analytics)
            content_item.performance = current_perf
            
            db.session.commit()
            return {"success": True, "item": content_item.to_dict()}
        else:
             return {"success": False, "error": f"Analytics Error: {resp.text}"}

    except Exception as e:
        return {"success": False, "error": str(e)}
