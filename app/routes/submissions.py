from flask import request, jsonify
from app.routes import submissions_bp
from app import db
from app.models import User, Startup, SubmissionStage, Progress
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

@submissions_bp.route('/submit-stage', methods=['POST'])
@jwt_required()
def submit_stage():
    """Save individual stage data (protected route)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        data = request.json
        stage = data.get('stage')
        stage_data = data.get('data')
        
        startup = user.startup
        
        # Update startup status
        if startup.status == 'not_started':
            startup.status = 'in_progress'
        
        # Update or create stage
        stage_obj = SubmissionStage.query.filter_by(
            startup_id=startup.id, 
            stage_number=int(stage)
        ).first()
        
        if stage_obj:
            stage_obj.set_data(stage_data)
            stage_obj.completed_at = datetime.utcnow()
        else:
            stage_obj = SubmissionStage(
                startup_id=startup.id,
                stage_number=int(stage)
            )
            stage_obj.set_data(stage_data)
            db.session.add(stage_obj)
        
        startup.current_stage = int(stage)
        startup.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'submission_id': startup.submission_id,
            'message': f'Stage {stage} saved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@submissions_bp.route('/submit-final', methods=['POST'])
@jwt_required()
def submit_final():
    """Mark submission as complete and initialize progress tracking"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        startup = user.startup
        startup.status = 'completed'
        startup.completed_at = datetime.utcnow()
        
        # Initialize progress tracking if not exists
        if not startup.progress:
            progress = Progress(startup_id=startup.id)
            db.session.add(progress)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Submission completed successfully',
            'data': startup.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@submissions_bp.route('/get-submission', methods=['GET'])
@jwt_required()
def get_submission():
    """Retrieve current user's submission"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        return jsonify({'success': True, 'data': user.startup.to_dict()}), 200
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
