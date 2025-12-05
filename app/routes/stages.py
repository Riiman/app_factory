from flask import Blueprint, jsonify, request
from app import db
from app.models import User, Submission, EvaluationTask, ScopeDocument, ScopeComment, Contract, Startup, UserRole, ContractStatus, ContractSignatory, ContractComment
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from app.services.notification_service import publish_update

stages_bp = Blueprint('stages', __name__, url_prefix='/api/stages')

# Helper function to get user and submission
def get_user_and_submission():
    user_id = get_jwt_identity()
    if not user_id:
        return None, None, jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    user = User.query.get(user_id)
    if not user:
        return None, None, jsonify({'success': False, 'error': 'User not found'}), 404

    # Assuming a user has one submission for simplicity in this context
    submission = Submission.query.filter_by(user_id=user.id).first()
    if not submission:
        return user, None, jsonify({'success': False, 'error': 'Submission not found for user'}), 404
        
    return user, submission, None, None

# --- Evaluation Stage Endpoints ---

@stages_bp.route('/evaluation/tasks', methods=['GET'])
@jwt_required()
def get_evaluation_tasks():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code
        
    tasks = EvaluationTask.query.filter_by(submission_id=submission.id).all()
    return jsonify({'success': True, 'tasks': [task.to_dict() for task in tasks]}), 200

# --- Scope Stage Endpoints ---

@stages_bp.route('/scope', methods=['GET'])
@jwt_required()
def get_scope_document():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    if not submission.startup:
        return jsonify({'success': False, 'error': 'Startup not found for this submission'}), 404

    scope_doc = ScopeDocument.query.filter_by(startup_id=submission.startup.id).first()
    if not scope_doc:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404
        
    return jsonify({'success': True, 'scope_document': scope_doc.to_dict()}), 200

