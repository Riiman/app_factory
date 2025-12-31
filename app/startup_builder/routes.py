from flask import request, jsonify
import logging
from . import builder_bp
from .manager import DockerManager
from .graph import create_graph
from .agent import MultiAgentSystem
from .v3.orchestrator import create_v3_graph

manager = DockerManager()
agent = MultiAgentSystem()
graph = create_graph(
    agent.planner_node,
    agent.creator_node,
    agent.reviewer_node
)

import threading

building_tasks = {}
stop_signals = set()

@builder_bp.route('/<startup_id>/start', methods=['POST'])
def start_env(startup_id):
    from app.models import Startup
    from app.extensions import db, redis_client
    from app.services.notification_service import publish_update
    
    # Clear any pending stop signals
    redis_client.delete(f"signal:{startup_id}")
    
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
            elif container.status == 'exited':
                # Resume stopped container
                print(f"Resuming stopped container {startup.container_name}")
                container.start()
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
            room = f"startup_{startup_id}"
            
            try:
                # Emit build started event
                publish_update('build_started', {
                    'startup_id': startup_id,
                    'stack_type': stack_type
                }, rooms=[room])
                
                # Re-fetch startup within this thread's app context
                from app.models import Startup
                startup_obj = Startup.query.get(startup_id)
                if not startup_obj:
                    print(f"Startup {startup_id} not found in build task")
                    publish_update('build_failed', {
                        'startup_id': startup_id,
                        'error': 'Startup not found'
                    }, rooms=[room])
                    return
                
                start_container_name = startup_obj.container_name
                
                # Close the session to release any potential locks during the long build process
                db.session.remove()
                
                print(f"Starting async build for {startup_id}")
                result = manager.ensure_container(startup_id, stack_type=stack_type, container_name=start_container_name)
                
                # Check for errors
                if result.get("error"):
                    print(f"Build failed: {result['error']}")
                    publish_update('build_failed', {
                        'startup_id': startup_id,
                        'error': result['error']
                    }, rooms=[room])
                    return
                
                # Save container_name to database if it was generated
                if result.get("container_name"):
                    # Re-query the startup object in a fresh session/transaction
                    from app.models import Startup
                    startup_update = Startup.query.get(startup_id)
                    if startup_update and not startup_update.container_name:
                         startup_update.container_name = result["container_name"]
                         db.session.commit()
                         print(f"Saved container name {result['container_name']} to database")
                    elif startup_update:
                         # Just ensure we have the latest state if we need to do other updates
                         pass
                
                print(f"Async build finished for {startup_id}")
                
                # Emit build complete event
                publish_update('build_complete', {
                    'startup_id': startup_id,
                    'status': result.get('status'),
                    'container_id': result.get('container_id'),
                    'ports': result.get('ports'),
                    'container_name': result.get('container_name')
                }, rooms=[room])
                
            except Exception as e:
                print(f"Async build failed for {startup_id}: {e}")
                import traceback
                traceback.print_exc()
                
                # Emit build failed event
                publish_update('build_failed', {
                    'startup_id': startup_id,
                    'error': str(e)
                }, rooms=[room])
    
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
    from app.extensions import db, redis_client
    
    startup = Startup.query.get(startup_id)
    if not startup:
        return jsonify({"error": "Startup not found"}), 404
    
    # 1. Send STOP Signal to Graph Agents (V2 & V3)
    # This ensures the agent loop exits and doesn't try to query the dead container
    redis_client.set(f"signal:{startup_id}", "stop", ex=60) # Expires in 60s
    print(f"Sent STOP signal for {startup_id}")
    
    # 2. Stop the container
    if startup.container_name:
        result = manager.stop_container(startup_id, container_name=startup.container_name)
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

