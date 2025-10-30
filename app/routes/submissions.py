from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Submission, Startup, SubmissionStage
from app import db
from datetime import datetime
import traceback

submissions_bp = Blueprint('submissions', __name__)

# ============================================================================
# NEW ENDPOINTS FOR EVALUATIONFORM.JS
# ============================================================================

@submissions_bp.route('/submission-status', methods=['GET'])
@jwt_required()
def get_submission_status():
    """Get current submission status and stage data"""
    user_id = get_jwt_identity()
    
    # Find the most recent draft or in-progress submission
    submission = Submission.query.filter_by(user_id=user_id).first()
    
    if not submission:
        return jsonify({
            'success': True,
            'submission_id': None,
            'current_stage': 0,
            'stages': []
        }), 200
    
    # Parse stage_data JSON to return individual stages
    stages = []
    if submission.stage_data:
        for i in range(1, 7):  # 6 stages
            stage_key = f'stage_{i}'
            if stage_key in submission.stage_data:
                stages.append({
                    'stage_number': i,
                    'data': submission.stage_data[stage_key]
                })
    
    return jsonify({
        'success': True,
        'submission_id': submission.id,
        'current_stage': submission.current_stage or 0,
        'stages': stages
    }), 200


@submissions_bp.route('/submissions/submit-stage', methods=['POST', 'OPTIONS'])
def submit_stage():
    """Save a single stage of the submission"""
    # Handle OPTIONS preflight request for CORS
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200
    
    # JWT is required for POST
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    submission_id = data.get('submission_id')
    stage = data.get('stage')  # 1-6
    stage_data = data.get('data')
    
    if not stage or not stage_data:
        return jsonify({'error': 'Stage number and data are required'}), 400
    
    print(f"--- TRACE: submit_stage started for user {user_id}, stage {stage} ---")
    
    # Find or create submission
    if submission_id:
        submission = Submission.query.filter_by(
            id=submission_id, 
            user_id=user_id
        ).first()
        print(f"--- TRACE: Found existing submission {submission_id} ---")
    else:
        submission = Submission.query.filter_by(
            user_id=user_id
        ).filter(
            Submission.status.in_(['draft', 'in_progress'])
        ).first()
        if submission:
            print(f"--- TRACE: Found existing draft submission {submission.id} ---")
        else:
            print("--- TRACE: No existing submission found, preparing to create new one ---")
    
    if not submission:
        # Create new submission with minimal required fields
        submission = Submission(
            user_id=user_id,
            startup_name=stage_data.get('startup_name', 'Draft'),
            industry=stage_data.get('industry', 'Not specified'),
            stage='draft',
            description=stage_data.get('problem_statement', 'Draft submission'),
            status='in_progress',
            current_stage=stage,
            stage_data={}
        )
        db.session.add(submission)
        print("--- TRACE: New submission object added to session ---")
        db.session.flush() # Flush to get an ID if needed for subsequent operations
        print(f"--- TRACE: Session flushed, new submission ID: {submission.id} ---")
    
    # Update stage data
    if not submission.stage_data:
        submission.stage_data = {}
    
    submission.stage_data[f'stage_{stage}'] = stage_data
    submission.current_stage = max(submission.current_stage or 0, stage)
    submission.updated_at = datetime.utcnow()
    
    # Update main fields from stage 1 data
    if stage == 1 and stage_data:
        submission.startup_name = stage_data.get('startup_name', submission.startup_name)
        submission.industry = stage_data.get('industry', submission.industry)
    
    print("--- TRACE: Before db.session.commit() ---")
    try:
        db.session.commit()
        print("--- TRACE: After db.session.commit() successfully ---")
    except Exception as e:
        db.session.rollback() # Rollback on error
        print(f"--- TRACE: ERROR during db.session.commit(): {e} ---")
        traceback.print_exc() # Print full traceback to console
        return jsonify({'error': f'Database commit failed: {e}'}), 500
    
    print(f"--- TRACE: submit_stage finished successfully for submission {submission.id} ---")
    
    return jsonify({
        'success': True,
        'submission_id': submission.id,
        'message': f'Stage {stage} saved successfully'
    }), 200


@submissions_bp.route('/submissions/submit-final', methods=['POST', 'OPTIONS'])
def submit_final():
    """Mark submission as complete and ready for review"""
    # Handle OPTIONS preflight request for CORS
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST,OPTIONS')
        return response, 200
    
    # JWT is required for POST
    from flask_jwt_extended import verify_jwt_in_request
    verify_jwt_in_request()
    
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    submission_id = data.get('submission_id')
    
    if not submission_id:
        return jsonify({'error': 'Submission ID is required'}), 400
    
    submission = Submission.query.filter_by(
        user_id=user_id
    ).first()
    
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404
    
    # Flatten all stage data into main fields
    if submission.stage_data:
        for stage_key, stage_value in submission.stage_data.items():
            if isinstance(stage_value, dict):
                for field, value in stage_value.items():
                    if hasattr(submission, field):
                        setattr(submission, field, value)
    
    submission.status = 'pending'
    submission.submitted_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    # Send email notification
    try:
        from app.email_utils import send_submission_confirmation_email
        user = User.query.get(user_id)
        send_submission_confirmation_email(user.email, submission.startup_name)
    except Exception as e:
        print(f"Email notification failed: {e}")
    
    return jsonify({
        'success': True,
        'submission_id': submission.id,
        'message': 'Submission completed successfully'
    }), 200


