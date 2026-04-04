from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, MarketingCampaignStatus, ActivityLog, Scope, MarketingOverview, TeamMember, MarketingSettings
from app import db
from app.services.notification_service import publish_update

from app.services.execution_service import publish_content, simulate_metrics

marketing_bp = Blueprint('marketing', __name__, url_prefix='/api/startups')

def validate_startup_access(startup, user, required_scope=None):
    if not user: return False
    # Super Admin
    if user.organization_id == 1 and user.role == UserRole.ADMIN: return True
    if startup.organization_id != user.organization_id: return False
    # Owner
    if startup.user_id == user.id: return True
    # Org Admin
    if user.role == UserRole.ADMIN: return True
    # Team Member
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        if required_scope is None: return True
        if member.scopes and required_scope in member.scopes: return True
            
    return False

@marketing_bp.route('/<int:startup_id>/marketing-overview', methods=['GET'])
@jwt_required()
def get_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    marketing_overview = startup.marketing_overview
    if not marketing_overview:
        marketing_overview = MarketingOverview(startup_id=startup_id)
        db.session.add(marketing_overview)
        db.session.commit()
        db.session.refresh(marketing_overview)

    return jsonify({'success': True, 'marketing_overview': marketing_overview.to_dict()}), 200

@marketing_bp.route('/<int:startup_id>/marketing-overview', methods=['PUT'])
@jwt_required()
def update_marketing_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    marketing_overview = startup.marketing_overview
    if not marketing_overview:
        marketing_overview = MarketingOverview(startup_id=startup_id)
        startup.marketing_overview = marketing_overview
        db.session.add(marketing_overview)

    if 'positioning_statement' in data:
        marketing_overview.positioning_statement = data['positioning_statement']
    
    if 'brand_details' in data:
        marketing_overview.brand_details = data['brand_details']

    db.session.commit()

    publish_update("marketing_overview_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Marketing',
        target_id=startup.id,
        details='Updated marketing overview'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'marketing_overview': startup.marketing_overview.to_dict()}), 200

