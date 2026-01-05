"""
V4 Compatibility Layer

Provides backward compatibility with V3 routes while using V4 internally.
"""

from flask import Blueprint, request, jsonify
import logging

from app.startup_builder.v4.workflows import MissionExecutor

logger = logging.getLogger(__name__)

# Create compatibility blueprint
v3_compat = Blueprint('v3_compat', __name__, url_prefix='/api/builder/v3')


@v3_compat.route('/start', methods=['POST'])
def start_v3_mission():
    """
    V3 compatibility endpoint - uses V4 internally.
    
    Accepts V3 request format and translates to V4.
    """
    try:
        data = request.json
        
        startup_id = data.get('startup_id')
        mission = data.get('mission')
        
        if not startup_id or not mission:
            return jsonify({
                'status': 'error',
                'error': 'Missing required fields'
            }), 400
        
        # Use V4 executor internally
        executor = MissionExecutor(startup_id)
        
        import uuid
        mission_id = str(uuid.uuid4())
        
        # Execute with V4
        result = executor.execute_mission(
            mission_id=mission_id,
            mission_type='general',
            description=mission,
            priority='medium'
        )
        
        # Return V3-compatible response
        return jsonify({
            'status': 'success' if result['success'] else 'error',
            'logs': _format_logs_v3(result),
            'plan': result.get('plan', {}).get('tasks', [])
        })
        
    except Exception as e:
        logger.error(f"V3 compatibility error: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


def _format_logs_v3(v4_result):
    """Format V4 result as V3 logs"""
    logs = []
    
    # Add plan info
    if 'plan' in v4_result:
        logs.append(f"Strategy: {v4_result['plan']['strategy']['name']}")
        logs.append(f"Tasks: {len(v4_result['plan']['tasks'])}")
    
    # Add execution results
    if 'execution_results' in v4_result:
        for i, result in enumerate(v4_result['execution_results']):
            status = "✅" if result.get('success') else "❌"
            logs.append(f"{status} Task {i+1}: {result.get('message', 'Completed')}")
    
    # Add metrics
    if 'metrics' in v4_result:
        metrics = v4_result['metrics']
        logs.append(f"\nMetrics:")
        logs.append(f"  Success rate: {metrics.get('success_rate', 0):.0%}")
        logs.append(f"  Execution time: {metrics.get('execution_time', 0):.1f}s")
    
    return logs
