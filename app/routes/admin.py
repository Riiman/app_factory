from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models import Submission, Startup, User, Founder, StartupStage, SubmissionStatus, EvaluationTask, ScopeDocument, ScopeComment, Contract, ContractSignatory, UserRole, ScopeStatus, ContractStatus, StartupSnapshot
from app.utils.decorators import admin_required
from flask_jwt_extended import get_jwt_identity
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
import re
from datetime import datetime
import json
from app.services.analyzer_service import run_analysis
from app.services.document_generator_service import generate_scope_document
from app.tasks import analyze_submission_task, generate_scope_document_task
from app.models import Product, Feature, ActivityLog
from app.services.notification_service import publish_update
from app.email_utils import send_submission_status_email


print("--- DEBUG: Importing admin.py ---")


def validate_admin_access(entity, user):
    """
    Checks if the admin user has access to the given entity (Startup, Submission, User).
    Super Admins (Org 1) have global access.
    """
    if not user or not entity:
        return False
        
    # Super Admin
    if user.organization_id == 1:
        return True
        
    # Check Organization Match
    # Entity can be Startup, Submission, or User - all have organization_id
    if hasattr(entity, 'organization_id'):
        if entity.organization_id != user.organization_id:
            return False
            
    # For Startup, we might want to double check logic, but org match is key for Admin.
    return True

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/submissions', methods=['GET'])
@admin_required
def get_all_submissions():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = Submission.query.filter(
        Submission.status.notin_([SubmissionStatus.DRAFT, SubmissionStatus.FINALIZE_SUBMISSION])
    )
    
    # Filter by Org unless Super Admin (Org ID 1)
    if user.organization_id != 1:
        query = query.filter(Submission.organization_id == user.organization_id)
        
    submissions = query.all()
    print(f"--- DEBUG: Found {len(submissions)} submissions in get_all_submissions ---")
    return jsonify({'success': True, 'submissions': [s.to_dict() for s in submissions]}), 200

@admin_bp.route('/startups', methods=['GET'])
@admin_required
def get_all_startups():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    query = Startup.query.options(joinedload(Startup.submission))
    
    # Filter by Org unless Super Admin (Org ID 1)
    if user.organization_id != 1:
        query = query.filter(Startup.organization_id == user.organization_id)
        
    startups = query.all()
    return jsonify({'success': True, 'startups': [s.to_dict(include_relations=True) for s in startups]}), 200

@admin_bp.route('/startups/<int:startup_id>', methods=['GET'])
@admin_required
def get_startup_detail(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403
        
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=True)}), 200

@admin_bp.route('/startups/<int:startup_id>/stage', methods=['PUT'])
@admin_required
def update_startup_stage(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403

    data = request.get_json()
    new_stage_str = data.get('current_stage')

    if not new_stage_str:
        return jsonify({'success': False, 'error': 'New stage is required'}), 400

    try:
        new_stage = StartupStage[new_stage_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid stage: {new_stage_str}'}), 400

    startup.current_stage = new_stage
    db.session.commit()
    
    publish_update("startup_stage_updated", {"startup_id": startup.id, "new_stage": new_stage.value}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=False)}), 200

