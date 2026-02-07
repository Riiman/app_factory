"""
Calendar routes for unified calendar view across modules.
Aggregates events from multiple sources (interviews, tasks, meetings, etc.)
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, Job, Candidate, Application, Interview, User, Startup, JobStatus, ApplicationStatus, Artifact, Task, Product, Sprint, Release, MarketingContentItem, Scope, TaskStatus, CalendarEvent, CalendarEventType, MarketingContentCalendar, MarketingCampaign
from datetime import datetime
from app.extensions import db

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')


def user_id_from_token():
    """Helper to get user_id from JWT token"""
    return get_jwt_identity()


def get_user_startup_id(user):
    """Helper to get user's startup_id from relationships"""
    if user.startups:
        return user.startups[0].id
    elif user.team_memberships:
        return user.team_memberships[0].startup_id
    return None


def format_utc(dt):
    """Helper to format datetime as ISO with Z suffix if naive UTC"""
    if not dt: return None
    iso = dt.isoformat()
    if not dt.tzinfo:
        iso += 'Z'
    return iso


@calendar_bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    data = request.get_json()
    
    try:
        start = datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
        end = datetime.fromisoformat(data['end'].replace('Z', '+00:00'))
    except (ValueError, KeyError):
        return jsonify({'error': 'Invalid date format'}), 400
        
    # Validation
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    try:
        event_type = CalendarEventType[data.get('type', 'MEETING')]
    except KeyError:
        return jsonify({'error': 'Invalid event type'}), 400

    # Determine startup_id
    startup_id = get_user_startup_id(user)
        
    if not startup_id:
        return jsonify({'error': 'User is not associated with any startup'}), 400

    event = CalendarEvent(
        user_id=current_user_id,
        startup_id=startup_id,
        title=data.get('title'),
        description=data.get('description'),
        start_time=start,
        end_time=end,
        event_type=event_type,
        location=data.get('location')
    )
    
    # Add attendees
    attendee_ids = data.get('attendee_ids', [])
    if attendee_ids:
        attendees = User.query.filter(User.id.in_(attendee_ids)).all()
        event.attendees.extend(attendees)
    
    db.session.add(event)
    db.session.commit()
    
    return jsonify(event.to_dict()), 201



@calendar_bp.route('/events/<int:event_id>', methods=['PUT'])
@jwt_required()
def update_event(event_id):
    current_user_id = user_id_from_token()
    event = CalendarEvent.query.get_or_404(event_id)
    
    if event.user_id != current_user_id:
        return jsonify({'error': 'Permission denied'}), 403
        
    data = request.get_json()
    
    # Update fields
    if 'title' in data: event.title = data['title']
    if 'description' in data: event.description = data['description']
    if 'location' in data: event.location = data['location']
    
    try:
        if 'start' in data:
            event.start_time = datetime.fromisoformat(data['start'].replace('Z', '+00:00'))
        if 'end' in data:
            event.end_time = datetime.fromisoformat(data['end'].replace('Z', '+00:00'))
        if 'type' in data:
            event.event_type = CalendarEventType[data['type']]
    except (ValueError, KeyError):
        return jsonify({'error': 'Invalid data'}), 400
        
    # Update attendees
    if 'attendee_ids' in data:
        attendee_ids = data['attendee_ids']
        event.attendees.clear()
        if attendee_ids:
            attendees = User.query.filter(User.id.in_(attendee_ids)).all()
            event.attendees.extend(attendees)
        
    db.session.commit()
    return jsonify(event.to_dict())


