from flask import Blueprint, jsonify, request, session
from app import db
from app.models import User, Submission, EvaluationTask, ScopeDocument, ScopeComment, Contract
from app.utils.decorators import session_required

stages_bp = Blueprint('stages', __name__, url_prefix='/api/stages')

# Helper function to get user and submission
def get_user_and_submission():
    user_id = session.get('user_id')
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
@session_required
def get_evaluation_tasks():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code
        
    tasks = EvaluationTask.query.filter_by(submission_id=submission.id).all()
    return jsonify({'success': True, 'tasks': [task.to_dict() for task in tasks]}), 200

# --- Scope Stage Endpoints ---

@stages_bp.route('/scope', methods=['GET'])
@session_required
def get_scope_document():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    scope_doc = ScopeDocument.query.filter_by(submission_id=submission.id).first()
    if not scope_doc:
        return jsonify({'success': False, 'error': 'Scope document not found'}), 404
        
    return jsonify({'success': True, 'scope_document': scope_doc.to_dict()}), 200

@stages_bp.route('/scope/comments', methods=['POST'])
@session_required
def add_scope_comment():
    data = request.get_json()
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    scope_doc = ScopeDocument.query.filter_by(submission_id=submission.id).first()
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
@session_required
def get_contract_details():
    user, submission, error_response, status_code = get_user_and_submission()
    if error_response:
        return error_response, status_code

    contract = Contract.query.filter_by(submission_id=submission.id).first()
    if not contract:
        return jsonify({'success': False, 'error': 'Contract not found'}), 404
        
    return jsonify({'success': True, 'contract': contract.to_dict()}), 200
