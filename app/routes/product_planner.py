from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Product, Feature, Sprint, Release, FeatureStatus, User, Startup
from app.services import product_analytics_service
from datetime import datetime

product_planner_bp = Blueprint('product_planner', __name__, url_prefix='/api/planner')

# --- Feature Management ---

@product_planner_bp.route('/products/<int:product_id>/features', methods=['GET'])
@jwt_required()
def get_features(product_id):
    """List all features for a product, optionally filtered by status/sprint"""
    product = Product.query.get_or_404(product_id)
    features = Feature.query.filter_by(product_id=product_id).all()
    return jsonify([f.to_dict() for f in features]), 200

@product_planner_bp.route('/products/<int:product_id>/features', methods=['POST'])
@jwt_required()
def create_feature(product_id):
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        feature = Feature(
            product_id=product_id,
            name=data['name'],
            description=data.get('description'),
            user_story=data.get('user_story'),
            acceptance_criteria=data.get('acceptance_criteria'),
            priority=data.get('priority', 3),
            created_by=current_user_id,
            status=FeatureStatus.BACKLOG,
            target_date=datetime.fromisoformat(data['target_date'].replace('Z', '')) if 'target_date' in data and data['target_date'] else None
        )
        
        # RICE details
        if 'rice_details' in data:
            rice = data['rice_details']
            feature.rice_reach = rice.get('reach')
            feature.rice_impact = rice.get('impact')
            feature.rice_confidence = rice.get('confidence')
            feature.rice_effort = rice.get('effort')
            # Calculate Score: (R * I * C) / E
            if all(k in rice for k in ['reach', 'impact', 'confidence', 'effort']) and rice['effort'] > 0:
                score = (rice['reach'] * rice['impact'] * (rice['confidence'] / 100)) / rice['effort']
                feature.rice_score = round(score, 2)

        db.session.add(feature)
        db.session.commit()
        return jsonify(feature.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@product_planner_bp.route('/features/<int:feature_id>', methods=['PUT'])
@jwt_required()
def update_feature(feature_id):
    feature = Feature.query.get_or_404(feature_id)
    data = request.get_json()
    
    if 'name' in data: feature.name = data['name']
    if 'description' in data: feature.description = data['description']
    if 'user_story' in data: feature.user_story = data['user_story']
    if 'acceptance_criteria' in data: feature.acceptance_criteria = data['acceptance_criteria']
    if 'status' in data: feature.status = FeatureStatus[data['status']]
    if 'priority' in data: feature.priority = data['priority']
    if 'sprint_id' in data: feature.sprint_id = data['sprint_id']
    if 'release_id' in data: feature.release_id = data['release_id']
    if 'target_date' in data:
         feature.target_date = datetime.fromisoformat(data['target_date'].replace('Z', '')) if data['target_date'] else None
    
    # RICE Recalculation
    if 'rice_details' in data:
        rice = data['rice_details']
        feature.rice_reach = rice.get('reach', feature.rice_reach)
        feature.rice_impact = rice.get('impact', feature.rice_impact)
        feature.rice_confidence = rice.get('confidence', feature.rice_confidence)
        feature.rice_effort = rice.get('effort', feature.rice_effort)
        
        if feature.rice_reach and feature.rice_impact and feature.rice_confidence and feature.rice_effort:
             score = (feature.rice_reach * feature.rice_impact * (feature.rice_confidence / 100)) / feature.rice_effort
             feature.rice_score = round(score, 2)

    db.session.commit()
    return jsonify(feature.to_dict()), 200

@product_planner_bp.route('/features/<int:feature_id>', methods=['DELETE'])
@jwt_required()
def delete_feature(feature_id):
    feature = Feature.query.get_or_404(feature_id)
    db.session.delete(feature)
    db.session.commit()
    return jsonify({'message': 'Feature deleted'}), 200


# --- Sprint Management ---

@product_planner_bp.route('/products/<int:product_id>/sprints', methods=['GET'])
@jwt_required()
def get_sprints(product_id):
    sprints = Sprint.query.filter_by(product_id=product_id).order_by(Sprint.start_date).all()
    return jsonify([s.to_dict() for s in sprints]), 200

@product_planner_bp.route('/products/<int:product_id>/sprints', methods=['POST'])
@jwt_required()
def create_sprint(product_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    # Find startup from user or product? Product has startup_id.
    product = Product.query.get_or_404(product_id)
    
    data = request.get_json()
    try:
        sprint = Sprint(
            product_id=product_id,
            startup_id=product.startup_id,
            name=data['name'],
            goal=data.get('goal'),
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '')),
            end_date=datetime.fromisoformat(data['end_date'].replace('Z', '')),
            capacity=data.get('capacity'),
            status='PLANNING'
        )
        db.session.add(sprint)
        db.session.commit()
        
        # Assign features if provided
        if 'feature_ids' in data and data['feature_ids']:
            for feature_id in data['feature_ids']:
                feature = Feature.query.get(feature_id)
                if feature and feature.product_id == product_id:
                    feature.sprint_id = sprint.id
            db.session.commit()
            
        return jsonify(sprint.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@product_planner_bp.route('/sprints/<int:sprint_id>/start', methods=['POST'])
@jwt_required()
def start_sprint(sprint_id):
    sprint = Sprint.query.get_or_404(sprint_id)
    sprint.status = 'ACTIVE'
    db.session.commit()
    return jsonify(sprint.to_dict()), 200

@product_planner_bp.route('/sprints/<int:sprint_id>/complete', methods=['POST'])
@jwt_required()
def complete_sprint(sprint_id):
    sprint = Sprint.query.get_or_404(sprint_id)
    sprint.status = 'COMPLETED'
    
    # Move incomplete features to backlog
    for feature in sprint.features:
        if feature.status not in [FeatureStatus.DONE, FeatureStatus.SHIPPED]:
            feature.sprint_id = None
            feature.status = FeatureStatus.BACKLOG
            
    db.session.commit()
    return jsonify(sprint.to_dict()), 200


# --- Release Management ---

@product_planner_bp.route('/products/<int:product_id>/releases', methods=['GET'])
@jwt_required()
def get_releases(product_id):
    releases = Release.query.filter_by(product_id=product_id).order_by(Release.target_date).all()
    return jsonify([r.to_dict() for r in releases]), 200

@product_planner_bp.route('/products/<int:product_id>/releases', methods=['POST'])
@jwt_required()
def create_release(product_id):
    data = request.get_json()
    try:
        release = Release(
            product_id=product_id,
            version=data['version'],
            name=data.get('name'),
            description=data.get('description'),
            target_date=datetime.fromisoformat(data['target_date'].replace('Z', '')) if data.get('target_date') else None,
            status='PLANNED'
        )
        db.session.add(release)
        db.session.commit()
        
        # Assign features if provided
        if 'feature_ids' in data and data['feature_ids']:
            for feature_id in data['feature_ids']:
                feature = Feature.query.get(feature_id)
                if feature and feature.product_id == product_id:
                    feature.release_id = release.id
            db.session.commit()

        return jsonify(release.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@product_planner_bp.route('/releases/<int:release_id>', methods=['PUT'])
@jwt_required()
def update_release(release_id):
    release = Release.query.get_or_404(release_id)
    data = request.get_json()
    
    if 'version' in data: release.version = data['version']
    if 'name' in data: release.name = data['name']
    if 'description' in data: release.description = data['description']
    if 'status' in data: release.status = data['status']
    if 'target_date' in data: 
        release.target_date = datetime.fromisoformat(data['target_date'].replace('Z', '')) if data['target_date'] else None
    if 'release_notes' in data: release.release_notes = data['release_notes']

    db.session.commit()
    return jsonify(release.to_dict()), 200

@product_planner_bp.route('/releases/<int:release_id>/generate-notes', methods=['POST'])
@jwt_required()
def generate_release_notes(release_id):
    release = Release.query.get_or_404(release_id)
    
    # Simple generation logic (Mock AI)
    features = release.features
    
    notes = f"# Release Notes: {release.version}\n"
    if release.name:
        notes += f"**{release.name}**\n"
    notes += f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
    
    if not features:
        notes += "No features included in this release yet."
    else:
        notes += "## New Features\n"
        for feature in features:
             notes += f"- **{feature.name}**: {feature.description or 'No description'}\n"
             
    release.release_notes = notes
    db.session.commit()
    
    return jsonify({'release_notes': notes, 'release': release.to_dict()}), 200


# --- Analytics Endpoints ---

@product_planner_bp.route('/analytics/overview', methods=['GET'])
@jwt_required()
def get_product_analytics_overview():
    """Get aggregated product metrics for the startup"""
    import logging
    logger = logging.getLogger(__name__)
    
    current_user_id = get_jwt_identity()
    logger.info(f'Analytics overview requested by user_id: {current_user_id}')
    
    user = User.query.get(current_user_id)
    
    if not user:
        logger.error(f'User not found: {current_user_id}')
        return jsonify({'error': 'User not found'}), 404
    
    # Get user's startup (users can own startups or be team members)
    startup = None
    if user.startups:
        startup = user.startups[0]
    elif hasattr(user, 'team_memberships') and user.team_memberships:
        startup = user.team_memberships[0].startup
    
    if not startup:
        logger.error(f'User {current_user_id} has no associated startup')
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    logger.info(f'User {current_user_id} belongs to startup {startup.id}')
    data = product_analytics_service.calculate_product_overview(startup.id)
    return jsonify({'success': True, 'data': data}), 200



@product_planner_bp.route('/analytics/feature-distribution', methods=['GET'])
@jwt_required()
def get_feature_distribution():
    """Get feature breakdown by status"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    startup = user.startups[0] if user.startups else (user.team_memberships[0].startup if hasattr(user, 'team_memberships') and user.team_memberships else None)
    if not startup:
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    data = product_analytics_service.calculate_feature_distribution(startup.id)
    return jsonify({'success': True, 'data': data}), 200


@product_planner_bp.route('/analytics/sprint-velocity', methods=['GET'])
@jwt_required()
def get_sprint_velocity():
    """Get sprint velocity over time"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    startup = user.startups[0] if user.startups else (user.team_memberships[0].startup if hasattr(user, 'team_memberships') and user.team_memberships else None)
    if not startup:
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    limit = request.args.get('limit', 6, type=int)
    data = product_analytics_service.calculate_sprint_velocity(startup.id, limit)
    return jsonify({'success': True, 'data': data}), 200


@product_planner_bp.route('/analytics/release-timeline', methods=['GET'])
@jwt_required()
def get_release_timeline():
    """Get upcoming and recent releases"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    startup = user.startups[0] if user.startups else (user.team_memberships[0].startup if hasattr(user, 'team_memberships') and user.team_memberships else None)
    if not startup:
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    data = product_analytics_service.calculate_release_timeline(startup.id)
    return jsonify({'success': True, 'data': data}), 200


@product_planner_bp.route('/analytics/product-health', methods=['GET'])
@jwt_required()
def get_product_health():
    """Get product health indicators"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    startup = user.startups[0] if user.startups else (user.team_memberships[0].startup if hasattr(user, 'team_memberships') and user.team_memberships else None)
    if not startup:
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    data = product_analytics_service.calculate_product_health(startup.id)
    return jsonify({'success': True, 'data': data}), 200


@product_planner_bp.route('/analytics/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent product-related activity"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    startup = user.startups[0] if user.startups else (user.team_memberships[0].startup if hasattr(user, 'team_memberships') and user.team_memberships else None)
    if not startup:
        return jsonify({'error': 'User not associated with a startup'}), 400
    
    limit = request.args.get('limit', 10, type=int)
    data = product_analytics_service.get_recent_activity(startup.id, limit)
    return jsonify({'success': True, 'data': data}), 200


# --- Bulk Feature Assignment ---

@product_planner_bp.route('/sprints/<int:sprint_id>/assign-features', methods=['POST'])
@jwt_required()
def assign_features_to_sprint(sprint_id):
    """Assign multiple features to a sprint"""
    sprint = Sprint.query.get_or_404(sprint_id)
    data = request.get_json()
    feature_ids = data.get('feature_ids', [])
    
    if not feature_ids:
        return jsonify({'error': 'No features provided'}), 400
    
    # Update all features
    updated_count = 0
    for feature_id in feature_ids:
        feature = Feature.query.get(feature_id)
        if feature and feature.product_id == sprint.product_id:
            feature.sprint_id = sprint_id
            updated_count += 1
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'{updated_count} features assigned to sprint',
        'sprint': sprint.to_dict()
    }), 200


@product_planner_bp.route('/releases/<int:release_id>/assign-features', methods=['POST'])
@jwt_required()
def assign_features_to_release(release_id):
    """Assign multiple features to a release"""
    release = Release.query.get_or_404(release_id)
    data = request.get_json()
    feature_ids = data.get('feature_ids', [])
    
    if not feature_ids:
        return jsonify({'error': 'No features provided'}), 400
    
    # Update all features
    updated_count = 0
    for feature_id in feature_ids:
        feature = Feature.query.get(feature_id)
        if feature and feature.product_id == release.product_id:
            feature.release_id = release_id
            updated_count += 1
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'{updated_count} features assigned to release',
        'release': release.to_dict()
    }), 200


@product_planner_bp.route('/features/<int:feature_id>/unassign', methods=['POST'])
@jwt_required()
def unassign_feature(feature_id):
    """Unassign a feature from sprint and/or release"""
    feature = Feature.query.get_or_404(feature_id)
    data = request.get_json()
    
    unassign_type = data.get('type', 'both')  # 'sprint', 'release', or 'both'
    
    if unassign_type in ['sprint', 'both']:
        feature.sprint_id = None
    
    if unassign_type in ['release', 'both']:
        feature.release_id = None
    
    db.session.commit()
    return jsonify({
        'success': True,
        'message': 'Feature unassigned',
        'feature': feature.to_dict()
    }), 200