@builder_bp.route('/<startup_id>/file', methods=['GET'])
def get_file(startup_id):
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Path required'}), 400
    
    # Check extension
    lower_path = path.lower()
    is_image = lower_path.endswith(('.png', '.jpg', '.jpeg', '.gif'))
    
    if is_image:
        res = manager.read_file_base64(startup_id, path)
        if res.get('error'):
             return jsonify(res), 404
        
        import base64
        import io
        from flask import send_file
        
        try:
            decoded = base64.b64decode(res['content_base64'])
            mimetype = 'image/png'
            if lower_path.endswith('.jpg') or lower_path.endswith('.jpeg'):
                mimetype = 'image/jpeg'
            
            return send_file(io.BytesIO(decoded), mimetype=mimetype)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    else:
        res = manager.read_file(startup_id, path)
        return jsonify(res)

@builder_bp.route('/<startup_id>/approve', methods=['POST'])
def approve_step(startup_id):
    yolo = request.json.get('yolo', False) 
    
    initial_state = {"interaction_completed": True}
    
    # CLEAR any pending signals
    from app.extensions import redis_client
    redis_client.delete(f"signal:{startup_id}")
    
    run_agent_bg(startup_id, initial_state, yolo)
    
    return jsonify({"status": "success", "message": "Step approved, resuming in background"})

@builder_bp.route('/<startup_id>/status', methods=['GET'])
def get_status(startup_id):
    """Returns the current state of the agent for UI persistence (Supports V3 & V2)."""
    config = {"configurable": {"thread_id": startup_id}}
    
    try:
        from .v3.orchestrator import create_v3_graph
        v3_graph = create_v3_graph(db_path="v3_checkpoints.sqlite", log_callback=lambda x, y: None)
        snapshot = v3_graph.get_state(config)
        
        if snapshot.values and snapshot.values.get("status") != "init":
             state = snapshot.values
             return jsonify({
                "status": "active",
                "version": "v3",
                "task_status": state.get("status", "unknown"),
                "logs": state.get("logs", []),
                "thoughts": state.get("thoughts", []), 
                "node": snapshot.next[0] if snapshot.next else "idle", 
                "plan": state.get("plan", []),
                "total_tasks": len(state.get("plan", [])),
                "completed_tasks": len([t for t in state.get("plan", []) if t.get("status") == "completed"]),
                "waiting_approval": False, 
                "mission_queue": state.get("missions", []), 
                "current_mission_index": state.get("current_mission_id", 0) 
            })
    except Exception as e:
        print(f"V3 Status Check Error: {e}")

    # 2. Fallback to V2 State
    try:
        snapshot = graph.get_state(config)
        if not snapshot.values:
             return jsonify({"status": "idle"})
             
        state = snapshot.values
        return jsonify({
            "status": "active",
            "version": "v2",
            "task_status": state.get("status", "unknown"),
            "current_task": state.get("current_task"),
            "logs": state.get("logs", []),
            "plan": state.get("plan", []),
            "total_tasks": state.get("total_tasks", 0),
            "completed_tasks": state.get("completed_tasks", 0),
            "waiting_approval": not snapshot.next, 
            "waiting_interaction": state.get("status") == "waiting_interaction",
            "mission_queue": state.get("missions", []), 
            "current_mission_index": state.get("current_mission_id", 0) 
        })
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

@builder_bp.route('/<startup_id>/pause', methods=['POST'])
def pause_task(startup_id):
    from app.extensions import redis_client
    redis_client.set(f"signal:{startup_id}", "pause", ex=60)
    print(f"Sent PAUSE signal for {startup_id}")
    return jsonify({"status": "success", "message": "Pause signal sent"})

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
    from app.extensions import redis_client
    redis_client.delete(f"signal:{startup_id}")
    
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

