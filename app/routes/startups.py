import redis
import json
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests
from app.models import Startup, Task, Experiment, Artifact, Founder, User, UserRole, TeamMember, ActivityLog, Scope
from app.startup_builder.manager import DockerManager

from app import db
from datetime import datetime
from app.services.notification_service import publish_update

import shutil
import time
import logging
from firebase_admin import auth as firebase_auth
import secrets
import string

startups_bp = Blueprint('startups', __name__, url_prefix='/api/startups')

def validate_startup_access(startup, user, required_scope=None):
    if not user:
        return False
        
    # Super Admin Check: Org 1 + Admin Role
    if user.organization_id == 1 and user.role == UserRole.ADMIN:
        return True

    if startup.organization_id != user.organization_id:
        return False

    # Owner Check
    if startup.user_id == user.id:
        return True
    
    # Org Admin Check
    if user.role == UserRole.ADMIN:
        return True

    # Team Member Check
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        if required_scope is None:
            return True
        if member.scopes and required_scope in member.scopes:
            return True
            
    return False

@startups_bp.route('/<int:startup_id>', methods=['GET'])
@jwt_required()
def get_startup(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup data.'}), 403
    
    # Only return core attributes, no heavy relations
    startup_data = startup.to_dict(include_relations=False)
    startup_data['products'] = [p.to_dict() for p in startup.products]
    startup_data['marketing_campaigns'] = [c.to_dict() for c in startup.marketing_campaigns] # Also needed for campaigns list if not fetched separately
    
    return jsonify({'success': True, 'startup': startup_data}), 200

# --- TASKS ---

@startups_bp.route('/<int:startup_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    tasks = [task.to_dict() for task in startup.tasks]
    return jsonify({'success': True, 'tasks': tasks}), 200

@startups_bp.route('/<int:startup_id>/tasks', methods=['POST'])
@jwt_required()
def create_task(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to add task to this startup.'}), 403

    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Task name is required.'}), 400

    due_date_str = data.get('due_date')
    due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date() if due_date_str else None

    scope_str = data.get('scope', 'GENERAL').upper()
    status_str = data.get('status', 'PENDING').upper()

    new_task = Task(
        startup_id=startup_id,
        name=data['name'],
        description=data.get('description'),
        due_date=due_date,
        status=status_str,
        scope=scope_str,
        linked_to_id=data.get('linked_to_id'),
        linked_to_type=data.get('linked_to_type')
    )
    
    db.session.add(new_task)
    db.session.commit()
    db.session.refresh(new_task)

    publish_update("dashboard_update", {
        "model": "Task",
        "id": new_task.id,
        "startup_id": startup_id,
        "timestamp": datetime.now().isoformat()
    }, rooms=[f"user_{startup.user_id}", "admin"])

    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Task',
        target_id=new_task.id,
        details=new_task.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Task created successfully.',
        'task': new_task.to_dict()
    }), 201

@startups_bp.route('/<int:startup_id>/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(startup_id, task_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized to update task for this startup.'}), 403

    task = Task.query.get_or_404(task_id)
    if task.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Task does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    task.name = data.get('name', task.name)
    task.description = data.get('description', task.description)
    
    due_date_str = data.get('due_date')
    if due_date_str:
        task.due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()
    
    status_str = data.get('status')
    if status_str:
        task.status = status_str.upper()
        
    scope_str = data.get('scope')
    if scope_str:
        task.scope = scope_str.upper()

    db.session.commit()
    
    publish_update("task_updated", {
        "startup_id": startup_id, 
        "task": task.to_dict()
    }, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'task': task.to_dict()}), 200

# --- EXPERIMENTS ---

