from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, MarketingCampaignStatus, ActivityLog, Scope, MarketingOverview, TeamMember, MarketingSettings
from app import db
from app.services.notification_service import publish_update
from app.services.generation_service import generate_ad_hoc_content
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
    result = simulate_metrics(content_id)
    if result['success']:
        return jsonify({'success': True, 'item': result['item']}), 200
    else:
        return jsonify({'success': False, 'error': result['error']}), 500

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
