"""
gtm_scope.py - Endpoints for managing GTM scope
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, GtmScope, db

gtm_scope_bp = Blueprint('gtm_scope', __name__)

# Platform endpoints
@gtm_scope_bp.route('/platform/startups/<int:startup_id>/gtm-scope', methods=['POST'])
@jwt_required()
def create_or_update_gtm_scope(startup_id):
    # ... (add authorization for platform team)
    stage_instance = StageInstance.query.filter_by(startup_id=startup_id, stage_key='gtm_scope').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'GTM scope stage not found for this startup'}), 404

    scope = GtmScope.query.filter_by(stage_instance_id=stage_instance.id).first()
    data = request.get_json()

    if not scope:
        scope = GtmScope(stage_instance_id=stage_instance.id)
        db.session.add(scope)

    scope.icp = data.get('icp')
    scope.target_geographies = data.get('target_geographies')
    scope.channels = data.get('channels')
    scope.positioning_statement = data.get('positioning_statement')
    scope.status = 'draft'

    db.session.commit()
    return jsonify({'success': True, 'data': {'scope_id': scope.id}})

# Founder endpoints
@gtm_scope_bp.route('/dashboard/gtm-scope', methods=['GET'])
@jwt_required()
def get_gtm_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='gtm_scope').first()
    if not stage_instance or not stage_instance.gtm_scope:
        return jsonify({'success': False, 'error': 'GTM scope not found'}), 404

    scope = stage_instance.gtm_scope
    return jsonify({
        'success': True,
        'data': {
            'scope_id': scope.id,
            'status': scope.status,
            'version': scope.version,
            'icp': scope.icp,
            'target_geographies': scope.target_geographies,
            'channels': scope.channels,
            'positioning_statement': scope.positioning_statement
        }
    })

@gtm_scope_bp.route('/dashboard/gtm-scope/approve', methods=['POST'])
@jwt_required()
def approve_gtm_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='gtm_scope').first()
    if stage_instance and stage_instance.gtm_scope:
        stage_instance.gtm_scope.status = 'approved'
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'GTM Scope not found'}), 404

@gtm_scope_bp.route('/dashboard/gtm-scope/request-changes', methods=['POST'])
@jwt_required()
def request_changes_gtm_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='gtm_scope').first()
    if stage_instance and stage_instance.gtm_scope:
        stage_instance.gtm_scope.status = 'changes_requested'
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'GTM Scope not found'}), 404
