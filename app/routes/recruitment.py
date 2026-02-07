
import os
import io
import logging
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from urllib.parse import urlparse
from app.models import db, Job, Candidate, Application, Interview, User, Startup, JobStatus, ApplicationStatus, Artifact
from app.services.recruitment_service import recruitment_service
from app.services.artifact_storage_service import artifact_storage_service
from pypdf import PdfReader

recruitment_bp = Blueprint('recruitment', __name__, url_prefix='/api/recruitment')
logger = logging.getLogger(__name__)

# --- JOBS ---

@recruitment_bp.route('/jobs', methods=['POST'])
@jwt_required()
def create_job():
    current_user_id = get_jwt_identity()
    data = request.json
    
    # Simple validation: user must own the startup or be authorized
    startup_id = data.get('startup_id')
    startup = Startup.query.get(startup_id)

    # Cast current_user_id to int for comparison if it's a string
    try:
        current_user_id = int(current_user_id)
    except (ValueError, TypeError):
        pass

    if not startup or startup.user_id != current_user_id:
        return jsonify({"error": "Unauthorized"}), 403

    job = Job(
        startup_id=startup_id,
        title=data.get('title'),
        description=data.get('description'),
        requirements=data.get('requirements', []),
        location=data.get('location'),
        salary_min=data.get('salary_min'),
        salary_max=data.get('salary_max'),
        currency=data.get('currency', 'USD'),
        status=JobStatus.OPEN # Default to OPEN for now
    )
    db.session.add(job)
    db.session.commit()
    
    return jsonify(job.to_dict()), 201

@recruitment_bp.route('/jobs', methods=['GET'])
@jwt_required()
def get_jobs():
    current_user_id = get_jwt_identity()
    startup_id = request.args.get('startup_id')
    
    if not startup_id:
        return jsonify({"error": "Startup ID required"}), 400
        
    jobs = Job.query.filter_by(startup_id=startup_id).all()
    return jsonify([j.to_dict() for j in jobs]), 200

@recruitment_bp.route('/jobs/<int:job_id>', methods=['GET'])
@jwt_required()
def get_job_detail(job_id):
    job = Job.query.get_or_404(job_id)
    return jsonify(job.to_dict()), 200

@recruitment_bp.route('/jobs/<int:job_id>/close', methods=['POST'])
@jwt_required()
def close_job(job_id):
    job = Job.query.get_or_404(job_id)
    # Authorization check (can be enhanced)
    job.status = JobStatus.CLOSED
    db.session.commit()
    return jsonify(job.to_dict()), 200

@recruitment_bp.route('/jobs/generate-description', methods=['POST'])
@jwt_required()
def generate_jd():
    data = request.json
    title = data.get('title')
    keywords = data.get('keywords')
    context = data.get('context', '')
    
    if not title:
        return jsonify({"error": "Title required"}), 400
        
    description = recruitment_service.generate_job_description(title, keywords, context)
    return jsonify({"description": description}), 200

# --- CANDIDATES & APPLICATIONS ---

