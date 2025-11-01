"""
analytics.py - Endpoints for managing analytics and metrics
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, Metric, db

analytics_bp = Blueprint('analytics', __name__)

# Platform endpoints
@analytics_bp.route('/platform/startups/<int:startup_id>/metrics', methods=['POST'])
@jwt_required()
def update_startup_metrics(startup_id):
    # ... (add authorization for platform team)
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    data = request.get_json()
    metrics_data = data.get('metrics', [])

    for metric_data in metrics_data:
        metric = Metric.query.filter_by(
            stage_instance_id=startup.stage_instances[0].id, # Assuming first stage for now
            key=metric_data['key']
        ).first()

        if metric:
            metric.value = metric_data.get('value', metric.value)
            metric.target = metric_data.get('target', metric.target)
            metric.unit = metric_data.get('unit', metric.unit)
            metric.metric_type = metric_data.get('metric_type', metric.metric_type)
            metric.last_synced_at = datetime.utcnow()
        else:
            metric = Metric(
                stage_instance_id=startup.stage_instances[0].id, # Assuming first stage for now
                key=metric_data['key'],
                name=metric_data['name'],
                value=metric_data.get('value'),
                target=metric_data.get('target'),
                unit=metric_data.get('unit'),
                metric_type=metric_data.get('metric_type', 'product'),
                last_synced_at=datetime.utcnow()
            )
            db.session.add(metric)
    db.session.commit()
    return jsonify({'success': True})

# Founder endpoints
@analytics_bp.route('/dashboard/analytics', methods=['GET'])
@jwt_required()
def get_dashboard_analytics():
    user_id = int(get_jwt_identity())
    startup = Startup.query.filter_by(user_id=user_id).first()
    if not startup:
        return jsonify({'success': False, 'error': 'Startup not found'}), 404

    # Fetch all metrics associated with the startup's stage instances
    metrics = db.session.query(Metric).join(StageInstance).filter(
        StageInstance.startup_id == startup.id
    ).all()

    return jsonify({
        'success': True,
        'data': [m.to_dict() for m in metrics]
    })
