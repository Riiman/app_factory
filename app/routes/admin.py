from flask import Blueprint, jsonify, request, session
from app import db
from app.models import Submission, Startup, User, StartupStage, SubmissionStatus, EvaluationTask, ScopeDocument, ScopeComment, Contract, ContractSignatory, UserRole
from app.utils.decorators import admin_required
from sqlalchemy.exc import IntegrityError

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/submissions', methods=['GET'])
@admin_required
def get_all_submissions():
    submissions = Submission.query.all()
    return jsonify({'success': True, 'submissions': [s.to_dict() for s in submissions]}), 200

@admin_bp.route('/startups', methods=['GET'])
@admin_required
def get_all_startups():
    startups = Startup.query.all()
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
    
    # If submission is approved, create a startup entry and initial evaluation tasks
    if new_status == SubmissionStatus.APPROVED:
        if not submission.startup:
            # Create Startup
            startup = Startup(
                user_id=submission.user_id,
                submission_id=submission.id,
                name=submission.startup_name,
                slug=submission.startup_name.lower().replace(' ', '-').replace(/[^a-z0-9-]/g, ''),
                current_stage=StartupStage.EVALUATION # Start at evaluation stage
            )
            db.session.add(startup)
            db.session.flush() # Flush to get startup.id

            # Create initial Evaluation Tasks
            task1 = EvaluationTask(
                submission_id=submission.id,
                title="Submit Pitch Deck",
                description="Upload your latest pitch deck in PDF format.",
                due_date=datetime.utcnow().date()
            )
            task2 = EvaluationTask(
                submission_id=submission.id,
                title="Complete Founder Bio",
                description="Fill out the founder biography form.",
                due_date=datetime.utcnow().date()
            )
            db.session.add_all([task1, task2])

            # Create initial Scope Document
            scope_doc = ScopeDocument(
                startup_id=startup.id,
                product_scope="Define initial product features and roadmap for the first 3 months.",
                gtm_scope="Identify target customer persona and primary acquisition channels.",
                status=ScopeStatus.DRAFT
            )
            db.session.add(scope_doc)

            # Create initial Contract
            contract = Contract(
                startup_id=startup.id,
                title="Incubator Agreement",
                document_url="#", # Placeholder for actual document link
                status=ContractStatus.DRAFT
            )
            db.session.add(contract)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'A startup already exists for this submission.'}), 409

    return jsonify({'success': True, 'submission': submission.to_dict()}), 200

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
        scope_document_id=startup.scope_document.id,
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