@recruitment_bp.route('/candidates/upload', methods=['POST'])
@jwt_required()
def upload_candidate():
    """
    1. Upload PDF to S3/Local
    2. Extract Text -> AI Parse
    3. Create Candidate Record
    4. (Optional) Create Application if job_id provided
    """
    current_user_id = get_jwt_identity()
    
    # 1. Validation
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    job_id = request.form.get('job_id')
    startup_id = request.form.get('startup_id')
    
    if not startup_id:
        return jsonify({'error': 'Startup ID required'}), 400
        
    # 2. Extract Text (Read content into memory)
    file_content = file.read()
    file.seek(0) # Reset stream for S3 upload
    
    text_content = ""
    try:
        # Use PdfReader on bytes
        reader = PdfReader(io.BytesIO(file_content))
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
    except Exception as e:
        logger.error(f"Failed to read PDF: {e}")
        return jsonify({'error': 'Invalid PDF file'}), 400
        
    # 3. AI Parsing
    parsed_data = recruitment_service.parse_resume(text_content)
    if not parsed_data:
        parsed_data = {}
    
    candidate_name = parsed_data.get('name') or "Unknown Candidate"
    candidate_email = parsed_data.get('email') or f"unknown_{os.urandom(4).hex()}@example.com"
    
    # 4. Upload to Storage (Artifact)
    try:
        artifact = artifact_storage_service.upload_file_artifact(
            file=file,
            startup_id=startup_id,
            user_id=current_user_id,
            name=f"Resume - {candidate_name}",
            scope="GENERAL", 
            description="Candidate Resume"
        )
        resume_url = artifact_storage_service.get_download_url(artifact.id)
    except Exception as e:
        logger.error(f"Artifact upload failed: {e}")
        return jsonify({'error': 'Failed to save resume file'}), 500

    # 5. Create Candidate
    # Check if exists (by email) - for now simpler to just create new or update
    candidate = Candidate.query.filter_by(email=candidate_email).first()
    if not candidate:
        candidate = Candidate(
            startup_id=startup_id,
            name=candidate_name,
            email=candidate_email,
            phone=parsed_data.get('phone'),
            resume_url=resume_url,
            parsed_data=parsed_data
        )
        db.session.add(candidate)
        db.session.flush()
    else:
        # Update resume/data
        candidate.resume_url = resume_url
        candidate.parsed_data = parsed_data
    
    # 6. Create Application (if job_id)
    application = None
    if job_id:
        job = Job.query.get(job_id)
        if job:
            # AI Scoring
            score_data = recruitment_service.score_candidate(job.description, text_content)
            
            application = Application(
                job_id=job.id,
                candidate_id=candidate.id,
                status=ApplicationStatus.APPLIED,
                stage="Applied",
                ai_score=score_data.get('score', 0),
                ai_analysis=score_data.get('analysis')
            )
            db.session.add(application)
            
    db.session.commit()
    
    return jsonify({
        "candidate": candidate.to_dict(),
        "application": application.to_dict() if application else None
    }), 201

@recruitment_bp.route('/jobs/<int:job_id>/pipeline', methods=['GET'])
@jwt_required()
def get_pipeline(job_id):
    """Get Kanban board data: Columns with applications"""
    apps = Application.query.filter_by(job_id=job_id).all()
    
    pipeline = {
        "Applied": [],
        "Screening": [],
        "Interview": [],
        "Offer": [],
        "Hired": [],
        "Rejected": []
    }
    
    for app in apps:
        # Use 'stage' field for visual column, fallback to status
        stage = app.stage if app.stage in pipeline else "Applied"
        pipeline[stage].append(app.to_dict())
        
    return jsonify(pipeline), 200


@recruitment_bp.route('/applications/<int:app_id>', methods=['GET'])
@jwt_required()
def get_application_detail(app_id):
    """Get full details of a candidate application including AI analysis"""
    app = Application.query.get_or_404(app_id)
    
    # Ensure authorization (startup owner)
    current_user_id = get_jwt_identity()
    # Simple check: job -> startup -> user_id
    if app.job.startup.user_id != user_id_from_token(current_user_id):
         # Also allow if user is in the same startup team
         current_user = User.query.get(current_user_id)
         user_startup_id = None
         if current_user.startups: 
             user_startup_id = current_user.startups[0].id
         elif hasattr(current_user, 'team_memberships') and current_user.team_memberships:
             user_startup_id = current_user.team_memberships[0].startup_id
             
         if not user_startup_id or user_startup_id != app.job.startup_id:
             return jsonify({"error": "Unauthorized"}), 403

    app_data = app.to_dict()
    
    # Refresh resume URL if needed (handle expired presigned URLs)
    if app_data.get('candidate') and app_data['candidate'].get('resume_url'):
        resume_url = app_data['candidate']['resume_url']
        # Check if likely an S3 URL
        if 'amazonaws.com' in resume_url and '?' in resume_url:
            try:
                parsed = urlparse(resume_url)
                # Parse key from path (remove leading slash)
                s3_key = parsed.path.lstrip('/')
                
                # Find artifact by key
                artifact = Artifact.query.filter_by(s3_key=s3_key).first()
                if artifact:
                    # Generate fresh URL
                    app_data['candidate']['resume_url'] = artifact_storage_service.get_download_url(artifact.id)
            except Exception as e:
                logger.error(f"Failed to refresh resume URL: {e}")

    return jsonify(app_data), 200

