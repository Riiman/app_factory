from flask import Blueprint, jsonify, request
from app import db
from app.models import User, Submission, EvaluationTask, ScopeDocument, ScopeComment, Contract, Startup, UserRole, ContractStatus, ContractSignatory, ContractComment
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

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
    else:
        scope_doc.founder_accepted = True

    # Check if both accepted
    if scope_doc.admin_accepted and scope_doc.founder_accepted:
        scope_doc.status = 'Accepted'
        startup.current_stage = 'CONTRACT' # Update startup stage
        
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
    elif scope_doc.founder_accepted:
         scope_doc.status = 'Pending Admin Acceptance'

    db.session.commit()
    
    return jsonify({
        'success': True, 
        'scope_document': scope_doc.to_dict(),
        'message': 'Scope accepted successfully.'
    }), 200
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
    # title = data.get('title') # Optional update for title

    if not startup_id or not content:
        return jsonify({'success': False, 'error': 'Startup ID and content are required'}), 400

    contract = Contract.query.filter_by(startup_id=startup_id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404

    contract.content = content
    # Reset acceptance on update
    contract.founder_accepted = False
    contract.admin_accepted = False
    contract.status = ContractStatus.DRAFT
    
    db.session.commit()

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
    
    return jsonify({'success': True, 'contract': contract.to_dict()}), 200
