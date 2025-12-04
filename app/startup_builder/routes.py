from flask import request, jsonify
import logging
from . import builder_bp
from .manager import DockerManager
from .graph import create_graph
from .agent import MultiAgentSystem

manager = DockerManager()
agent = MultiAgentSystem()
graph = create_graph(
    agent.architect_node,
    agent.spec_approval_node,
    agent.task_manager_node,
    agent.reasoning_node,
    agent.planner_node,
    agent.developer_node,
    agent.executor_node,
    agent.reviewer_node,
    agent.debugger_node,
    agent.strategist_node, # New Node
    agent.overseer_node,
    agent.tester_node
)

import threading

building_tasks = {}

@builder_bp.route('/<startup_id>/start', methods=['POST'])
def start_env(startup_id):
    from app.models import Startup
    from app.extensions import db
    
    print(f"Received start_env request for {startup_id}")
    data = request.json or {}
    stack_type = data.get('stack_type', 'MERN')
    print(f"Stack type: {stack_type}")
    
    # Fetch startup from database
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({"error": "Startup not found"}), 404

    if startup_id in building_tasks and building_tasks[startup_id].is_alive():
         return jsonify({"status": "building", "message": "Build in progress..."})

    # Check if already running (fast check)
    if startup.container_name:
        try:
            container = manager.client.containers.get(startup.container_name)
            if container.status == 'running':
                container.reload()
                ports = container.attrs['NetworkSettings']['Ports']
                return jsonify({
                    "status": "running", 
                    "container_id": container.id, 
                    "ports": ports,
                    "container_name": startup.container_name
                })
        except:
            # Container doesn't exist anymore, clear the name from DB
            startup.container_name = None
            db.session.commit()

    # Capture the app instance for the background thread
    from flask import current_app
    app = current_app._get_current_object()

    def build_task():
        with app.app_context():
            from app.extensions import socketio
            room = f"startup_{startup_id}"
            
            try:
                # Emit build started event
                socketio.emit('build_started', {
                    'startup_id': startup_id,
                    'stack_type': stack_type
                }, room=room, namespace='/builder')
                
                # Re-fetch startup within this thread's app context
                from app.models import Startup
                startup_obj = Startup.query.get(startup_id)
                if not startup_obj:
                    print(f"Startup {startup_id} not found in build task")
                    socketio.emit('build_failed', {
                        'startup_id': startup_id,
                        'error': 'Startup not found'
                    }, room=room, namespace='/builder')
                    return
                
                print(f"Starting async build for {startup_id}")
                result = manager.ensure_container(startup_id, stack_type=stack_type, container_name=startup_obj.container_name)
                
                # Check for errors
                if result.get("error"):
                    print(f"Build failed: {result['error']}")
                    socketio.emit('build_failed', {
                        'startup_id': startup_id,
                        'error': result['error']
                    }, room=room, namespace='/builder')
                    return
                
                # Save container_name to database if it was generated
                if result.get("container_name") and not startup_obj.container_name:
                    startup_obj.container_name = result["container_name"]
                    db.session.commit()
                    print(f"Saved container name {result['container_name']} to database")
                
                print(f"Async build finished for {startup_id}")
                
                # Emit build complete event
                socketio.emit('build_complete', {
                    'startup_id': startup_id,
                    'status': result.get('status'),
                    'container_id': result.get('container_id'),
                    'ports': result.get('ports'),
                    'container_name': result.get('container_name')
                }, room=room, namespace='/builder')
                
            except Exception as e:
                print(f"Async build failed for {startup_id}: {e}")
                import traceback
                traceback.print_exc()
                
                # Emit build failed event
                socketio.emit('build_failed', {
                    'startup_id': startup_id,
                    'error': str(e)
                }, room=room, namespace='/builder')
    
    thread = threading.Thread(target=build_task)
    thread.start()
    building_tasks[startup_id] = thread
    
    return jsonify({"status": "building", "message": "Started build process"})

@builder_bp.route('/<startup_id>/env-status', methods=['GET'])
def env_status(startup_id):
    from app.models import Startup
    
    startup = Startup.query.get(startup_id)
    if not startup or not startup.container_name:
        return jsonify({"status": "stopped"})
    
    try:
        container = manager.client.containers.get(startup.container_name)
        if container.status == 'running':
            ports = container.attrs['NetworkSettings']['Ports']
            return jsonify({"status": "running", "container_id": container.id, "ports": ports})
        else:
            return jsonify({"status": "stopped"})
    except Exception:
        return jsonify({"status": "stopped"})

@builder_bp.route('/<startup_id>/stop', methods=['POST'])
def stop_env(startup_id):
    from app.models import Startup
    from app.extensions import db
    
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({"error": "Startup not found"}), 404
    
    # Stop and remove the container
    if startup.container_name:
        result = manager.cleanup_container(startup.container_name)
        # Clear container_name from database
        startup.container_name = None
        db.session.commit()
        return jsonify(result)
    else:
        return jsonify({"status": "not_found"})

