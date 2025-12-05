from flask import Blueprint, jsonify, request, session
from app.extensions import db
from app.models import DashboardNotification
from app.utils.decorators import admin_required
from flask_jwt_extended import jwt_required


from app.services.notification_service import publish_update

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('', methods=['GET'])
# @jwt_required() # Uncomment when login_required is available/verified
def get_notifications():

    # For now, fetching all notifications or filtering by user if user_id is in session
    # Assuming user_id is in session for logged in users
    # user_id = session.get('user_id')
    # if not user_id:
    #     return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    
    # Fetching all for demo/admin purposes if no strict auth yet, or filtering by a default admin user ID if needed.
    # Ideally: notifications = DashboardNotification.query.filter_by(user_id=user_id).order_by(DashboardNotification.created_at.desc()).all()
    
    notifications = DashboardNotification.query.order_by(DashboardNotification.created_at.desc()).limit(50).all()
    return jsonify({'success': True, 'notifications': [n.to_dict() for n in notifications]}), 200

@notifications_bp.route('', methods=['POST'])
# @jwt_required()
def create_notification():

    data = request.get_json()
    
    required_fields = ['user_id', 'title', 'message']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'error': f'Missing required field: {field}'}), 400

    notification = DashboardNotification(
        user_id=data['user_id'],
        title=data['title'],
        message=data['message'],
        type=data.get('type', 'info')
    )
    
    db.session.add(notification)
    db.session.commit()
    
    publish_update("notification_created", {"notification": notification.to_dict()}, rooms=[f"user_{notification.user_id}"])
    
    return jsonify({'success': True, 'notification': notification.to_dict()}), 201

@notifications_bp.route('/<int:notification_id>/read', methods=['PUT'])
# @jwt_required()
def mark_as_read(notification_id):

    notification = DashboardNotification.query.get_or_404(notification_id)
    notification.read = True
    db.session.commit()
    
    publish_update("notification_read", {"notification_id": notification.id}, rooms=[f"user_{notification.user_id}"])
    
    return jsonify({'success': True, 'notification': notification.to_dict()}), 200
