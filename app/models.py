
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    """Represents a user of the application"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))
    full_name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(20), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    startup = db.relationship('Startup', back_populates='user', uselist=False, cascade="all, delete-orphan")
    submission = db.relationship('Submission', back_populates='user', uselist=False, cascade="all, delete-orphan")


    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Serializes the User object to a dictionary"""
        user_data = {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'mobile': self.mobile,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        return user_data
    
    def __repr__(self):
        return f'<User {self.email}>'

class Submission(db.Model):
    """Main startup submission table"""
    __tablename__ = 'submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False,  unique=True)
    
    # Basic Information
    startup_name = db.Column(db.String(200), nullable=False)
    industry = db.Column(db.String(100), nullable=False)
    stage = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # Problem & Solution
    problem_statement = db.Column(db.Text)
    solution = db.Column(db.Text)
    unique_value_proposition = db.Column(db.Text)
    
    # Market & Competition
    target_market = db.Column(db.Text)
    market_size = db.Column(db.String(100))
    competition = db.Column(db.Text)
    competitive_advantage = db.Column(db.Text)
    
    # Business Model
    business_model = db.Column(db.Text)
    revenue_streams = db.Column(db.Text)
    pricing_strategy = db.Column(db.Text)
    
    # Team & Traction
    team_size = db.Column(db.Integer, default=1)
    team_description = db.Column(db.Text)
    current_traction = db.Column(db.Text)
    milestones_achieved = db.Column(db.Text)
    
    # Financial Information
    funding_required = db.Column(db.Float, default=0)
    current_revenue = db.Column(db.Float, default=0)
    monthly_burn_rate = db.Column(db.Float)
    runway_months = db.Column(db.Integer)
    
    # Additional Information
    website = db.Column(db.String(200))
    pitch_deck_url = db.Column(db.String(200))
    demo_url = db.Column(db.String(200))
    social_media_links = db.Column(db.Text)
    
    # Status & Tracking
    status = db.Column(db.String(50), default='draft')  # draft, pending, under_review, approved, rejected
    current_stage = db.Column(db.Integer, default=1)
    stage_data = db.Column(db.JSON)
    admin_notes = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    
    # Relationships
    documents = db.relationship('Document', backref='submission', lazy=True, cascade='all, delete-orphan')
    user = db.relationship('User', back_populates='submission')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'startupName': self.startup_name,
            'industry': self.industry,
            'stage': self.stage,
            'description': self.description,
            'problemStatement': self.problem_statement,
            'solution': self.solution,
            'uniqueValueProposition': self.unique_value_proposition,
            'targetMarket': self.target_market,
            'marketSize': self.market_size,
            'competition': self.competition,
            'competitiveAdvantage': self.competitive_advantage,
            'businessModel': self.business_model,
            'revenueStreams': self.revenue_streams,
            'pricingStrategy': self.pricing_strategy,
            'teamSize': self.team_size,
            'teamDescription': self.team_description,
            'currentTraction': self.current_traction,
            'milestonesAchieved': self.milestones_achieved,
            'fundingRequired': self.funding_required,
            'currentRevenue': self.current_revenue,
            'monthlyBurnRate': self.monthly_burn_rate,
            'runwayMonths': self.runway_months,
            'website': self.website,
            'pitchDeckUrl': self.pitch_deck_url,
            'demoUrl': self.demo_url,
            'socialMediaLinks': self.social_media_links,
            'status': self.status,
            'currentStage': self.current_stage,
            'stageData': self.stage_data,
            'adminNotes': self.admin_notes,
            'rejectionReason': self.rejection_reason,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'submittedAt': self.submitted_at.isoformat() if self.submitted_at else None,
            'reviewedAt': self.reviewed_at.isoformat() if self.reviewed_at else None
        }
    
    def __repr__(self):
        return f'<Submission {self.startup_name}>'

class Document(db.Model):
    """Generated startup documents"""
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=True)
    
    # Document Information
    document_type = db.Column(db.String(50), nullable=False)  # pitch_deck, business_plan, financial_model, etc.
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    
    # File Information
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    
    # Generation Information
    is_generated = db.Column(db.Boolean, default=False)
    generation_prompt = db.Column(db.Text)
    generation_model = db.Column(db.String(50))
    generation_tokens = db.Column(db.Integer)
    
    # Status & Tracking
    status = db.Column(db.String(50), default='active')  # active, archived, deleted
    download_count = db.Column(db.Integer, default=0)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_downloaded_at = db.Column(db.DateTime)
    
    # Add this relationship
    startup = db.relationship('Startup', back_populates='documents')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'userId': self.user_id,
            'submissionId': self.submission_id,
            'startupId': self.startup_id,
            'documentType': self.document_type,
            'title': self.title,
            'description': self.description,
            'fileName': self.file_name,
            'filePath': self.file_path,
            'fileSize': self.file_size,
            'mimeType': self.mime_type,
            'isGenerated': self.is_generated,
            'generationPrompt': self.generation_prompt,
            'generationModel': self.generation_model,
            'generationTokens': self.generation_tokens,
            'status': self.status,
            'downloadCount': self.download_count,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            'lastDownloadedAt': self.last_downloaded_at.isoformat() if self.last_downloaded_at else None
        }
    
    def __repr__(self):
        return f'<Document {self.title}>'

