from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import BusinessModel, Startup, User, BusinessModelType, BusinessModelStatus, Account
from app.services import business_analytics_service

business_models_bp = Blueprint('business_models', __name__)

def validate_startup_access(startup, user, required_scope='BUSINESS'):
    if user.role == 'admin':
        return True
    if startup.user_id == user.id:
        return True
    # Team member check can be added here
    return False


@business_models_bp.route('/api/startups/<int:startup_id>/business-models', methods=['GET'])
@jwt_required()
def get_business_models(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    # Get enriched models with actual performance metrics
    enriched_models = business_analytics_service.get_enriched_business_models(startup_id)
    return jsonify({'success': True, 'business_models': enriched_models}), 200

@business_models_bp.route('/api/startups/<int:startup_id>/business-models', methods=['POST'])
@jwt_required()
def create_business_model(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Name is required'}), 400

    new_model = BusinessModel(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        model_type=data.get('model_type', 'TRANSACTIONAL'),

        model_config=data.get('model_config'),
        revenue_account_id=data.get('revenue_account_id'),
        cost_account_id=data.get('cost_account_id'),
        status=BusinessModelStatus.ACTIVE,
        target_arpu=data.get('target_arpu'),
        target_cac=data.get('target_cac'),
        target_margin=data.get('target_margin')
    )
    
    db.session.add(new_model)
    db.session.commit()
    
    return jsonify({'success': True, 'business_model': new_model.to_dict()}), 201

@business_models_bp.route('/api/startups/<int:startup_id>/business-models/<int:model_id>', methods=['PUT'])
@jwt_required()
def update_business_model(startup_id, model_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    model = BusinessModel.query.get_or_404(model_id)
    if model.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Model not found in this startup'}), 404

    data = request.get_json()
    

    
    if 'name' in data: model.name = data['name']
    if 'description' in data: model.description = data['description']
    if 'model_type' in data: model.model_type = data['model_type']
    if 'model_config' in data: model.model_config = data['model_config']
    if 'revenue_account_id' in data: model.revenue_account_id = data['revenue_account_id']
    if 'cost_account_id' in data: model.cost_account_id = data['cost_account_id']
    if 'status' in data: model.status = data['status']
    
    if 'target_arpu' in data: model.target_arpu = data['target_arpu']
    if 'target_cac' in data: model.target_cac = data['target_cac']
    if 'target_margin' in data: model.target_margin = data['target_margin']

    db.session.commit()
    
    # Return enriched model with analytics
    enriched_models = business_analytics_service.get_enriched_business_models(startup_id)
    updated_model = next((m for m in enriched_models if m['id'] == model_id), model.to_dict())
    
    return jsonify({'success': True, 'business_model': updated_model}), 200

@business_models_bp.route('/api/startups/<int:startup_id>/business-models/<int:model_id>', methods=['DELETE'])
@jwt_required()
def delete_business_model(startup_id, model_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    model = BusinessModel.query.get_or_404(model_id)
    if model.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Model not found in this startup'}), 404

    db.session.delete(model)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Business model deleted'}), 200
