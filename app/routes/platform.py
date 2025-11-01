"""
platform.py - Endpoints for the Platform Dashboard
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Submission, Startup, StageInstance, db

platform_bp = Blueprint('platform', __name__)

@platform_bp.route('/platform/submissions', methods=['GET'])
@jwt_required()
def get_all_submissions():
    """Get all submissions for platform review"""
    try:
        # Add logic here to check if the user is a platform team member
        
        submissions = Submission.query.order_by(Submission.submitted_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in submissions]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@platform_bp.route('/platform/submissions/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission(submission_id):
    """Get a single submission by ID"""
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        return jsonify({
            'success': True,
            'data': submission.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@platform_bp.route('/platform/startups-with-metrics', methods=['GET'])
@jwt_required()
def get_all_startups_with_metrics():
    try:
        startups = Startup.query.all()
        result = []
        for startup in startups:
            metrics = db.session.query(Metric).join(StageInstance).filter(
                StageInstance.startup_id == startup.id
            ).all()
            startup_dict = startup.to_dict()
            startup_dict['metrics'] = [m.to_dict() for m in metrics]
            result.append(startup_dict)
        return jsonify({'success': True, 'data': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@platform_bp.route('/platform/submissions/<int:submission_id>/evaluate', methods=['POST'])
@jwt_required()
def evaluate_submission(submission_id):
    """Submit an evaluation for a submission"""
    try:
        submission = Submission.query.get(submission_id)
        if not submission:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        data = request.get_json()
        
        submission.evaluation_summary = data.get('evaluation_summary')
        submission.platform_feedback = data.get('platform_feedback')
        submission.action_tasks = data.get('action_tasks')
        submission.status = 'reviewed'
        submission.reviewed_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': submission.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
