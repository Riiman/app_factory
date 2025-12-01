from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models import Submission, Startup, User, Founder, StartupStage, SubmissionStatus, EvaluationTask, ScopeDocument, ScopeComment, Contract, ContractSignatory, UserRole, ScopeStatus, ContractStatus
from app.utils.decorators import admin_required
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
import re
from datetime import datetime
import json
from app.services.analyzer_service import run_analysis
from app.services.document_generator_service import generate_scope_document
from app.tasks import generate_product_task
from app.services.product_generator_service import generate_product_from_scope
from app.models import Product, Feature, ActivityLog


print("--- DEBUG: Importing admin.py ---")

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/submissions', methods=['GET'])
@admin_required
def get_all_submissions():
    submissions = Submission.query.filter(
        Submission.status.notin_([SubmissionStatus.DRAFT, SubmissionStatus.FINALIZE_SUBMISSION])
    ).all()
    print(f"--- DEBUG: Found {len(submissions)} submissions in get_all_submissions ---")
    return jsonify({'success': True, 'submissions': [s.to_dict() for s in submissions]}), 200

@admin_bp.route('/startups', methods=['GET'])
@admin_required
def get_all_startups():
    startups = Startup.query.options(joinedload(Startup.submission)).all()
    return jsonify({'success': True, 'startups': [s.to_dict(include_relations=True) for s in startups]}), 200

@admin_bp.route('/startups/<int:startup_id>', methods=['GET'])
@admin_required
def get_startup_detail(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=True)}), 200

@admin_bp.route('/startups/<int:startup_id>/stage', methods=['PUT'])
@admin_required
def update_startup_stage(startup_id):
    startup = Startup.query.get_or_404(startup_id)
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
    return jsonify({'success': True, 'startup': startup.to_dict(include_relations=False)}), 200

@admin_bp.route('/submissions/<int:submission_id>/status', methods=['PUT'])
@admin_required
def update_submission_status(submission_id):
    submission = Submission.query.get_or_404(submission_id)
    data = request.get_json()
    new_status_str = data.get('status')

    if not new_status_str:
        return jsonify({'success': False, 'error': 'New status is required'}), 400

    try:
        new_status = SubmissionStatus[new_status_str.upper()]
    except KeyError:
        return jsonify({'success': False, 'error': f'Invalid status: {new_status_str}'}), 400

    submission.status = new_status
    
    # If submission is moved to review, trigger the analysis task
    if new_status == SubmissionStatus.IN_REVIEW:
        run_analysis(submission.id)

    # If submission is approved, create a startup entry and trigger scope document generation
    if new_status == SubmissionStatus.APPROVED:
        print(f"--- DEBUG: Checking if submission {submission.id} has a startup: {submission.startup} ---")
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
                submission_id=submission.id,
                name=submission.startup_name,
                slug=slug,
                current_stage=StartupStage.SCOPING.value
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

            # Trigger async scope document generation
            generate_scope_document(startup)

            # Create initial Contract
            contract = Contract(
                startup_id=startup.id,
                title=f"Incubator Agreement for {startup.name}",
                document_url="#", # Placeholder for actual document link
                status=ContractStatus.DRAFT.name # Convert Enum to string
            )
            db.session.add(contract)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'A startup already exists for this submission.'}), 409
    return jsonify({'success': True, 'submission': submission.to_dict()}), 200
    
    @admin_bp.route('/submissions/<int:submission_id>/tasks', methods=['POST'])
    @admin_required
    def create_evaluation_task(submission_id):
        submission = Submission.query.get_or_404(submission_id)
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
    
        return jsonify({'success': True, 'task': task.to_dict()}), 201

print("--- DEBUG: Defining get_all_users route ---")
@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_all_users():
    users = User.query.all()
    return jsonify({'success': True, 'users': [u.to_dict() for u in users]}), 200

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@admin_required
def update_user_role(user_id):
    user = User.query.get_or_404(user_id)
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
    return jsonify({'success': True, 'user': user.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/scope', methods=['PUT'])
@admin_required
def update_scope_document(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    if not startup.scope_document:
        return jsonify({'success': False, 'error': 'Scope document not found for this startup'}), 404
    
    data = request.get_json()
    startup.scope_document.product_scope = data.get('productScope', startup.scope_document.product_scope)
    startup.scope_document.gtm_scope = data.get('gtmScope', startup.scope_document.gtm_scope)
    
    db.session.commit()
    return jsonify({'success': True, 'scope_document': startup.scope_document.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/scope/comments', methods=['POST'])
@admin_required
def add_scope_comment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
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
    return jsonify({'success': True, 'comment': comment.to_dict()}), 201

@admin_bp.route('/startups/<int:startup_id>/contract', methods=['PUT'])
@admin_required
def update_contract(startup_id):
    startup = Startup.query.get_or_404(startup_id)
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
    return jsonify({'success': True, 'contract': startup.contract.to_dict()}), 200

@admin_bp.route('/startups/<int:startup_id>/generate-product', methods=['POST'])
@admin_required
def generate_product_for_startup(startup_id):
    """
    Triggers the asynchronous Celery task to generate a product and its features
    from the startup's scope document.
    """
    startup = Startup.query.get_or_404(startup_id)
    
    # Dispatch the background task
    generate_product_task.delay(startup.id)
    
    return jsonify({
        'success': True,
        'message': 'Product generation has been queued and will start shortly.'
    }), 202

@admin_bp.route('/activity', methods=['GET'])
@admin_required
def get_recent_activity():
    activities = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(50).all()
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
    
    return jsonify({'success': True, 'activity': activity.to_dict()}), 201

