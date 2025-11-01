"""
submissions.py - Updated to work with new 9-stage architecture
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import (
    User, Submission, Startup, StageTemplate, StageInstance,
    StageStatus, db
)
from datetime import datetime
import traceback
import uuid

submissions_bp = Blueprint('submissions', __name__)

# ============================================================================
# EVALUATION FORM ENDPOINTS (Initial Submission)
# ============================================================================

@submissions_bp.route('/submission-status', methods=['GET'])
@jwt_required()
def get_submission_status():
    """Get current submission status for EvaluationForm"""
    try:
        user_id = int(get_jwt_identity())
        
        # Check if submission exists
        submission = Submission.query.filter_by(user_id=user_id).first()
        
        if not submission:
            return jsonify({
                'success': True,
                'submission_id': None,
                'current_stage': 0,
                'stages': []
            }), 200
        
        # Return submission data organized by evaluation form stages (6 stages)
        # This is different from the 9 MVP stages
        stages = []
        if hasattr(submission, 'stage_data') and submission.stage_data:
            for i in range(1, 7):
                stage_key = f'stage_{i}'
                if stage_key in submission.stage_data:
                    stages.append({
                        'stage_number': i,
                        'data': submission.stage_data[stage_key]
                    })
        
        return jsonify({
            'success': True,
            'submission_id': submission.submission_id,
            'current_stage': getattr(submission, 'current_stage', 0) or 0,
            'stages': stages,
            'status': submission.status
        }), 200
        
    except Exception as e:
        print(f"Error in get_submission_status: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@submissions_bp.route('/submissions/submit-stage', methods=['POST'])
@jwt_required()
def submit_stage():
    """Save a single stage of the evaluation form"""
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        submission_id = data.get('submission_id')
        stage = data.get('stage')  # 1-6 for evaluation form
        stage_data = data.get('data')
        
        if not stage or not stage_data:
            return jsonify({'error': 'Stage number and data are required'}), 400
        
        print(f"[SUBMISSION] User {user_id} submitting stage {stage}")
        
        # Find or create submission
        if submission_id:
            submission = Submission.query.filter_by(
                submission_id=submission_id,
                user_id=user_id
            ).first()
        else:
            submission = Submission.query.filter_by(user_id=user_id).first()
        
        if not submission:
            # Create new submission
            submission = Submission(
                user_id=user_id,
                submission_id=str(uuid.uuid4()),
                startup_name=stage_data.get('startup_name', 'Draft'),
                status='in_progress'
            )
            db.session.add(submission)
            db.session.flush()  # Get submission.id
            print(f"[SUBMISSION] Created new submission: {submission.submission_id}")
        
        # Store stage data in JSON field (for evaluation form stages)
        if not hasattr(submission, 'stage_data') or not submission.stage_data:
            submission.stage_data = {}
        
        submission.stage_data[f'stage_{stage}'] = stage_data
        
        # Update current stage tracker
        if not hasattr(submission, 'current_stage') or submission.current_stage is None:
            submission.current_stage = stage
        else:
            current = int(submission.current_stage) if submission.current_stage else 0
            submission.current_stage = max(current, int(stage))
        
        # Map evaluation form data to Submission model fields
        _map_stage_data_to_submission(submission, stage, stage_data)
        
        db.session.commit()
        print(f"[SUBMISSION] Stage {stage} saved successfully")
        
        return jsonify({
            'success': True,
            'submission_id': submission.submission_id,
            'message': f'Stage {stage} saved successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"[SUBMISSION ERROR] {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@submissions_bp.route('/submissions/submit-final', methods=['POST'])
@jwt_required()
def submit_final():
    """
    Mark evaluation form as complete and create Startup + 9 StageInstances
    This is the bridge between evaluation form and dashboard
    """
    try:
        user_id = int(get_jwt_identity())
        
        submission = Submission.query.filter_by(user_id=user_id).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        print(f"[SUBMISSION] Finalizing submission for user {user_id}")
        
        # Flatten all stage data into main submission fields
        if hasattr(submission, 'stage_data') and submission.stage_data:
            for stage_key, stage_value in submission.stage_data.items():
                if isinstance(stage_value, dict):
                    for field, value in stage_value.items():
                        if hasattr(submission, field):
                            setattr(submission, field, value)
        
        # Mark as submitted
        submission.status = 'pending'
        submission.submitted_at = datetime.utcnow()
        
        # Create or update Startup record
        startup = Startup.query.filter_by(user_id=user_id).first()
        
        if not startup:
            print(f"[SUBMISSION] Creating new Startup for user {user_id}")
            startup = Startup(
                user_id=user_id,
                submission_id=submission.id,
                name=submission.startup_name or 'My Startup',
                slug=_generate_slug(submission.startup_name or f'startup-{user_id}'),
                status='active',
                current_stage_key='founder_specifications',
                overall_progress=0.0
            )
            db.session.add(startup)
            db.session.flush()  # Get startup.id
            
            # Initialize all 9 stage instances
            print(f"[SUBMISSION] Initializing 9 stages for startup {startup.id}")
            startup.initialize_stages()
            
            # Seed stage instances with submission data
            _seed_stages_from_submission(startup, submission)
        else:
            print(f"[SUBMISSION] Startup already exists: {startup.id}")
        
        db.session.commit()
        print(f"[SUBMISSION] Submission finalized successfully")
        
        # Send confirmation email
        try:
            from app.email_utils import send_submission_confirmation_email
            user = User.query.get(user_id)
            send_submission_confirmation_email(user.email, submission.startup_name)
        except Exception as e:
            print(f"[EMAIL ERROR] Failed to send confirmation: {e}")
        
        return jsonify({
            'success': True,
            'submission_id': submission.submission_id,
            'startup_id': startup.id,
            'message': 'Submission completed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"[SUBMISSION ERROR] {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _map_stage_data_to_submission(submission, stage, stage_data):
    """Map evaluation form stage data to Submission model fields"""
    
    if stage == 1:  # Basic Information
        submission.startup_name = stage_data.get('startup_name', submission.startup_name)
        submission.founder_linkedin = stage_data.get('founder_name')
        submission.website_url = stage_data.get('website')
    
    elif stage == 2:  # Business Concept
        submission.problem_statement = stage_data.get('problem_statement')
        submission.solution = stage_data.get('solution')
        submission.target_market = stage_data.get('target_market')
        submission.unique_value_proposition = stage_data.get('unique_value')
    
    elif stage == 3:  # Market Analysis
        submission.competition = stage_data.get('competitors')
        submission.competitive_advantage = stage_data.get('competitive_advantage')
    
    elif stage == 4:  # Business Model
        submission.revenue_streams = stage_data.get('revenue_model')
        submission.pricing_strategy = stage_data.get('pricing_strategy')
        submission.go_to_market_strategy = stage_data.get('customer_acquisition')
        submission.funding_required = stage_data.get('funding_raised')
    
    elif stage == 5:  # Team & Resources
        submission.team_size = stage_data.get('team_size')
        submission.team_description = stage_data.get('key_team_members')
    
    elif stage == 6:  # Traction & Milestones
        submission.current_stage = stage_data.get('current_stage')


def _seed_stages_from_submission(startup, submission):
    """
    Populate the 9 StageInstance records with data from Submission
    Maps evaluation form data to appropriate dashboard stages
    """
    
    print(f"[SEEDING] Seeding stages for startup {startup.id}")
    
    # Stage 1: Founder Specifications
    stage1 = StageInstance.query.filter_by(
        startup_id=startup.id,
        stage_key='founder_specifications'
    ).first()
    
    if stage1:
        stage1.set_form_data({
            'startup_name': submission.startup_name,
            'website_url': submission.website_url,
            'founding_year': submission.founding_year,
            'number_of_founders': submission.number_of_founders,
            'team_size': submission.team_size,
            'headquarters': submission.headquarters,
            'team_description': submission.team_description
        })
        stage1.status = StageStatus.COMPLETED
        stage1.progress = 100
        stage1.completed_at = datetime.utcnow()
        print("[SEEDING] Stage 1 (Founder Specs) completed")
    
    # Stage 2: Product Scope
    stage2 = StageInstance.query.filter_by(
        startup_id=startup.id,
        stage_key='product_scope'
    ).first()
    
    if stage2:
        stage2.set_form_data({
            'company_overview': submission.company_overview,
            'problem_statement': submission.problem_statement,
            'solution': submission.solution,
            'value_proposition': submission.unique_value_proposition,
            'tech_stack': submission.tech_stack,
            'key_features': submission.key_features
        })
        stage2.status = StageStatus.IN_PROGRESS
        stage2.progress = 60
        stage2.started_at = datetime.utcnow()
        print("[SEEDING] Stage 2 (Product Scope) in progress")
    
    # Stage 3: GTM Scope
    stage3 = StageInstance.query.filter_by(
        startup_id=startup.id,
        stage_key='gtm_scope'
    ).first()
    
    if stage3:
        stage3.set_form_data({
            'target_market': submission.target_market,
            'customer_segments': submission.customer_segments,
            'competition': submission.competition,
            'competitive_advantage': submission.competitive_advantage,
            'pricing_strategy': submission.pricing_strategy,
            'gtm_strategy': submission.go_to_market_strategy
        })
        stage3.status = StageStatus.IN_PROGRESS
        stage3.progress = 40
        stage3.started_at = datetime.utcnow()
        print("[SEEDING] Stage 3 (GTM Scope) in progress")
    
    # Stage 9: Fundraise
    stage9 = StageInstance.query.filter_by(
        startup_id=startup.id,
        stage_key='fundraise'
    ).first()
    
    if stage9:
        stage9.set_form_data({
            'funding_required': submission.funding_required,
            'current_stage': submission.current_stage,
            'revenue_streams': submission.revenue_streams,
            'business_model': submission.business_model,
            'pitch_deck_url': submission.pitch_deck_url,
            'demo_url': submission.demo_url
        })
        stage9.status = StageStatus.NOT_STARTED
        print("[SEEDING] Stage 9 (Fundraise) not started")
    
    # Stages 4-8 remain NOT_STARTED by default
    print(f"[SEEDING] Completed seeding for startup {startup.id}")
    
    # Update startup's current stage
    startup.current_stage_key = 'product_scope'
    startup.overall_progress = startup.compute_progress()


def _generate_slug(name):
    """Generate URL-friendly slug from startup name"""
    import re
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = slug[:200]  # Limit length
    
    # Ensure uniqueness
    base_slug = slug
    counter = 1
    while Startup.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug


# ============================================================================
# LEGACY ENDPOINTS (Keep for backward compatibility)
# ============================================================================

@submissions_bp.route('/submissions', methods=['GET'])
@jwt_required()
def list_submissions():
    """Get user's submissions"""
    try:
        user_id = int(get_jwt_identity())
        submissions = Submission.query.filter_by(user_id=user_id).all()
        
        return jsonify({
            'success': True,
            'submissions': [s.to_dict() for s in submissions]
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@submissions_bp.route('/submissions/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission(submission_id):
    """Get specific submission"""
    try:
        user_id = int(get_jwt_identity())
        submission = Submission.query.filter_by(id=submission_id, user_id=user_id).first()
        
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
        
        return jsonify({
            'success': True,
            'submission': submission.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