# ============================================================================
# OLD ENDPOINTS (keep for backward compatibility)
# ============================================================================

@submissions_bp.route('/submissions/current', methods=['GET'])
@jwt_required()
def get_current_submission():
    """Get the user's current in-progress submission (OLD system)"""
    user_id = get_jwt_identity()
    
    startup = Startup.query.filter_by(user_id=user_id, status='in_progress').first()
    
    if not startup:
        return jsonify({'startup': None, 'stages': {}}), 200
    
    stages = SubmissionStage.query.filter_by(startup_id=startup.id).all()
    stages_data = {stage.stage_name: stage.data for stage in stages}
    
    return jsonify({
        'startup': startup.to_dict(),
        'stages': stages_data
    }), 200


@submissions_bp.route('/submissions/save', methods=['POST'])
@jwt_required()
def save_submission_progress():
    """Save progress for a single stage (OLD system)"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    stage_name = data.get('stage_name')
    stage_data = data.get('data')
    
    if not stage_name or stage_data is None:
        return jsonify({'error': 'Stage name and data are required'}), 400
    
    startup = Startup.query.filter_by(user_id=user_id, status='in_progress').first()
    
    if not startup:
        startup = Startup(user_id=user_id, status='in_progress')
        db.session.add(startup)
        db.session.flush()
    
    if stage_name == 'Basic Information':
        startup.startup_name = stage_data.get('startup_name')
        startup.founder_name = stage_data.get('founder_name')
        startup.email = stage_data.get('email')
    
    submission_stage = SubmissionStage.query.filter_by(
        startup_id=startup.id, 
        stage_name=stage_name
    ).first()
    
    if not submission_stage:
        submission_stage = SubmissionStage(startup_id=startup.id, stage_name=stage_name)
        db.session.add(submission_stage)
    
    submission_stage.data = stage_data
    db.session.commit()
    
    return jsonify({
        'success': True,
        'startup_id': startup.id,
        'message': f'Stage "{stage_name}" saved successfully'
    }), 200


@submissions_bp.route('/submissions', methods=['POST'])
@jwt_required()
def create_submission():
    """Create a new submission"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        from config import Config
        existing_submissions = Submission.query.filter_by(user_id=user_id).count()
        
        if existing_submissions >= Config.SUBMISSIONS_PER_USER:
            return jsonify({'error': 'Submission limit reached'}), 400
        
        required_fields = ['startupName', 'industry', 'stage', 'description']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        submission = Submission(
            user_id=user_id,
            startup_name=data['startupName'],
            industry=data['industry'],
            stage=data['stage'],
            description=data['description'],
            problem_statement=data.get('problemStatement', ''),
            solution=data.get('solution', ''),
            target_market=data.get('targetMarket', ''),
            business_model=data.get('businessModel', ''),
            competition=data.get('competition', ''),
            team_size=data.get('teamSize', 1),
            funding_required=data.get('fundingRequired', 0),
            current_revenue=data.get('currentRevenue', 0),
            website=data.get('website', ''),
            pitch_deck_url=data.get('pitchDeckUrl', ''),
            status='pending'
        )
        
        db.session.add(submission)
        db.session.commit()
        
        try:
            from app.email_utils import send_submission_confirmation_email
            user = User.query.get(int(user_id))
            send_submission_confirmation_email(user.email, submission.startup_name)
        except:
            pass
        
        return jsonify({
            'message': 'Submission created successfully',
            'submission': submission.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@submissions_bp.route('/submissions', methods=['GET'])
@jwt_required()
def list_submissions():
    """Get user's submission (single)"""
    try:
        user_id = int(get_jwt_identity())
    
        submission = Submission.query.filter_by(user_id=user_id).first()
        
        return jsonify({
            'success': True,
            'submissions': [submission.to_dict()] if submission else []
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@submissions_bp.route('/submissions/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission(submission_id):
    """Get specific submission"""
    try:
        user_id = get_jwt_identity()
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        return jsonify({'submission': submission.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@submissions_bp.route('/submissions/<int:submission_id>/submit', methods=['POST'])
@jwt_required()
def submit_for_review(submission_id):
    """Submit a draft submission for review"""
    try:
        user_id = get_jwt_identity()
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        if submission.status != 'draft':
            return jsonify({'error': 'Submission is not in draft status'}), 400
        
        submission.status = 'pending'
        submission.submitted_at = datetime.utcnow()
        submission.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        try:
            from app.email_utils import send_submission_confirmation_email
            user = User.query.get(int(user_id))
            send_submission_confirmation_email(user.email, submission.startup_name)
        except:
            pass
        
        return jsonify({
            'message': 'Submission submitted for review',
            'submission': submission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