@builder_bp.route('/<startup_id>/command', methods=['POST'])
def run_command(startup_id):
    data = request.json
    command = data.get('command')
    if not command:
        return jsonify({'error': 'Command required'}), 400
    
    result = manager.run_command(startup_id, command)
    return jsonify(result)

@builder_bp.route('/<startup_id>/approve', methods=['POST'])
def approve_step(startup_id):
    yolo = request.json.get('yolo', False) # Allow switching to YOLO mid-stream
    
    # Resume the graph with interaction_completed
    initial_state = {"interaction_completed": True}
    
    # Run in background
    run_agent_bg(startup_id, initial_state, yolo)
    
    return jsonify({"status": "success", "message": "Step approved, resuming in background"})

@builder_bp.route('/<startup_id>/status', methods=['GET'])
def get_status(startup_id):
    """Returns the current state of the agent for UI persistence."""
    config = {"configurable": {"thread_id": startup_id}}
    try:
        snapshot = graph.get_state(config)
        if not snapshot.values:
             return jsonify({"status": "idle"})
             
        state = snapshot.values
        return jsonify({
            "status": "active",
            "task_status": state.get("status", "unknown"),
            "current_task": state.get("current_task"),
            "logs": state.get("logs", []),
            "plan": state.get("plan", []),
            "total_tasks": state.get("total_tasks", 0),
            "completed_tasks": state.get("completed_tasks", 0),
            "waiting_approval": not snapshot.next, # If no next step, it's waiting
            "waiting_interaction": state.get("status") == "waiting_interaction"
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

@builder_bp.route('/<startup_id>/features', methods=['GET'])
def get_features(startup_id):
    # Find products for startup
    products = Product.query.filter_by(startup_id=startup_id).all()
    result = []
    for p in products:
        p_data = p.to_dict()
        # Ensure features are included
        p_data['features'] = [f.to_dict() for f in p.features]
        result.append(p_data)
    return jsonify(result)

from app.models import Product, Feature, FeatureStatus, ProductStage
from app.extensions import db

@builder_bp.route('/<startup_id>/run-task', methods=['POST'])
def run_task(startup_id):
    data = request.json
    goal = data.get('goal')
    yolo = data.get('yolo', False)
    product_id = data.get('product_id')
    feature_id = data.get('feature_id')
    
    if not goal:
        return jsonify({'error': 'Goal required'}), 400

    # Update DB Status
    try:
        if product_id:
            product = Product.query.get(product_id)
            if product:
                product.stage = ProductStage.DEVELOPMENT
                db.session.commit()
        elif feature_id:
            feature = Feature.query.get(feature_id)
            if feature:
                feature.status = FeatureStatus.IN_PROGRESS
                db.session.commit()
    except Exception as e:
        print(f"Error updating DB status: {e}")
        
    # Initialize State
    initial_state = {
        "startup_id": startup_id,
        "goal": goal,
        "context": "",
        "plan": [],
        "current_step_index": 0,
        "current_step": {},
        "code_changes": {},
        "error_history": [],
        "logs": [],
        "status": "start",
        "total_tasks": 0,
        "completed_tasks": 0
    }
    
    # Run in background
    run_agent_bg(startup_id, initial_state, yolo)
    
    return jsonify({"status": "success", "message": "Task started in background"})

@builder_bp.route('/<startup_id>/build-feature', methods=['POST'])
def build_feature(startup_id):
    data = request.json
    feature_id = data.get('feature_id')
    yolo = data.get('yolo', False)
    
    feature = Feature.query.get(feature_id)
    if not feature:
        return jsonify({'error': 'Feature not found'}), 404
        
    product = feature.product
    
    # Construct a detailed goal for the agent
    goal = f"""
    Implement Feature: {feature.name}
    Context: Product '{product.name}' - {product.description}
    Feature Description: {feature.description}
    Acceptance Criteria: {feature.acceptance_criteria}
    
    Tech Stack: {product.tech_stack}
    
    Task:
    1. Analyze the existing codebase.
    2. Implement the feature '{feature.name}' following the description.
    3. Ensure it meets the acceptance criteria.
    """
    
    # Initialize State
    initial_state = {
        "startup_id": startup_id,
        "goal": goal,
        "context": "",
        "plan": [],
        "current_step_index": 0,
        "current_step": {},
        "code_changes": {},
        "error_history": [],
        "logs": [],
        "status": "planning"
    }
    
    try:
        # Update feature status
        feature.status = FeatureStatus.IN_PROGRESS
        db.session.commit()
        
        # Run in background
        run_agent_bg(startup_id, initial_state, yolo, feature_id=feature.id)
        
        return jsonify({"status": "success", "message": "Feature build started in background"})

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

def run_agent_bg(startup_id, initial_state, yolo, feature_id=None):
    """Runs the agent graph in a background thread."""
    from flask import current_app
    app = current_app._get_current_object()
    
    def task():
        with app.app_context():
            config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 100}
            
            # Initialize state tracker from current snapshot to ensure history is preserved
            state_tracker = {}
            try:
                snapshot = graph.get_state(config)
                if snapshot.values:
                    state_tracker = snapshot.values.copy()
            except:
                pass
            
            # Update with new input
            state_tracker.update(initial_state)
            current_input = initial_state
            final_state = None
            
            try:
                while True:
                    for event in graph.stream(current_input, config=config):
                        for key, value in event.items():
                            if key == "__interrupt__":
                                continue
                                
                            if isinstance(value, dict):
                                state_tracker.update(value)
                            
                            final_state = value
                            
                            # Emit update via WebSocket
                            from app.extensions import socketio
                            socketio.emit('agent_update', {
                                'logs': state_tracker.get("logs", []),
                                'plan': state_tracker.get("plan", []),
                                'task_status': state_tracker.get("status", "unknown"),
                                'total_tasks': state_tracker.get("total_tasks", 0),
                                'completed_tasks': state_tracker.get("completed_tasks", 0),
                                'current_step': state_tracker.get("current_step", {}),
                                'waiting_approval': False # Default
                            }, room=f"startup_{startup_id}", namespace='/builder')
                    
                    snapshot = graph.get_state(config)
                    
                    if not snapshot.next:
                        break
                        
                    if yolo:
                        current_input = None
                        continue
                    else:
                        # Waiting for approval
                        from app.extensions import socketio
                        socketio.emit('agent_update', {
                            'waiting_approval': True,
                            'current_step': snapshot.values.get("current_step", {})
                        }, room=f"startup_{startup_id}", namespace='/builder')
                        return # Exit thread, wait for /approve endpoint to resume
                
                # Finished
                if feature_id and final_state and final_state.get("status") != "failed":
                    from app.models import Feature, FeatureStatus
                    from app.extensions import db
                    feature = Feature.query.get(feature_id)
                    if feature:
                        feature.status = FeatureStatus.COMPLETED
                        db.session.commit()
                        
            except Exception as e:
                print(f"Agent background task failed: {e}")
                from app.extensions import socketio
                socketio.emit('agent_update', {
                    'task_status': 'failed',
                    'logs': state_tracker.get("logs", []) + [f"System Error: {str(e)}"]
                }, room=f"startup_{startup_id}", namespace='/builder')

    thread = threading.Thread(target=task)
    thread.start()

@builder_bp.route('/<startup_id>/logs', methods=['GET'])
def get_logs(startup_id):
    config = {"configurable": {"thread_id": startup_id}}
    try:
        snapshot = graph.get_state(config)
        if snapshot.values:
            return jsonify({
                "status": "success",
                "logs": snapshot.values.get("logs", []),
                "task_status": snapshot.values.get("status", "unknown"),
                "total_tasks": snapshot.values.get("total_tasks", 0),
                "completed_tasks": snapshot.values.get("completed_tasks", 0)
            })
        else:
            return jsonify({"status": "success", "logs": [], "task_status": "unknown"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

@builder_bp.route('/<startup_id>/files', methods=['GET'])
def list_files(startup_id):
    path = request.args.get('path', '.')
    result = manager.list_files(startup_id, path)
    return jsonify(result)

@builder_bp.route('/<startup_id>/files/content', methods=['GET'])
def read_file(startup_id):
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Path required'}), 400
    result = manager.read_file(startup_id, path)
    return jsonify(result)

@builder_bp.route('/<startup_id>/container-logs', methods=['GET'])
def get_container_logs(startup_id):
    result = manager.get_container_logs(startup_id)
    return jsonify(result)

@builder_bp.route('/<startup_id>/reset', methods=['POST'])
def reset_agent(startup_id):
    try:
        # 1. Clear Artifacts in Container
        manager.run_command(startup_id, "rm -f artifacts/tasks.json artifacts/PROGRESS.md artifacts/spec.md")
        
        # 2. Clear Agent State (Checkpoint)
        config = {"configurable": {"thread_id": startup_id}}
        # LangGraph doesn't have a direct "clear" method exposed easily via public API in all versions,
        # but we can update the state to empty or just rely on the fact that we start fresh if no next step.
        # However, to be safe, we can manually update the state to "start".
        
        graph.update_state(config, {
            "goal": "",
            "plan": [],
            "current_step_index": 0,
            "current_step": {},
            "error_history": [],
            "logs": [],
            "status": "start",
            "task_queue": [],
            "current_task": "",
            "completed_tasks": 0,
            "total_tasks": 0
        })
        
        return jsonify({"status": "success", "message": "Agent memory reset."})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})