@builder_bp.route('/<startup_id>/build-product', methods=['POST'])
def build_product(startup_id):
    from app.models import Product, ProductStage
    from app.extensions import db, redis_client
    from .v3.orchestrator import create_v3_graph
    
    # CLEAR pending signals
    redis_client.delete(f"signal:{startup_id}")
    
    data = request.json
    product_id = data.get('product_id')
    yolo = data.get('yolo', False)
    
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "Product not found"}), 404
        
    # Update stage
    product.stage = ProductStage.DEVELOPMENT
    db.session.commit()
    
    # --- ENFORCE CONTAINER EXISTENCE ---
    # Ensure a container exists before starting the build, especially for fresh builds.
    try:
        from app.models import Startup
        resp = manager.ensure_container(startup_id)
        if resp.get("error"):
            print(f"Container Provisioning Error: {resp['error']}")
            return jsonify({"error": f"Failed to provision container: {resp['error']}"}), 500
            
        new_container_name = resp.get("container_name")
        if new_container_name:
             startup = Startup.query.get(startup_id)
             if startup.container_name != new_container_name:
                  print(f"Binding new container {new_container_name} to Startup {startup_id}")
                  startup.container_name = new_container_name
                  db.session.commit()
    except Exception as e:
        print(f"Failed to ensure container: {e}")
        return jsonify({"error": str(e)}), 500
    # -----------------------------------
    
    # Synthesize V3 Initial State
    product_context = {
        "name": product.name,
        "description": product.description,
        "features": [f.to_dict() for f in product.features]
    }
    
    # Check for existing state/missions
    force_rebuild = data.get('force_rebuild', False)
    initial_state = None
    found_checkpoint = False
    
    if not force_rebuild:
        try:
             # Look for existing checkpoint
             v3_graph = create_v3_graph(db_path="v3_checkpoints.sqlite", log_callback=lambda x, y: None)
             config = {"configurable": {"thread_id": startup_id}}
             snapshot = v3_graph.get_state(config)
             if snapshot.values and snapshot.values.get("missions"):
                  found_checkpoint = True
                  current_status = snapshot.values.get("status")
                  missions = snapshot.values.get("missions", [])
                  pending_work = any(m["status"] == "pending" for m in missions)
                  
                  if pending_work:
                      print(f"Resuming existing missions for {startup_id}")
                      initial_state = None # Default Resume
                      
                      # SMART RESUME: Recover from terminal states if work remains
                      if current_status in ["done", "failed", "stopped"]:
                          print(f"Auto-Recovering: Resetting status from '{current_status}' to 'routed'")
                          initial_state = {"status": "routed"}
                  else:
                      print(f"Previous build '{current_status}' with no pending work. Starting fresh.")
                      # Force fresh rebuild
                      force_rebuild = True
        except Exception as e:
            print(f"Error checking existing state: {e}")
            
    if found_checkpoint and initial_state is None and not force_rebuild:
         # Resume confirmed from DB checkpoint
         pass
    else:
        # Check for File-Based Persistence (artifacts/missions.json)
        # This allows resuming even if DB checkpoint is missing/cleared but workspace is intact.
        import json
        missions_file = manager.read_file(startup_id, "artifacts/missions.json")
        
        if not force_rebuild and not missions_file.get("error"):
            try:
                data = json.loads(missions_file["content"])
                print(f"Resuming from missions.json for {startup_id}")
                
                existing_missions = data.get("missions", [])
                
                # --- SMART INCREMENTAL BUILD ---
                # Check for new features in Product Context not in Existing Missions
                existing_feature_ids = set()
                for m in existing_missions:
                    if m.get("feature_id"):
                        existing_feature_ids.add(str(m["feature_id"])) # Ensure string comparison
                
                new_missions = []
                current_timestamp = 1000 # dummy or use time
                import time
                base_id = len(existing_missions)
                
                features = product_context.get("features", [])
                for f in features:
                    f_id = str(f["id"])
                    if f_id not in existing_feature_ids:
                        print(f"Found New Feature: {f['name']} (ID: {f_id})")
                        # Create Synthetic Mission
                        new_missions.append({
                            "id": base_id + len(new_missions), # increment ID
                            "title": f"Implement Feature: {f['name']}",
                            "description": f"Implement the feature '{f['name']}'. Description: {f['description']}",
                            "status": "pending", # Force pending
                            "feature_id": f_id
                        })
                
                if new_missions:
                    print(f"Adding {len(new_missions)} new missions to queue.")
                    existing_missions.extend(new_missions)
                    status_override = "routed" # Resumed/Active
                else:
                    # No new features.
                    # Verify if pending work exists in current list
                    if any(m["status"] == "pending" for m in existing_missions):
                        status_override = "routed"
                    else:
                        print("All features built. No pending work.")
                        # SAFETY: Do not auto-rebuild.
                        return jsonify({"status": "no_changes", "message": "Project is already fully built. No new features found. Use 'Force Rebuild' to restart."})
                
                initial_state = {
                    "startup_id": startup_id,
                    "product_context": product_context,
                    "missions": existing_missions, # RESTORED: Load missions into state
                    "current_mission": None, 
                    "tech_stack": data.get("tech_stack", "Existing"),
                    "status": status_override, 
                    "plan": [],
                    "logs": [f"Smart Resume: Loaded {len(existing_missions)} missions ({len(new_missions)} new)."]
                }
            except Exception as e:
                print(f"Smart Resume Failed (Starting Fresh): {e}")
                # Fallback to fresh start
                initial_state = None
        
        if not initial_state:
            # Start fresh (Initializer will run)
            initial_state = {
                "startup_id": startup_id,
                "product_context": product_context, # Passed to V3Initializer
                "status": "init", # Trigger Initializer
                "plan": [],
                # "missions": [], # Initializer will populate
                "current_mission": None,
                "logs": [f"Starting V3 Build for Product: {product.name}"]
            }

    
    # Run in background
    run_v3_agent_bg(startup_id, initial_state)
    
    return jsonify({"status": "success", "message": f"Build started for {product.name}"})