@startups_bp.route('/<int:startup_id>/experiments', methods=['GET'])
@jwt_required()
def get_experiments(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    experiments = [e.to_dict() for e in startup.experiments]
    return jsonify({'success': True, 'experiments': experiments}), 200

@startups_bp.route('/<int:startup_id>/experiments', methods=['POST'])
@jwt_required()
def create_experiment(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Experiment name is required.'}), 400
    
    new_experiment = Experiment(startup_id=startup_id, **data)
    db.session.add(new_experiment)
    db.session.commit()
    
    publish_update("experiment_created", {"startup_id": startup_id, "experiment": new_experiment.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='started',
        target_type='Experiment',
        target_id=new_experiment.id,
        details=new_experiment.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'experiment': new_experiment.to_dict()}), 201

# --- ARTIFACTS ---

@startups_bp.route('/<int:startup_id>/artifacts', methods=['GET'])
@jwt_required()
def get_artifacts(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    artifacts = [a.to_dict() for a in startup.artifacts]
    return jsonify({'success': True, 'artifacts': artifacts}), 200

@startups_bp.route('/<int:startup_id>/artifacts', methods=['POST'])
@jwt_required()
def create_artifact(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data or 'type' not in data:
        return jsonify({'success': False, 'error': 'Artifact name and type are required.'}), 400
    new_artifact = Artifact(startup_id=startup_id, **data)
    db.session.add(new_artifact)
    db.session.commit()
    
    publish_update("artifact_created", {"startup_id": startup_id, "artifact": new_artifact.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='created',
        target_type='Artifact',
        target_id=new_artifact.id,
        details=new_artifact.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'artifact': new_artifact.to_dict()}), 201

# --- FOUNDERS ---

@startups_bp.route('/<int:startup_id>/founders', methods=['POST'])
@jwt_required()
def create_founder(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Founder name is required.'}), 400
    new_founder = Founder(startup_id=startup_id, **data)
    db.session.add(new_founder)
    db.session.commit()
    
    publish_update("founder_created", {"startup_id": startup_id, "founder": new_founder.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Founder',
        target_id=new_founder.id,
        details=new_founder.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Founder created successfully.', 'founder': new_founder.to_dict()}), 201

@startups_bp.route('/<int:startup_id>/founders/<int:founder_id>', methods=['PUT'])
@jwt_required()
def update_founder(startup_id, founder_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    founder = Founder.query.get_or_404(founder_id)
    if founder.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Founder does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        setattr(founder, key, value)
    db.session.commit()
    
    publish_update("founder_updated", {"startup_id": startup_id, "founder": founder.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'founder': founder.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/founders/<int:founder_id>', methods=['DELETE'])
@jwt_required()
def delete_founder(startup_id, founder_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    founder = Founder.query.get_or_404(founder_id)
    if founder.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Founder does not belong to this startup.'}), 400

    db.session.delete(founder)
    db.session.commit()
    
    publish_update("founder_deleted", {"startup_id": startup_id, "founder_id": founder_id}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'message': 'Founder deleted successfully.'}), 200

# --- SETTINGS ---

@startups_bp.route('/<int:startup_id>/settings', methods=['PUT'])
@jwt_required()
def update_startup_settings(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)
    if startup.user_id != user_id and (not user or user.role != UserRole.ADMIN):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    startup.name = data.get('name', startup.name)
    startup.slug = data.get('slug', startup.slug)
    startup.next_milestone = data.get('next_milestone', startup.next_milestone)
    
    db.session.commit()
    
    publish_update("startup_settings_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Startup',
        target_id=startup.id,
        details='Updated settings'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Settings updated successfully.',
        'startup': startup.to_dict()
    }), 200

# --- ASSETS ---

@startups_bp.route('/<int:startup_id>/assets/generate', methods=['POST'])
@jwt_required()
def generate_assets(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id_from_jwt = get_jwt_identity()
    user_id = int(user_id_from_jwt)
    user = User.query.get(user_id)

    has_access = False
    if validate_startup_access(startup, user, required_scope='PRODUCT'):
        has_access = True
    elif validate_startup_access(startup, user, required_scope='MARKETING'):
        has_access = True
    elif validate_startup_access(startup, user) and startup.user_id == user.id: 
         has_access = True
    
    if not has_access:
         return jsonify({'success': False, 'error': 'Unauthorized. Requires PRODUCT or MARKETING access.'}), 403

    data = request.get_json() or {}
    generate_product = data.get('generate_product', True)
    generate_gtm = data.get('generate_gtm', True)
    
    if generate_product and startup.is_generating_product:
        return jsonify({'success': False, 'error': 'Product generation is already in progress.'}), 400
    if generate_gtm and startup.is_generating_gtm:
        return jsonify({'success': False, 'error': 'GTM generation is already in progress.'}), 400

    if generate_product:
        startup.is_generating_product = True
    if generate_gtm:
        startup.is_generating_gtm = True
    db.session.commit()

    from app.tasks import generate_startup_assets_task
    publish_update("assets_generation_started", {"startup_id": startup.id, "message": "Asset generation started..."}, rooms=[f"user_{startup.user_id}", "admin"])
    
    generate_startup_assets_task.delay(startup.id, generate_product=generate_product, generate_gtm=generate_gtm)

    return jsonify({'success': True, 'message': 'Asset generation triggered.'}), 200

# --- MARKETING CONTENT ITEMS ---

@startups_bp.route('/<int:startup_id>/content-items/<int:content_id>', methods=['PUT'])
@jwt_required()
def update_content_item(startup_id, content_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    # Import locally to avoid circular imports if any, or verify global import
    from app.models import MarketingContentItem
    
    item = MarketingContentItem.query.get_or_404(content_id)
    # Check if item belongs to a calendar that belongs to a campaign of this startup
    if item.calendar.campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Content item does not belong to this startup.'}), 400

    data = request.get_json() or {}
    
    if 'title' in data:
        item.title = data['title']
    if 'content_type' in data:
        item.content_type = data['content_type']
    if 'channel' in data:
        item.channel = data['channel']
    if 'content_body' in data:
        item.content_body = data['content_body']
    if 'publish_date' in data:
        try:
            item.publish_date = datetime.strptime(data['publish_date'], '%Y-%m-%d').date()
        except ValueError:
            pass # Ignore invalid date format or handle error
    if 'status' in data:
        # Validate status enum if strictness is needed, else standard assignment
        item.status = data['status']
    if 'content_brief' in data:
        item.content_brief = data['content_brief']

    db.session.commit()
    return jsonify({'success': True, 'message': 'Content item updated.', 'content_item': item.to_dict()}), 200

@startups_bp.route('/<int:startup_id>/content-items/<int:content_id>', methods=['DELETE'])
@jwt_required()
def delete_content_item(startup_id, content_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    from app.models import MarketingContentItem

    item = MarketingContentItem.query.get_or_404(content_id)
    if item.calendar.campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Content item does not belong to this startup.'}), 400

    db.session.delete(item)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Content item deleted.'}), 200

@startups_bp.route('/<int:startup_id>/content-items/<int:content_id>/generate', methods=['POST'])
@jwt_required()
def generate_content_item_body(startup_id, content_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not validate_startup_access(startup, user, required_scope='MARKETING'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    from app.services.generation_service import generate_final_content
    
    # Check ownership
    from app.models import MarketingContentItem
    item = MarketingContentItem.query.get_or_404(content_id)
    if item.calendar.campaign.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Content item does not belong to this startup.'}), 400

    result = generate_final_content(startup_id, content_id)
    if result:
         return jsonify({'success': True, 'message': 'Content generated.', 'content_item': result}), 200
    else:
         return jsonify({'success': False, 'error': 'Generation failed.'}), 500

# --- PREVIEW PROXY ---

@startups_bp.route('/<int:startup_id>/preview/', defaults={'subpath': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@startups_bp.route('/<int:startup_id>/preview/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy_to_container(startup_id, subpath):
    # Proxy logic implementation
    from flask import Response
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request(optional=True)
        current_user_id = get_jwt_identity()
    except:
        current_user_id = None

    startup = Startup.query.get_or_404(startup_id)
    manager = DockerManager()
    
    container_info = manager.ensure_container(startup_id, container_name=startup.container_name)
    if "error" in container_info:
        return jsonify({"error": container_info["error"]}), 502
    
    if container_info.get("status") != "running":
        return jsonify({"error": "Container is not running"}), 502

    app_status = manager.ensure_app_running(startup_id, container_name=startup.container_name)
         
    ports = container_info.get("ports", {})
    target_port = None
    if '3000/tcp' in ports and ports['3000/tcp']:
        target_port = ports['3000/tcp'][0]['HostPort']
    elif '8000/tcp' in ports and ports['8000/tcp']:
        target_port = ports['8000/tcp'][0]['HostPort']
    elif '5000/tcp' in ports and ports['5000/tcp']:
        target_port = ports['5000/tcp'][0]['HostPort']
        
    if not target_port:
        return jsonify({"error": "No exposed web port found on container"}), 502
        
    target_url = f"http://localhost:{target_port}/{subpath}"
    if request.query_string:
        target_url += f"?{request.query_string.decode('utf-8')}"
        
    MAX_RETRIES = 5
    retry_delay = 1
    
    for attempt in range(MAX_RETRIES):
        try:
            proxy_headers = {key: value for (key, value) in request.headers if key != 'Host' and key.lower() != 'accept-encoding'}
            
            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=proxy_headers,
                data=request.get_data(),
                cookies=request.cookies,
                allow_redirects=False
            )
            
            excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
            headers = [(name, value) for (name, value) in resp.raw.headers.items()
                       if name.lower() not in excluded_headers]
            
            content = resp.content
            content_type = resp.headers.get('Content-Type', '').lower()
            if 'text/html' in content_type:
                try:
                    text_content = content.decode('utf-8')
                    import re
                    proxy_base = f"/api/startups/{startup_id}/preview"
                    def rewrite_path(match):
                        attr = match.group(1)
                        path = match.group(2)
                        return f'{attr}="{proxy_base}/{path}"'

                    text_content = re.sub(r'(src|href)="/(?!/)([^"]*)"', rewrite_path, text_content)
                    content = text_content.encode('utf-8')
                    headers = [(k, v) for k, v in headers if k.lower() != 'content-length']
                    headers.append(('Content-Length', str(len(content))))
                except Exception as e:
                    pass
                       
            return Response(content, resp.status_code, headers)
            
        except requests.exceptions.ConnectionError:
            if attempt < MAX_RETRIES - 1:
                time.sleep(retry_delay)
                retry_delay += 1
            else:
                return jsonify({"error": "Failed to connect to container app after multiple attempts"}), 502
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "Unknown error"}), 500

# --- TEAM MEMBERS ---

@startups_bp.route('/<int:startup_id>/team', methods=['GET'])
@jwt_required()
def get_team_members(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    members = []
    # Add Owner
    if startup.user:
        members.append({
            'user_id': startup.user.id,
            'user_email': startup.user.email,
            'user_name': startup.user.full_name,
            'role': 'Owner',
            'scopes': ['ALL'],
            'status': 'Active'
        })
        
    for member in startup.team_members:
        members.append(member.to_dict())
        
    return jsonify({'success': True, 'members': members}), 200

@startups_bp.route('/<int:startup_id>/team', methods=['POST'])
@jwt_required()
def add_team_member(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    if not validate_startup_access(startup, current_user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Only the owner or admin can manage team members.'}), 403

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    scopes = data.get('scopes', [])
    full_name = data.get('full_name', 'Team Member')
    role_title = data.get('role', 'Member')
    linkedin = data.get('linkedin')
    
    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and Password are required.'}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        existing_member = TeamMember.query.filter_by(startup_id=startup.id, user_id=existing_user.id).first()
        if existing_member:
             return jsonify({'success': False, 'error': 'User is already a member of this team.'}), 400
        
        new_member = TeamMember(
            startup_id=startup.id,
            user_id=existing_user.id,
            role=role_title,
            linkedin=linkedin,
            scopes=scopes
        )
        db.session.add(new_member)
        db.session.commit()
        return jsonify({'success': True, 'member': new_member.to_dict()}), 200

    try:
        try:
            firebase_user = firebase_auth.get_user_by_email(email)
        except firebase_auth.UserNotFoundError:
             firebase_user = firebase_auth.create_user(
                email=email,
                password=password,
                display_name=full_name,
                email_verified=False
            )
        
        if not existing_user:
             uid = firebase_user.uid
             new_user = User(
                firebase_uid=uid,
                email=email,
                full_name=full_name,
                role=UserRole.USER,
                organization_id=startup.organization_id, 
                email_verified=False
             )
             db.session.add(new_user)
             db.session.flush()
             
             new_member = TeamMember(
                startup_id=startup.id,
                user_id=new_user.id,
                role=role_title,
                linkedin=linkedin,
                scopes=scopes
             )
             db.session.add(new_member)
             db.session.commit()

             return jsonify({'success': True, 'member': new_member.to_dict()}), 201
        
        return jsonify({
            'success': True,
            'message': 'Team member added successfully.',
            'member': new_member.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Failed to add team member: {str(e)}'}), 500

@startups_bp.route('/<int:startup_id>/team/<int:member_user_id>', methods=['DELETE'])
@jwt_required()
def remove_team_member(startup_id, member_user_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403
         
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=member_user_id).first()
    if not member:
        return jsonify({'success': False, 'error': 'Member not found.'}), 404
        
    db.session.delete(member)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Team member removed.'}), 200

@startups_bp.route('/<int:startup_id>/team/<int:member_user_id>', methods=['PUT'])
@jwt_required()
def update_team_member(startup_id, member_user_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    current_user = User.query.get(user_id)
    
    is_owner = startup.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN and startup.organization_id == current_user.organization_id
    
    if not (is_owner or is_admin):
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403
         
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=member_user_id).first()
    if not member:
        return jsonify({'success': False, 'error': 'Member not found.'}), 404
        
    data = request.get_json()
    if 'scopes' in data:
        member.scopes = data['scopes']
        
    db.session.commit()
    return jsonify({'success': True, 'member': member.to_dict()}), 200
