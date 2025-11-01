"""
dashboard.py - Refactored for 9-stage architecture
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    User, Submission, Startup, StageInstance, StageTemplate,
    Task, Metric, Artifact, Experiment, Integration, Document,
    StageStatus, TaskStatus, TaskPriority, ArtifactType, ExperimentStatus
)
from app import db
from datetime import datetime
import json

dashboard_bp = Blueprint('dashboard', __name__)

# ============================================================================
# MAIN DASHBOARD
# ============================================================================

@dashboard_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get complete dashboard overview for user's startup"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get submission
        submission = user.submission
        if not submission:
            return jsonify({
                'success': False,
                'error': 'No submission found. Please complete your application first.'
            }), 404
        
        # Get or create startup
        startup = user.startup
        if not startup:
            startup = _create_startup_from_submission(user, submission)
        
        # Compute overall progress
        startup.overall_progress = startup.compute_progress()
        db.session.commit()
        
        # Get all stage instances
        stages = StageInstance.query.filter_by(startup_id=startup.id).order_by(StageInstance.order).all()
        
        # Get recent activity (last 10 items)
        recent_tasks = Task.query.join(StageInstance).filter(
            StageInstance.startup_id == startup.id
        ).order_by(Task.updated_at.desc()).limit(10).all()
        
        recent_artifacts = Artifact.query.join(StageInstance).filter(
            StageInstance.startup_id == startup.id
        ).order_by(Artifact.created_at.desc()).limit(10).all()
        
        # Get integrations
        integrations = Integration.query.filter_by(startup_id=startup.id).all()
        
        # Get alerts/blockers
        alerts = _get_startup_alerts(startup, stages)
        
        return jsonify({
            'success': True,
            'data': {
                'user': user.to_dict(),
                'submission': submission.to_dict(),
                'startup': startup.to_dict(),
                'stages': [s.to_dict() for s in stages],
                'recent_activity': {
                    'tasks': [t.to_dict() for t in recent_tasks],
                    'artifacts': [a.to_dict() for a in recent_artifacts]
                },
                'integrations': [i.to_dict() for i in integrations],
                'alerts': alerts
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
def get_overview_stats():
    """Get aggregated overview statistics"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        # Aggregate stats
        stages = StageInstance.query.filter_by(startup_id=startup.id).all()
        
        stats = {
            'overall_progress': startup.overall_progress,
            'current_stage': startup.current_stage_key,
            'stages_completed': sum(1 for s in stages if s.status == StageStatus.COMPLETED),
            'stages_in_progress': sum(1 for s in stages if s.status == StageStatus.IN_PROGRESS),
            'stages_blocked': sum(1 for s in stages if s.status == StageStatus.BLOCKED),
            'total_tasks': db.session.query(Task).join(StageInstance).filter(
                StageInstance.startup_id == startup.id
            ).count(),
            'tasks_completed': db.session.query(Task).join(StageInstance).filter(
                StageInstance.startup_id == startup.id,
                Task.status == TaskStatus.DONE
            ).count(),
            'total_artifacts': db.session.query(Artifact).join(StageInstance).filter(
                StageInstance.startup_id == startup.id
            ).count(),
            'active_experiments': db.session.query(Experiment).join(StageInstance).filter(
                StageInstance.startup_id == startup.id,
                Experiment.status == ExperimentStatus.RUNNING
            ).count(),
            'integrations_connected': db.session.query(Integration).filter_by(
                startup_id=startup.id,
                status='connected'
            ).count()
        }
        
        return jsonify({'success': True, 'data': stats}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# STAGE OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/stages', methods=['GET'])
@jwt_required()
def get_stages():
    """Get all stage instances for startup"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stages = StageInstance.query.filter_by(startup_id=startup.id).order_by(StageInstance.order).all()
        
        return jsonify({
            'success': True,
            'data': [s.to_dict() for s in stages]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>', methods=['GET'])
@jwt_required()
def get_stage_detail(stage_key):
    """Get detailed information for a specific stage"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        # Get template for form schema
        template = stage_instance.template
        
        return jsonify({
            'success': True,
            'data': {
                'stage': stage_instance.to_dict(include_details=True),
                'template': template.to_dict() if template else None
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>', methods=['PUT'])
@jwt_required()
def update_stage(stage_key):
    """Update stage status, form data, or metadata"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'status' in data:
            stage_instance.status = StageStatus(data['status'])
            if data['status'] == 'completed':
                stage_instance.completed_at = datetime.utcnow()
            elif data['status'] == 'in_progress' and not stage_instance.started_at:
                stage_instance.started_at = datetime.utcnow()
        
        if 'form_data' in data:
            stage_instance.set_form_data(data['form_data'])
        
        if 'notes' in data:
            stage_instance.notes = data['notes']
        
        if 'blockers' in data:
            stage_instance.blockers = json.dumps(data['blockers'])
        
        if 'due_date' in data:
            stage_instance.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
        
        # Recompute progress
        stage_instance.progress = stage_instance.compute_progress()
        startup.overall_progress = startup.compute_progress()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': stage_instance.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# TASK OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/stage/<stage_key>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(stage_key):
    """Get all tasks for a stage"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        tasks = Task.query.filter_by(stage_instance_id=stage_instance.id).order_by(Task.order, Task.created_at).all()
        
        return jsonify({
            'success': True,
            'data': [t.to_dict() for t in tasks]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>/tasks', methods=['POST'])
@jwt_required()
def create_task(stage_key):
    """Create a new task"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        data = request.get_json()
        
        task = Task(
            stage_instance_id=stage_instance.id,
            title=data['title'],
            description=data.get('description'),
            status=TaskStatus(data.get('status', 'todo')),
            priority=TaskPriority(data.get('priority', 'p2')),
            assignee_id=data.get('assignee_id'),
            due_date=datetime.fromisoformat(data['due_date']) if data.get('due_date') else None,
            tags=json.dumps(data.get('tags', [])),
            order=data.get('order', 0)
        )
        
        db.session.add(task)
        db.session.commit()
        
        # Recompute progress
        stage_instance.progress = stage_instance.compute_progress()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': task.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update a task"""
    try:
        user_id = int(get_jwt_identity())
        
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        # Verify ownership
        if task.stage_instance.startup.user_id != user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'status' in data:
            task.status = TaskStatus(data['status'])
            if data['status'] == 'done':
                task.completed_at = datetime.utcnow()
        if 'priority' in data:
            task.priority = TaskPriority(data['priority'])
        if 'due_date' in data:
            task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
        if 'tags' in data:
            task.tags = json.dumps(data['tags'])
        
        db.session.commit()
        
        # Recompute progress
        task.stage_instance.progress = task.stage_instance.compute_progress()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': task.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    """Delete a task"""
    try:
        user_id = int(get_jwt_identity())
        
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'success': False, 'error': 'Task not found'}), 404
        
        # Verify ownership
        if task.stage_instance.startup.user_id != user_id:
            return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
        stage_instance = task.stage_instance
        db.session.delete(task)
        db.session.commit()
        
        # Recompute progress
        stage_instance.progress = stage_instance.compute_progress()
        db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# METRIC OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/stage/<stage_key>/metrics', methods=['GET'])
@jwt_required()
def get_metrics(stage_key):
    """Get all metrics for a stage"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        metrics = Metric.query.filter_by(stage_instance_id=stage_instance.id).all()
        
        return jsonify({
            'success': True,
            'data': [m.to_dict() for m in metrics]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>/metrics', methods=['POST'])
@jwt_required()
def upsert_metric(stage_key):
    """Create or update a metric"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        data = request.get_json()
        
        # Check if metric exists
        metric = Metric.query.filter_by(
            stage_instance_id=stage_instance.id,
            key=data['key']
        ).first()
        
        if metric:
            # Update existing
            metric.value = data.get('value', metric.value)
            metric.target = data.get('target', metric.target)
            metric.unit = data.get('unit', metric.unit)
            metric.source = data.get('source', metric.source)
        else:
            # Create new
            metric = Metric(
                stage_instance_id=stage_instance.id,
                key=data['key'],
                name=data['name'],
                value=data.get('value'),
                target=data.get('target'),
                unit=data.get('unit'),
                source=data.get('source', 'manual')
            )
            db.session.add(metric)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': metric.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# ARTIFACT OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/stage/<stage_key>/artifacts', methods=['GET'])
@jwt_required()
def get_artifacts(stage_key):
    """Get all artifacts for a stage"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        artifacts = Artifact.query.filter_by(stage_instance_id=stage_instance.id).order_by(Artifact.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'data': [a.to_dict() for a in artifacts]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>/artifacts', methods=['POST'])
@jwt_required()
def create_artifact(stage_key):
    """Create a new artifact"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        data = request.get_json()
        
        artifact = Artifact(
            stage_instance_id=stage_instance.id,
            title=data['title'],
            artifact_type=ArtifactType(data['type']),
            url=data.get('url'),
            file_path=data.get('file_path'),
            description=data.get('description'),
            version=data.get('version', '1.0'),
            visibility=data.get('visibility', 'private'),
            metadata=json.dumps(data.get('metadata', {})),
            uploaded_by=user_id
        )
        
        db.session.add(artifact)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': artifact.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# EXPERIMENT OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/stage/<stage_key>/experiments', methods=['GET'])
@jwt_required()
def get_experiments(stage_key):
    """Get all experiments for a stage"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        experiments = Experiment.query.filter_by(stage_instance_id=stage_instance.id).all()
        
        return jsonify({
            'success': True,
            'data': [e.to_dict() for e in experiments]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@dashboard_bp.route('/dashboard/stage/<stage_key>/experiments', methods=['POST'])
@jwt_required()
def create_experiment(stage_key):
    """Create a new experiment"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        stage_instance = StageInstance.query.filter_by(
            startup_id=startup.id,
            stage_key=stage_key
        ).first()
        
        if not stage_instance:
            return jsonify({'success': False, 'error': 'Stage not found'}), 404
        
        data = request.get_json()
        
        experiment = Experiment(
            stage_instance_id=stage_instance.id,
            name=data['name'],
            hypothesis=data.get('hypothesis'),
            status=ExperimentStatus(data.get('status', 'draft')),
            metric_keys=json.dumps(data.get('metric_keys', []))
        )
        
        db.session.add(experiment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': experiment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# INTEGRATION OPERATIONS
# ============================================================================

@dashboard_bp.route('/dashboard/integrations', methods=['GET'])
@jwt_required()
def get_integrations():
    """Get all integrations for startup"""
    try:
        user_id = int(get_jwt_identity())
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            return jsonify({'success': False, 'error': 'Startup not found'}), 404
        
        integrations = Integration.query.filter_by(startup_id=startup.id).all()
        
        return jsonify({
            'success': True,
            'data': [i.to_dict() for i in integrations]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _create_startup_from_submission(user, submission):
    """Create startup from submission data and initialize stages"""
    startup = Startup(
        user_id=user.id,
        submission_id=submission.id,
        name=submission.startup_name,
        slug=submission.startup_name.lower().replace(' ', '-') if submission.startup_name else f'startup-{user.id}',
        status='active'
    )
    
    db.session.add(startup)
    db.session.flush()  # Get startup.id
    
    # Initialize all 9 stages
    startup.initialize_stages()
    
    # Seed data from submission into stage instances
    _seed_stage_data_from_submission(startup, submission)
    
    db.session.commit()
    return startup


def _seed_stage_data_from_submission(startup, submission):
    """Populate stage instances with submission data"""
    
    # Stage 1: Founder Specifications
    stage1 = StageInstance.query.filter_by(startup_id=startup.id, stage_key='founder_specifications').first()
    if stage1:
        stage1.set_form_data({
            'startup_name': submission.startup_name,
            'founders': submission.number_of_founders,
            'team_size': submission.team_size,
            'headquarters': submission.headquarters,
            'founding_year': submission.founding_year,
            'team_description': submission.team_description
        })
        stage1.status = StageStatus.COMPLETED
        stage1.progress = 100
    
    # Stage 2: Product Scope
    stage2 = StageInstance.query.filter_by(startup_id=startup.id, stage_key='product_scope').first()
    if stage2:
        stage2.set_form_data({
            'overview': submission.company_overview,
            'problem': submission.problem_statement,
            'solution': submission.solution,
            'value_prop': submission.unique_value_proposition,
            'tech_stack': submission.tech_stack,
            'features': submission.key_features
        })
        stage2.status = StageStatus.IN_PROGRESS
    
    # Stage 3: GTM Scope
    stage3 = StageInstance.query.filter_by(startup_id=startup.id, stage_key='gtm_scope').first()
    if stage3:
        stage3.set_form_data({
            'target_market': submission.target_market,
            'segments': submission.customer_segments,
            'competition': submission.competition,
            'advantage': submission.competitive_advantage,
            'pricing': submission.pricing_strategy,
            'gtm_strategy': submission.go_to_market_strategy
        })
        stage3.status = StageStatus.IN_PROGRESS
    
    # Stage 9: Fundraise
    stage9 = StageInstance.query.filter_by(startup_id=startup.id, stage_key='fundraise').first()
    if stage9:
        stage9.set_form_data({
            'funding_required': submission.funding_required,
            'revenue_streams': submission.revenue_streams,
            'business_model': submission.business_model,
            'pitch_deck_url': submission.pitch_deck_url,
            'demo_url': submission.demo_url
        })


def _get_startup_alerts(startup, stages):
    """Generate alerts for blocked stages, overdue tasks, stale metrics"""
    alerts = []
    
    # Blocked stages
    blocked_stages = [s for s in stages if s.status == StageStatus.BLOCKED]
    for stage in blocked_stages:
        alerts.append({
            'type': 'blocked_stage',
            'severity': 'high',
            'message': f'{stage.template.name} is blocked',
            'stage_key': stage.stage_key,
            'blockers': stage.get_blockers()
        })
    
    # Overdue tasks
    overdue_tasks = Task.query.join(StageInstance).filter(
        StageInstance.startup_id == startup.id,
        Task.due_date < datetime.utcnow(),
        Task.status != TaskStatus.DONE
    ).count()
    
    if overdue_tasks > 0:
        alerts.append({
            'type': 'overdue_tasks',
            'severity': 'medium',
            'message': f'{overdue_tasks} task(s) overdue',
            'count': overdue_tasks
        })
    
    # Stale metrics (not updated in 7 days)
    from datetime import timedelta
    stale_threshold = datetime.utcnow() - timedelta(days=7)
    stale_metrics = Metric.query.join(StageInstance).filter(
        StageInstance.startup_id == startup.id,
        Metric.last_synced_at < stale_threshold
    ).count()
    
    if stale_metrics > 0:
        alerts.append({
            'type': 'stale_metrics',
            'severity': 'low',
            'message': f'{stale_metrics} metric(s) need update',
            'count': stale_metrics
        })
    
    return alerts