@builder_bp.route('/<startup_id>/build-feature', methods=['POST'])
def build_feature(startup_id):
    from app.models import Feature, FeatureStatus
    from app.extensions import db, redis_client
    
    # CLEAR pending signals
    redis_client.delete(f"signal:{startup_id}")
    
    data = request.json
    feature_id = data.get('feature_id')
    yolo = data.get('yolo', False)
    
    feature = Feature.query.get(feature_id)
    if not feature:
        return jsonify({"error": "Feature not found"}), 404
        
    # Update status
    feature.status = FeatureStatus.IN_PROGRESS
    db.session.commit()
    
    product = feature.product
    
    # Synthesize V3 Mission
    mission_prompt = (
        f"Implement Feature: '{feature.name}' for Product: '{product.name}'.\n"
        f"Description: {feature.description}\n"
        f"Acceptance Criteria: {feature.acceptance_criteria}\n"
        f"Ensure it integrates with the existing codebase."
    )
    
    initial_state = {
        "startup_id": startup_id,
        "mission": mission_prompt,
        "status": "analyzing", # Start with analysis
        "plan": [],
        "logs": [f"Starting V3 Build for Feature: {feature.name}"]
    }
    
    # Run in background
    run_v3_agent_bg(startup_id, initial_state)
    
    return jsonify({"status": "success", "message": f"V3 Agent started building feature: {feature.name}"})

@builder_bp.route('/<int:startup_id>/v3/start', methods=['POST'])
def start_v3_agent(startup_id):
    data = request.json or {}
    # startup_id is passed in URL
    from app.extensions import redis_client

    # CLEAR pending signals
    redis_client.delete(f"signal:{startup_id}")
    
    # If resuming, we might not have a mission in body.
    # The Selector will handle picking up the mission.
    mission = data.get('mission')
    
    initial_state = {
        "startup_id": startup_id,
        "missions": [], # Will be ignored if file exists?
        "current_mission_id": 0,
        "tech_stack": "Existing",
        "status": "mission_selector", # Force Selector to pick up pending work
        "plan": [],
        "logs": ["V3 Agent Resumed."]
    }

    if mission:
        # If explicit mission passed (Ad-hoc start)
        synthetic_mission = {
            "id": 0,
            "title": "Ad-Hoc Task",
            "description": mission,
            "status": "pending"
        }
        initial_state["missions"] = [synthetic_mission]
        initial_state["logs"] = ["V3 Agent Started with New Mission."]
    
    # Run in background
    
    # Run in background
    run_v3_agent_bg(startup_id, initial_state)
    
    return jsonify({"status": "success", "message": "V3 Agent Started"})

