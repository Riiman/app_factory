from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Submission, Startup, StageInstance, Metric, StartupStatus, GtmScope, db
from datetime import datetime
import traceback

platform_bp = Blueprint('platform', __name__)

@platform_bp.route('/platform/submissions', methods=['GET'])
@jwt_required()
def get_all_submissions():
    """Get all submissions for platform review, with optional status filtering"""
    try:
        print("Fetching all submissions...")
        
        # Get status filter from query parameters
        status_filter = request.args.get('status')
        
        query = Submission.query
        
        if status_filter:
            # If multiple statuses are provided (comma-separated)
            statuses = [s.strip() for s in status_filter.split(',')]
            query = query.filter(Submission.status.in_(statuses))
        else:
            # Default to 'pending' if no status filter is provided
            query = query.filter_by(status='pending')
            
        submissions = query.order_by(Submission.submitted_at.desc()).all()
        
        print(f"Found {len(submissions)} submissions.")
        
        submissions_data = [s.to_dict() for s in submissions]

        return jsonify({
            'success': True,
            'submissions': submissions_data
        }), 200
        
    except Exception as e:
        print(f"Error in get_all_submissions: {e}")
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
    """Get all startups with their latest metrics and GTM Scope"""
    try:
        startups = Startup.query.all()
        
        results = []
        for startup in startups:
            # Update overall progress before serializing
            startup.overall_progress = startup.compute_progress()
            db.session.add(startup)

            startup_data = startup.to_dict()
            
            # This is inefficient - should be optimized with a better query
            latest_metrics = db.session.query(Metric).join(StageInstance).filter(StageInstance.startup_id == startup.id).order_by(Metric.updated_at.desc()).limit(5).all()
            
            startup_data['metrics'] = [m.to_dict() for m in latest_metrics]

            # Fetch GTM Scope
            gtm_stage_instance = StageInstance.query.filter_by(
                startup_id=startup.id,
                stage_key='gtm_scope'
            ).first()

            if gtm_stage_instance:
                gtm_scope = GtmScope.query.filter_by(
                    stage_instance_id=gtm_stage_instance.id
                ).first()
                if gtm_scope:
                    startup_data['gtm_scope'] = gtm_scope.to_dict()
                else:
                    startup_data['gtm_scope'] = None
            else:
                startup_data['gtm_scope'] = None
            
            results.append(startup_data)
        
        db.session.commit()
            
        return jsonify({'success': True, 'data': results}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in get_all_startups_with_metrics: {e}")
        traceback.print_exc() # Print full traceback for debugging
        return jsonify({'success': False, 'error': str(e)}), 500


@platform_bp.route('/platform/submissions/<int:submission_id>/evaluate', methods=['POST'])
@jwt_required()
def evaluate_submission(submission_id):
    """Submit an evaluation for a submission"""
    try:
        print(f"Evaluating submission {submission_id}")
        submission = Submission.query.get(submission_id)
        if not submission:
            print(f"Submission {submission_id} not found")
            return jsonify({'success': False, 'error': 'Submission not found'}), 404
        
        data = request.get_json()
        print(f"Evaluation data: {data}")
        
        submission.evaluation_summary = data.get('evaluation_summary')
        submission.platform_feedback = data.get('platform_feedback')
        submission.action_tasks = data.get('action_tasks')
        submission.status = 'reviewed'
        submission.reviewed_at = datetime.utcnow()

        # Update associated Startup status
        if submission.startup:
            submission.startup.status = StartupStatus.SCOPE_APPROVED
            db.session.add(submission.startup)

        print("Committing evaluation to the database...")
        db.session.commit()
        print("Evaluation committed successfully.")
        
        return jsonify({
            'success': True,
            'data': submission.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Error evaluating submission: {e}")
        traceback.print_exc()
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@platform_bp.route('/platform/startups/<int:startup_id>/product-scope', methods=['GET'])
@jwt_required()
def get_startup_product_scope(startup_id):
    """Get the product scope for a specific startup"""
    try:
        startup = Startup.query.get(startup_id)
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404

        product_stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key='product_scope'
        ).first()

        if not product_stage_instance:
            return jsonify({'success': False, 'error': 'Product scope stage not found for this startup'}), 404

        product_scope = ProductScope.query.filter_by(
            stage_instance_id=product_stage_instance.id
        ).first()

        if not product_scope:
            return jsonify({'success': False, 'error': 'Product scope not yet defined for this startup'}), 404
        
        # Serialize product scope including features and comments
        scope_data = {
            'id': product_scope.id,
            'status': product_scope.status,
            'version': product_scope.version,
            'created_at': product_scope.created_at.isoformat() if product_scope.created_at else None,
            'updated_at': product_scope.updated_at.isoformat() if product_scope.updated_at else None,
            'features': []
        }

        for feature in product_scope.features:
            feature_data = {
                'id': feature.id,
                'title': feature.title,
                'description': feature.description,
                'priority': feature.priority,
                'status': feature.status,
                'build_status': feature.build_status,
                'comments': [c.content for c in feature.comments] # Only content for now
            }
            scope_data['features'].append(feature_data)

        return jsonify({'success': True, 'data': scope_data}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@platform_bp.route('/platform/startups/<int:startup_id>/gtm-scope', methods=['GET'])
@jwt_required()
def get_startup_gtm_scope(startup_id):
    """Get the GTM scope for a specific startup"""
    try:
        startup = Startup.query.get(startup_id)
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404

        gtm_stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key='gtm_scope'
        ).first()

        if not gtm_stage_instance:
            return jsonify({'success': False, 'error': 'GTM scope stage not found for this startup'}), 404

        gtm_scope = GtmScope.query.filter_by(
            stage_instance_id=gtm_stage_instance.id
        ).first()

        if not gtm_scope:
            return jsonify({'success': False, 'error': 'GTM scope not yet defined for this startup'}), 404
        
        return jsonify({'success': True, 'data': gtm_scope.to_dict()}), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@platform_bp.route('/platform/startups/<int:startup_id>/status', methods=['PUT'])
@jwt_required()
def update_startup_status(startup_id):
    """Update the status of a startup"""
    try:
        startup = Startup.query.get(startup_id)
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404

        data = request.get_json()
        new_status = data.get('status')

        if not new_status:
            return jsonify({'success': False, 'error': 'New status is required'}), 400

        # You might want to add some validation here to make sure the status transition is valid
        startup.status = new_status
        db.session.commit()

        return jsonify({'success': True, 'data': startup.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
