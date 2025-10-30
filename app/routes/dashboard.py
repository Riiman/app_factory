# dashboard.py - Complete rewrite

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Submission, Startup, Progress, Document
from app import db
import json

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    """Get complete dashboard data for the current user's startup"""
    try:
        user_id = int(get_jwt_identity())
        
        # Get user's submission
        submission = Submission.query.filter_by(user_id=user_id).first()
        
        if not submission:
            return jsonify({
                'success': False,
                'error': 'No submission found. Please complete your application first.'
            }), 404
        
        # Get or create startup
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            # Auto-create startup from submission
            from datetime import datetime
            startup = Startup(
                user_id=user_id,
                submission_id=submission.id,
                status=submission.status if submission.status in ['pending', 'approved', 'rejected'] else 'draft'
            )
            db.session.add(startup)
            db.session.flush()  # Get startup.id before creating progress
            
            # Initialize Progress
            progress = Progress(startup_id=startup.id)
            db.session.add(progress)
            
            db.session.commit()
            print(f"✅ Auto-created Startup (id={startup.id}) for user {user_id}")
        
        # Get progress data
        if not startup.progress:
            # Create progress if missing
            progress = Progress(startup_id=startup.id)
            db.session.add(progress)
            db.session.commit()
        
        progress_data = startup.progress.to_dict() if startup.progress else None
        
        # Check if documents exist
        documents = Document.query.filter_by(startup_id=startup.id).all()
        document_available = len(documents) > 0
        
        return jsonify({
            'success': True,
            'data': {
                'submission': submission.to_dict(),
                'startup': startup.to_dict(),
                'progress': progress_data,
                'documents': [doc.to_dict() for doc in documents],
                'document_available': document_available
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()  # Rollback on error
        print(f"Dashboard error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for the current user"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user's single submission
        submission = Submission.query.filter_by(user_id=user_id).first()
        
        # Get document statistics
        total_documents = Document.query.filter_by(user_id=user_id).count()
        generated_documents = Document.query.filter_by(
            user_id=user_id,
            is_generated=True
        ).count()
        
        # Calculate completion percentage
        completion_steps = {
            'profile_complete': bool(user.full_name and user.email),
            'email_verified': user.is_verified,
            'submission_created': submission is not None,
            'submission_completed': submission.status == 'pending' if submission else False,
            'document_generated': total_documents > 0
        }
        
        completed_steps = sum(1 for step in completion_steps.values() if step)
        total_steps = len(completion_steps)
        completion_percentage = int((completed_steps / total_steps) * 100)
        
        return jsonify({
            'stats': {
                'submission': {
                    'exists': submission is not None,
                    'status': submission.status if submission else None,
                    'progress': submission.current_stage if submission else 0
                },
                'documents': {
                    'total': total_documents,
                    'generated': generated_documents
                },
                'completion': {
                    'percentage': completion_percentage,
                    'steps': completion_steps
                }
            },
            'submission': submission.to_dict() if submission else None,
            'user': {
                'fullName': user.full_name,
                'email': user.email,
                'isVerified': user.is_verified,
                'createdAt': user.created_at.isoformat() if user.created_at else None
            }
        }), 200
        
    except Exception as e:
        print(f"Stats error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@dashboard_bp.route('/dashboard/update-progress', methods=['POST'])
@jwt_required()
def update_progress():
    """Update progress tracking for MVP or GTM"""
    try:
        user_id = int(get_jwt_identity())
        data = request.json
        progress_type = data.get('type')  # 'mvp_development' or 'gtm_strategy'
        updates = data.get('updates')
        
        # Get user's startup
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup or not startup.progress:
            return jsonify({
                'success': False,
                'error': 'Progress tracking not initialized'
            }), 404
        
        progress = startup.progress
        
        if progress_type == 'mvp_development':
            if 'status' in updates:
                progress.mvp_status = updates['status']
            if 'progress_percentage' in updates:
                progress.mvp_progress_percentage = updates['progress_percentage']
            if 'phases' in updates:
                progress.mvp_phases = json.dumps(updates['phases'])
            if 'milestones' in updates:
                progress.mvp_milestones = json.dumps(updates['milestones'])
                
        elif progress_type == 'gtm_strategy':
            if 'status' in updates:
                progress.gtm_status = updates['status']
            if 'progress_percentage' in updates:
                progress.gtm_progress_percentage = updates['progress_percentage']
            if 'phases' in updates:
                progress.gtm_phases = json.dumps(updates['phases'])
            if 'milestones' in updates:
                progress.gtm_milestones = json.dumps(updates['milestones'])
            if 'metrics' in updates:
                progress.gtm_metrics = json.dumps(updates['metrics'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Progress updated successfully',
            'data': progress.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Update progress error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
