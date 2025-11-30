from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Submission, User, SubmissionStatus # Added SubmissionStatus
from app.extensions import db
from app.services.chatbot_orchestrator import ChatbotOrchestrator

submissions_bp = Blueprint('submissions_bp', __name__, url_prefix='/api/submissions')

@submissions_bp.route('/start', methods=['POST'])
@jwt_required()
def start_submission():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # Check if the user already has a pending submission
    existing_submission = Submission.query.filter_by(user_id=user_id, status='PENDING').first()
    if existing_submission:
        return jsonify({"msg": "You already have a pending submission.", "submission_id": existing_submission.id}), 400

    new_submission = Submission(user_id=user_id)
    db.session.add(new_submission)
    db.session.commit()

    return jsonify({"msg": "New submission started.", "submission_id": new_submission.id}), 201

@submissions_bp.route('/<int:submission_id>', methods=['PUT'])
@jwt_required()
def update_submission(submission_id):
    user_id = get_jwt_identity()
    submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
    if not submission:
        return jsonify({"msg": "Submission not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"msg": "No data provided"}), 400

    # These are the fields a user is allowed to edit
    editable_fields = [
        "startup_name", "founders_and_inspiration", "problem_statement", 
        "who_experiences_problem", "product_service_idea", "how_solves_problem", 
        "intended_users_customers", "main_competitors_alternatives", 
        "how_stands_out", "startup_type"
    ]

    for key, value in data.items():
        if key in editable_fields:
            setattr(submission, key, value)

    db.session.commit()
    return jsonify(submission.to_dict()), 200

@submissions_bp.route('/chat', methods=['POST'])
@jwt_required()
def handle_chat():
    data = request.get_json()
    user_message = data.get('message')
    user_id = get_jwt_identity()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Find the user's latest pending submission
    submission = Submission.query.filter_by(user_id=user_id, status='PENDING').order_by(Submission.submitted_at.desc()).first()

    if not submission:
        return jsonify({"error": "No active submission found for this user."}), 404

    # Use the orchestrator to process the message
    orchestrator = ChatbotOrchestrator(submission_id=submission.id)
    response = orchestrator.process_user_message(user_message)

    return jsonify(response), 200
