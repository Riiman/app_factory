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
    print(f"Received start_env request for {startup_id}")
    data = request.json or {}
    stack_type = data.get('stack_type', 'MERN')
    print(f"Stack type: {stack_type}")

    if startup_id in building_tasks and building_tasks[startup_id].is_alive():
         return jsonify({"status": "building", "message": "Build in progress..."})

    # Check if already running (fast check)
    try:
        container_name = manager.get_container_name(startup_id)
        container = manager.client.containers.get(container_name)
        if container.status == 'running':
            container.reload()
            ports = container.attrs['NetworkSettings']['Ports']
            return jsonify({"status": "running", "container_id": container.id, "ports": ports})
    except:
        pass

    def build_task():
        try:
            print(f"Starting async build for {startup_id}")
            manager.ensure_container(startup_id, stack_type=stack_type)
            print(f"Async build finished for {startup_id}")
        except Exception as e:
            print(f"Async build failed for {startup_id}: {e}")
    
    thread = threading.Thread(target=build_task)
    thread.start()
    building_tasks[startup_id] = thread
    
    return jsonify({"status": "building", "message": "Started build process"})

@builder_bp.route('/<startup_id>/stop', methods=['POST'])
def stop_env(startup_id):
    result = manager.stop_container(startup_id)
    return jsonify(result)

@builder_bp.route('/<startup_id>/command', methods=['POST'])
def run_command(startup_id):
    data = request.json
    command = data.get('command')
    if not command:
        return jsonify({'error': 'Command required'}), 400
    
    result = manager.run_command(startup_id, command)
    return jsonify(result)

from app.models import Product, Feature, FeatureStatus
from app.extensions import db

@builder_bp.route('/<startup_id>/run-task', methods=['POST'])
def run_task(startup_id):
    data = request.json
    goal = data.get('goal')
    yolo = data.get('yolo', False)
    
    if not goal:
        return jsonify({'error': 'Goal required'}), 400
        
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
        "status": "start"
    }
    
    # Use startup_id as thread_id for persistence
    config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 100}
    
    try:
        # Initial Run
        final_state = None
        # We use a loop to handle YOLO mode (auto-resume on interrupt)
        current_input = initial_state
        
        while True:
            for event in graph.stream(current_input, config=config):
                for key, value in event.items():
                    final_state = value
            
            snapshot = graph.get_state(config)
            
            # If finished (no next step), break
            if not snapshot.next:
                break
                
            # If interrupted and YOLO is ON, resume immediately
            if yolo:
                current_input = None # Resume from interrupt
                continue
            else:
                # Interrupted and YOLO is OFF -> Return to user for approval
                return jsonify({
                    "status": "success",
                    "logs": snapshot.values.get("logs", []),
                    "plan": snapshot.values.get("plan", []),
                    "current_step": snapshot.values.get("current_step", {}),
                    "waiting_approval": True
                })
        
        # If we get here, the graph finished completely
        return jsonify({
            "status": "success",
            "task_status": final_state.get("status") if final_state else "unknown",
            "logs": final_state.get("logs", []) if final_state else [],
            "plan": final_state.get("plan", []) if final_state else [],
            "total_tasks": final_state.get("total_tasks", 0) if final_state else 0,
            "completed_tasks": final_state.get("completed_tasks", 0) if final_state else 0,
            "waiting_approval": False
        })

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

@builder_bp.route('/<startup_id>/approve', methods=['POST'])
def approve_step(startup_id):
    config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 100}
    yolo = request.json.get('yolo', False) # Allow switching to YOLO mid-stream
    
    try:
        # Resume the graph
        current_input = None
        final_state = None
        
        while True:
            for event in graph.stream(current_input, config=config):
                 for key, value in event.items():
                    final_state = value
            
            snapshot = graph.get_state(config)
            
            if not snapshot.next:
                break
                
            if yolo:
                current_input = None
                continue
            else:
                return jsonify({
                    "status": "success",
                    "logs": snapshot.values.get("logs", []),
                    "plan": snapshot.values.get("plan", []),
                    "waiting_approval": True
                })
                
        return jsonify({
            "status": "success",
            "task_status": snapshot.values.get("status", "unknown"),
            "logs": snapshot.values.get("logs", []),
            "plan": snapshot.values.get("plan", []),
            "total_tasks": snapshot.values.get("total_tasks", 0),
            "completed_tasks": snapshot.values.get("completed_tasks", 0),
            "waiting_approval": False
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
    
    # Reuse the run_task logic by calling it internally or refactoring
    # For simplicity, we'll just call the graph logic here (duplication is minimal)
    
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
    
    config = {"configurable": {"thread_id": startup_id}, "recursion_limit": 100}
    
    try:
        # Update feature status
        feature.status = FeatureStatus.IN_PROGRESS
        db.session.commit()
        
        final_state = None
        current_input = initial_state
        
        while True:
            for event in graph.stream(current_input, config=config):
                for key, value in event.items():
                    final_state = value
            
            snapshot = graph.get_state(config)
            
            if not snapshot.next:
                break
            
            if yolo:
                current_input = None
                continue
            else:
                return jsonify({
                    "status": "success",
                    "logs": snapshot.values.get("logs", []),
                    "plan": snapshot.values.get("plan", []),
                    "waiting_approval": True
                })
        
        # If finished successfully
        if final_state and final_state.get("status") != "failed":
            feature.status = FeatureStatus.COMPLETED
            db.session.commit()
        else:
            # If failed, keep as IN_PROGRESS (or revert to PENDING if preferred, but IN_PROGRESS is accurate)
            print(f"Feature build failed or incomplete. Status: {final_state.get('status') if final_state else 'Unknown'}")
        
        return jsonify({
            "status": "success",
            "task_status": final_state.get("status") if final_state else "unknown",
            "logs": final_state.get("logs", []),
            "plan": final_state.get("plan", []),
            "waiting_approval": False
        })

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

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
