from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, Product, Feature, ProductMetric, ProductIssue, ProductBusinessDetails, ActivityLog, TeamMember
from app import db
from app.services.notification_service import publish_update

product_bp = Blueprint('product', __name__, url_prefix='/api/startups')

def validate_startup_access(startup, user, required_scope=None):
    if not user: return False
    # Super Admin
    if user.organization_id == 1 and user.role == UserRole.ADMIN: return True
    if startup.organization_id != user.organization_id: return False
    # Owner
    if startup.user_id == user.id: return True
    # Org Admin
    if user.role == UserRole.ADMIN: return True
    # Team Member
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        if required_scope is None: return True
        if member.scopes and required_scope in member.scopes: return True
            
    return False

@product_bp.route('/<int:startup_id>/products', methods=['GET'])
@jwt_required()
def get_products(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    products = [p.to_dict() for p in startup.products]
    return jsonify({'success': True, 'products': products}), 200

@product_bp.route('/<int:startup_id>/products', methods=['POST'])
@jwt_required()
def create_product(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Product name is required.'}), 400
    
    try:
        if 'targeted_launch_date' in data:
            if data['targeted_launch_date']:
                data['targeted_launch_date'] = datetime.strptime(data['targeted_launch_date'], '%Y-%m-%d').date()
            else:
                data['targeted_launch_date'] = None
        if 'actual_launch_date' in data:
            if data['actual_launch_date']:
                data['actual_launch_date'] = datetime.strptime(data['actual_launch_date'], '%Y-%m-%d').date()
            else:
                data['actual_launch_date'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    new_product = Product(startup_id=startup_id, **data)
    db.session.add(new_product)
    db.session.commit()
    
    publish_update("product_created", {"startup_id": startup_id, "product": new_product.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Product',
        target_id=new_product.id,
        details=new_product.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'product': new_product.to_dict()}), 201

@product_bp.route('/<int:startup_id>/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        setattr(product, key, value)
    db.session.commit()
    
    publish_update("product_updated", {"startup_id": startup_id, "product": product.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'product': product.to_dict()}), 200

@product_bp.route('/<int:startup_id>/products/<int:product_id>/features', methods=['POST'])
@jwt_required()
def create_feature(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Feature name is required.'}), 400
    new_feature = Feature(product_id=product_id, **data)
    db.session.add(new_feature)
    db.session.commit()
    
    publish_update("feature_created", {"startup_id": startup_id, "product_id": product_id, "feature": new_feature.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Feature',
        target_id=new_feature.id,
        details=new_feature.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'feature': new_feature.to_dict()}), 201

@product_bp.route('/<int:startup_id>/products/<int:product_id>/features/<int:feature_id>', methods=['PUT'])
@jwt_required()
def update_feature(startup_id, product_id, feature_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    feature = Feature.query.get_or_404(feature_id)
    if feature.product_id != product_id:
        return jsonify({'success': False, 'error': 'Feature does not belong to this product.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    feature.name = data.get('name', feature.name)
    feature.description = data.get('description', feature.description)
    feature.acceptance_criteria = data.get('acceptance_criteria', feature.acceptance_criteria)
    feature.status = data.get('status', feature.status)
    
    db.session.commit()
    
    publish_update("feature_updated", {"startup_id": startup_id, "product_id": product_id, "feature": feature.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'feature': feature.to_dict()}), 200

@product_bp.route('/<int:startup_id>/products/<int:product_id>/metrics', methods=['POST'])
@jwt_required()
def create_metric(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'metric_name' not in data:
        return jsonify({'success': False, 'error': 'Metric name is required.'}), 400
    if 'date_recorded' in data and data['date_recorded']:
        try:
            data['date_recorded'] = datetime.strptime(data['date_recorded'], '%Y-%m-%d').date()
        except ValueError:
             return jsonify({'success': False, 'error': 'Invalid date format for date_recorded. Expected YYYY-MM-DD.'}), 400
    new_metric = ProductMetric(product_id=product_id, **data)
    db.session.add(new_metric)
    db.session.commit()
    
    publish_update("metric_created", {"startup_id": startup_id, "product_id": product_id, "metric": new_metric.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Metric',
        target_id=new_metric.metric_id,
        details=new_metric.metric_name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'metric': new_metric.to_dict()}), 201

@product_bp.route('/<int:startup_id>/products/<int:product_id>/metrics/<int:metric_id>', methods=['PUT'])
@jwt_required()
def update_metric(startup_id, product_id, metric_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    metric = ProductMetric.query.get_or_404(metric_id)
    if metric.product_id != product_id:
        return jsonify({'success': False, 'error': 'Metric does not belong to this product.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    metric.metric_name = data.get('metric_name', metric.metric_name)
    metric.value = data.get('value', metric.value)
    metric.target_value = data.get('target_value', metric.target_value)
    metric.unit = data.get('unit', metric.unit)
    metric.period = data.get('period', metric.period)

    date_recorded_str = data.get('date_recorded')
    if date_recorded_str:
        metric.date_recorded = datetime.strptime(date_recorded_str, '%Y-%m-%d').date()
    else:
        metric.date_recorded = None
    
    db.session.commit()
    
    publish_update("dashboard_update", {
        "model": "ProductMetric",
        "id": metric_id,
        "product_id": product_id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }, rooms=[f"user_{startup.user_id}", "admin"])

    return jsonify({'success': True, 'metric': metric.to_dict()}), 200

@product_bp.route('/<int:startup_id>/products/<int:product_id>/issues', methods=['POST'])
@jwt_required()
def create_issue(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'success': False, 'error': 'Issue title is required.'}), 400
    new_issue = ProductIssue(product_id=product_id, created_by=user_id, **data)
    db.session.add(new_issue)
    db.session.commit()
    
    publish_update("issue_created", {"startup_id": startup_id, "product_id": product_id, "issue": new_issue.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='reported',
        target_type='Issue',
        target_id=new_issue.issue_id,
        details=new_issue.title
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'issue': new_issue.to_dict()}), 201

@product_bp.route('/<int:startup_id>/products/<int:product_id>/business-details', methods=['PUT'])
@jwt_required()
def update_product_business_details(startup_id, product_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='PRODUCT'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    product = Product.query.get_or_404(product_id)
    if product.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Product does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    business_details = product.business_details or ProductBusinessDetails(product_id=product.id)
    for key, value in data.items():
        setattr(business_details, key, value)
    db.session.add(business_details)
    db.session.commit()
    
    publish_update("product_business_details_updated", {"startup_id": startup_id, "product_id": product_id, "business_details": business_details.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'business_details': business_details.to_dict()}), 200
