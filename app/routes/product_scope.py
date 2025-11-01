"""
product_scope.py - Endpoints for managing product scope
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, ProductScope, Feature, Comment, db

product_scope_bp = Blueprint('product_scope', __name__)

# Platform endpoints
@product_scope_bp.route('/platform/startups/<int:startup_id>/scope', methods=['POST'])
@jwt_required()
def create_product_scope(startup_id):
    # ... (add authorization for platform team)
    stage_instance = StageInstance.query.filter_by(startup_id=startup_id, stage_key='product_scope').first()
    if not stage_instance:
        return jsonify({'success': False, 'error': 'Product scope stage not found for this startup'}), 404

    scope = ProductScope(stage_instance_id=stage_instance.id)
    db.session.add(scope)
    db.session.commit()
    return jsonify({'success': True, 'data': {'scope_id': scope.id}})

@product_scope_bp.route('/platform/scopes/<int:scope_id>/features', methods=['POST'])
@jwt_required()
def add_feature_to_scope(scope_id):
    # ... (add authorization for platform team)
    data = request.get_json()
    feature = Feature(
        scope_id=scope_id,
        title=data['title'],
        description=data.get('description'),
        priority=data.get('priority')
    )
    db.session.add(feature)
    db.session.commit()
    return jsonify({'success': True, 'data': {'feature_id': feature.id}})

# Founder endpoints
@product_scope_bp.route('/dashboard/scope', methods=['GET'])
@jwt_required()
def get_product_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_scope').first()
    if not stage_instance or not stage_instance.product_scope:
        return jsonify({'success': False, 'error': 'Product scope not found'}), 404

    scope = stage_instance.product_scope
    features = Feature.query.filter_by(scope_id=scope.id).all()

    return jsonify({
        'success': True,
        'data': {
            'scope_id': scope.id,
            'status': scope.status,
            'version': scope.version,
            'features': [{
                'id': f.id,
                'title': f.title,
                'description': f.description,
                'priority': f.priority,
                'status': f.status,
                'comments': [c.content for c in f.comments]
            } for f in features]
        }
    })

@product_scope_bp.route('/dashboard/features/<int:feature_id>/comments', methods=['POST'])
@jwt_required()
def add_comment_to_feature(feature_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    comment = Comment(
        feature_id=feature_id,
        user_id=user_id,
        content=data['content']
    )
    db.session.add(comment)
    db.session.commit()
    return jsonify({'success': True, 'data': {'comment_id': comment.id}})

@product_scope_bp.route('/dashboard/scope/approve', methods=['POST'])
@jwt_required()
def approve_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_scope').first()
    if stage_instance and stage_instance.product_scope:
        stage_instance.product_scope.status = 'approved'
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Scope not found'}), 404

@product_scope_bp.route('/dashboard/scope/request-changes', methods=['POST'])
@jwt_required()
def request_changes_scope():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    stage_instance = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_scope').first()
    if stage_instance and stage_instance.product_scope:
        stage_instance.product_scope.status = 'changes_requested'
        db.session.commit()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Scope not found'}), 404
