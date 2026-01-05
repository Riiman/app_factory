"""
V4 Builder Routes

API routes for V4 autonomous code generation system.
"""

from flask import Blueprint, request, jsonify
import logging

from app.startup_builder.v4.workflows import MissionExecutor, TaskExecutor

logger = logging.getLogger(__name__)

# Create blueprint
v4_builder = Blueprint('v4_builder', __name__, url_prefix='/api/builder/v4')


@v4_builder.route('/start', methods=['POST'])
def start_mission():
    """
    Start a V4 mission.
    
    Request:
    {
        "startup_id": "123",
        "mission": "Create login page",
        "mission_type": "ui_component",
        "priority": "high",
        "options": {
            "safety_level": "high",
            "auto_heal": true,
            "learn": true
        }
    }
    
    Response:
    {
        "status": "success",
        "mission_id": "uuid",
        "result": {...}
    }
    """
    try:
        data = request.json
        
        startup_id = data.get('startup_id')
        mission = data.get('mission')
        mission_type = data.get('mission_type', 'general')
        priority = data.get('priority', 'medium')
        options = data.get('options', {})
        
        if not startup_id or not mission:
            return jsonify({
                'status': 'error',
                'error': 'Missing required fields: startup_id, mission'
            }), 400
        
        # Create mission executor
        executor = MissionExecutor(startup_id)
        
        # Generate mission ID
        import uuid
        mission_id = str(uuid.uuid4())
        
        # Execute mission
        result = executor.execute_mission(
            mission_id=mission_id,
            mission_type=mission_type,
            description=mission,
            priority=priority,
            context=options
        )
        
        return jsonify({
            'status': 'success',
            'mission_id': mission_id,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error starting mission: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@v4_builder.route('/task', methods=['POST'])
def execute_task():
    """
    Execute a single V4 task.
    
    Request:
    {
        "startup_id": "123",
        "task_type": "run_shell",
        "task_data": {
            "command": "npm install",
            "directory": "frontend"
        }
    }
    
    Response:
    {
        "status": "success",
        "result": {...}
    }
    """
    try:
        data = request.json
        
        startup_id = data.get('startup_id')
        task_type = data.get('task_type')
        task_data = data.get('task_data', {})
        
        if not startup_id or not task_type:
            return jsonify({
                'status': 'error',
                'error': 'Missing required fields: startup_id, task_type'
            }), 400
        
        # Create task executor
        executor = TaskExecutor(startup_id)
        
        # Execute task
        result = executor.execute_task(
            task_type=task_type,
            task_data=task_data
        )
        
        return jsonify({
            'status': 'success',
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error executing task: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@v4_builder.route('/stats/<startup_id>', methods=['GET'])
def get_stats(startup_id):
    """
    Get V4 system statistics for a startup.
    
    Response:
    {
        "status": "success",
        "stats": {...}
    }
    """
    try:
        # Create executor to get stats
        executor = MissionExecutor(startup_id)
        stats = executor.get_stats()
        
        return jsonify({
            'status': 'success',
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@v4_builder.route('/health', methods=['GET'])
def health_check():
    """
    V4 system health check.
    
    Response:
    {
        "status": "healthy",
        "version": "4.0.0"
    }
    """
    return jsonify({
        'status': 'healthy',
        'version': '4.0.0',
        'features': {
            'safety': True,
            'healing': True,
            'knowledge': False,  # Disabled by default
            'prompting': False,  # Opt-in
            'generation': False  # Opt-in
        }
    })