@admin_bp.route('/submissions/<int:submission_id>/status', methods=['PUT'])
@admin_required
def update_submission_status(submission_id):
    submission = Submission.query.get_or_404(submission_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(submission, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to submission.'}), 403

    data = request.get_json()
    new_status_str = data.get('status')

    if not new_status_str:
        return jsonify({'success': False, 'error': 'New status is required'}), 400

    try:
        new_status = SubmissionStatus[new_status_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid status: {new_status_str}'}), 400

    # If submission is moved to review, trigger the analysis task
    if new_status == SubmissionStatus.IN_REVIEW:
        # ASYNC: Use Celery task
        # Do not set status to IN_REVIEW yet. The task will do it when analysis is complete.
        # However, we need to know that analysis is triggered. 
        # For now, we will NOT update the status here if it is IN_REVIEW.
        pass
    else:
        submission.status = new_status
    
    # Trigger analysis if the *requested* status was IN_REVIEW
    if new_status == SubmissionStatus.IN_REVIEW:
         analyze_submission_task.delay(submission.id)
         
         # Synchronously notify admin that analysis is queued/started to prevent UI flicker
         publish_update("analysis_started", 
                        {
                            "submission_id": submission.id, 
                            "message": "Analysis queued..."
                        }, 
                        rooms=["admin"])

         # Optionally, return a specialized message
         return jsonify({'success': True, 'message': 'Analysis started. Status will update to IN_REVIEW upon completion.', 'submission': submission.to_dict()}), 200

    # If submission is approved, create a startup entry and trigger scope document generation
    if new_status == SubmissionStatus.APPROVED:
        print(f"--- DEBUG: Checking if submission {submission.id} has a startup: {submission.startup} ---")
        
        # Check if already generating
        if submission.startup and submission.startup.is_generating_scope:
             return jsonify({'success': False, 'error': 'Scope generation is already in progress.'}), 400

        if not submission.startup:
            base_slug = re.sub(r'[^a-z0-9-]', '', submission.startup_name.lower().replace(' ', '-'))
            slug = base_slug
            counter = 1
            while Startup.query.filter_by(slug=slug).first():
                slug = f"{base_slug}-{counter}"
                counter += 1

            # Create Startup
            startup = Startup(
                user_id=submission.user_id,
                organization_id=submission.organization_id,
                submission_id=submission.id,
                name=submission.startup_name,
                slug=slug,
                current_stage=StartupStage.EVALUATION.value,
                is_generating_scope=True # Set flag immediately
            )
            db.session.add(startup)
            db.session.flush() # Flush to get startup.id

            # Create a Founder record for the submitting user
            submitting_user = User.query.get(submission.user_id)
            if submitting_user:
                founder = Founder(
                    startup_id=startup.id,
                    name=submitting_user.full_name,
                    email=submitting_user.email,
                    role="Founder" # Default role, can be updated later
                )
                db.session.add(founder)

            # Create initial Contract
            contract = Contract(
                startup_id=startup.id,
                title=f"Incubator Agreement for {startup.name}",
                document_url="#", # Placeholder for actual document link
                status=ContractStatus.DRAFT.name # Convert Enum to string
            )
            db.session.add(contract)
        
        else:
            # Startup exists (maybe from a retry), just reset flag
            startup = submission.startup
            startup.is_generating_scope = True
            
        try:
            db.session.commit()
            
            # ASYNC: Use Celery task
            generate_scope_document_task.delay(startup.id)

            # Notify admins that generation started (so they see the spinner)
            publish_update("submission_status_updated", {
                "submission_id": submission.id, 
                "new_status": submission.status.value, 
                "startup_id": startup.id,
                "is_generating_scope": True,
                "startup": startup.to_dict() # Include full startup object for frontend cache
            }, rooms=["admin"])

            return jsonify({'success': True, 'message': 'Scope generation started. Status will update upon completion.', 'submission': submission.to_dict()}), 200
            
        except IntegrityError:
            db.session.rollback()
            return jsonify({'success': False, 'error': 'Database error during startup creation.'}), 500

    # For other statuses (REJECTED, etc.), update immediately as before
    submission.status = new_status
    db.session.commit()

    publish_update("submission_status_updated", {"submission_id": submission.id, "new_status": new_status.value, "startup_id": submission.startup.id if submission.startup else None}, rooms=["admin", f"user_{submission.user_id}"])
    
    # Send status update email
    user = User.query.get(submission.user_id)
    if user:
        send_submission_status_email(user.email, submission.startup_name, new_status.name)
        
    return jsonify({'success': True, 'submission': submission.to_dict()}), 200
    
    @admin_bp.route('/submissions/<int:submission_id>/tasks', methods=['POST'])
    @admin_required
    def create_evaluation_task(submission_id):
        submission = Submission.query.get_or_404(submission_id)
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not validate_admin_access(submission, user):
             return jsonify({'success': False, 'error': 'Unauthorized access to submission.'}), 403

        data = request.get_json()
    
        title = data.get('title')
        description = data.get('description')
        due_date_str = data.get('due_date')
    
        if not title:
            return jsonify({'success': False, 'error': 'Task title is required'}), 400
    
        due_date = datetime.fromisoformat(due_date_str) if due_date_str else None
    
        task = EvaluationTask(
            submission_id=submission.id,
            title=title,
            description=description,
            due_date=due_date
        )
        db.session.add(task)
        db.session.commit()
        
        publish_update("evaluation_task_created", {"submission_id": submission.id, "task": task.to_dict()}, rooms=["admin", f"user_{submission.user_id}"])
    
        return jsonify({'success': True, 'task': task.to_dict()}), 201

print("--- DEBUG: Defining get_all_users route ---")
@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    query = User.query
    
    # Filter by Org unless Super Admin (Org ID 1)
    if user.organization_id != 1:
        query = query.filter(User.organization_id == user.organization_id)
        
    users = query.all()
    return jsonify({'success': True, 'users': [u.to_dict() for u in users]}), 200

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(target_user_id):
    target_user = User.query.get_or_404(target_user_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(target_user, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to user.'}), 403

    data = request.get_json()
    new_role_str = data.get('role')

    if not new_role_str:
        return jsonify({'success': False, 'error': 'New role is required'}), 400

    try:
        new_role = UserRole[new_role_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid role: {new_role_str}'}), 400

    user.role = new_role
    db.session.commit()
    
    publish_update("user_role_updated", {"user_id": user.id, "new_role": new_role.value}, rooms=["admin", f"user_{user.id}"])
    
    return jsonify({'success': True, 'user': user.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/scope', methods=['PUT'])
@admin_required
def update_scope_document(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403

    if not startup.scope_document:
        return jsonify({'success': False, 'error': 'Scope document not found for this startup'}), 404
    
    data = request.get_json()
    startup.scope_document.product_scope = data.get('productScope', startup.scope_document.product_scope)
    startup.scope_document.gtm_scope = data.get('gtmScope', startup.scope_document.gtm_scope)
    
    db.session.commit()
    
    publish_update("scope_document_updated", {"startup_id": startup.id, "scope_document": startup.scope_document.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'scope_document': startup.scope_document.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/scope/comments', methods=['POST'])
@admin_required
def add_scope_comment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403

    if not startup.scope_document:
        return jsonify({'success': False, 'error': 'Scope document not found for this startup'}), 404

    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({'success': False, 'error': 'Comment text is required'}), 400

    admin_user_id = session.get('user_id')
    
    comment = ScopeComment(
        document_id=startup.scope_document.id,
        user_id=admin_user_id,
        text=text
    )
    db.session.add(comment)
    db.session.commit()
    
    publish_update("scope_comment_added", {"startup_id": startup.id, "comment": comment.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'comment': comment.to_dict()}), 201

@admin_bp.route('/startups/<int:startup_id>/contract', methods=['PUT'])
@admin_required
def update_contract(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403

    if not startup.contract:
        return jsonify({'success': False, 'error': 'Contract not found for this startup'}), 404

    data = request.get_json()
    
    startup.contract.document_url = data.get('documentUrl', startup.contract.document_url)
    
    new_status_str = data.get('status')
    if new_status_str:
        try:
            new_status = ContractStatus[new_status_str.upper()]
            startup.contract.status = new_status
            if new_status == ContractStatus.SENT and not startup.contract.sent_at:
                startup.contract.sent_at = datetime.utcnow()
            elif new_status == ContractStatus.SIGNED and not startup.contract.signed_at:
                startup.contract.signed_at = datetime.utcnow()
        except KeyError:
            return jsonify({'success': False, 'error': f'Invalid contract status: {new_status_str}'}), 400

    db.session.commit()
    
    publish_update("contract_updated", {"startup_id": startup.id, "contract": startup.contract.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'contract': startup.contract.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/contract/comments', methods=['POST'])
@admin_required
def add_contract_comment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not validate_admin_access(startup, user):
         return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403

    if not startup.contract:
        return jsonify({'success': False, 'error': 'Contract not found for this startup'}), 404

    data = request.get_json()
    text = data.get('text')
    if not text:
        return jsonify({'success': False, 'error': 'Comment text is required'}), 400

    admin_user_id = session.get('user_id')
    
    # Ensure ContractComment is imported or available
    from app.models import ContractComment

    comment = ContractComment(
        contract_id=startup.contract.id,
        user_id=admin_user_id,
        text=text
    )
    db.session.add(comment)
    db.session.commit()
    
    publish_update("contract_comment_added", {"startup_id": startup.id, "comment": comment.to_dict()}, rooms=["admin", f"user_{startup.user_id}"])
    
    return jsonify({'success': True, 'comment': comment.to_dict()}), 201



@admin_bp.route('/activity', methods=['GET'])
@admin_required
def get_recent_activity():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    query = db.session.query(ActivityLog).outerjoin(Startup, ActivityLog.startup_id == Startup.id)

    # Filter by Org unless Super Admin (Org ID 1)
    if user.organization_id != 1:
        # Filter where Startup belongs to user's org OR (startup_id is null AND user_id belongs to org?? - simpler to just rely on startup linkage for now)
        # To be robust:
        # Activities on Startups in my Org
        query = query.filter(Startup.organization_id == user.organization_id)
        
    activities = query.order_by(ActivityLog.created_at.desc()).limit(50).all()
    return jsonify({'success': True, 'activity': [a.to_dict() for a in activities]}), 200

@admin_bp.route('/activity', methods=['POST'])
@admin_required
def create_activity():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['user_id', 'action', 'target_type']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

    activity = ActivityLog(
        user_id=data['user_id'],
        startup_id=data.get('startup_id'),
        action=data['action'],
        target_type=data['target_type'],
        target_id=data.get('target_id'),
        details=data.get('details')
    )
    
    db.session.add(activity)
    db.session.commit()
    
    # Activity logs are generally for admins, but if it relates to a startup, the user might want to know?
    # The current implementation seems to be admin-focused.
    # Let's publish to admin room.
    publish_update("activity_created", {"activity": activity.to_dict()}, rooms=["admin"])
    
    return jsonify({'success': True, 'activity': activity.to_dict()}), 201


# ============================================================================
# ADMIN ANALYTICS ENDPOINTS
# New endpoints for admin dashboard analytics - DO NOT modify user endpoints
# ============================================================================

from app.services.admin_analytics_service import (
    calculate_portfolio_metrics,
    get_startup_rankings,
    get_organization_alerts
)

@admin_bp.route('/analytics/portfolio-summary', methods=['GET'])
@admin_required
def get_portfolio_summary():
    """
    Get aggregated portfolio metrics for all startups in the admin's organization.
    Super Admin (Org ID 1) sees all organizations.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Determine which organization to query
    org_id = None if user.organization_id == 1 else user.organization_id
    
    try:
        metrics = calculate_portfolio_metrics(org_id)
        return jsonify({'success': True, 'data': metrics}), 200
    except Exception as e:
        print(f"Error calculating portfolio metrics: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/analytics/startup-rankings', methods=['GET'])
@admin_required
def get_rankings():
    """
    Get startup rankings by specified metric.
    Query params:
    - metric: 'revenue', 'customers', 'mrr', 'burn' (default: 'revenue')
    - limit: number of results (default: 10)
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Get query parameters
    metric = request.args.get('metric', 'revenue')
    limit = int(request.args.get('limit', 10))
    
    # Determine which organization to query
    org_id = None if user.organization_id == 1 else user.organization_id
    
    try:
        rankings = get_startup_rankings(org_id, metric=metric, limit=limit)
        return jsonify({'success': True, 'data': rankings}), 200
    except Exception as e:
        print(f"Error getting startup rankings: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/analytics/organization-alerts', methods=['GET'])
@admin_required
def get_org_alerts():
    """
    Get all critical alerts across the organization.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    # Determine which organization to query
    org_id = None if user.organization_id == 1 else user.organization_id
    
    try:
        alerts = get_organization_alerts(org_id)
        return jsonify({'success': True, 'data': alerts}), 200
    except Exception as e:
        print(f"Error getting organization alerts: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# INSIGHTS ENDPOINTS
# ============================================================================

@admin_bp.route('/startups/<int:startup_id>/insights/latest', methods=['GET'])
@admin_required
def get_latest_insights(startup_id):
    """Get the latest insights snapshot for a startup"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    startup = Startup.query.get_or_404(startup_id)
    
    if not validate_admin_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403
    
    latest_snapshot = StartupSnapshot.query.filter_by(
        startup_id=startup_id
    ).order_by(StartupSnapshot.date.desc()).first()
    
    if not latest_snapshot:
        return jsonify({
            'success': True,
            'data': None,
            'message': 'No insights snapshot available yet'
        }), 200
    
    return jsonify({
        'success': True,
        'data': {
            'date': latest_snapshot.date.isoformat(),
            'founder_maturity_score': latest_snapshot.founder_maturity_score,
            'product_readiness_score': latest_snapshot.product_readiness_score,
            'market_fit_score': latest_snapshot.market_fit_score,
            'runway_months': latest_snapshot.runway_months,
            'financial_data': latest_snapshot.financial_data,
            'product_data': latest_snapshot.product_data,
            'growth_data': latest_snapshot.growth_data,
            'team_data': latest_snapshot.team_data
        }
    }), 200


@admin_bp.route('/startups/<int:startup_id>/insights/history', methods=['GET'])
@admin_required
def get_insights_history(startup_id):
    """Get historical insights snapshots for trend analysis"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    startup = Startup.query.get_or_404(startup_id)
    
    if not validate_admin_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403
    
    limit = request.args.get('limit', 30, type=int)
    
    snapshots = StartupSnapshot.query.filter_by(
        startup_id=startup_id
    ).order_by(StartupSnapshot.date.desc()).limit(limit).all()
    
    if not snapshots:
        return jsonify({
            'success': True,
            'data': [],
            'message': 'No historical insights available yet'
        }), 200
    
    history = [{
        'date': snapshot.date.isoformat(),
        'founder_maturity_score': snapshot.founder_maturity_score,
        'product_readiness_score': snapshot.product_readiness_score,
        'market_fit_score': snapshot.market_fit_score,
        'runway_months': snapshot.runway_months,
        'financial_data': snapshot.financial_data,
        'product_data': snapshot.product_data,
        'growth_data': snapshot.growth_data
    } for snapshot in reversed(snapshots)]
    
    return jsonify({
        'success': True,
        'data': history
    }), 200
