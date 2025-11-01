"""
build.py - Endpoints for managing the MVP build
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, Feature, Build, db

build_bp = Blueprint('build', __name__)

# Platform endpoints
@build_bp.route('/platform/features/<int:feature_id>/status', methods=['PUT'])
@jwt_required()
def update_feature_build_status(feature_id):
    # ... (add authorization for platform team)
    data = request.get_json()
    feature = Feature.query.get(feature_id)
    if not feature:
        return jsonify({'success': False, 'error': 'Feature not found'}), 404

    feature.build_status = data.get('build_status')
    db.session.commit()
    return jsonify({'success': True})

@build_bp.route('/platform/startups/<int:startup_id>/builds', methods=['POST'])
@jwt_required()
def create_build(startup_id):
    # ... (add authorization for platform team)
    stage_instance = StageInstance.query.filter_by(startup_id=startup_id, stage_key='product_code').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'Build stage not found for this startup'}), 404

    data = request.get_json()
    build = Build(
        stage_instance_id=stage_instance.id,
        version_number=data['version_number'],
        changelog=data.get('changelog')
    )
    db.session.add(build)
    db.session.commit()
    return jsonify({'success': True, 'data': {'build_id': build.id}})

# Founder endpoints
@build_bp.route('/dashboard/build-progress', methods=['GET'])
@jwt_required()
def get_build_progress():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_scope').first()
    if not stage_instance or not stage_instance.product_scope:
        return jsonify({'success': False, 'error': 'Product scope not found'}), 404

    features = Feature.query.filter_by(scope_id=stage_instance.product_scope.id).all()
    return jsonify({
        'success': True,
        'data': [{
            'id': f.id,
            'title': f.title,
            'build_status': f.build_status
        } for f in features]
    })

@build_bp.route('/dashboard/builds', methods=['GET'])
@jwt_required()
def get_builds():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_code').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'Build stage not found'}), 404

    builds = Build.query.filter_by(stage_instance_id=stage_instance.id).order_by(Build.created_at.desc()).all()
    return jsonify({
        'success': True,
        'data': [{
            'id': b.id,
            'version_number': b.version_number,
            'changelog': b.changelog,
            'status': b.status,
            'created_at': b.created_at.isoformat()
        } for b in builds]
    })
