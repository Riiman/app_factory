from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, BusinessMonthlyData, BusinessOverview, ActivityLog, DashboardNotification, TeamMember
from app import db
from app.services.notification_service import publish_update

business_bp = Blueprint('business', __name__, url_prefix='/api/startups')

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

@business_bp.route('/<int:startup_id>/monthly-reports', methods=['GET'])
@jwt_required()
def get_monthly_reports(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='BUSINESS'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    reports = [r.to_dict() for r in startup.monthly_data]
    return jsonify({'success': True, 'reports': reports}), 200

@business_bp.route('/<int:startup_id>/monthly-reports', methods=['POST'])
@jwt_required()
def create_monthly_report(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='BUSINESS'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'month_start' not in data:
        return jsonify({'success': False, 'error': 'Month start date is required.'}), 400
    
    try:
        data['month_start'] = datetime.strptime(data['month_start'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format for month_start. Expected YYYY-MM-DD.'}), 400

    new_report = BusinessMonthlyData(startup_id=startup_id, created_by=user_id, **data)
    db.session.add(new_report)
    db.session.commit()
    
    publish_update("monthly_report_created", {"startup_id": startup_id, "report": new_report.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='submitted',
        target_type='Report',
        target_id=new_report.record_id,
        details=f"Report for {data.get('month', 'unknown')}"
    )
    db.session.add(activity)
    
    notification = DashboardNotification(
        user_id=1, # Admin
        title='Monthly Report Submitted',
        message=f"Startup {startup.name} has submitted a monthly report.",
        type='info'
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({'success': True, 'report': new_report.to_dict()}), 201

@business_bp.route('/<int:startup_id>/business-overview', methods=['GET'])
@jwt_required()
def get_business_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='BUSINESS'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    business_overview = startup.business_overview or BusinessOverview(startup_id=startup_id)
    if not startup.business_overview:
        db.session.add(business_overview)
        db.session.commit() # Save empty one so ID exists? Or just return dict

    return jsonify({'success': True, 'business_overview': business_overview.to_dict()}), 200

@business_bp.route('/<int:startup_id>/business-overview', methods=['PUT'])
@jwt_required()
def update_business_overview(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='BUSINESS'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    business_overview = startup.business_overview
    if not business_overview:
        business_overview = BusinessOverview(startup_id=startup_id)
        startup.business_overview = business_overview
        db.session.add(business_overview)

    business_overview.business_model = data.get('business_model', business_overview.business_model)
    business_overview.key_partners = data.get('key_partners', business_overview.key_partners)
    business_overview.notes = data.get('notes', business_overview.notes)
    
    db.session.commit()
    
    publish_update("business_overview_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Business',
        target_id=startup.id,
        details='Updated business overview'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'business_overview': business_overview.to_dict()}), 200
