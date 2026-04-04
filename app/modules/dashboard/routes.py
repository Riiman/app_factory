from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Startup, User, TaskStatus, ExperimentStatus, ActivityLog, UserRole, TeamMember
from app import db

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/startups')

def validate_startup_access(startup, user, required_scope=None):
    if not user:
        return False
        
    # Super Admin Check: Org 1 + Admin Role
    if user.organization_id == 1 and user.role == UserRole.ADMIN:
        return True

    if startup.organization_id != user.organization_id:
        return False

    # Owner Check
    if startup.user_id == user.id:
        return True
    
    # Org Admin Check
    if user.role == UserRole.ADMIN:
        return True

    # Team Member Check
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        if required_scope is None:
            return True
        if member.scopes and required_scope in member.scopes:
            return True
            
    return False

@dashboard_bp.route('/<int:startup_id>/dashboard-overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview(startup_id):
    """
    Fetches aggregated data specifically for the Dashboard Landing Page.
    Includes:
    - Monthly Data (for charts)
    - Upcoming Tasks (limit 5)
    - Active Experiments (limit 3)
    - Recent Activity (limit 10)
    - Core progress metrics
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    # 1. Monthly Data (All for charts)
    monthly_data = [d.to_dict() for d in startup.monthly_data]

    # 2. Upcoming Tasks (Limit 5, Not Completed)
    upcoming_tasks = [
        t.to_dict() for t in startup.tasks 
        if t.status != TaskStatus.COMPLETED
    ]
    # Sort by due date if available, else creation? SQL sort preferred but list sort for now
    upcoming_tasks.sort(key=lambda x: x.get('due_date') or '9999-12-31')
    upcoming_tasks = upcoming_tasks[:5]

    # 3. Active Experiments (Limit 3, Running)
    active_experiments = [
        e.to_dict() for e in startup.experiments 
        if e.status == ExperimentStatus.RUNNING
    ][:3]

    # 4. Recent Activity
    activities = ActivityLog.query.filter_by(startup_id=startup_id).order_by(ActivityLog.created_at.desc()).limit(10).all()
    recent_activity = [a.to_dict() for a in activities]

    response_data = {
        'monthly_data': monthly_data,
        'tasks': upcoming_tasks,
        'experiments': active_experiments,
        'activity': recent_activity,
        'next_milestone': startup.next_milestone,
        'overall_progress': startup.overall_progress
    }

    return jsonify({'success': True, 'dashboard_overview': response_data}), 200