def user_id_from_token(identity):
    try:
        return int(identity)
    except:
        return str(identity)


@recruitment_bp.route('/applications/<int:app_id>/move', methods=['POST'])
@jwt_required()
def move_application(app_id):
    """Move candidate to different stage"""
    data = request.json
    new_stage = data.get('stage')
    
    app = Application.query.get_or_404(app_id)
    app.stage = new_stage
    
    # Basic status mapping
    if new_stage == 'Hired':
        app.status = ApplicationStatus.HIRED
    elif new_stage == 'Rejected':
        app.status = ApplicationStatus.REJECTED
    elif new_stage == 'Offer':
        app.status = ApplicationStatus.OFFER
        
    db.session.commit()
    return jsonify(app.to_dict()), 200


@recruitment_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    startup_id = request.args.get('startup_id')
    if not startup_id:
        return jsonify({"error": "Startup ID required"}), 400

    # Metrics
    total_jobs = Job.query.filter_by(startup_id=startup_id).count()
    active_jobs = Job.query.filter_by(startup_id=startup_id, status=JobStatus.OPEN).count()
    
    # Candidates & Applications
    # Join with Job to filter by startup_id
    total_candidates = db.session.query(Application).join(Job).filter(Job.startup_id == startup_id).count()
    hired_candidates = db.session.query(Application).join(Job).filter(
        Job.startup_id == startup_id, 
        Application.status == ApplicationStatus.HIRED
    ).count()

    # Recent Activity (Last 5 applications)
    recent_applications = db.session.query(Application)\
        .join(Job)\
        .filter(Job.startup_id == startup_id)\
        .order_by(Application.created_at.desc())\
        .limit(5)\
        .all()

    return jsonify({
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_candidates": total_candidates,
        "hired_candidates": hired_candidates,
        "recent_activity": [app.to_dict() for app in recent_applications]
    }), 200


@recruitment_bp.route('/applications/<int:app_id>/activities', methods=['GET'])
@jwt_required()
def get_application_activities(app_id):
    """Get all activity/notes for an application"""
    from app.models import RecruitmentActivity
    
    activities = RecruitmentActivity.query.filter_by(application_id=app_id)\
        .order_by(RecruitmentActivity.created_at.desc())\
        .all()
    
    return jsonify([activity.to_dict() for activity in activities]), 200


@recruitment_bp.route('/applications/<int:app_id>/activities', methods=['POST'])
@jwt_required()
def add_application_activity(app_id):
    """Add a note/comment to an application"""
    from app.models import RecruitmentActivity
    
    current_user_id = get_jwt_identity()
    data = request.json
    
    activity = RecruitmentActivity(
        application_id=app_id,
        user_id=current_user_id,
        action=data.get('action', 'Added Note'),
        details={'note': data.get('note'), 'type': data.get('type', 'comment')}
    )
    
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'activity': activity.to_dict()}), 201