def run_v3_agent_bg(startup_id, initial_state):
    """Runs the V3 Agent Graph in background."""
    from flask import current_app
    app = current_app._get_current_object()
    
    def task():
        with app.app_context():
            from app.extensions import socketio
            
            # Callback for Thoughts
            def log_callback(content, node):
                from app.services.notification_service import publish_update
                publish_update('agent_thought', {
                    'content': content, 
                    'node': node
                }, rooms=[f"startup_{startup_id}"])

            try:
                # DEBUG DIAGNOSTICS
                from app.extensions import redis_client
                s_id_str = str(startup_id)
                print(f"THREAD START: startup_id={s_id_str}, redis={redis_client}")
                
                # Notify Start
                publish_update('agent_update', {
                    'task_status': 'planning', 
                    'logs': [f"Agent Thread Started for ID {s_id_str}"]
                }, rooms=[f"startup_{s_id_str}"])

                # --- CONTEXT INJECTION START ---
                try:
                    from app.models.startup import Startup, StartupEvaluation
                    from app.models.product import Product
                    
                    startup = Startup.query.get(startup_id)
                    
                    context_data = {
                        "startup_id": startup_id,
                        "name": startup.name,
                        "description": startup.description,
                    }
                    
                    # 1. Fetch Evaluation (Detailed report)
                    if startup.evaluation_id:
                        evaluation = StartupEvaluation.query.get(startup.evaluation_id)
                        if evaluation:
                            context_data["evaluation"] = {
                                "viability": evaluation.viability_score,
                                "complexity": evaluation.complexity_score,
                                "report": evaluation.evaluation_report
                            }
                    
                    # 2. Fetch Product (Features, PRD)
                    # Use relationship if exists, else query
                    product = Product.query.filter_by(startup_id=startup_id).first()
                    if product:
                         context_data["product"] = {
                             "name": product.name,
                             "description": product.description,
                             "target_audience": product.target_audience,
                             "features": product.features_list if hasattr(product, 'features_list') else product.features,
                             "unique_selling_propositions": getattr(product, 'usp', [])
                         }
                         
                    # 3. Write to Container Artifact
                    from app.startup_builder.manager import DockerManager
                    temp_manager = DockerManager() 
                    
                    import json
                    context_json = json.dumps(context_data, indent=2)
                    
                    # Ensure artifacts dir exists
                    temp_manager.run_command(startup_id, "mkdir -p artifacts")
                    temp_manager.write_file(startup_id, "artifacts/project_context.json", context_json)
                    
                    publish_update('agent_update', {'logs': ["Injected Project Context to artifacts/project_context.json"]}, rooms=[f"startup_{s_id_str}"])
                    
                except Exception as e:
                    print(f"Context Injection Failed: {e}")
                    publish_update('agent_update', {'logs': [f"Warning: Failed to inject context: {e}"]}, rooms=[f"startup_{s_id_str}"])
                # --- CONTEXT INJECTION END ---

                # Create V3 Graph on the fly (lightweight)
                # or cache it if expensive. We need log_callback bound though.
                v3_graph = create_v3_graph(db_path="v3_checkpoints.sqlite", log_callback=log_callback)
                
                config = {"configurable": {"thread_id": s_id_str}, "recursion_limit": 500}
                
                publish_update('agent_update', {'logs': ["Debug: Graph Created. Starting Stream..."]}, rooms=[f"startup_{s_id_str}"])
                
                # Run the graph
                for event in v3_graph.stream(initial_state, config=config):
                    # event is a dict where keys are node names and values are the state updates from that node
                    publish_update('agent_update', {'logs': [f"Debug: Stream Event Received"]}, rooms=[f"startup_{s_id_str}"])
                    
                    # --- REDIS SIGNAL CHECK ---
                    from app.extensions import redis_client
                    signal = redis_client.get(f"signal:{s_id_str}")
                    if signal and signal in ["pause", "stop"]:
                        print(f"Pausing V3 Agent for {startup_id} (Signal: {signal})")
                        redis_client.delete(f"signal:{s_id_str}")
                        
                        from app.services.notification_service import publish_update
                        publish_update('agent_update', {
                            'task_status': 'paused',
                            'logs': ["Process paused/stopped by user."]
                        }, rooms=[f"startup_{startup_id}"])
                        return

                    # FETCH FULL STATE
                    # We use the snapshot because 'event' only contains the delta from the last node
                    snapshot = v3_graph.get_state(config)
                    full_state = snapshot.values
                    
                    for key, value in event.items():
                         # We still use 'key' to know WHICH node just ran, but 'full_state' for data
                        
                        # Compute Progress for Frontend
                        plan = full_state.get('plan', [])
                        total_tasks = len(plan)
                        completed_tasks = len([t for t in plan if t.get("status") == "completed"])
                        
                        # Extract Mission Info
                        missions = full_state.get("missions", [])
                        current_mission = full_state.get("current_mission", {})
                        
                        # Find index locally if passed
                        # Or rely on 'current_mission' object emission
                        
                        from app.services.notification_service import publish_update
                        publish_update('agent_update', {
                            'node': key,
                            'task_status': full_state.get('status', 'processing'),
                            'plan': plan,
                            'logs': value.get('logs', []), # Logs are transient, likely in the delta
                            'mission_queue': missions,
                            'current_mission': current_mission, # Pass full object
                            'total_tasks': total_tasks,
                            'completed_tasks': completed_tasks
                        }, rooms=[f"startup_{startup_id}"])
                        
                from app.services.notification_service import publish_update
                publish_update('agent_update', {
                    'task_status': 'done',
                    'logs': ['V3 Mission Complete']
                }, rooms=[f"startup_{startup_id}"])
                
            except Exception as e:
                print(f"V3 Error: {e}")
                from app.services.notification_service import publish_update
                publish_update('agent_update', {
                    'task_status': 'failed',
                    'logs': [f"Critical Error: {e}"]
                }, rooms=[f"startup_{startup_id}"])

    thread = threading.Thread(target=task)
    thread.start()

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
            
            # Clear any existing stop signal before starting
            if startup_id in stop_signals:
                stop_signals.remove(startup_id)
            
            # --- CRITICAL FIX: REFRESH STARTUP CONTEXT ---
            # The container might have been created just before this thread started.
            # We need to ensure the graph/agent knows about it (if passed in state or context).
            # But 'initial_state' was passed by value.
            # Currently V3 uses 'startup_id' to look up container via DockerManager?
            # DockerManager.get_container_name(startup_id) queries the DB.
            # So as long as DB is committed, we are fine.
            # BUT: We should ensure we don't hold stale state.
            
            # Update with new input
            state_tracker.update(initial_state)
            current_input = initial_state
            final_state = None
            
            # Track current mission index to detect changes
            last_mission_index = state_tracker.get("current_mission_index", 0)
            
            # --- STATUS SYNC: Set initial mission feature to IN_PROGRESS ---
            if "mission_queue" in state_tracker and state_tracker["mission_queue"]:
                 try:
                     current_mission = state_tracker["mission_queue"][last_mission_index]
                     if "feature_id" in current_mission:
                         from app.models import Feature, FeatureStatus
                         from app.extensions import db
                         f = Feature.query.get(current_mission["feature_id"])
                         if f and f.status != FeatureStatus.COMPLETED:
                             f.status = FeatureStatus.IN_PROGRESS
                             db.session.commit()
                 except Exception as e:
                     print(f"Failed to update initial feature status: {e}")
            
            try:
                while True:
                    # Check for pause signal
                    if startup_id in stop_signals:
                        print(f"Pausing task for {startup_id}")
                        stop_signals.remove(startup_id)
                        
                        from app.services.notification_service import publish_update
                        # Update status to paused in state
                        # Note: We can't easily update langgraph state without a transition, 
                        # but we can just stop the loop. The state remains at the last step.
                        publish_update('agent_update', {
                            'task_status': 'paused',
                            'logs': state_tracker.get("logs", []) + ["Process paused by user."]
                        }, rooms=[f"startup_{startup_id}"])
                        return

                    for event in graph.stream(current_input, config=config):
                        for key, value in event.items():
                            if key == "__interrupt__":
                                continue
                                
                            if isinstance(value, dict):
                                state_tracker.update(value)
                            
                            final_state = value
                            
                            # --- STATUS SYNC: Detect Mission Change ---
                            current_index = state_tracker.get("current_mission_index", 0)
                            if current_index != last_mission_index:
                                try:
                                    mission_queue = state_tracker.get("mission_queue", [])
                                    # 1. Mark previous mission as COMPLETED
                                    if last_mission_index < len(mission_queue):
                                        prev_mission = mission_queue[last_mission_index]
                                        if "feature_id" in prev_mission:
                                            from app.models import Feature, FeatureStatus
                                            from app.extensions import db
                                            # Re-fetch because session might have closed/renewed? No, same thread.
                                            f_prev = Feature.query.get(prev_mission["feature_id"])
                                            if f_prev:
                                                f_prev.status = FeatureStatus.COMPLETED
                                                db.session.commit()
                                                
                                    # 2. Mark new mission as IN_PROGRESS
                                    if current_index < len(mission_queue):
                                        new_mission = mission_queue[current_index]
                                        if "feature_id" in new_mission:
                                            from app.models import Feature, FeatureStatus
                                            from app.extensions import db
                                            f_new = Feature.query.get(new_mission["feature_id"])
                                            if f_new:
                                                f_new.status = FeatureStatus.IN_PROGRESS
                                                db.session.commit()
                                    
                                    last_mission_index = current_index
                                except Exception as e:
                                    print(f"Error syncing feature status: {e}")

                            # Emit update via WebSocket
                            from app.services.notification_service import publish_update
                            
                            # Calculate Progress dynamically
                            plan = state_tracker.get("plan", [])
                            total_tasks = len(plan)
                            completed_tasks = len([t for t in plan if t.get("status") == "completed"])
                            
                            publish_update('agent_update', {
                                'logs': state_tracker.get("logs", []),
                                'plan': plan,
                                'task_status': state_tracker.get("status", "unknown"),
                                'total_tasks': total_tasks,
                                'completed_tasks': completed_tasks,
                                'current_step': state_tracker.get("current_step", {}),
                                'waiting_approval': False # Default
                            }, rooms=[f"startup_{startup_id}"])
                    
                        # --- REDIS SIGNAL CHECK (Inside Loop) ---
                        from app.extensions import redis_client
                        signal = redis_client.get(f"signal:{startup_id}")
                        if signal and signal in ["pause", "stop"]:
                            print(f"Signal '{signal}' received for {startup_id}. Pausing/Stopping Agent.")
                            redis_client.delete(f"signal:{startup_id}")
                            
                            from app.services.notification_service import publish_update
                            publish_update('agent_update', {
                                'task_status': 'paused',
                                'logs': state_tracker.get("logs", []) + ["Process paused/stopped by user."]
                            }, rooms=[f"startup_{startup_id}"])
                            return

                    snapshot = graph.get_state(config)
                    
                    if not snapshot.next:
                        # Graph finished (Planner said "done")
                        # 1. Mark current mission as COMPLETED
                        try:
                             mission_queue = state_tracker.get("mission_queue", [])
                             current_index = state_tracker.get("current_mission_index", 0)
                             if mission_queue and current_index < len(mission_queue):
                                  last_mission = mission_queue[current_index]
                                  if "feature_id" in last_mission and state_tracker.get("status") != "failed":
                                       from app.models import Feature, FeatureStatus
                                       from app.extensions import db
                                       f = Feature.query.get(last_mission["feature_id"])
                                       if f:
                                            f.status = FeatureStatus.COMPLETED
                                            db.session.commit()
                        except Exception as e:
                            print(f"Error marking mission complete: {e}")

                        # 2. Check for NEXT Mission
                        mission_queue = state_tracker.get("mission_queue", [])
                        next_index = current_index + 1
                        
                        if next_index < len(mission_queue):
                            print(f"--- Advancing to Mission {next_index} ---")
                            # Prepare state for next mission
                            next_mission_data = mission_queue[next_index]
                            
                            # Update tracker
                            state_tracker["current_mission_index"] = next_index
                            last_mission_index = next_index # Sync local tracker
                            
                            # Reset Status for next run
                            # We can't "reset" the graph easily, but we can pass new input that updates the state.
                            # The Planner will read the new 'goal' from the state update.
                            
                            new_input = {
                                "goal": next_mission_data["goal"],
                                "current_mission_index": next_index,
                                "status": "planning", # Reset status to trigger Planner
                                "current_task": "plan_next_mission", # Dummy task to wake up
                                "plan": [] # Clear plan for new mission? Or keep history? 
                                           # Ideally keep history but Planner prompt might get confused. 
                                           # For V2, let's clear plan to force fresh planning for new mission.
                            }
                            
                            # We need to UPDATE the state, then CONTINUE stream
                            # LangGraph checkpointer will verify this state update
                            # But wait, 'graph.stream' finished. We need to call it again.
                            current_input = new_input
                            
                            # IMPORTANT: Update config thread_id if we want separate threads?
                            # No, keep same thread_id to share context/logs?
                            # Yes, keep same thread.
                            
                            # We must update the state via a "fake" invocation or just pass input to stream?
                            # Passing input to stream(..., input=new_input) updates the state.
                            continue 
                        else:
                            # No more missions
                            print("All missions completed.")
                            break
                        
                    if yolo:
                        current_input = None
                        continue
                    else:
                        # Waiting for approval
                        publish_update('agent_update', {
                            'waiting_approval': True,
                            'current_step': snapshot.values.get("current_step", {})
                        }, rooms=[f"startup_{startup_id}"])
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
                publish_update('agent_update', {
                    'task_status': 'failed',
                    'logs': state_tracker.get("logs", []) + [f"System Error: {str(e)}"]
                }, rooms=[f"startup_{startup_id}"])

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
        from app.models import Startup
        from app.extensions import db
        import sqlite3
        import shutil
        
        # 1. Clear Artifacts in Container (If running)
        manager.run_command(startup_id, "rm -f artifacts/tasks.json artifacts/PROGRESS.md artifacts/spec.md")
        
        # 2. Hard Cleanup: Stop & Remove Container
        startup = Startup.query.get(startup_id)
        if startup and startup.container_name:
             manager.cleanup_container(startup.container_name)
             startup.container_name = None
             db.session.commit()
             
        # 3. Nuke Workspace Files
        try:
             workspace_path = os.path.join(manager.base_work_dir, str(startup_id))
             if os.path.exists(workspace_path):
                 shutil.rmtree(workspace_path)
                 print(f"Deleted workspace: {workspace_path}")
        except Exception as e:
             print(f"Error deleting workspace: {e}")
        
        # 4. Clear Agent State (Both V3 and Default SQLite)
        for db_file in ["v3_checkpoints.sqlite", "checkpoints.sqlite"]:
             try:
                 db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", db_file) # Assuming app/startup_builder layout
                 # Safer to just use absolute path based on manager's knowledge or current working dir?
                 # Routes runs in app context. Let's assume run from root.
                 if not os.path.exists(db_file):
                      # Try internal path
                      db_path = os.path.join("/home/ubuntu/app_factory", db_file)
                 else:
                      db_path = db_file
                      
                 if os.path.exists(db_path):
                     conn = sqlite3.connect(db_path)
                     c = conn.cursor()
                     # Check if tables exist first? Or just try delete
                     try:
                         c.execute(f"DELETE FROM checkpoints WHERE thread_id='{startup_id}'")
                         c.execute(f"DELETE FROM writes WHERE thread_id='{startup_id}'")
                         conn.commit()
                         print(f"Cleared checkpoints from {db_file}")
                     except Exception as ex:
                         print(f"Error clearing {db_file}: {ex}")
                     finally:
                         conn.close()
             except Exception as e:
                 print(f"DB Cleanup Error: {e}")
        
        # 5. Reset Graph State via update
        config = {"configurable": {"thread_id": startup_id}}
        
        graph.update_state(config, {
            "goal": "",
            "plan": [],
            "current_step_index": 0,
            "current_step": {},
            "error_history": [],
            "logs": [],
            "status": "start",
            "total_tasks": 0,
            "completed_tasks": 0
        })

        return jsonify({"status": "success", "message": "Agent hard reset successfully"})
    except Exception as e:
        print(f"Reset Error: {e}")
        return jsonify({"status": "error", "error": str(e)}), 500