@stages_bp.route('/scope/comments', methods=['POST'])
@jwt_required()
def add_scope_comment():
    data = request.get_json()
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    if not submission.startup:
        return jsonify({'success': False, 'error': 'Startup not found for this submission'}), 404

    scope_doc = ScopeDocument.query.filter_by(startup_id=submission.startup.id).first()
    if not scope_doc:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404

    new_comment = ScopeComment(
        document_id=scope_doc.id,
        user_id=user.id,
        section_id=data.get('section_id'),
        text=data.get('text')
    )
    db.session.add(new_comment)
    db.session.commit()
    
    # Create notification for the admin
    from app.models import DashboardNotification
    # Find an admin user to assign the notification to (or broadcast to all admins if logic supported, but here we pick one or just use ID 1 as fallback)
    admin_user = User.query.filter_by(role=UserRole.ADMIN).first()
    if admin_user:
        notification = DashboardNotification(
            user_id=admin_user.id,
            title=f"New Scope Comment from {submission.startup.name}",
            message=f"{submission.startup.name} commented on their {data.get('section_id', 'general')} scope: {data.get('text')[:50]}...",
            type="info"
        )
        db.session.add(notification)
        db.session.commit()
        publish_update("notification_created", {"notification": notification.to_dict()}, rooms=["admin"])

    publish_update("scope_comment_added", {"startup_id": submission.startup.id, "comment": new_comment.to_dict()}, rooms=[f"user_{submission.startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'comment': new_comment.to_dict()}), 201

# --- Contract Stage Endpoints ---

@stages_bp.route('/contract', methods=['GET'])
@jwt_required()
def get_contract_details():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    if not submission.startup:
        return jsonify({'success': False, 'error': 'Startup not found for this submission'}), 404

    contract = Contract.query.filter_by(startup_id=submission.startup.id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404
        
    return jsonify({'success': True, 'contract': contract.to_dict()}), 200

@stages_bp.route('/scope/accept', methods=['POST'])
@jwt_required()
def accept_scope():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    is_admin = user.role == UserRole.ADMIN
    data = request.get_json() or {}
    startup_id = data.get('startup_id')

    scope_doc = None
    startup = None

    if is_admin:
        if not startup_id:
             return jsonify({'success': False, 'error': 'Startup ID required for admin'}), 400
        startup = Startup.query.get(startup_id)
        if not startup:
             return jsonify({'success': False, 'error': 'Startup not found'}), 404
        scope_doc = ScopeDocument.query.filter_by(startup_id=startup.id).first()
    else:
        # Founder logic
        submission = Submission.query.filter_by(user_id=user.id).first()
        if not submission or not submission.startup:
             return jsonify({'success': False, 'error': 'Submission/Startup not found'}), 404
        startup = submission.startup
        scope_doc = ScopeDocument.query.filter_by(startup_id=startup.id).first()

    if not scope_doc:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404

    # Update acceptance
    if is_admin:
        scope_doc.admin_accepted = True
        print(f"--- [API] Admin accepted scope for startup ID: {startup.id} ---")
    else:
        scope_doc.founder_accepted = True
        print(f"--- [API] Founder accepted scope for startup ID: {startup.id} ---")

    # Check if both accepted
    if scope_doc.admin_accepted and scope_doc.founder_accepted:
        scope_doc.status = 'Accepted'
        startup.current_stage = 'CONTRACT' # Update startup stage
        print(f"--- [API] Both parties accepted. Transitioning to CONTRACT stage for startup ID: {startup.id} ---")
        
        # Create initial contract if not exists
        if not startup.contract:
            new_contract = Contract(
                startup_id=startup.id,
                title=f"Contract for {startup.name}",
                status='DRAFT'
            )
            db.session.add(new_contract)
            
    elif scope_doc.admin_accepted:
         scope_doc.status = 'Pending Founder Acceptance'
         print(f"--- [API] Admin accepted. Waiting for founder acceptance for startup ID: {startup.id} ---")
    elif scope_doc.founder_accepted:
         scope_doc.status = 'Pending Admin Acceptance'
         print(f"--- [API] Founder accepted. Waiting for admin acceptance for startup ID: {startup.id} ---")

    db.session.commit()
    
    publish_update("scope_accepted", {"startup_id": startup.id, "scope_document": scope_doc.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({
        'success': True, 
        'scope_document': scope_doc.to_dict(),
        'message': 'Scope accepted successfully.'
    }), 200

@stages_bp.route('/scope', methods=['PUT'])
@jwt_required()
def update_scope_document():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    startup_id = data.get('startup_id')
    content = data.get('content')

    if not startup_id or not content:
        return jsonify({'success': False, 'error': 'Startup ID and content are required'}), 400

    scope_doc = ScopeDocument.query.filter_by(startup_id=startup_id).first()
    if not scope_doc:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404

    scope_doc.content = content
    # Reset acceptance on update
    scope_doc.founder_accepted = False
    scope_doc.admin_accepted = False
    scope_doc.status = 'Proposed' # Reset status

    db.session.commit()
    
    startup = Startup.query.get(startup_id)
    publish_update("scope_document_updated", {"startup_id": startup_id, "scope_document": scope_doc.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    return jsonify({'success': True, 'scope_document': scope_doc.to_dict()}), 200

@stages_bp.route('/contract', methods=['PUT'])
@jwt_required()
def update_contract():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != UserRole.ADMIN:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    startup_id = data.get('startup_id')
    content = data.get('content')
    document_url = data.get('documentUrl')
    status = data.get('status')

    if not startup_id:
        return jsonify({'success': False, 'error': 'Startup ID is required'}), 400

    contract = Contract.query.filter_by(startup_id=startup_id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    if content:
        contract.content = content
    
    if document_url:
        contract.document_url = document_url

    if status:
        # If status is provided, use it (e.g. Admin setting to SENT)
        # We might want to validate the status string against Enum
        try:
            contract.status = ContractStatus[status] if isinstance(status, str) else ContractStatus(status)
        except:
            pass # Ignore invalid status or handle error
    else:
        # Default behavior: if content changed and no status provided, reset to DRAFT
        if content:
            contract.status = ContractStatus.DRAFT

    # Reset acceptance on update if content changed (optional, but good practice)
    if content or document_url:
        contract.founder_accepted = False
        contract.admin_accepted = False
    
    db.session.commit()
    
    startup = Startup.query.get(startup_id)
    publish_update("contract_updated", {"startup_id": startup_id, "contract": contract.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    return jsonify({'success': True, 'contract': contract.to_dict()}), 200

@stages_bp.route('/contract/accept', methods=['POST'])
@jwt_required()
def accept_contract():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    is_admin = user.role == UserRole.ADMIN
    data = request.get_json() or {}
    startup_id = data.get('startup_id')

    contract = None
    startup = None

    if is_admin:
        if not startup_id:
             return jsonify({'success': False, 'error': 'Startup ID required for admin'}), 400
        startup = Startup.query.get(startup_id)
        if not startup:
             return jsonify({'success': False, 'error': 'Startup not found'}), 404
        contract = Contract.query.filter_by(startup_id=startup.id).first()
    else:
        # Founder logic
        submission = Submission.query.filter_by(user_id=user.id).first()
        if not submission or not submission.startup:
             return jsonify({'success': False, 'error': 'Submission/Startup not found'}), 404
        startup = submission.startup
        contract = Contract.query.filter_by(startup_id=submission.startup.id).first()

    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    # Update acceptance
    if is_admin:
        contract.admin_accepted = True
    else:
        contract.founder_accepted = True

    # Check if both accepted
    if contract.admin_accepted and contract.founder_accepted:
        contract.status = ContractStatus.ACCEPTED
            
    db.session.commit()
    
    publish_update("contract_accepted", {"startup_id": startup.id, "contract": contract.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({
        'success': True, 
        'contract': contract.to_dict(),
        'message': 'Contract accepted successfully.'
    }), 200

@stages_bp.route('/contract/signatories', methods=['POST'])
@jwt_required()
def add_contract_signatory():
    data = request.get_json()
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    if not submission.startup:
        return jsonify({'success': False, 'error': 'Startup not found for this submission'}), 404

    contract = Contract.query.filter_by(startup_id=submission.startup.id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    name = data.get('name')
    email = data.get('email')

    if not name or not email:
        return jsonify({'success': False, 'error': 'Name and email are required'}), 400

    signatory = ContractSignatory(
        contract_id=contract.id,
        name=name,
        email=email,
        status='Not Signed'
    )
    db.session.add(signatory)
    db.session.commit()
    
    publish_update("contract_signatory_added", {"startup_id": submission.startup.id, "signatory": signatory.to_dict()}, rooms=[f"user_{submission.startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'signatory': signatory.to_dict()}), 201

@stages_bp.route('/contract/comments', methods=['POST'])
@jwt_required()
def add_contract_comment():
    data = request.get_json()
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    if not submission.startup:
        return jsonify({'success': False, 'error': 'Startup not found for this submission'}), 404

    contract = Contract.query.filter_by(startup_id=submission.startup.id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    text = data.get('text')
    if not text:
        return jsonify({'success': False, 'error': 'Comment text is required'}), 400

    comment = ContractComment(
        contract_id=contract.id,
        user_id=user.id,
        text=text
    )
    db.session.add(comment)
    db.session.commit()
    
    publish_update("contract_comment_added", {"startup_id": submission.startup.id, "comment": comment.to_dict()}, rooms=[f"user_{submission.startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'comment': comment.to_dict()}), 201

@stages_bp.route('/contract/sign', methods=['POST'])
@jwt_required()
def sign_contract():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    submission = Submission.query.filter_by(user_id=user.id).first()
    if not submission or not submission.startup:
         return jsonify({'success': False, 'error': 'Submission/Startup not found'}), 404
    
    contract = Contract.query.filter_by(startup_id=submission.startup.id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    if contract.status != ContractStatus.SENT:
        return jsonify({'success': False, 'error': 'Contract is not in SENT status'}), 400

    contract.status = ContractStatus.SIGNED
    contract.signed_at = datetime.utcnow()
    
    # Also mark the founder in signatories as signed if they exist
    founder_signatory = ContractSignatory.query.filter_by(contract_id=contract.id, email=user.email).first()
    if founder_signatory:
        founder_signatory.status = 'Signed'
        founder_signatory.signed_at = datetime.utcnow()

    db.session.commit()
    
    publish_update("contract_signed", {"startup_id": submission.startup.id, "contract": contract.to_dict()}, rooms=[f"user_{submission.startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'contract': contract.to_dict()}), 200
