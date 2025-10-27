from datetime import datetime
from app import db
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(db.Model):
    """User authentication table"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    mobile = db.Column(db.String(20), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship
    startup = db.relationship('Startup', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'mobile': self.mobile,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Startup(db.Model):
    """Main startup table"""
    __tablename__ = 'startups'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    submission_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    status = db.Column(db.String(50), default='not_started')  # not_started, in_progress, completed
    current_stage = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', back_populates='startup')
    stages = db.relationship('SubmissionStage', back_populates='startup', cascade='all, delete-orphan')
    progress = db.relationship('Progress', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    document = db.relationship('Document', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'submission_id': self.submission_id,
            'status': self.status,
            'current_stage': self.current_stage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'stages': {stage.stage_number: stage.to_dict() for stage in self.stages}
        }

class SubmissionStage(db.Model):
    """Individual stage submissions"""
    __tablename__ = 'submission_stages'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    stage_number = db.Column(db.Integer, nullable=False)
    stage_data = db.Column(db.Text, nullable=False)  # JSON string
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    startup = db.relationship('Startup', back_populates='stages')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'stage_number': self.stage_number,
            'data': json.loads(self.stage_data) if self.stage_data else {},
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    def set_data(self, data_dict):
        """Set stage data from dictionary"""
        self.stage_data = json.dumps(data_dict)
    
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

class Document(db.Model):
    """Generated startup documents"""
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False, unique=True)
    file_path = db.Column(db.String(500), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    startup = db.relationship('Startup', back_populates='document')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'file_path': self.file_path,
            'generated_at': self.generated_at.isoformat() if self.generated_at else None,
            'available': True
        }