class Startup(db.Model):
    """Represents a startup in the incubator"""
    __tablename__ = 'startups'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False, unique=True)
    status = db.Column(db.String(50), default='pending')
    current_stage = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', back_populates='startup')
    submission = db.relationship('Submission', backref=db.backref('startup', uselist=False))
    documents = db.relationship('Document', back_populates='startup', lazy=True)
    progress = db.relationship('Progress', back_populates='startup', uselist=False, cascade="all, delete-orphan")
    stages = db.relationship('SubmissionStage', back_populates='startup', lazy='dynamic', cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'submission_id': self.submission_id,
            'status': self.status,
            'current_stage': self.current_stage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'stages': [stage.to_dict() for stage in self.stages]
        }

class SubmissionStage(db.Model):
    """Individual stage submissions"""
    __tablename__ = 'submission_stages'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    stage_name = db.Column(db.String(100), nullable=False)
    stage_data = db.Column(db.Text)  # JSON data
    completed_at = db.Column(db.DateTime)
    
    # Relationship
    startup = db.relationship('Startup', back_populates='stages')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'stage_number': self.stage_name,
            'data': self.get_data(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def get_data(self):
        """Get stage data as dictionary"""
        return json.loads(self.stage_data) if self.stage_data else {}

class Progress(db.Model):
    """Progress tracking for MVP and GTM"""
    __tablename__ = 'progress'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False, unique=True)
    
    # MVP Development
    mvp_status = db.Column(db.String(50), default='not_started')
    mvp_progress_percentage = db.Column(db.Integer, default=0)
    mvp_phases = db.Column(db.Text)  # JSON string
    mvp_milestones = db.Column(db.Text)  # JSON string
    
    # GTM Strategy
    gtm_status = db.Column(db.String(50), default='not_started')
    gtm_progress_percentage = db.Column(db.Integer, default=0)
    gtm_phases = db.Column(db.Text)  # JSON string
    gtm_milestones = db.Column(db.Text)  # JSON string
    gtm_metrics = db.Column(db.Text)  # JSON string
    
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    verified_at = db.Column(db.DateTime)
    
    # Relationship
    startup = db.relationship('Startup', back_populates='progress')
    
    def __init__(self, **kwargs):
        super(Progress, self).__init__(**kwargs)
        # Initialize default phases
        self.mvp_phases = json.dumps([
            {'name': 'Foundation', 'status': 'pending', 'progress': 0},
            {'name': 'Core Features', 'status': 'pending', 'progress': 0},
            {'name': 'AI Integration', 'status': 'pending', 'progress': 0},
            {'name': 'Testing & Launch', 'status': 'pending', 'progress': 0}
        ])
        self.gtm_phases = json.dumps([
            {'name': 'Pre-launch', 'status': 'pending', 'progress': 0},
            {'name': 'Launch Week', 'status': 'pending', 'progress': 0},
            {'name': 'Early Traction (M1-2)', 'status': 'pending', 'progress': 0},
            {'name': 'Growth Acceleration (M3-4)', 'status': 'pending', 'progress': 0},
            {'name': 'Scale & Optimize (M5-6)', 'status': 'pending', 'progress': 0}
        ])
        self.mvp_milestones = json.dumps([])
        self.gtm_milestones = json.dumps([])
        self.gtm_metrics = json.dumps({
            'active_users': 0,
            'revenue': 0,
            'cac': 0,
            'ltv': 0
        })
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'mvp_development': {
                'status': self.mvp_status,
                'progress_percentage': self.mvp_progress_percentage,
                'phases': json.loads(self.mvp_phases) if self.mvp_phases else [],
                'milestones': json.loads(self.mvp_milestones) if self.mvp_milestones else []
            },
            'gtm_strategy': {
                'status': self.gtm_status,
                'progress_percentage': self.gtm_progress_percentage,
                'phases': json.loads(self.gtm_phases) if self.gtm_phases else [],
                'milestones': json.loads(self.gtm_milestones) if self.gtm_milestones else [],
                'metrics': json.loads(self.gtm_metrics) if self.gtm_metrics else {}
            },
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None
        }
