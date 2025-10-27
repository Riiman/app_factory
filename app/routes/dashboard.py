from flask import request, jsonify
from app.routes import dashboard_bp
from app import db
from app.models import Startup, Progress
import json

@dashboard_bp.route('/dashboard/<submission_id>', methods=['GET'])
def get_dashboard_data(submission_id):
    """Get complete dashboard data for a startup"""
    try:
        startup = Startup.query.filter_by(submission_id=submission_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        # Get progress data
        progress_data = startup.progress.to_dict() if startup.progress else {}
        
        # Check if document exists
        document_available = startup.document is not None
        
        return jsonify({
            'success': True,
            'data': {
                'submission': startup.to_dict(),
                'progress': progress_data,
                'document_available': document_available
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@dashboard_bp.route('/update-progress/<submission_id>', methods=['POST'])
def update_progress(submission_id):
    """Update progress tracking for MVP or GTM"""
    try:
        data = request.json
        progress_type = data.get('type')  # 'mvp_development' or 'gtm_strategy'
        updates = data.get('updates')
        
        startup = Startup.query.filter_by(submission_id=submission_id).first()
        
        if not startup or not startup.progress:
            return jsonify({'success': False, 'error': 'Progress tracking not initialized'}), 404
        
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
        return jsonify({'success': False, 'error': str(e)}), 500
