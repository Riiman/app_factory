"""
analytics.py - Endpoints for managing analytics and metrics
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Startup, StageInstance, Metric, db, Submission
from app.utils.azure_openai_utils import generate_evaluation_insights
from flask import stream_with_context, Response

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analyze-submission', methods=['POST'])
@jwt_required()
def analyze_submission():
    try:
        data = request.get_json()
        submission_id = data.get('submission_id')

        if not submission_id:
            return jsonify({'success': False, 'error': 'Submission ID is required'}), 400

        submission = Submission.query.get(submission_id)

        if not submission:
            return jsonify({'success': False, 'error': 'Submission not found'}), 404

        # Call the Gemini API to generate insights
        insights_stream = generate_evaluation_insights(submission)

        # Consume and print the stream for debugging
        full_response = ""
        for chunk in insights_stream:
            full_response += chunk
            print(f"Stream chunk: {chunk}") # Print each chunk
        print(f"Full streamed response: {full_response}") # Print the full response

        # Re-create the stream for the actual response
        insights_stream = generate_evaluation_insights(submission)

        return Response(stream_with_context(insights_stream), mimetype='text/event-stream')

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


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
