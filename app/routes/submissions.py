from flask import request, jsonify, session, Blueprint
from app import db
from app.models import Submission, User, Evaluation
from app.utils.decorators import session_required
from app.services.chatbot_service import StartupAnalyzerChatbot
import traceback

submissions_bp = Blueprint('submissions', __name__, url_prefix='/submissions')

def _get_latest_answer(data, key):
    """Safely gets the last answer for a given key from the chatbot data."""
    return data.get(key, [{}])[-1].get('answer', None)

@submissions_bp.route('/chat/start', methods=['POST'])
@session_required
def start_chat_submission():
    try:
        user_id = session.get('user_id')
        chatbot = StartupAnalyzerChatbot()
        initial_message = chatbot.start_chat()
        
        session[f'chatbot_state_{user_id}'] = {
            'conversation_history': chatbot.conversation_history,
            'startup_data': chatbot.startup_data,
            'current_question_index': chatbot.current_question_index
        }
        
        return jsonify({'success': True, 'message': initial_message}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': f"An unexpected error occurred: {str(e)}"}), 500

@submissions_bp.route('/chat/message', methods=['POST'])
@session_required
def chat_submission_message():
    user_id = session.get('user_id')
    data = request.get_json()
    user_message = data.get('message')

    if not user_message:
        return jsonify({'success': False, 'error': 'Message is required.'}), 400

    chatbot_state = session.get(f'chatbot_state_{user_id}')
    if not chatbot_state:
        return jsonify({'success': False, 'error': 'Chat session not found. Please start a new chat.'}), 400

    chatbot = StartupAnalyzerChatbot()
    chatbot.conversation_history = chatbot_state.get('conversation_history', [])
    chatbot.startup_data = chatbot_state.get('startup_data', {})
    chatbot.current_question_index = chatbot_state.get('current_question_index', 0)

    bot_response, is_complete = chatbot.process_response(user_message)
    
    session[f'chatbot_state_{user_id}'] = {
        'conversation_history': chatbot.conversation_history,
        'startup_data': chatbot.startup_data,
        'current_question_index': chatbot.current_question_index
    }

    if is_complete:
        startup_data = chatbot.startup_data
        
        submission = Submission(
            user_id=user_id,
            startup_name=_get_latest_answer(startup_data, 'startup_name'),
            founders_and_inspiration=_get_latest_answer(startup_data, 'founders_and_inspiration'),
            problem_statement=_get_latest_answer(startup_data, 'problem_statement'),
            who_experiences_problem=_get_latest_answer(startup_data, 'who_experiences_problem'),
            product_service_idea=_get_latest_answer(startup_data, 'product_service_idea'),
            how_solves_problem=_get_latest_answer(startup_data, 'how_solves_problem'),
            intended_users_customers=_get_latest_answer(startup_data, 'intended_users_customers'),
            main_competitors_alternatives=_get_latest_answer(startup_data, 'main_competitors_alternatives'),
            how_stands_out=_get_latest_answer(startup_data, 'how_stands_out'),
            startup_type=startup_data.get('startup_type'),
            raw_chat_data=startup_data
        )
        db.session.add(submission)
        db.session.commit()
        
        # --- Dispatch Background Task for Evaluation ---
        from celery_worker import run_evaluation_task
        run_evaluation_task.delay(submission.id)
        
        session.pop(f'chatbot_state_{user_id}', None)

    return jsonify({'success': True, 'message': bot_response, 'is_complete': is_complete}), 200

@submissions_bp.route('/submissions', methods=['POST'])
@session_required
def create_submission():
    user_id = session.get('user_id')
    data = request.get_json()

    submission = Submission(
        user_id=user_id,
        startup_name=data.get('startup_name'),
        founders_and_inspiration=data.get('founders_and_inspiration'),
        problem_statement=data.get('problem_statement'),
        who_experiences_problem=data.get('who_experiences_problem'),
        product_service_idea=data.get('product_service_idea'),
        how_solves_problem=data.get('how_solves_problem'),
        intended_users_customers=data.get('intended_users_customers'),
        main_competitors_alternatives=data.get('main_competitors_alternatives'),
        how_stands_out=data.get('how_stands_out'),
        startup_type=data.get('startup_type')
    )

    db.session.add(submission)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Submission created successfully.',
        'submission': submission.to_dict()
    }), 201

@submissions_bp.route('/submissions', methods=['GET'])
@session_required
def get_submissions():
    user_id = session.get('user_id')
    submissions = Submission.query.filter_by(user_id=user_id).all()
    return jsonify({
        'success': True,
        'submissions': [s.to_dict() for s in submissions]
    }), 200