"""
deployment.py - Endpoints for managing deployments
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, Build, Deployment, db

deployment_bp = Blueprint('deployment', __name__)

# Platform endpoints
@deployment_bp.route('/platform/builds/<int:build_id>/deployments', methods=['POST'])
@jwt_required()
def create_deployment(build_id):
    # ... (add authorization for platform team)
    build = Build.query.get(build_id)
    if not build:
        return jsonify({'success': False, 'error': 'Build not found'}), 404

    data = request.get_json()
    deployment = Deployment(
        build_id=build_id,
        stage_instance_id=build.stage_instance_id,
        environment=data['environment'],
        url=data.get('url'),
        feedback_form_url=data.get('feedback_form_url'),
        launch_checklist=data.get('launch_checklist')
    )
    db.session.add(deployment)
    db.session.commit()
    return jsonify({'success': True, 'data': {'deployment_id': deployment.id}})

@deployment_bp.route('/platform/deployments/<int:deployment_id>', methods=['PUT'])
@jwt_required()
def update_deployment(deployment_id):
    # ... (add authorization for platform team)
    deployment = Deployment.query.get(deployment_id)
    if not deployment:
        return jsonify({'success': False, 'error': 'Deployment not found'}), 404

    data = request.get_json()
    deployment.status = data.get('status', deployment.status)
    deployment.url = data.get('url', deployment.url)
    deployment.feedback_form_url = data.get('feedback_form_url', deployment.feedback_form_url)
    deployment.launch_checklist = data.get('launch_checklist', deployment.launch_checklist)
    db.session.commit()
    return jsonify({'success': True})

# Founder endpoints
@deployment_bp.route('/dashboard/deployments', methods=['GET'])
@jwt_required()
def get_deployments():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='test_deploy').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'Deployment stage not found'}), 404

    deployments = Deployment.query.filter_by(stage_instance_id=stage_instance.id).order_by(Deployment.created_at.desc()).all()
    return jsonify({
        'success': True,
        'data': [{
            'id': d.id,
            'environment': d.environment,
            'url': d.url,
            'status': d.status,
            'feedback_form_url': d.feedback_form_url,
            'launch_checklist': d.launch_checklist,
            'created_at': d.created_at.isoformat()
        } for d in deployments]
    })

@deployment_bp.route('/dashboard/deployments/<int:deployment_id>/approve-release', methods=['POST'])
@jwt_required()
def approve_release(deployment_id):
    user_id = int(get_jwt_identity())
    deployment = Deployment.query.get(deployment_id)
    if not deployment:
        return jsonify({'success': False, 'error': 'Deployment not found'}), 404

    # Check if the deployment belongs to the user's startup
    if deployment.stage_instance.startup.user_id != user_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    deployment.status = 'approved_for_release'
    db.session.commit()
    return jsonify({'success': True})

@deployment_bp.route('/dashboard/deployments/<int:deployment_id>/submit-feedback', methods=['POST'])
@jwt_required()
def submit_feedback(deployment_id):
    user_id = int(get_jwt_identity())
    deployment = Deployment.query.get(deployment_id)
    if not deployment:
        return jsonify({'success': False, 'error': 'Deployment not found'}), 404

    # Check if the deployment belongs to the user's startup
    if deployment.stage_instance.startup.user_id != user_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    # For now, just store feedback in a generic way. In a real app, this would be more structured.
    # Perhaps add a new model for feedback.
    deployment.feedback = data.get('feedback') # Assuming a feedback column exists or will be added
    db.session.commit()
    return jsonify({'success': True})