@marketing_bp.route('/<int:startup_id>/campaigns', methods=['GET'])
@jwt_required()
def get_campaigns(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    campaigns = [c.to_dict() for c in startup.marketing_campaigns]
    return jsonify({'success': True, 'campaigns': campaigns}), 200

@marketing_bp.route('/<int:startup_id>/campaigns', methods=['POST'])
@jwt_required()
def create_campaign(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'campaign_name' not in data:
        return jsonify({'success': False, 'error': 'Campaign name is required.'}), 400

    try:
        if 'start_date' in data and data['start_date']:
            data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        else:
            data['start_date'] = None
        if 'end_date' in data and data['end_date']:
            data['end_date'] = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        else:
            data['end_date'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    # Always enable content mode for all campaigns
    data['content_mode'] = True

    new_campaign = MarketingCampaign(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_campaign)
    db.session.commit()
    
    publish_update("campaign_created", {"startup_id": startup_id, "campaign": new_campaign.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='launched',
        target_type='Campaign',
        target_id=new_campaign.campaign_id,
        details=new_campaign.campaign_name
    )
    db.session.add(activity)
    db.session.commit()
    
    if auto_generate_content:
        from app.services.generation_service import generate_campaign_content_calendar
        generate_campaign_content_calendar(startup_id, new_campaign.campaign_id)

    return jsonify({'success': True, 'campaign': new_campaign.to_dict()}), 201

@marketing_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    campaign = MarketingCampaign.query.get_or_404(campaign_id)
    if campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Campaign does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        if key == 'status':
            try:
                campaign.status = MarketingCampaignStatus(value)
            except ValueError:
                pass
        elif key in ['start_date', 'end_date']:
            if value:
                try:
                    if isinstance(value, str):
                        setattr(campaign, key, datetime.strptime(value, '%Y-%m-%d').date())
                except ValueError:
                    pass
            else:
                setattr(campaign, key, None)
        elif key == 'spend' and value is not None:
             setattr(campaign, key, float(value))
        else:
            setattr(campaign, key, value)
            
    db.session.commit()
    
    publish_update("campaign_updated", {"startup_id": startup_id, "campaign": campaign.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='updated',
        target_type='Campaign',
        target_id=campaign.campaign_id,
        details=f"Updated campaign '{campaign.campaign_name}'"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'campaign': campaign.to_dict()}), 200

@marketing_bp.route('/<int:startup_id>/campaigns/<int:campaign_id>/content-items', methods=['POST'])
@jwt_required()
def create_content_item(startup_id, campaign_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Content item title is required.'}), 400

    try:
        if 'publish_date' in data and data['publish_date']:
            data['publish_date'] = datetime.strptime(data['publish_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    campaign = MarketingCampaign.query.get_or_404(campaign_id)

    if campaign.content_mode:
        if not campaign.content_calendars:
            new_calendar = MarketingContentCalendar(campaign_id=campaign.campaign_id, title=f"{campaign.campaign_name} Content Calendar", description=f"Content calendar for {campaign.campaign_name}", owner_id=user_id)
            db.session.add(new_calendar)
            db.session.commit()
            db.session.refresh(new_calendar)
            calendar_id = new_calendar.calendar_id
        else:
            calendar_id = campaign.content_calendars[0].calendar_id
    else:
        return jsonify({'success': False, 'error': 'This campaign is not configured for content management.'}), 400

    new_item = MarketingContentItem(calendar_id=calendar_id, created_by=user_id, **data)
    db.session.add(new_item)
    db.session.commit()
    
    publish_update("content_item_created", {"startup_id": startup_id, "campaign_id": campaign_id, "item": new_item.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'message': 'Content item created successfully.', 'item': new_item.to_dict()}), 201
    return jsonify({'success': True, 'message': 'Content item created successfully.', 'item': new_item.to_dict()}), 201

@marketing_bp.route('/<int:startup_id>/content-items/<int:content_id>', methods=['PUT'])
@jwt_required()
def update_content_item(startup_id, content_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    item = MarketingContentItem.query.get_or_404(content_id)
    # Check if item belongs to a calendar that belongs to a campaign of this startup
    if item.calendar.campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Content item does not belong to this startup.'}), 400

    data = request.get_json() or {}
    
    if 'title' in data:
        item.title = data['title']
    if 'content_type' in data:
        item.content_type = data['content_type']
    if 'channel' in data:
        item.channel = data['channel']
    if 'content_body' in data:
        item.content_body = data['content_body']
    if 'publish_date' in data:
        try:
            item.publish_date = datetime.strptime(data['publish_date'], '%Y-%m-%d').date()
        except ValueError:
            pass 
    if 'status' in data:
        item.status = data['status']
    if 'content_brief' in data:
        item.content_brief = data['content_brief']

    db.session.commit()
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='updated',
        target_type='Content',
        target_id=item.id,
        details=f"Updated content '{item.title}'"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Content item updated.', 'content_item': item.to_dict()}), 200

@marketing_bp.route('/<int:startup_id>/content-items/<int:content_id>', methods=['DELETE'])
@jwt_required()
def delete_content_item(startup_id, content_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    item = MarketingContentItem.query.get_or_404(content_id)
    if item.calendar.campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Content item does not belong to this startup.'}), 400

    db.session.delete(item)
    db.session.commit()
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='deleted',
        target_type='Content',
        target_id=content_id,
        details=f"Deleted content item '{item.title}'"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Content item deleted.'}), 200

@marketing_bp.route('/<int:startup_id>/marketing/quick-create', methods=['POST'])
@jwt_required()
def quick_create_content(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'topic' not in data or 'channel' not in data:
        return jsonify({'success': False, 'error': 'Topic and Channel are required.'}), 400

    # Execute Ad-Hoc Generation
    from app.services.generation_service import generate_ad_hoc_content
    content_item_dict = generate_ad_hoc_content(
        startup_id=startup.id,
        topic=data.get('topic'),
        channel=data.get('channel'),
        content_type=data.get('content_type', 'text_only')
    )

    if content_item_dict:
        return jsonify({'success': True, 'item': content_item_dict}), 201
    else:
        return jsonify({'success': False, 'error': 'Failed to generate content.'}), 500

@marketing_bp.route('/<int:startup_id>/content-items/<int:content_id>/publish', methods=['POST'])
@jwt_required()
def publish_content_item(startup_id, content_id):
    result = publish_content(content_id)
    if result['success']:
        return jsonify({'success': True, 'item': result['item']}), 200
    else:
        return jsonify({'success': False, 'error': result['error']}), 500

@marketing_bp.route('/<int:startup_id>/content-items/<int:content_id>/refresh-metrics', methods=['POST'])
@jwt_required()
def refresh_content_metrics(startup_id, content_id):
    # 1. Simulate/Fetch Item Metrics
    result = simulate_metrics(content_id)
    if not result['success']:
        return jsonify({'success': False, 'error': result['error']}), 500

    # 2. Aggregation: Update Campaign Metrics
    try:
        content_item = MarketingContentItem.query.get(content_id)
        if content_item and content_item.calendar and content_item.calendar.campaign:
            update_campaign_metrics(content_item.calendar.campaign.campaign_id)
    except Exception as e:
        print(f"Failed to auto-aggregate metrics: {e}")
        # non-blocking error for the user response
    
    return jsonify({'success': True, 'item': result['item']}), 200

def update_campaign_metrics(campaign_id):
    """
    Helper to recalculate campaign-level metrics by summing up content items.
    """
    campaign = MarketingCampaign.query.get(campaign_id)
    if not campaign: return

    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    # Spend might be manually set OR calculated. For now, let's assume manual spend tracking 
    # unless we have per-post spend. Let's ONLY aggregate performance stats.
    
    if campaign.content_calendars:
        for calendar in campaign.content_calendars:
            for item in calendar.content_items:
                if item.performance:
                    # GetLate/Mock analytics structure:
                    # { 'impressions': 123, 'likes': 10, 'clicks': 5 ... }
                    # We map 'likes' + 'clicks' etc. loosely or just use direct fields if available
                    
                    # Safe retrieval with defaults
                    imps = item.performance.get('impressions', 0)
                    # normalize strings if API returns them
                    if isinstance(imps, str): 
                        try: imps = int(imps.replace(',', ''))
                        except: imps = 0
                    
                    total_impressions += int(imps)
                    
                    # Clicks
                    clicks = item.performance.get('clicks', 0)
                    if isinstance(clicks, str):
                        try: clicks = int(clicks.replace(',', ''))
                        except: clicks = 0
                    total_clicks += int(clicks)

                    # Conversions (if available)
                    convs = item.performance.get('conversions', 0)
                    if isinstance(convs, str):
                        try: convs = int(convs.replace(',', ''))
                        except: convs = 0
                    total_conversions += int(convs)

    campaign.impressions = total_impressions
    campaign.clicks = total_clicks
    campaign.conversions = total_conversions
    
    db.session.commit()

@marketing_bp.route('/<int:startup_id>/marketing/recalculate-metrics', methods=['POST'])
@jwt_required()
def recalculate_all_metrics(startup_id):
    """
    Utility endpoint to force recalculation of metrics for all campaigns in the startup.
    Useful for migrating old data or fixing discrepancies.
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    count = 0
    for campaign in startup.marketing_campaigns:
        update_campaign_metrics(campaign.campaign_id)
        count += 1
        
    return jsonify({'success': True, 'message': f'Recalculated metrics for {count} campaigns.'}), 200

@marketing_bp.route('/<int:startup_id>/settings', methods=['GET'])
@jwt_required()
def get_marketing_settings(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    settings = MarketingSettings.query.filter_by(startup_id=startup_id).all()
    return jsonify({'success': True, 'settings': [s.to_dict() for s in settings]}), 200

@marketing_bp.route('/<int:startup_id>/settings', methods=['POST'])
@jwt_required()
def update_marketing_settings(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'provider' not in data:
        return jsonify({'success': False, 'error': 'Provider is required.'}), 400

    provider = data['provider']
    setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider=provider).first()
    
    if not setting:
        setting = MarketingSettings(startup_id=startup_id, provider=provider)
        db.session.add(setting)

    if 'credentials' in data:
        setting.credentials = data['credentials']
    if 'is_active' in data:
        setting.is_active = data['is_active']
        
    db.session.commit()
    
    return jsonify({'success': True, 'setting': setting.to_dict()}), 200
@marketing_bp.route('/<int:startup_id>/marketing/<provider>/connect', methods=['GET'])
@jwt_required()
def initiate_connection(startup_id, provider):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    from flask import current_app
    import requests
    
    backend_url = current_app.config.get('BACKEND_URL') or request.host_url.rstrip('/')
    redirect_url = f"{backend_url}/api/startups/{startup_id}/marketing/callback/generic"
    api_key = current_app.config.get('GETLATE_API_KEY')
    
    if not api_key:
         return jsonify({'success': False, 'error': 'Server configuration error: Missing GetLate API Key'}), 500

    # 1. Ensure Profile Exists
    # Check if we have a stored profile ID
    profile_setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider='getlate_profile').first()
    
    profile_id = None
    if profile_setting and profile_setting.credentials and profile_setting.credentials.get('id'):
        profile_id = profile_setting.credentials['id']
    else:
        # Create Profile
        try:
            profile_url = "https://getlate.dev/api/v1/profiles"
            payload = {
                "internalId": f"startup_{startup_id}",
                "name": startup.name or f"Startup {startup_id}"
            }
            p_resp = requests.post(profile_url, headers={'Authorization': f'Bearer {api_key}'}, json=payload)
            
            if p_resp.status_code in [200, 201]:
                p_data = p_resp.json()
                profile_id = p_data.get('id')
                if not profile_id: profile_id = p_data.get('profile', {}).get('_id')
            elif (p_resp.status_code in [400, 409, 500] and "exists" in p_resp.text) or "exists" in p_resp.text:
                 # Profile exists. Attempt to fetch it by internalId
                 # Assuming GET /profiles?internalId=... works or we filter list
                 # Or just try to get by internalId query if API supports it.
                 # If API doesn't support direct lookup, we might need to list all.
                 # Let's try List Profiles with query
                 list_url = f"https://getlate.dev/api/v1/profiles?internalId=startup_{startup_id}"
                 l_resp = requests.get(list_url, headers={'Authorization': f'Bearer {api_key}'})
                 
                 found = False
                 if l_resp.status_code == 200:
                     data = l_resp.json()
                     profiles = []
                     
                     # Case 1: Wrapped list
                     if isinstance(data, dict) and 'profiles' in data:
                         profiles = data['profiles']
                     # Case 2: Direct list
                     elif isinstance(data, list):
                         profiles = data
                     # Case 3: Single Object (Direct match)
                     elif isinstance(data, dict) and (data.get('internalId') == f"startup_{startup_id}" or data.get('id')):
                          profiles = [data]
                     
                     print(f"DEBUG: Recovering profile, received: {data}")

                     for p in profiles:
                         # Relaxed check: if we queried by internalId, any result is likely it.
                         # But let's verify if 'internalId' key exists
                         p_internal = p.get('internalId')
                         if p_internal == f"startup_{startup_id}" or (not p_internal and len(profiles) == 1):
                             profile_id = p.get('id') or p.get('_id')
                             found = True
                             break
                 
                 if not found:
                     print(f"DEBUG: Failed to recover. Response: {l_resp.text}")
                     return jsonify({'success': False, 'error': f"Profile exists but recovery failed. Debug: {l_resp.text[:100]}"}), 500
            else:
                return jsonify({'success': False, 'error': f"Failed to create GetLate Profile: {p_resp.text}"}), 500

            # Store it (Common block for created or recovered)
            if profile_id:
                if not profile_setting:
                    profile_setting = MarketingSettings(startup_id=startup_id, provider='getlate_profile')
                    db.session.add(profile_setting)
                
                profile_setting.credentials = {'id': profile_id, 'internalId': f"startup_{startup_id}"}
                profile_setting.is_active = True
                
                from sqlalchemy.orm.attributes import flag_modified
                if profile_setting.credentials: flag_modified(profile_setting, "credentials")

                db.session.commit()
                
        except Exception as e:
             return jsonify({'success': False, 'error': f"Profile creation connection failed: {str(e)}"}), 500

    if not profile_id:
         return jsonify({'success': False, 'error': 'Could not obtain Profile ID'}), 500

    # 2. Initiate Connect
    base_url = f"https://getlate.dev/api/v1/connect/{provider}"
    params = {
        'headless': 'true',
        'redirect_url': redirect_url,
        'profileId': profile_id
    }
    
    try:
        # Use params to ensuring correct encoding
        resp = requests.get(base_url, headers={'Authorization': f'Bearer {api_key}'}, params=params, allow_redirects=False)
        
        if resp.status_code in [301, 302, 303, 307, 308]:
            target_url = resp.headers.get('Location')
            return jsonify({'success': True, 'auth_url': target_url}), 200
        elif resp.status_code == 200:
             try:
                 data = resp.json()
                 if 'authUrl' in data: return jsonify({'success': True, 'auth_url': data['authUrl']}), 200
                 if 'url' in data: return jsonify({'success': True, 'auth_url': data['url']}), 200
             except:
                 pass
             return jsonify({'success': False, 'error': f"Unexpected response from GetLate: {resp.status_code}"}), 502
        else:
            return jsonify({'success': False, 'error': f"GetLate Connect Error: {resp.text}"}), resp.status_code
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@marketing_bp.route('/<int:startup_id>/marketing/callback/generic', methods=['GET'])
def generic_callback(startup_id):
    connect_token = request.args.get('connect_token')
    platform = request.args.get('platform')
    
    from flask import current_app, redirect
    frontend_url = current_app.config.get('FRONTEND_URL') or 'http://localhost:3000'

    # Updated to match DashboardPage deep linking support
    # /dashboard?scope=MARKETING&tab=Settings
    
    if not connect_token:
         # If connect_token is missing, we still want to redirect to the dashboard with an error status
         # and forward any other relevant params.
         import urllib.parse
         final_params = request.args.to_dict()
         final_params['scope'] = 'MARKETING'
         final_params['tab'] = 'Settings'
         final_params['status'] = 'error'
         final_params['message'] = 'Missing Connect Token'
         redirect_url = f"{frontend_url}/dashboard?{urllib.parse.urlencode(final_params)}"
         return redirect(redirect_url)

    # Forward ALL query params to frontend (to preserve orgIds, etc.)
    import urllib.parse
    params = request.args.to_dict()
    
    # We already have scope/tab in base, so we join carefully
    # Let's reconstruct cleanly
    final_params = params.copy()
    final_params['scope'] = 'MARKETING'
    final_params['tab'] = 'Settings'
    # We MUST trigger selection flow for Headless mode
    final_params['status'] = 'requires_selection'
    
    # Map platform -> provider if distinct, or ensure provider key exists
    if platform and 'provider' not in final_params:
        final_params['provider'] = platform
    
    # CRITICAL: Inject existing Profile ID if present, to ensure we Reconnect/Refresh 
    # the SAME profile instead of creating a new one.
    profile_setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider='getlate_profile').first()
    if profile_setting and profile_setting.credentials and 'id' in profile_setting.credentials:
        final_params['profileId'] = profile_setting.credentials['id']
    
    redirect_url = f"{frontend_url}/dashboard?{urllib.parse.urlencode(final_params)}"

    return redirect(redirect_url)

@marketing_bp.route('/<int:startup_id>/marketing/<provider>/list-entities', methods=['POST'])
@jwt_required()
def list_entities(startup_id, provider):
    data = request.json

    connect_token = data.get('connect_token') # This is the tempToken
    # Check for other params forwarded from callback
    org_ids = data.get('orgIds') 
    
    # Fallback: if frontend sent raw organizations string but no orgIds
    if not org_ids and data.get('organizations'):
        try:
            import json
            from urllib.parse import unquote
            
            orgs_raw = data.get('organizations')
            # Decode if it looks URL encoded (starting with %)
            if isinstance(orgs_raw, str):
                if orgs_raw.startswith('%'):
                    orgs_raw = unquote(orgs_raw)
                
            # It might be a list or a string representation
            if isinstance(orgs_raw, str):
                orgs_list = json.loads(orgs_raw)
            else:
                orgs_list = orgs_raw
                
            if isinstance(orgs_list, list):
                # Extract IDs
                ids = [str(o.get('id') or o.get('urn', '')).split(':').pop() for o in orgs_list if o]
                org_ids = ",".join(filter(None, ids))
        except Exception as e:
            print(f"Failed to parse organizations in backend: {e}")

    from flask import current_app
    api_key = current_app.config.get('GETLATE_API_KEY')
    
    if not connect_token:
        return jsonify({'success': False, 'error': 'Missing connect_token'}), 400
        
    getlate_endpoint = ""
    if provider == 'linkedin':
        getlate_endpoint = "https://getlate.dev/api/v1/connect/linkedin/organizations"
    elif provider == 'facebook':
        getlate_endpoint = "https://getlate.dev/api/v1/connect/facebook/select-page"
    
    if not getlate_endpoint:
         return jsonify({'success': False, 'error': 'Unsupported provider'}), 400
         
    import requests
    # Include API Key for Auth
    headers = {
        'Authorization': f'Bearer {api_key}'
    }
    
    # Pass tempToken as query param as per docs
    params = {'tempToken': connect_token}
    if org_ids:
        params['orgIds'] = org_ids
        
    # Also pass profileId if we have it
    profile_setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider='getlate_profile').first()
    if profile_setting and profile_setting.credentials and 'id' in profile_setting.credentials:
        params['profileId'] = profile_setting.credentials['id']
    
    try:
        resp = requests.get(getlate_endpoint, headers=headers, params=params)
        if resp.status_code != 200:
             print(f"GETLATE ERROR ({resp.status_code}): {resp.text}")
             return jsonify({'success': False, 'error': f"GetLate Error: {resp.text}"}), resp.status_code
        
        resp_data = resp.json()
        return jsonify({'success': True, 'data': resp_data}), 200
    except Exception as e:
        print(f"SERVER ERROR: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@marketing_bp.route('/<int:startup_id>/marketing/<provider>/finalize', methods=['POST'])
@jwt_required()
def finalize_connection(startup_id, provider):
    data = request.json
    connect_token = data.get('connect_token')
    selected_id = data.get('selected_id') 
    selected_name = data.get('selected_name')
    
    from flask import current_app
    api_key = current_app.config.get('GETLATE_API_KEY')
    
    getlate_base = "https://getlate.dev/api/v1/connect"
    payload = {}
    url = ""
    
    if provider == 'linkedin':
        url = f"{getlate_base}/linkedin/select-organization"
        # Common fields required by GetLate for this endpoint
        payload = {
            "tempToken": connect_token,
            "profileId": data.get('profileId'),
        }
        if data.get('userProfile'):
            payload['userProfile'] = data.get('userProfile')
        
        # CRITICAL: Include refreshToken so GetLate can refresh expired access tokens
        if data.get('refreshToken'):
            payload['refreshToken'] = data.get('refreshToken')
            
        if selected_id == 'personal':
            payload["accountType"] = "personal"
        else:
            payload["accountType"] = "organization"
            payload["selectedOrganization"] = {
                "urn": selected_id,
                "name": selected_name
            }
    elif provider == 'facebook':
         url = f"{getlate_base}/facebook/select-page"
         payload = {"pageId": selected_id, "pageName": selected_name}
            
    import requests
    headers = {
        'X-Connect-Token': connect_token, 
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    try:
        resp = requests.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            return jsonify({'success': False, 'error': f"Failed to finalize: {resp.text}"}), 400
            
        result = resp.json()
        getlate_profile_id = result.get('id') or result.get('profileId')
        
        setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider=provider).first()
        if not setting:
            setting = MarketingSettings(startup_id=startup_id, provider=provider)
            db.session.add(setting)
            
        setting.is_active = True
        creds = {} # Clear old legacy keys
        creds['getlate_profile_id'] = getlate_profile_id
        creds['provider_entity_id'] = selected_id
        creds['provider_entity_name'] = selected_name
        
        setting.credentials = creds
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(setting, "credentials")
        
        # ALSO update the main 'getlate_profile' setting to ensure execution service uses the correct ID
        main_profile_setting = MarketingSettings.query.filter_by(startup_id=startup_id, provider='getlate_profile').first()
        if main_profile_setting:
            mp_creds = dict(main_profile_setting.credentials or {})
            # Only update if we received a valid ID and it's different
            if getlate_profile_id and mp_creds.get('id') != getlate_profile_id:
                mp_creds['id'] = getlate_profile_id
                main_profile_setting.credentials = mp_creds
                flag_modified(main_profile_setting, "credentials")
        
        db.session.commit()
        
        return jsonify({'success': True, 'profile_id': getlate_profile_id}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
