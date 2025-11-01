"""
ux_design.py - Endpoints for managing UX design scope
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, UxDesignScope, Comment, db

ux_design_bp = Blueprint('ux_design', __name__)

# Platform endpoints
@ux_design_bp.route('/platform/startups/<int:startup_id>/ux-design', methods=['POST'])
@jwt_required()
def create_or_update_ux_design_scope(startup_id):
    # ... (add authorization for platform team)
    stage_instance = StageInstance.query.filter_by(startup_id=startup_id, stage_key='product_ux').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'UX design stage not found for this startup'}), 404

    scope = UxDesignScope.query.filter_by(stage_instance_id=stage_instance.id).first()
    data = request.get_json()

    if not scope:
        scope = UxDesignScope(stage_instance_id=stage_instance.id)
        db.session.add(scope)

    scope.wireframe_url = data.get('wireframe_url')
    scope.mockup_url = data.get('mockup_url')
    scope.final_ui_url = data.get('final_ui_url')
    scope.status = 'draft'

    db.session.commit()
    return jsonify({'success': True, 'data': {'scope_id': scope.id}})

# Founder endpoints
@ux_design_bp.route('/dashboard/ux-design', methods=['GET'])
@jwt_required()
def get_ux_design_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_ux').first()
    if not stage_instance or not stage_instance.ux_design_scope:
        return jsonify({'success': False, 'error': 'UX design scope not found'}), 404

    scope = stage_instance.ux_design_scope
    return jsonify({
        'success': True,
        'data': {
            'scope_id': scope.id,
            'status': scope.status,
            'wireframe_url': scope.wireframe_url,
            'wireframe_status': scope.wireframe_status,
            'mockup_url': scope.mockup_url,
            'mockup_status': scope.mockup_status,
            'final_ui_url': scope.final_ui_url,
            'final_ui_status': scope.final_ui_status
        }
    })

@ux_design_bp.route('/dashboard/ux-design/comments', methods=['POST'])
@jwt_required()
def add_ux_design_comment():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    comment = Comment(
        user_id=user_id,
        content=data['content'],
        context=data['context']
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({'success': True, 'data': {'comment_id': comment.id}})

@ux_design_bp.route('/dashboard/ux-design/approve', methods=['POST'])
@jwt_required()
def approve_ux_design():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_ux').first()
    if stage_instance and stage_instance.ux_design_scope:
        data = request.get_json()
        design_type = data.get('design_type') # wireframe, mockup, final_ui
        if design_type == 'wireframe':
            stage_instance.ux_design_scope.wireframe_status = 'approved'
        elif design_type == 'mockup':
            stage_instance.ux_design_scope.mockup_status = 'approved'
        elif design_type == 'final_ui':
            stage_instance.ux_design_scope.final_ui_status = 'approved'
        
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'UX Design Scope not found'}), 404