@recruitment_bp.route('/applications/<int:app_id>/schedule-interview', methods=['POST'])
@jwt_required()
def schedule_interview(app_id):
    """Schedule an interview for an application"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Get user's startup
    user_startup = None
    if current_user.startups:
        user_startup = current_user.startups[0]
    elif hasattr(current_user, 'team_memberships') and current_user.team_memberships:
        user_startup = current_user.team_memberships[0].startup
    
    if not user_startup:
        return jsonify({'error': 'User not associated with any startup'}), 403
    
    # Get application and verify access
    application = Application.query.get(app_id)
    if not application:
        return jsonify({'error': 'Application not found'}), 404
    
    # Verify user has access to this application's job
    job = application.job
    if not job or job.startup_id != user_startup.id:
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.json
    
    # Validate required fields
    if not data.get('scheduled_at'):
        return jsonify({'error': 'scheduled_at is required'}), 400
    
    if not data.get('interviewer_id'):
        return jsonify({'error': 'interviewer_id is required'}), 400
    
    # Parse and validate scheduled time
    try:
        from datetime import datetime
        scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00'))
        
        # Check if time is in the future
        if scheduled_at <= datetime.now(scheduled_at.tzinfo):
            return jsonify({'error': 'Interview must be scheduled in the future'}), 400
    except (ValueError, AttributeError):
        return jsonify({'error': 'Invalid date format'}), 400
    
    # Verify interviewer is a team member
    interviewer = User.query.get(data['interviewer_id'])
    if not interviewer:
        return jsonify({'error': 'Interviewer not found'}), 400
    
    # Check if interviewer belongs to the same startup
    interviewer_startup = None
    if interviewer.startups:
        interviewer_startup = interviewer.startups[0]
    elif hasattr(interviewer, 'team_memberships') and interviewer.team_memberships:
        interviewer_startup = interviewer.team_memberships[0].startup
    
    if not interviewer_startup or interviewer_startup.id != user_startup.id:
        return jsonify({'error': 'Interviewer must be a team member'}), 400
    
    # Create interview
    interview = Interview(
        application_id=app_id,
        interviewer_id=data['interviewer_id'],
        scheduled_at=scheduled_at,
        meeting_link=data.get('meeting_link'),
        notes=data.get('notes'),
        status='SCHEDULED'
    )
    
    db.session.add(interview)
    db.session.commit()
    
    return jsonify({
        'interview': {
            'id': interview.id,
            'application_id': interview.application_id,
            'interviewer_id': interview.interviewer_id,
            'interviewer_name': interviewer.full_name,
            'scheduled_at': interview.scheduled_at.isoformat(),
            'meeting_link': interview.meeting_link,
            'notes': interview.notes,
            'status': interview.status.value if hasattr(interview.status, 'value') else interview.status
        }
    }), 201


@recruitment_bp.route('/interviews/<int:interview_id>', methods=['PUT'])
@jwt_required()
def update_interview(interview_id):
    current_user_id = user_id_from_token(get_jwt_identity())
    interview = Interview.query.get_or_404(interview_id)
    
    # Permission: Owner of startup OR the Interviewer
    startup_owner_id = interview.application.job.startup.user_id
    if current_user_id != startup_owner_id and current_user_id != interview.interviewer_id:
         return jsonify({'error': 'Permission denied'}), 403
         
    data = request.json
    
    if 'scheduled_at' in data:
        try:
            from datetime import datetime
            dt = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00'))
            interview.scheduled_at = dt
        except ValueError:
            return jsonify({'error': 'Invalid date'}), 400
            
    if 'notes' in data:
        interview.notes = data['notes']
    if 'meeting_link' in data:
        interview.meeting_link = data['meeting_link']
        
    db.session.commit()
    return jsonify(interview.to_dict())


@recruitment_bp.route('/interviews/<int:interview_id>', methods=['DELETE'])
@jwt_required()
def delete_interview(interview_id):
    current_user_id = user_id_from_token(get_jwt_identity())
    interview = Interview.query.get_or_404(interview_id)
    
    startup_owner_id = interview.application.job.startup.user_id
    if current_user_id != startup_owner_id and current_user_id != interview.interviewer_id:
        return jsonify({'error': 'Permission denied'}), 403
        
    db.session.delete(interview)
    db.session.commit()
    return jsonify({'message': 'Interview cancelled'})