@calendar_bp.route('/events/<int:event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    current_user_id = user_id_from_token()
    event = CalendarEvent.query.get_or_404(event_id)
    
    if event.user_id != current_user_id:
        return jsonify({'error': 'Permission denied'}), 403
        
    db.session.delete(event)
    db.session.commit()
    return jsonify({'message': 'Event deleted'})


@calendar_bp.route('/events', methods=['GET'])
@jwt_required()
def get_calendar_events():
    """
    Get calendar events for a user within a date range.
    Query params:
        - user_id: User whose calendar to fetch (defaults to current user)
        - start: Start date (ISO format)
        - end: End date (ISO format)
        - types[]: Event types to include (interview, meeting, deadline, content)
        - modules[]: Source modules to include (recruitment, marketing, tasks)
    """
    current_user_id = user_id_from_token()
    current_user = User.query.get(current_user_id)
    
    # Get query parameters
    target_user_id = request.args.get('user_id', current_user_id, type=int)
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    event_types = request.args.getlist('types[]')
    source_modules = request.args.getlist('modules[]')
    
    # Permission check: Only owners/admins/team members with scope can view other users' calendars
    # If no user_id specified, default to current user (already handled above)
    if target_user_id != current_user_id:
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if users are in same startup
        current_user_startup_id = get_user_startup_id(current_user)
        target_user_startup_id = get_user_startup_id(target_user)
        
        if not current_user_startup_id or not target_user_startup_id or current_user_startup_id != target_user_startup_id:
             # Allow admin override
            is_admin = current_user.role.value == 'ADMIN' if hasattr(current_user.role, 'value') else current_user.role == 'ADMIN'
            if not is_admin:
                return jsonify({'error': 'Permission denied'}), 403

        # Check permissions
        # 1. Admin
        is_admin = current_user.role.value == 'ADMIN' if hasattr(current_user.role, 'value') else current_user.role == 'ADMIN'
        
        # 2. Startup Owner
        startup = Startup.query.get(current_user_startup_id)
        is_owner = startup and startup.user_id == current_user.id
        
        # 3. Team Member with TEAM scope
        has_team_scope = False
        if not is_owner and not is_admin:
            from app.models import TeamMember
            membership = TeamMember.query.filter_by(user_id=current_user.id, startup_id=current_user_startup_id).first()
            if membership and membership.scopes and 'TEAM' in membership.scopes:
                has_team_scope = True
        
        if not (is_admin or is_owner or has_team_scope):
            return jsonify({'error': 'Permission denied'}), 403
    
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    events = []
    
    # Aggregate events from different sources
    # 1. Interviews (from recruitment module)
    if not event_types or 'interview' in event_types:
        if not source_modules or 'recruitment' in source_modules:
            interviews = Interview.query.filter_by(interviewer_id=target_user_id)
            
            if start_dt:
                interviews = interviews.filter(Interview.scheduled_at >= start_dt)
            if end_dt:
                interviews = interviews.filter(Interview.scheduled_at <= end_dt)
            
            for interview in interviews.all():
                # Get candidate and job info
                application = interview.application
                candidate = application.candidate if application else None
                job = application.job if application else None
                
                events.append({
                    'id': f'interview_{interview.id}',
                    'type': 'interview',
                    'source_module': 'recruitment',
                    'source_id': interview.id,
                    'title': f'Interview with {candidate.name if candidate else "Unknown"}',
                    'title': f'Interview with {candidate.name if candidate else "Unknown"}',
                    'start': format_utc(interview.scheduled_at),
                    'end': None,  # Interviews don't have end time currently
                    'all_day': False,
                    'metadata': {
                        'candidate_name': candidate.name if candidate else None,
                        'candidate_id': candidate.id if candidate else None,
                        'job_title': job.title if job else None,
                        'job_id': job.id if job else None,
                        'application_id': application.id if application else None,
                        'meeting_link': interview.meeting_link,
                        'status': interview.status.value,
                        'notes': interview.notes
                    }
                })
    
    # 2. Manual Calendar Events
    if not source_modules or 'manual' in source_modules:
        # Fetch events created by user OR where user is attendee
        query = CalendarEvent.query.filter(
            (CalendarEvent.user_id == target_user_id) | 
            (CalendarEvent.attendees.any(id=target_user_id))
        )
        if start_dt:
            query = query.filter(CalendarEvent.start_time >= start_dt)
        if end_dt:
            query = query.filter(CalendarEvent.start_time <= end_dt)
            
        for event in query.all():
            event_dict = event.to_dict()
            attendees_str = ", ".join([a['name'] for a in event_dict.get('attendees', [])])
            
            events.append({
                'id': f'event_{event.id}',
                'type': event.event_type.value.lower(),
                'source_module': 'manual',
                'source_id': event.id,
                'title': event.title,
                'start': format_utc(event.start_time),
                'end': format_utc(event.end_time),
                'all_day': False, 
                'metadata': {
                    'description': event.description,
                    'location': event.location,
                    'attendees': event_dict.get('attendees', []) 
                }
            })

    # 3. Tasks/Deadlines
    if not source_modules or 'tasks' in source_modules:
        try:
            # Find tasks where user is assignee OR owner, or maybe tasks for the startup
            # For "My Calendar": Assigned tasks
            task_query = Task.query.filter_by(assigned_to=target_user_id)
            if start_dt:
                task_query = task_query.filter(Task.due_date >= start_dt.date())
            if end_dt:
                task_query = task_query.filter(Task.due_date <= end_dt.date())
            
            for task in task_query.all():
                events.append({
                    'id': f'task_{task.id}',
                    'type': 'deadline',
                    'source_module': 'tasks', # maps to filters
                    'source_id': task.id,
                    'title': f'{task.name} (Due)',
                    'start': f"{task.due_date.isoformat()}T09:00:00Z", # Default to 9 AM for tasks
                    'end': f"{task.due_date.isoformat()}T10:00:00Z",
                    'all_day': True,
                    'metadata': {
                        'status': task.status.value,
                        'scope': task.scope.value,
                        'description': task.description
                    }
                })
        except Exception as e:
            current_app.logger.error(f"Error fetching tasks: {e}")

    # 4. Marketing Content
    if not source_modules or 'marketing' in source_modules:
        try:
             # Find user's startup(s)
            target_user = User.query.get(target_user_id)
            if target_user and target_user.startups:
                startup_id = target_user.startups[0].id # Simplified: assume first startup
                
                # Fetch calendar -> items
                # Items -> Calendar -> Campaign -> Startup
                content_query = db.session.query(MarketingContentItem).join(MarketingContentCalendar).join(MarketingCampaign).filter(
                    MarketingCampaign.startup_id == startup_id,
                    MarketingContentItem.publish_date != None
                )
                
                if start_dt:
                    content_query = content_query.filter(MarketingContentItem.publish_date >= start_dt.date())
                if end_dt:
                   content_query = content_query.filter(MarketingContentItem.publish_date <= end_dt.date())
                   
                for content in content_query.all():
                    events.append({
                        'id': f'content_{content.content_id}',
                        'type': 'content',
                        'source_module': 'marketing',
                        'source_id': content.content_id,
                        'title': f'{content.title} (Publish)',
                        'start': f"{content.publish_date.isoformat()}T10:00:00Z", # Default 10 AM
                        'end': None,
                        'all_day': True,
                        'metadata': {
                            'channel': content.channel,
                            'status': content.status.value,
                            'media_type': content.media_type
                        }
                    })
        except Exception as e:
            current_app.logger.error(f"Error fetching content: {e}")

    # 5. Product Launches
    if not source_modules or 'product' in source_modules or 'general' in source_modules:
        try:
             target_user = User.query.get(target_user_id)
             if target_user and target_user.startups:
                startup_id = target_user.startups[0].id
                
                # Product Launches
                prod_query = Product.query.filter_by(startup_id=startup_id).filter(Product.targeted_launch_date != None)
                if start_dt:
                    prod_query = prod_query.filter(Product.targeted_launch_date >= start_dt.date())
                if end_dt:
                    prod_query = prod_query.filter(Product.targeted_launch_date <= end_dt.date())
                    
                for prod in prod_query.all():
                    events.append({
                        'id': f'product_{prod.id}',
                        'type': 'launch',
                        'source_module': 'general',
                        'source_id': prod.id,
                        'title': f'{prod.name} Launch',
                        'start': f"{prod.targeted_launch_date.isoformat()}T08:00:00Z",
                        'end': None,
                        'all_day': True,
                        'metadata': {
                            'stage': prod.stage.value,
                            'version': prod.version
                        }
                    })

                # 6. Sprints
                sprint_query = Sprint.query.filter_by(startup_id=startup_id)
                if start_dt:
                    sprint_query = sprint_query.filter(Sprint.end_date >= start_dt.date())
                if end_dt:
                    sprint_query = sprint_query.filter(Sprint.start_date <= end_dt.date())

                for sprint in sprint_query.all():
                    # Sprint Start
                    events.append({
                        'id': f'sprint_start_{sprint.id}',
                        'type': 'deadline', # Reuse deadline color (yellow) or add custom
                        'source_module': 'product',
                        'source_id': sprint.id,
                        'title': f'Sprint Start: {sprint.name}',
                        'start': f"{sprint.start_date.isoformat()}T09:00:00Z",
                        'all_day': True,
                        'metadata': {'status': sprint.status}
                    })
                    # Sprint End
                    events.append({
                        'id': f'sprint_end_{sprint.id}',
                        'type': 'deadline',
                        'source_module': 'product',
                        'source_id': sprint.id,
                        'title': f'Sprint End: {sprint.name}',
                        'start': f"{sprint.end_date.isoformat()}T17:00:00Z",
                        'all_day': True,
                        'metadata': {'status': sprint.status}
                    })

                # 7. Releases
                release_query = Release.query.join(Product).filter(Product.startup_id == startup_id)
                if start_dt:
                    release_query = release_query.filter(Release.target_date >= start_dt.date())
                if end_dt:
                    release_query = release_query.filter(Release.target_date <= end_dt.date())

                for release in release_query.all():
                    events.append({
                        'id': f'release_{release.id}',
                        'type': 'launch', # Reuse launch color (purple/special)
                        'source_module': 'product',
                        'source_id': release.id,
                        'title': f'Release: {release.version}',
                        'start': f"{release.target_date.isoformat()}T09:00:00Z",
                        'all_day': True,
                        'metadata': {
                            'name': release.name,
                            'status': release.status
                        }
                    })

        except Exception as e:
            current_app.logger.error(f"Error fetching product events: {e}")

    return jsonify({'events': events}), 200


@calendar_bp.route('/team-events', methods=['GET'])
@jwt_required()
def get_team_calendar_events():
    """
    Get aggregated calendar events for all team members (owner/admin only).
    Query params: start, end, types[], modules[]
    """
    current_user_id = user_id_from_token()
    current_user = User.query.get(current_user_id)
    
    # Permission check
    # Check if user is system admin
    is_admin = current_user.role.value == 'ADMIN' if hasattr(current_user.role, 'value') else current_user.role == 'ADMIN'
    
    # Check if user is owner of any startup (and thus has full access to it)
    startup_id = get_user_startup_id(current_user)
    if not startup_id and not is_admin:
         return jsonify({'error': 'User not associated with startup'}), 403

    startup = Startup.query.get(startup_id)
    is_owner = startup and startup.user_id == current_user.id
    
    # Check if user is a team member with TEAM scope
    from app.models import TeamMember
    has_team_scope = False
    if not is_owner and not is_admin:
        membership = TeamMember.query.filter_by(user_id=current_user.id, startup_id=startup_id).first()
        if membership and membership.scopes and 'TEAM' in membership.scopes:
            has_team_scope = True
    
    if not (is_admin or is_owner or has_team_scope):
        return jsonify({'error': 'Permission denied'}), 403
    
    start_date = request.args.get('start')
    end_date = request.args.get('end')
    event_types = request.args.getlist('types[]')
    source_modules = request.args.getlist('modules[]')
    
    # Parse dates
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00')) if start_date else None
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00')) if end_date else None
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    
    events = []
    
    # Get all users associated with this startup (owner + members)
    # This requires more complex query or multiple queries
    
    # Fix import alias if needed, or use TeamMember directly
    owner_id = startup.user_id
    member_ids = [m.user_id for m in TeamMember.query.filter_by(startup_id=startup_id).all()]
    team_member_ids = list(set([owner_id] + member_ids))
    
    # Aggregate interviews for all team members
    if not event_types or 'interview' in event_types:
        if not source_modules or 'recruitment' in source_modules:
            interviews = Interview.query.filter(
                Interview.interviewer_id.in_(team_member_ids)
            )
            
            if start_dt:
                interviews = interviews.filter(Interview.scheduled_at >= start_dt)
            if end_dt:
                interviews = interviews.filter(Interview.scheduled_at <= end_dt)
            
            for interview in interviews.all():
                application = interview.application
                candidate = application.candidate if application else None
                job = application.job if application else None
                interviewer = interview.interviewer
                
                events.append({
                    'id': f'interview_{interview.id}',
                    'type': 'interview',
                    'source_module': 'recruitment',
                    'source_id': interview.id,
                    'user_id': interview.interviewer_id,
                    'user_name': interviewer.full_name if interviewer else None,
                    'title': f'Interview with {candidate.name if candidate else "Unknown"}',
                    'start': format_utc(interview.scheduled_at),
                    'end': None,
                    'all_day': False,
                    'metadata': {
                        'candidate_name': candidate.name if candidate else None,
                        'job_title': job.title if job else None,
                        'application_id': application.id if application else None,
                        'meeting_link': interview.meeting_link,
                        'status': interview.status.value
                    }
                })
    
    # Manual Calendar Events (Team)
    if not source_modules or 'manual' in source_modules:
        query = CalendarEvent.query.filter_by(startup_id=startup_id)
        if start_dt:
            query = query.filter(CalendarEvent.start_time >= start_dt)
        if end_dt:
            query = query.filter(CalendarEvent.start_time <= end_dt)
            
        for event in query.all():
            events.append({
                'id': f'event_{event.id}',
                'type': event.event_type.value.lower(),
                'source_module': 'manual',
                'source_id': event.id,
                'user_id': event.user_id,
                'user_name': event.user.full_name if event.user else None,
                'title': event.title,
                'start': format_utc(event.start_time),
                'end': format_utc(event.end_time),
                'all_day': False,
                'metadata': {
                    'description': event.description,
                    'location': event.location
                }
            })

    # Tasks/Deadlines (for all team members)
    if not source_modules or 'tasks' in source_modules:
        try:
            task_query = Task.query.filter(Task.assigned_to.in_(team_member_ids))
            if start_dt:
                task_query = task_query.filter(Task.due_date >= start_dt.date())
            if end_dt:
                task_query = task_query.filter(Task.due_date <= end_dt.date())
            
            for task in task_query.all():
                assignee = User.query.get(task.assigned_to)
                events.append({
                    'id': f'task_{task.id}',
                    'type': 'deadline',
                    'source_module': 'tasks',
                    'source_id': task.id,
                    'user_id': task.assigned_to,
                    'user_name': assignee.full_name if assignee else None,
                    'title': f'{task.name} (Due)',
                    'start': f"{task.due_date.isoformat()}T09:00:00Z",
                    'end': f"{task.due_date.isoformat()}T10:00:00Z",
                    'all_day': True,
                    'metadata': {
                        'status': task.status.value,
                        'scope': task.scope.value,
                        'description': task.description
                    }
                })
        except Exception as e:
            current_app.logger.error(f"Error fetching tasks: {e}")

    # Marketing Content (Startup wide)
    if not source_modules or 'marketing' in source_modules:
        try:
            content_query = db.session.query(MarketingContentItem).join(MarketingContentCalendar).join(MarketingCampaign).filter(
                MarketingCampaign.startup_id == startup_id,
                MarketingContentItem.publish_date != None
            )
            
            if start_dt:
                content_query = content_query.filter(MarketingContentItem.publish_date >= start_dt.date())
            if end_dt:
               content_query = content_query.filter(MarketingContentItem.publish_date <= end_dt.date())
               
            for content in content_query.all():
                events.append({
                    'id': f'content_{content.content_id}',
                    'type': 'content',
                    'source_module': 'marketing',
                    'source_id': content.content_id,
                    # Marketing content is usually not assigned to a specific user for viewing purposes, but belongs to startup
                    'title': f'{content.title} (Publish)',
                    'start': f"{content.publish_date.isoformat()}T10:00:00Z",
                    'end': None,
                    'all_day': True,
                    'metadata': {
                        'channel': content.channel,
                        'status': content.status.value,
                        'media_type': content.media_type
                    }
                })
        except Exception as e:
            current_app.logger.error(f"Error fetching content: {e}")

    # Product Launches, Sprints, Releases (Startup wide)
    if not source_modules or 'product' in source_modules or 'general' in source_modules:
        try:
            # Product Launches
            prod_query = Product.query.filter_by(startup_id=startup_id).filter(Product.targeted_launch_date != None)
            if start_dt:
                prod_query = prod_query.filter(Product.targeted_launch_date >= start_dt.date())
            if end_dt:
                prod_query = prod_query.filter(Product.targeted_launch_date <= end_dt.date())
                
            for prod in prod_query.all():
                events.append({
                    'id': f'product_{prod.id}',
                    'type': 'launch',
                    'source_module': 'general',
                    'source_id': prod.id,
                    'title': f'{prod.name} Launch',
                    'start': f"{prod.targeted_launch_date.isoformat()}T08:00:00Z",
                    'end': None,
                    'all_day': True,
                    'metadata': {
                        'stage': prod.stage.value,
                        'version': prod.version
                    }
                })

            # Sprints
            sprint_query = Sprint.query.filter_by(startup_id=startup_id)
            if start_dt:
                sprint_query = sprint_query.filter(Sprint.end_date >= start_dt.date())
            if end_dt:
                sprint_query = sprint_query.filter(Sprint.start_date <= end_dt.date())

            for sprint in sprint_query.all():
                # Sprint Start
                events.append({
                    'id': f'sprint_start_{sprint.id}',
                    'type': 'deadline',
                    'source_module': 'product',
                    'source_id': sprint.id,
                    'title': f'Sprint Start: {sprint.name}',
                    'start': f"{sprint.start_date.isoformat()}T09:00:00Z",
                    'all_day': True,
                    'metadata': {'status': sprint.status}
                })
                # Sprint End
                events.append({
                    'id': f'sprint_end_{sprint.id}',
                    'type': 'deadline',
                    'source_module': 'product',
                    'source_id': sprint.id,
                    'title': f'Sprint End: {sprint.name}',
                    'start': f"{sprint.end_date.isoformat()}T17:00:00Z",
                    'all_day': True,
                    'metadata': {'status': sprint.status}
                })

            # Releases
            release_query = Release.query.join(Product).filter(Product.startup_id == startup_id)
            if start_dt:
                release_query = release_query.filter(Release.target_date >= start_dt.date())
            if end_dt:
                release_query = release_query.filter(Release.target_date <= end_dt.date())

            for release in release_query.all():
                events.append({
                    'id': f'release_{release.id}',
                    'type': 'launch',
                    'source_module': 'product',
                    'source_id': release.id,
                    'title': f'Release: {release.version}',
                    'start': f"{release.target_date.isoformat()}T09:00:00Z",
                    'all_day': True,
                    'metadata': {
                        'name': release.name,
                        'status': release.status
                    }
                })

        except Exception as e:
            current_app.logger.error(f"Error fetching product events: {e}")

    return jsonify({'events': events}), 200
