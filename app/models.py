from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum
class UserRole(Enum):
    """Defines the roles a user can have within the application."""
    USER = "USER"
    ADMIN = "ADMIN"

class SubmissionStatus(Enum):
    DRAFT = 'DRAFT'
    FINALIZE_SUBMISSION = 'FINALIZE_SUBMISSION'
    PENDING = 'PENDING'
    IN_REVIEW = 'IN_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    COMPLETED = 'COMPLETED'

class StartupStatus(Enum):
    """Defines the operational status of a startup within the incubator program."""
    INACTIVE = "INACTIVE"
    ACTIVE = "ACTIVE"
    INCUBATING = "INCUBATING"
    GRADUATED = "GRADUATED"
    ARCHIVED = "ARCHIVED"

    def __str__(self):
        return self.value

class StartupStage(Enum):
    """Represents the current stage of a startup in its lifecycle within the program."""
    EVALUATION = "EVALUATION"
    ADMITTED = "ADMITTED"
    IDEA = "IDEA"
    MVP = "MVP"
    GROWTH = "GROWTH"

    def __str__(self):
        return self.value

class ScopeStatus(Enum):
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    IN_DISCUSSION = "IN_DISCUSSION"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

    def __str__(self):
        return self.value

class ContractStatus(Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    SIGNED = "SIGNED"
    ACCEPTED = "ACCEPTED" # Added ACCEPTED status

    def __str__(self):
        return self.value

class ArtifactType(Enum):
    """Specifies the type of an artifact, e.g., file, link, or text content."""
    FILE = "FILE"
    LINK = "LINK"
    TEXT = "TEXT"

    def __str__(self):
        return self.value

class StorageBackend(str, Enum):
    """Indicates where a FILE artifact is stored"""
    LOCAL = "LOCAL"      # Local file system (legacy)
    S3 = "S3"           # AWS S3 (new)
    EXTERNAL = "EXTERNAL"  # External URL (for LINK type)
    INLINE = "INLINE"   # Inline content (for TEXT type)

    def __str__(self):
        return self.value

class TaskStatus(Enum):
    """Indicates the current status of a task."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

    def __str__(self):
        return self.value

class RequestStatus(Enum):
    """Represents the status of a request, e.g., for resources or mentorship."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

    def __str__(self):
        return self.value

class ExperimentStatus(Enum):
    """Describes the current state of an experiment."""
    PLANNED = "PLANNED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"

    def __str__(self):
        return self.value

class ProductStage(Enum):
    """Indicates the development stage of a product."""
    CONCEPT = "CONCEPT"
    DEVELOPMENT = "DEVELOPMENT"
    BETA = "BETA"
    LIVE = "live"

    def __str__(self):
        return self.value

class Scope(Enum):
    """Defines the functional area or domain a task, experiment, or artifact belongs to."""
    PRODUCT = "PRODUCT"
    BUSINESS = "BUSINESS"
    FUNDRAISE = "FUNDRAISE"
    MARKETING = "MARKETING"
    ACCOUNTING = "ACCOUNTING"
    GENERAL = "GENERAL"

    def __str__(self):
        return self.value

class Task(db.Model):
    """Represents a task associated with a startup, which can be linked to various entities."""
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    scope = db.Column(db.Enum(Scope), default=Scope.GENERAL, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    linked_to_id = db.Column(db.Integer) # ID of the linked entity (e.g., Product, Experiment)
    linked_to_type = db.Column(db.String(50)) # Type of the linked entity (e.g., 'product', 'experiment')
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # ID of the user assigned to this task
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # ID of the user who created this task
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='tasks')
    assignee = db.relationship('User', foreign_keys=[assigned_to])
    creator = db.relationship('User', foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'scope': str(self.scope),
            'name': self.name,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': str(self.status),
            'linked_to_id': self.linked_to_id,
            'linked_to_type': self.linked_to_type,
            'assigned_to': self.assigned_to,
            'assignee': {
                'id': self.assignee.id,
                'name': self.assignee.full_name,
                'email': self.assignee.email
            } if self.assignee else None,
            'created_by': self.created_by,
            'creator': {
                'id': self.creator.id,
                'name': self.creator.full_name,
            } if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Experiment(db.Model):
    """Represents an experiment conducted by a startup, which can be linked to various entities."""
    __tablename__ = 'experiments'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    scope = db.Column(db.Enum(Scope), default=Scope.GENERAL, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assumption = db.Column(db.Text, nullable=True)
    validation_method = db.Column(db.Text, nullable=True)
    result = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(ExperimentStatus), default=ExperimentStatus.PLANNED, nullable=False)
    linked_to_id = db.Column(db.Integer) # ID of the linked entity (e.g., Product, Task)
    linked_to_type = db.Column(db.String(50)) # Type of the linked entity (e.g., 'product', 'task')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='experiments')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'scope': str(self.scope),
            'name': self.name,
            'description': self.description,
            'assumption': self.assumption,
            'validation_method': self.validation_method,
            'result': self.result,
            'status': str(self.status),
            'linked_to_id': self.linked_to_id,
            'linked_to_type': self.linked_to_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Artifact(db.Model):
    """
    Unified model for all external information attached to startup entities.
    Supports FILE (with S3 storage), LINK (external URLs), and TEXT (inline content).
    Multiple artifacts per entity supported via linked_to_type and linked_to_id.
    """
    __tablename__ = 'artifacts'
    
    # EXISTING FIELDS
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    scope = db.Column(db.Enum(Scope), default=Scope.GENERAL, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type = db.Column(db.Enum(ArtifactType), nullable=False)
    location = db.Column(db.Text, nullable=False) # S3 key for files, URL for links, content for text
    linked_to_id = db.Column(db.Integer)
    linked_to_type = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # NEW: Storage backend (only relevant for FILE type)
    storage_backend = db.Column(db.Enum(StorageBackend), nullable=True)
    
    # NEW: File metadata (only populated when type='FILE')
    file_size = db.Column(db.Integer)  # Size in bytes
    mime_type = db.Column(db.String(100))
    original_filename = db.Column(db.String(255))  # User's original filename
    
    # NEW: S3-specific fields (only populated when type='FILE' and storage_backend='S3')
    s3_bucket = db.Column(db.String(255))
    s3_key = db.Column(db.String(500))  # Full S3 path
    s3_region = db.Column(db.String(50))
    
    # NEW: User tracking
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # NEW: Soft delete
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime)
    
    # NEW: Flexible metadata (renamed from 'metadata' to avoid SQLAlchemy conflict)
    file_metadata = db.Column(db.JSON)
    
    # RELATIONSHIPS
    startup = db.relationship('Startup', back_populates='artifacts')
    uploader = db.relationship('User', foreign_keys=[uploaded_by])

    def to_dict(self):
        """Enhanced to_dict with conditional file-specific fields"""
        base_dict = {
            'id': self.id,
            'startup_id': self.startup_id,
            'scope': str(self.scope),
            'name': self.name,
            'description': self.description,
            'type': str(self.type),
            'location': self.location,
            'linked_to_id': self.linked_to_id,
            'linked_to_type': self.linked_to_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        
        # Add file-specific fields only if type is FILE
        if self.type == ArtifactType.FILE:
            base_dict.update({
                'storage_backend': str(self.storage_backend) if self.storage_backend else None,
                'file_size': self.file_size,
                'mime_type': self.mime_type,
                'original_filename': self.original_filename,
                's3_bucket': self.s3_bucket,
                's3_key': self.s3_key,
                's3_region': self.s3_region,
                'uploaded_by': self.uploaded_by,
                'is_deleted': self.is_deleted,
                'file_metadata': self.file_metadata,
            })
        
        return base_dict

import secrets

class Organization(db.Model):
    """Represents a tenant organization containing users and startups."""
    __tablename__ = 'organizations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=True) # Added slug
    invite_code = db.Column(db.String(10), unique=True, nullable=False, default=lambda: secrets.token_hex(4))
    logo_url = db.Column(db.String(500), nullable=True) # Organization Logo URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    users = db.relationship('User', back_populates='organization')
    startups = db.relationship('Startup', back_populates='organization')
    submissions = db.relationship('Submission', back_populates='organization')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug, # Include slug in dict
            'invite_code': self.invite_code,
            'logo_url': self.logo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class User(db.Model):
    """Represents a user of the application, including authentication details and roles."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=True) # Firebase User UID
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone_number = db.Column(db.String(20), nullable=True) # New field for phone number
    email_verified = db.Column(db.Boolean, default=False) # New field for email verification status
    phone_verified = db.Column(db.Boolean, default=False) # New field for phone verification status
    full_name = db.Column(db.String(100), nullable=False)
    is_verified = db.Column(db.Boolean, default=False) # This will primarily be driven by email_verified/phone_verified
    role = db.Column(db.Enum(UserRole), default=UserRole.USER, nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True) # Check note on migration
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    organization = db.relationship('Organization', back_populates='users')
    
    # OAuth provider IDs (kept for now, can be linked to Firebase in future)
    google_id = db.Column(db.String(128), unique=True, nullable=True)
    linkedin_id = db.Column(db.String(128), unique=True, nullable=True)
    
    submissions = db.relationship('Submission', back_populates='user', lazy=True, cascade='all, delete-orphan')
    startups = db.relationship('Startup', back_populates='user', lazy=True, cascade='all, delete-orphan')
    created_monthly_data = db.relationship('BusinessMonthlyData', back_populates='creator', lazy=True)
    created_marketing_campaigns = db.relationship('MarketingCampaign', back_populates='creator', lazy=True)
    owned_content_calendars = db.relationship('MarketingContentCalendar', back_populates='owner', lazy=True)
    created_content_items = db.relationship('MarketingContentItem', back_populates='creator', lazy=True)

    def to_dict(self):
        startup = self.startups[0] if self.startups else None
        scopes = []
        
        if startup:
             # Owners get all scopes capabilities by default
             scopes = ['PRODUCT', 'BUSINESS', 'FUNDRAISE', 'MARKETING', 'WORKSPACE', 'TEAM', 'SETTINGS', 'USER_SETTINGS']
        elif hasattr(self, 'team_memberships') and self.team_memberships:
            startup = self.team_memberships[0].startup
            scopes = self.team_memberships[0].scopes or []

        return {
            'id': self.id,
            'firebase_uid': self.firebase_uid,
            'email': self.email,
            'phone_number': self.phone_number,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
            'full_name': self.full_name,
            'is_verified': self.is_verified,
            'role': self.role.value,
            'organization_id': self.organization_id,
            'organization': self.organization.to_dict() if self.organization else None,
            'created_at': self.created_at.isoformat(),
            'startup_id': startup.id if startup else None,
            'scopes': scopes
        }

class Startup(db.Model):
    """Represents a startup being incubated, linking to various operational and strategic details."""
    __tablename__ = 'startups'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), unique=True, nullable=False)

    
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    status = db.Column(db.Enum(StartupStatus), default=StartupStatus.ACTIVE, nullable=False)
    overall_progress = db.Column(db.Float, default=0.0)
    current_stage = db.Column(db.Enum(StartupStage), default=StartupStage.EVALUATION, nullable=False)
    next_milestone = db.Column(db.String(255), nullable=True)
    recent_activity = db.Column(db.JSON, nullable=True) # Store as JSON array of strings
    container_name = db.Column(db.String(100), nullable=True, unique=True) # Docker container name
    logo_url = db.Column(db.String(500), nullable=True) # Startup logo URL
    
    # Status flags for async asset generation
    is_generating_product = db.Column(db.Boolean, default=False)
    is_generating_gtm = db.Column(db.Boolean, default=False)
    is_analyzing_submission = db.Column(db.Boolean, default=False)
    is_generating_scope = db.Column(db.Boolean, default=False)
    is_generating_contract = db.Column(db.Boolean, default=False)
    accounting_initialized = db.Column(db.Boolean, default=False)
    
    # Fundraising profile for investor recommendations
    focus_sectors = db.Column(db.JSON, nullable=True)  # Array: ['FinTech', 'AI', 'SaaS']
    fundraising_stage = db.Column(db.String(50), nullable=True)  # 'Pre-Seed', 'Seed', 'Series A', etc.
    target_raise = db.Column(db.Float, nullable=True)  # Target fundraising amount
    primary_location = db.Column(db.String(255), nullable=True)  # Primary location

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship('User', back_populates='startups')
    submission = db.relationship('Submission', back_populates='startup', uselist=False)

    # Existing relationships
    products = db.relationship('Product', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    business_overview = db.relationship('BusinessOverview', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    monthly_data = db.relationship('BusinessMonthlyData', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    fundraise_details = db.relationship('Fundraise', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    founders = db.relationship('Founder', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    funding_rounds = db.relationship('FundingRound', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    marketing_campaigns = db.relationship('MarketingCampaign', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    tasks = db.relationship('Task', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    experiments = db.relationship('Experiment', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    artifacts = db.relationship('Artifact', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    marketing_overview = db.relationship('MarketingOverview', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    
    # New relationships for pre-admission stages
    scope_document = db.relationship('ScopeDocument', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    contract = db.relationship('Contract', back_populates='startup', uselist=False, cascade='all, delete-orphan')
    investors = db.relationship('Investor', back_populates='startup', lazy=True, cascade='all, delete-orphan')
    organization = db.relationship('Organization', back_populates='startups')
    team_members = db.relationship('TeamMember', back_populates='startup', lazy=True, cascade='all, delete-orphan')

    # New relationship for Planner
    sprints = db.relationship('Sprint', back_populates='startup', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_relations=False):
        """
        Serializes the Startup object to a dictionary.
        If include_relations is False, it returns only the core Startup fields 
        for a faster initial load (lazy-loading).
        If include_relations is True, it serializes all related data.
        """
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'submission_id': self.submission_id,
            'name': self.name,
            'slug': self.slug,
            'status': str(self.status),
            'overall_progress': self.overall_progress,
            'current_stage': self.current_stage.value if self.current_stage else None,
            'next_milestone': self.next_milestone,
            'logo_url': self.logo_url,
            'is_generating_product': self.is_generating_product,
            'is_generating_gtm': self.is_generating_gtm,
            'is_analyzing_submission': self.is_analyzing_submission,
            'is_generating_scope': self.is_generating_scope,
            'is_generating_contract': self.is_generating_contract,
            'accounting_initialized': self.accounting_initialized,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None,
            'has_product': db.session.query(Product.id).filter_by(startup_id=self.id).first() is not None,
            'has_gtm': db.session.query(MarketingCampaign.campaign_id).filter_by(startup_id=self.id).first() is not None,
        }
        if include_relations:
            data.update({
                'submission': self.submission.to_dict() if self.submission else None,
                'founders': [founder.to_dict() for founder in self.founders],
                'products': [product.to_dict() for product in self.products],
                'tasks': [task.to_dict() for task in self.tasks],
                'experiments': [experiment.to_dict() for experiment in self.experiments],
                'artifacts': [artifact.to_dict() for artifact in self.artifacts],
                'monthly_data': [data.to_dict() for data in self.monthly_data],
                'marketing_campaigns': [campaign.to_dict() for campaign in self.marketing_campaigns],
                'business_overview': self.business_overview.to_dict() if self.business_overview else None,
                'fundraise_details': self.fundraise_details.to_dict() if self.fundraise_details else None,
                'marketing_overview': self.marketing_overview.to_dict() if self.marketing_overview else None,
                'funding_rounds': [round.to_dict() for round in self.funding_rounds],
                'investors': [investor.to_dict() for investor in Investor.query.all()],
                'scope_document': self.scope_document.to_dict() if self.scope_document else None,
                'contract': self.contract.to_dict() if self.contract else None,
                'team_members': [member.to_dict() for member in self.team_members],
            })
        return data

class TeamMember(db.Model):
    """Represents a team member with specific access scopes to a startup."""
    __tablename__ = 'team_members'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    role = db.Column(db.String(50), default='Member') # Job Title / Role
    linkedin = db.Column(db.String(255), nullable=True) # LinkedIn Profile URL
    scopes = db.Column(db.JSON, nullable=True) # List of allowed scopes e.g. ['MARKETING', 'PRODUCT']
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='team_members')
    user = db.relationship('User', backref='team_memberships')

    __table_args__ = (db.UniqueConstraint('startup_id', 'user_id', name='_startup_user_uc'),)

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'user_id': self.user_id,
            'user_email': self.user.email if self.user else None,
            'user_name': self.user.full_name if self.user else None,
            'role': self.role,
            'linkedin': self.linkedin,
            'scopes': self.scopes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class Product(db.Model):
    """Represents a product developed by a startup, including its features, metrics, and business details."""
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    stage = db.Column(db.Enum(ProductStage), default=ProductStage.CONCEPT, nullable=False)
    version = db.Column(db.String(50), nullable=True)
    targeted_launch_date = db.Column(db.Date, nullable=True)
    actual_launch_date = db.Column(db.Date, nullable=True)
    customer_segment = db.Column(db.Text, nullable=True)
    unique_value_prop = db.Column(db.Text, nullable=True)
    tech_stack = db.Column(db.JSON, nullable=True) # Store as JSON array of strings
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    startup = db.relationship('Startup', back_populates='products')
    features = db.relationship('Feature', back_populates='product', lazy=True, cascade='all, delete-orphan')
    product_metrics = db.relationship('ProductMetric', back_populates='product', lazy=True, cascade='all, delete-orphan')
    product_issues = db.relationship('ProductIssue', back_populates='product', lazy=True, cascade='all, delete-orphan')
    business_details = db.relationship('ProductBusinessDetails', back_populates='product', uselist=False, cascade='all, delete-orphan')
    marketing_campaigns = db.relationship('MarketingCampaign', back_populates='product', lazy=True)
    
    # New relationships for Planner
    sprints = db.relationship('Sprint', back_populates='product', cascade='all, delete-orphan')
    releases = db.relationship('Release', back_populates='product', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'name': self.name,
            'description': self.description,
            'stage': str(self.stage),
            'version': self.version,
            'targeted_launch_date': self.targeted_launch_date.isoformat() if self.targeted_launch_date else None,
            'actual_launch_date': self.actual_launch_date.isoformat() if self.actual_launch_date else None,
            'customer_segment': self.customer_segment,
            'unique_value_prop': self.unique_value_prop,
            'tech_stack': self.tech_stack,
            'features': [feature.to_dict() for feature in self.features],
            'product_metrics': [metric.to_dict() for metric in self.product_metrics],
            'product_issues': [issue.to_dict() for issue in self.product_issues],
            'business_details': self.business_details.to_dict() if self.business_details else None,
            'marketing_campaigns': [campaign.to_dict() for campaign in self.marketing_campaigns],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class FeatureStatus(Enum):
    BACKLOG = "BACKLOG"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    SHIPPED = "SHIPPED"
    PENDING = "PENDING" # Valid until migrated

    def __str__(self):
        return self.value

class Feature(db.Model):
    """Represents a specific feature of a product with planning details."""
    __tablename__ = 'features'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    sprint_id = db.Column(db.Integer, db.ForeignKey('sprints.id'), nullable=True)
    release_id = db.Column(db.Integer, db.ForeignKey('releases.id'), nullable=True)
    
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_story = db.Column(db.Text, nullable=True)
    acceptance_criteria = db.Column(db.Text, nullable=True)
    
    status = db.Column(db.Enum(FeatureStatus), default=FeatureStatus.BACKLOG, nullable=False)
    priority = db.Column(db.Integer, default=3) # 1=High, 5=Low
    effort_estimate = db.Column(db.String(10), nullable=True) # XS, S, M, L, XL
    target_date = db.Column(db.Date, nullable=True)
    
    # RICE Scoring
    rice_reach = db.Column(db.Integer, nullable=True) # 1-10
    rice_impact = db.Column(db.Integer, nullable=True) # 1-10
    rice_confidence = db.Column(db.Integer, nullable=True) # 0-100
    rice_effort = db.Column(db.Integer, nullable=True) # Person-months
    rice_score = db.Column(db.Float, nullable=True)

    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product', back_populates='features')
    sprint = db.relationship('Sprint', back_populates='features')
    release = db.relationship('Release', back_populates='features')
    creator = db.relationship('User', foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'sprint_id': self.sprint_id,
            'release_id': self.release_id,
            'name': self.name,
            'description': self.description,
            'user_story': self.user_story,
            'acceptance_criteria': self.acceptance_criteria,
            'status': self.status.value,
            'priority': self.priority,
            'effort_estimate': self.effort_estimate,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'rice_score': self.rice_score,
            'rice_details': {
                'reach': self.rice_reach,
                'impact': self.rice_impact,
                'confidence': self.rice_confidence,
                'effort': self.rice_effort
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Sprint(db.Model):
    """Agile sprint planning"""
    __tablename__ = 'sprints'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.Text)
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    
    capacity = db.Column(db.Integer)
    status = db.Column(db.String(20), default='PLANNING') # PLANNING, ACTIVE, COMPLETED
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product', back_populates='sprints')
    startup = db.relationship('Startup', back_populates='sprints') # Needs relationship on Startup
    features = db.relationship('Feature', back_populates='sprint')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'name': self.name,
            'goal': self.goal,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'status': self.status,
            'capacity': self.capacity,
            'features': [f.to_dict() for f in self.features]
        }

class Release(db.Model):
    """Product releases/milestones"""
    __tablename__ = 'releases'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    
    version = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(255))
    description = db.Column(db.Text)
    
    target_date = db.Column(db.Date)
    actual_date = db.Column(db.Date)
    
    status = db.Column(db.String(20), default='PLANNED')
    release_notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product', back_populates='releases')
    features = db.relationship('Feature', back_populates='release')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'version': self.version,
            'name': self.name,
            'status': self.status,
            'target_date': self.target_date.isoformat() if self.target_date else None,
            'release_notes': self.release_notes
        }


class ProductMetric(db.Model):
    """Tracks various metrics related to a product's performance."""
    __tablename__ = 'product_metrics'
    metric_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    metric_name = db.Column(db.String(255), nullable=False)
    value = db.Column(db.Numeric(15,2), nullable=True)
    target_value = db.Column(db.Numeric(15,2), nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    period = db.Column(db.String(50), nullable=True) # weekly, monthly, quarterly
    date_recorded = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship('Product', back_populates='product_metrics')

    def to_dict(self):
        return {
            'metric_id': self.metric_id,
            'product_id': self.product_id,
            'metric_name': self.metric_name,
            'value': float(self.value) if self.value is not None else None,
            'target_value': float(self.target_value) if self.target_value is not None else None,
            'unit': self.unit,
            'period': self.period,
            'date_recorded': self.date_recorded.isoformat() if self.date_recorded else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class ProductIssue(db.Model):
    """Records issues or bugs identified for a product."""
    __tablename__ = 'product_issues'
    issue_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(50), nullable=True) # Low, Medium, High, Critical
    status = db.Column(db.String(50), nullable=True) # Open, In Progress, Resolved
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    product = db.relationship('Product', back_populates='product_issues')
    creator = db.relationship('User', backref='created_issues')

    def to_dict(self):
        return {
            'issue_id': self.issue_id,
            'product_id': self.product_id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'status': self.status,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }

class BusinessOverview(db.Model):
    """Provides a high-level overview of a startup's business model and key partnerships."""
    __tablename__ = 'business_overview'
    business_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), unique=True, nullable=False)
    business_model = db.Column(db.String(255), nullable=True)
    key_partners = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='business_overview')

    def to_dict(self):
        return {
            'business_id': self.business_id,
            'startup_id': self.startup_id,
            'business_model': self.business_model,
            'key_partners': self.key_partners,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class BusinessModelType(Enum):
    SUBSCRIPTION = "SUBSCRIPTION"
    TRANSACTIONAL = "TRANSACTIONAL"
    SERVICE = "SERVICE"
    MARKETPLACE = "MARKETPLACE"
    ADVERTISING = "ADVERTISING"
    HYBRID = "HYBRID"

    def __str__(self):
        return self.value


class BusinessModelStatus(Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"

class BusinessModel(db.Model):
    """Represents a distinct way the startup generates value/revenue. Independent of specific products."""
    __tablename__ = 'business_models'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False) # e.g. "SaaS Pro Tier"
    description = db.Column(db.Text, nullable=True)
    
    model_type = db.Column(db.Enum(BusinessModelType), default=BusinessModelType.TRANSACTIONAL)
    model_config = db.Column(db.JSON, nullable=True) # Pricing tiers, recurrence, etc.
    

    # Financial Linkage
    revenue_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)
    cost_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)
    
    status = db.Column(db.Enum(BusinessModelStatus), default=BusinessModelStatus.DRAFT)

    # Proforma / Unit Economics Fields (for modeling without accounting)
    target_arpu = db.Column(db.Float, nullable=True) # Average Revenue Per User
    target_cac = db.Column(db.Float, nullable=True) # Customer Acquisition Cost
    target_margin = db.Column(db.Float, nullable=True) # Gross Margin % (0-100)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    revenue_account = db.relationship('Account', foreign_keys=[revenue_account_id])
    cost_account = db.relationship('Account', foreign_keys=[cost_account_id])

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'name': self.name,
            'description': self.description,
            'model_type': self.model_type.value if self.model_type else None,
            'model_config': self.model_config,
            'revenue_account_id': self.revenue_account_id,
            'revenue_account_name': self.revenue_account.name if self.revenue_account else None,
            'cost_account_id': self.cost_account_id,
            'cost_account_name': self.cost_account.name if self.cost_account else None,
            'status': self.status.value,
            'target_arpu': self.target_arpu,
            'target_cac': self.target_cac,
            'target_margin': self.target_margin,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    status = db.Column(db.Enum(BusinessModelStatus), default=BusinessModelStatus.DRAFT)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('business_models', lazy=True))
    revenue_account = db.relationship('Account', foreign_keys=[revenue_account_id])
    cost_account = db.relationship('Account', foreign_keys=[cost_account_id])



class ProductBusinessDetails(db.Model):
    """Details the business aspects specific to a product, such as pricing and target customers."""
    __tablename__ = 'product_business_details'
    product_business_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), unique=True, nullable=False)
    
    # New Fields for Structured Business Modeling
    model_type = db.Column(db.Enum(BusinessModelType), default=BusinessModelType.TRANSACTIONAL)
    model_config = db.Column(db.JSON, nullable=True) # Store model-specific details (e.g. tiers, take-rate)
    
    # Accounting Linkage
    revenue_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)
    cost_account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)

    pricing_model = db.Column(db.String(255), nullable=True) # Legacy/Generic field
    target_customer = db.Column(db.Text, nullable=True)
    revenue_streams = db.Column(db.Text, nullable=True)
    distribution_channels = db.Column(db.Text, nullable=True)
    cost_structure = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship('Product', back_populates='business_details')
    revenue_account = db.relationship('Account', foreign_keys=[revenue_account_id])
    cost_account = db.relationship('Account', foreign_keys=[cost_account_id])

    def to_dict(self):
        return {
            'product_business_id': self.product_business_id,
            'product_id': self.product_id,
            'model_type': str(self.model_type) if self.model_type else 'TRANSACTIONAL',
            'model_config': self.model_config,
            'revenue_account_id': self.revenue_account_id,
            'revenue_account_name': self.revenue_account.name if self.revenue_account else None,
            'cost_account_id': self.cost_account_id,
            'cost_account_name': self.cost_account.name if self.cost_account else None,
            'pricing_model': self.pricing_model,
            'target_customer': self.target_customer,
            'revenue_streams': self.revenue_streams,
            'distribution_channels': self.distribution_channels,
            'cost_structure': self.cost_structure,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class BusinessMonthlyData(db.Model):
    """Stores monthly financial and operational data for a startup."""
    __tablename__ = 'business_monthly_data'
    record_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    month_start = db.Column(db.Date, nullable=False)
    total_revenue = db.Column(db.Numeric(15,2), nullable=True)
    total_expenses = db.Column(db.Numeric(15,2), nullable=True)
    net_burn = db.Column(db.Numeric(15,2), nullable=True)
    cash_in_bank = db.Column(db.Numeric(15,2), nullable=True)
    mrr = db.Column(db.Numeric(15,2), nullable=True)
    churn_rate = db.Column(db.Numeric(5,2), nullable=True)
    new_customers = db.Column(db.Integer, nullable=True)
    total_customers = db.Column(db.Integer, nullable=True)
    
    # --- Expanded Metrics (CRM, Marketing, Fundraising) ---
    crm_pipeline_value = db.Column(db.Numeric(15,2), nullable=True)
    crm_win_rate = db.Column(db.Numeric(5,2), nullable=True)
    marketing_total_spend = db.Column(db.Numeric(15,2), nullable=True)
    marketing_impressions = db.Column(db.Integer, nullable=True)
    active_investors = db.Column(db.Integer, nullable=True)
    fundraising_amount = db.Column(db.Numeric(15,2), nullable=True)
    
    key_highlights = db.Column(db.Text, nullable=True)
    key_challenges = db.Column(db.Text, nullable=True)
    next_focus = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='monthly_data')
    creator = db.relationship('User', back_populates='created_monthly_data')

    def to_dict(self):
        return {
            'record_id': self.record_id,
            'startup_id': self.startup_id,
            'month_start': self.month_start.isoformat() if self.month_start else None,
            'total_revenue': float(self.total_revenue) if self.total_revenue is not None else None,
            'total_expenses': float(self.total_expenses) if self.total_expenses is not None else None,
            'net_burn': float(self.net_burn) if self.net_burn is not None else None,
            'cash_in_bank': float(self.cash_in_bank) if self.cash_in_bank is not None else None,
            'mrr': float(self.mrr) if self.mrr is not None else None,
            'churn_rate': float(self.churn_rate) if self.churn_rate is not None else None,
            'new_customers': self.new_customers,
            'total_customers': self.total_customers,
            'crm_pipeline_value': float(self.crm_pipeline_value) if self.crm_pipeline_value is not None else None,
            'crm_win_rate': float(self.crm_win_rate) if self.crm_win_rate is not None else None,
            'marketing_total_spend': float(self.marketing_total_spend) if self.marketing_total_spend is not None else None,
            'marketing_impressions': self.marketing_impressions,
            'active_investors': self.active_investors,
            'fundraising_amount': float(self.fundraising_amount) if self.fundraising_amount is not None else None,
            'key_highlights': self.key_highlights,
            'key_challenges': self.key_challenges,
            'next_focus': self.next_focus,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class MarketingOverview(db.Model):
    """Provides a high-level overview of a startup's marketing strategy and positioning."""
    __tablename__ = 'marketing_overview'
    marketing_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), unique=True, nullable=False)
    positioning_statement = db.Column(db.Text, nullable=True)
    brand_details = db.Column(db.JSON, nullable=True) # Store brand voice, archetype, audience, etc.

    startup = db.relationship('Startup', back_populates='marketing_overview')

    def to_dict(self):
        return {
            'marketing_id': self.marketing_id,
            'startup_id': self.startup_id,
            'positioning_statement': self.positioning_statement,
            'brand_details': self.brand_details,
        }

class MarketingCampaignStatus(Enum):
    """Defines the status of a marketing campaign."""
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"

    def __str__(self):
        return self.value

class MarketingContentStatus(Enum):
    """Defines the status of a marketing content item."""
    PLANNED = "PLANNED"
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CANCELLED = "CANCELLED"

    def __str__(self):
        return self.value

class MarketingCampaign(db.Model):
    """Represents a marketing campaign for a startup or a specific product."""
    __tablename__ = 'marketing_campaigns'
    campaign_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    scope = db.Column(db.String(50), default='overall') # e.g., 'overall', 'product_launch'
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    campaign_name = db.Column(db.String(255), nullable=False)
    objective = db.Column(db.Text, nullable=True)
    channel = db.Column(db.String(100), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    spend = db.Column(db.Numeric(15,2), nullable=True)
    impressions = db.Column(db.Integer, nullable=True)
    clicks = db.Column(db.Integer, nullable=True)
    conversions = db.Column(db.Integer, nullable=True)
    status = db.Column(db.Enum(MarketingCampaignStatus), default=MarketingCampaignStatus.PLANNED, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    content_mode = db.Column(db.Boolean, default=False) # True if campaign involves content calendar
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='marketing_campaigns')
    product = db.relationship('Product', back_populates='marketing_campaigns')
    creator = db.relationship('User', back_populates='created_marketing_campaigns')
    content_calendars = db.relationship('MarketingContentCalendar', back_populates='campaign', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'campaign_id': self.campaign_id,
            'startup_id': self.startup_id,
            'scope': self.scope,
            'product_id': self.product_id,
            'campaign_name': self.campaign_name,
            'objective': self.objective,
            'channel': self.channel,
            # Handle potential string vs date object issues
            'start_date': self.start_date.isoformat() if hasattr(self.start_date, 'isoformat') else str(self.start_date) if self.start_date else None,
            'end_date': self.end_date.isoformat() if hasattr(self.end_date, 'isoformat') else str(self.end_date) if self.end_date else None,
            'spend': float(self.spend) if self.spend is not None else None,
            'impressions': self.impressions,
            'clicks': self.clicks,
            'conversions': self.conversions,
            'status': str(self.status),
            'notes': self.notes,
            'content_mode': self.content_mode,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'content_calendars': [calendar.to_dict() for calendar in self.content_calendars],
        }

class MarketingContentCalendar(db.Model):
    """Manages a content calendar for a specific marketing campaign."""
    __tablename__ = 'marketing_content_calendar'
    calendar_id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('marketing_campaigns.campaign_id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    campaign = db.relationship('MarketingCampaign', back_populates='content_calendars')
    owner = db.relationship('User', back_populates='owned_content_calendars')
    content_items = db.relationship('MarketingContentItem', back_populates='calendar', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'calendar_id': self.calendar_id,
            'campaign_id': self.campaign_id,
            'title': self.title,
            'description': self.description,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'content_items': [item.to_dict() for item in self.content_items],
        }

class MarketingContentItem(db.Model):
    """Represents a single piece of marketing content within a content calendar."""
    __tablename__ = 'marketing_content_items'
    content_id = db.Column(db.Integer, primary_key=True)
    calendar_id = db.Column(db.Integer, db.ForeignKey('marketing_content_calendar.calendar_id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=True)
    content_body = db.Column(db.Text, nullable=True)
    content_brief = db.Column(db.Text, nullable=True) # The instruction/idea for the content
    channel = db.Column(db.String(100), nullable=True)
    
    # New fields for Phase 2 (Image Generation)
    media_type = db.Column(db.String(20), default='text_only') # 'text_only', 'image', 'video'
    image_url = db.Column(db.Text, nullable=True)
    image_prompt = db.Column(db.Text, nullable=True)

    publish_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(MarketingContentStatus), default=MarketingContentStatus.PLANNED, nullable=False)
    performance = db.Column(db.JSON, nullable=True) # Store as JSON for flexible performance metrics
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    calendar = db.relationship('MarketingContentCalendar', back_populates='content_items')
    creator = db.relationship('User', back_populates='created_content_items')

    def to_dict(self):
        return {
            'content_id': self.content_id,
            'calendar_id': self.calendar_id,
            'title': self.title,
            'content_type': self.content_type,
            'content_body': self.content_body,
            'content_brief': self.content_brief,
            'channel': self.channel,
            'media_type': self.media_type,
            'image_url': self.image_url,
            'image_prompt': self.image_prompt,
            'publish_date': self.publish_date.isoformat() if self.publish_date else None,
            'status': str(self.status),
            'performance': self.performance,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class MarketingSettings(db.Model):
    """Stores configuration and credentials for external marketing integrations."""
    __tablename__ = 'marketing_settings'
    setting_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    provider = db.Column(db.String(50), nullable=False) # 'linkedin', 'twitter', 'instagram', 'facebook', 'email_sendgrid', 'email_mailgun'
    credentials = db.Column(db.JSON, nullable=True) # Encrypted or raw JSON of keys/tokens
    is_active = db.Column(db.Boolean, default=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('marketing_settings', lazy=True))

    def to_dict(self):
        return {
            'setting_id': self.setting_id,
            'startup_id': self.startup_id,
            'provider': self.provider,
            'is_active': self.is_active,
            'credentials': self.credentials, # In a real app, mask secrets here!
            'updated_at': self.updated_at.isoformat()
        }

class Fundraise(db.Model):
    """Stores high-level fundraise details for a startup."""
    __tablename__ = 'fundraise_details'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), unique=True, nullable=False)
    funding_stage = db.Column(db.String(100), nullable=True) # e.g., Bootstrapped, Pre-Seed, Seed, Series A
    amount_raised = db.Column(db.Float, nullable=True)

    startup = db.relationship('Startup', back_populates='fundraise_details')
    next_funding_goal = db.relationship('NextFundingGoal', back_populates='fundraise', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'funding_stage': self.funding_stage,
            'amount_raised': self.amount_raised,
            'next_funding_goal': self.next_funding_goal.to_dict() if self.next_funding_goal else None,
        }

class NextFundingGoal(db.Model):
    """Details the next funding goal for a startup's fundraise efforts."""
    __tablename__ = 'next_funding_goals'
    id = db.Column(db.Integer, primary_key=True)
    fundraise_id = db.Column(db.Integer, db.ForeignKey('fundraise_details.id'), unique=True, nullable=False)
    target_amount = db.Column(db.Float, nullable=True)
    target_valuation = db.Column(db.Float, nullable=True)
    target_close_date = db.Column(db.Date, nullable=True)

    fundraise = db.relationship('Fundraise', back_populates='next_funding_goal')

    def to_dict(self):
        return {
            'id': self.id,
            'fundraise_id': self.fundraise_id,
            'target_amount': self.target_amount,
            'target_valuation': self.target_valuation,
            'target_close_date': self.target_close_date.isoformat() if self.target_close_date else None,
        }

class FundingRound(db.Model):
    """Records details about individual funding rounds a startup has raised or is raising."""
    __tablename__ = 'funding_rounds'
    round_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    round_type = db.Column(db.String(50), nullable=True) # Pre-Seed, Seed, Series A, etc.
    status = db.Column(db.String(50), nullable=True) # Planned, In Progress, Closed
    target_amount = db.Column(db.Numeric(15,2), nullable=True)
    amount_raised = db.Column(db.Numeric(15,2), nullable=True)
    valuation_pre = db.Column(db.Numeric(15,2), nullable=True)
    valuation_post = db.Column(db.Numeric(15,2), nullable=True)
    date_opened = db.Column(db.Date, nullable=True)
    date_closed = db.Column(db.Date, nullable=True)
    lead_investor = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    pitch_deck_url = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='funding_rounds')
    investors = db.relationship('RoundInvestor', back_populates='funding_round')

    def to_dict(self):
        return {
            'round_id': self.round_id,
            'startup_id': self.startup_id,
            'round_type': self.round_type,
            'status': self.status,
            'target_amount': float(self.target_amount) if self.target_amount is not None else None,
            'amount_raised': float(self.amount_raised) if self.amount_raised is not None else None,
            'valuation_pre': float(self.valuation_pre) if self.valuation_pre is not None else None,
            'valuation_post': float(self.valuation_post) if self.valuation_post is not None else None,
            'date_opened': self.date_opened.isoformat() if self.date_opened else None,
            'date_closed': self.date_closed.isoformat() if self.date_closed else None,
            'lead_investor': self.lead_investor,
            'notes': self.notes,
            'pitch_deck_url': self.pitch_deck_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'investors': [investor.to_dict() for investor in self.investors],
        }



class GlobalInvestor(db.Model):
    """Represents a global, shared database of investors available to all startups."""
    __tablename__ = 'global_investors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    firm_name = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(255), nullable=True)  # Role: Partner, GP, etc.
    types = db.Column(db.JSON, nullable=True) # Array: ['VC', 'Angel', 'Family Office']
    focus_sectors = db.Column(db.JSON, nullable=True) # Array: ['SaaS', 'Fintech', 'AI']
    focus_stages = db.Column(db.JSON, nullable=True) # Array: ['Pre-Seed', 'Seed', 'Series A']
    min_check_size = db.Column(db.Float, nullable=True)
    max_check_size = db.Column(db.Float, nullable=True)
    locations = db.Column(db.JSON, nullable=True) # Array of strings
    website = db.Column(db.Text, nullable=True)
    logo_url = db.Column(db.Text, nullable=True)
    sweet_spot = db.Column(db.Float, nullable=True) # Ideal check size
    bio = db.Column(db.Text, nullable=True)  # Investor biography
    recent_investments = db.Column(db.Text, nullable=True)  # Recent portfolio companies
    meta_data = db.Column(db.JSON, nullable=True) # Catch-all for extra details
    email = db.Column(db.String(255), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    linkedin = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Startups that have imported this investor to their CRM
    crm_instances = db.relationship('Investor', back_populates='global_investor')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'firm_name': self.firm_name,
            'title': self.title,
            'types': self.types,
            'focus_sectors': self.focus_sectors,
            'focus_stages': self.focus_stages,
            'min_check_size': self.min_check_size,
            'max_check_size': self.max_check_size,
            'sweet_spot': self.sweet_spot,
            'locations': self.locations,
            'website': self.website,
            'logo_url': self.logo_url,
            'bio': self.bio,
            'recent_investments': self.recent_investments,
            'email': self.email,
            'phone': self.phone,
            'linkedin': self.linkedin,
            'meta_data': self.meta_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class InvestorStage(Enum):
    PROSPECT = "PROSPECT"
    CONTACTED = "CONTACTED"
    MEETING = "MEETING"
    DUE_DILIGENCE = "DUE_DILIGENCE"
    TERM_SHEET = "TERM_SHEET"
    COMMITTED = "COMMITTED"
    PASSED = "PASSED"
    PORTFOLIO = "PORTFOLIO"
    
    def __str__(self):
        return self.value

class Investor(db.Model):
    """Represents an investor in a specific startup's CRM (potentially linked to GlobalInvestor)."""
    __tablename__ = 'investors'
    investor_id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=True) # If null, generic? No, should be startup specific now.
    global_investor_id = db.Column(db.Integer, db.ForeignKey('global_investors.id'), nullable=True)
    
    name = db.Column(db.String(255), nullable=False)
    firm_name = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(50), nullable=True) # Angel, VC, Fund, Accelerator
    email = db.Column(db.String(255), nullable=True)
    website = db.Column(db.Text, nullable=True)
    
    # CRM Fields
    stage = db.Column(db.Enum(InvestorStage), default=InvestorStage.PROSPECT, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    check_size_interest = db.Column(db.Float, nullable=True)
    next_action_date = db.Column(db.DateTime, nullable=True)
    next_action_type = db.Column(db.String(50), nullable=True) # 'Email', 'Call', 'Meeting'
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='investors')
    global_investor = db.relationship('GlobalInvestor', back_populates='crm_instances')
    rounds = db.relationship('RoundInvestor', back_populates='investor')
    interaction_logs = db.relationship('InteractionLog', back_populates='investor', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'investor_id': self.investor_id,
            'startup_id': self.startup_id,
            'global_investor_id': self.global_investor_id,
            'name': self.name,
            'firm_name': self.firm_name,
            'type': self.type,
            'email': self.email,
            'website': self.website,
            'notes': self.notes,
            'stage': str(self.stage) if self.stage else None,
            'check_size_interest': float(self.check_size_interest) if self.check_size_interest else None,
            'total_invested': sum([float(ri.amount_invested) for ri in self.rounds if ri.amount_invested]) if self.rounds else 0.0,
            'next_action_date': self.next_action_date.isoformat() if self.next_action_date else None,
            'next_action_type': self.next_action_type,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

class InteractionLog(db.Model):
    """Logs interactions (calls, emails, notes) with an investor."""
    __tablename__ = 'interaction_logs'
    id = db.Column(db.Integer, primary_key=True)
    investor_id = db.Column(db.Integer, db.ForeignKey('investors.investor_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False) # 'Email', 'Call', 'Meeting', 'Note'
    summary = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    
    investor = db.relationship('Investor', back_populates='interaction_logs')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'investor_id': self.investor_id,
            'user_id': self.user_id,
            'user_name': self.user.full_name,
            'type': self.type,
            'summary': self.summary,
            'date': self.date.isoformat(),
        }

class RoundInvestor(db.Model):
    """Link table between FundingRound and Investor."""
    __tablename__ = 'round_investors'
    id = db.Column(db.Integer, primary_key=True)
    round_id = db.Column(db.Integer, db.ForeignKey('funding_rounds.round_id'), nullable=False)
    investor_id = db.Column(db.Integer, db.ForeignKey('investors.investor_id'), nullable=False)
    amount_invested = db.Column(db.Numeric(15,2), nullable=True)
    
    funding_round = db.relationship('FundingRound', back_populates='investors')
    investor = db.relationship('Investor', back_populates='rounds')

    def to_dict(self):
        return {
            'round_id': self.round_id,
            'investor_id': self.investor_id,
            'amount_invested': float(self.amount_invested) if self.amount_invested is not None else None,
            'investor_name': self.investor.name,
            'firm_name': self.investor.firm_name,
            'investor': self.investor.to_dict()
        }

class ActivityLog(db.Model):
    """Logs activities for the dashboard feed."""
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=True)
    action = db.Column(db.String(50), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='activities')
    startup = db.relationship('Startup', backref='activities')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'startup_id': self.startup_id,
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_name': self.user.full_name if self.user else 'Unknown',
            'startup_name': self.startup.name if self.startup else None
        }

class DashboardNotification(db.Model):
    """Stores notifications for users."""
    __tablename__ = 'dashboard_notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info') # info, success, warning, error
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'read': self.read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }



class Founder(db.Model):
    """Represents a founder of a startup, storing their personal and contact details."""
    __tablename__ = 'founders'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    linkedin_link = db.Column(db.String(255), nullable=True)

    startup = db.relationship('Startup', back_populates='founders')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'name': self.name,
            'role': self.role,
            'email': self.email,
            'phone_number': self.phone_number,
            'linkedin_link': self.linkedin_link,
        }

class EvaluationTask(db.Model):
    __tablename__ = 'evaluation_tasks'
    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='Pending') # e.g., Pending, Submitted, Approved
    due_date = db.Column(db.DateTime, nullable=True)
    file_upload_path = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    submission = db.relationship('Submission', back_populates='evaluation_tasks')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'file_upload_path': self.file_upload_path,
            'created_at': self.created_at.isoformat(),
        }
    
class Submission(db.Model):
    """Represents a startup submission made by a user, containing initial details and status."""
    __tablename__ = 'submissions'
    __table_args__ = (
        db.UniqueConstraint('user_id', name='uq_user_submission'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    
    # Columns corresponding to chatbot keys
    startup_name = db.Column(db.String(200), nullable=True)
    founders_and_inspiration = db.Column(db.Text, nullable=True)
    problem_statement = db.Column(db.Text, nullable=True)
    who_experiences_problem = db.Column(db.Text, nullable=True)
    product_service_idea = db.Column(db.Text, nullable=True)
    how_solves_problem = db.Column(db.Text, nullable=True)
    intended_users_customers = db.Column(db.Text, nullable=True)
    main_competitors_alternatives = db.Column(db.Text, nullable=True)
    how_stands_out = db.Column(db.Text, nullable=True)
    startup_type = db.Column(db.String(100), nullable=True)

    # Metadata
    status = db.Column(db.Enum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    raw_chat_data = db.Column(db.JSON, nullable=True)  # Still useful for auditing
    chat_progress_step = db.Column(db.String(100), nullable=True, default='start')  # Tracks the current question

    user = db.relationship('User', back_populates='submissions')
    evaluation = db.relationship('Evaluation', back_populates='submission', uselist=False, cascade='all, delete-orphan')
    # In Submission model
    # In Submission model
    startup = db.relationship('Startup', back_populates='submission', uselist=False)
    organization = db.relationship('Organization', back_populates='submissions')
    
    # New relationships for pre-admission stages
    evaluation_tasks = db.relationship('EvaluationTask', order_by=EvaluationTask.id, back_populates='submission', cascade="all, delete-orphan")

    def to_dict(self):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'user_id': self.user_id,
            'organization_id': self.organization_id,
            'user': self.user.to_dict(),
            'startup_name': self.startup_name,
            'founders_and_inspiration': self.founders_and_inspiration,
            'problem_statement': self.problem_statement,
            'who_experiences_problem': self.who_experiences_problem,
            'product_service_idea': self.product_service_idea,
            'how_solves_problem': self.how_solves_problem,
            'intended_users_customers': self.intended_users_customers,
            'main_competitors_alternatives': self.main_competitors_alternatives,
            'how_stands_out': self.how_stands_out,
            'startup_type': self.startup_type,
            'status': self.status.name,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'evaluation': self.evaluation.to_dict() if self.evaluation else None
        }
        return data
    
class ScopeDocument(db.Model):
    __tablename__ = 'scope_documents'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    version = db.Column(db.String(20), default='1.0')
    status = db.Column(db.String(50), default='Pending Review') # e.g., Pending Review, Accepted, Rejected
    content = db.Column(db.Text, nullable=False) # Storing as JSON or Markdown
    founder_accepted = db.Column(db.Boolean, default=False)
    admin_accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    startup = db.relationship('Startup', back_populates='scope_document')
    comments = db.relationship('ScopeComment', back_populates='document', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'title': self.title,
            'version': self.version,
            'status': self.status,
            'content': self.content,
            'founder_accepted': self.founder_accepted,
            'admin_accepted': self.admin_accepted,
            'comments': [comment.to_dict() for comment in self.comments],
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }

class ScopeComment(db.Model):
    __tablename__ = 'scope_comments'
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('scope_documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    section_id = db.Column(db.String(100), nullable=False) # Identifier for the section within the document content
    text = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    document = db.relationship('ScopeDocument', back_populates='comments')
    author = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'author_name': self.author.full_name,
            'section_id': self.section_id,
            'text': self.text,
            'is_resolved': self.is_resolved,
            'created_at': self.created_at.isoformat(),
        }

class Contract(db.Model):
    __tablename__ = 'contracts'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True) # To store the generated contract
    document_url = db.Column(db.String(500), nullable=True) # Link to e-sign platform
    status = db.Column(db.Enum(ContractStatus), default=ContractStatus.DRAFT)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime, nullable=True)
    signed_at = db.Column(db.DateTime, nullable=True)
    founder_accepted = db.Column(db.Boolean, default=False)
    admin_accepted = db.Column(db.Boolean, default=False)
    
    startup = db.relationship('Startup', back_populates='contract')
    signatories = db.relationship('ContractSignatory', back_populates='contract', lazy=True, cascade="all, delete-orphan")
    comments = db.relationship('ContractComment', back_populates='contract', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'title': self.title,
            'content': self.content,
            'document_url': self.document_url,
            'status': self.status.name,
            'founder_accepted': self.founder_accepted,
            'admin_accepted': self.admin_accepted,
            'signatories': [s.to_dict() for s in self.signatories],
            'comments': [c.to_dict() for c in self.comments],
            'created_at': self.created_at.isoformat(),
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
        }

class ContractComment(db.Model):
    __tablename__ = 'contract_comments'
    id = db.Column(db.Integer, primary_key=True)
    contract_id = db.Column(db.Integer, db.ForeignKey('contracts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    contract = db.relationship('Contract', back_populates='comments')
    author = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'contract_id': self.contract_id,
            'user_id': self.user_id,
            'author_name': self.author.full_name,
            'text': self.text,
            'created_at': self.created_at.isoformat(),
        }

class ContractSignatory(db.Model):
    __tablename__ = 'contract_signatories'
    id = db.Column(db.Integer, primary_key=True)
    contract_id = db.Column(db.Integer, db.ForeignKey('contracts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Can be a platform user
    email = db.Column(db.String(120), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), default='Not Signed') # e.g., Not Signed, Signed
    signed_at = db.Column(db.DateTime, nullable=True)
    
    contract = db.relationship('Contract', back_populates='signatories')
    user = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'contract_id': self.contract_id,
            'user_id': self.user_id,
            'email': self.email,
            'name': self.name,
            'status': self.status,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
        }

# Add back-population relationships to Submission model
Submission.evaluation_tasks = db.relationship('EvaluationTask', order_by=EvaluationTask.id, back_populates='submission', cascade="all, delete-orphan")

class Evaluation(db.Model):
    """Stores the detailed evaluation results for a startup submission."""
    __tablename__ = 'evaluations'

    id = db.Column(db.Integer, primary_key=True)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), unique=True, nullable=False)
    
    problem_analysis = db.Column(db.JSON)
    solution_analysis = db.Column(db.JSON)
    market_analysis = db.Column(db.JSON)
    growth_analysis = db.Column(db.JSON)
    competitor_analysis = db.Column(db.JSON)
    risks_analysis = db.Column(db.JSON)
    
    overall_score = db.Column(db.Float)
    final_decision = db.Column(db.String(100))
    overall_summary = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    submission = db.relationship('Submission', back_populates='evaluation')

    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'problem_analysis': self.problem_analysis,
            'solution_analysis': self.solution_analysis,
            'market_analysis': self.market_analysis,
            'growth_analysis': self.growth_analysis,
            'competitor_analysis': self.competitor_analysis,
            'risks_analysis': self.risks_analysis,
            'overall_score': self.overall_score,
            'final_decision': self.final_decision,
            'overall_summary': self.overall_summary,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class AccountType(Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

    def __str__(self):
        return self.value

class Account(db.Model):
    """Represents a financial account in the chart of accounts."""
    __tablename__ = 'accounts'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum(AccountType), nullable=False)
    subtype = db.Column(db.String(100), nullable=True) # e.g., 'Bank', 'Credit Card', 'Operating Expense'
    balance = db.Column(db.Numeric(15, 2), default=0.00) # Current balance
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('accounts', lazy=True))


    def to_dict(self, month=None, year=None):
        balance = float(self.balance)
        
        if month is not None and year is not None:
            # Calculate balance as of the end of the specified month
            from datetime import date, timedelta
            month_start = date(year, month, 1)
            next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = next_month - timedelta(days=1)
            
            # Sum all activity up to month_end
            totals = db.session.query(
                db.func.sum(JournalLine.debit).label('total_debit'),
                db.func.sum(JournalLine.credit).label('total_credit')
            ).join(JournalEntry).filter(
                JournalLine.account_id == self.id,
                JournalEntry.date <= month_end
            ).first()
            
            total_debit = float(totals.total_debit or 0)
            total_credit = float(totals.total_credit or 0)
            
            if self.type in [AccountType.ASSET, AccountType.EXPENSE]:
                balance = total_debit - total_credit
            else:
                balance = total_credit - total_debit

        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'name': self.name,
            'type': self.type.value if hasattr(self.type, 'value') else self.type,
            'subtype': self.subtype,
            'balance': balance,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class JournalEntry(db.Model):
    """Represents a double-entry accounting transaction."""
    __tablename__ = 'journal_entries'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    reference = db.Column(db.String(100), nullable=True) # e.g., Invoice #123
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('journal_entries', lazy=True))
    lines = db.relationship('JournalLine', backref='journal_entry', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'date': self.date.isoformat(),
            'description': self.description,
            'reference': self.reference,
            'lines': [line.to_dict() for line in self.lines],
            'created_at': self.created_at.isoformat()
        }

class JournalLine(db.Model):
    """Represents a line item in a journal entry (debit or credit)."""
    __tablename__ = 'journal_lines'
    id = db.Column(db.Integer, primary_key=True)
    journal_entry_id = db.Column(db.Integer, db.ForeignKey('journal_entries.id'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    debit = db.Column(db.Numeric(15, 2), default=0.00)
    credit = db.Column(db.Numeric(15, 2), default=0.00)

    description = db.Column(db.String(255), nullable=True) # Line-level description
    business_model_id = db.Column(db.Integer, db.ForeignKey('business_models.id'), nullable=True)
    quantity = db.Column(db.Float, default=0.0) # For operational tracking (e.g. units sold)

    account = db.relationship('Account')
    business_model = db.relationship('BusinessModel')

    def to_dict(self):
        return {
            'id': self.id,
            'journal_entry_id': self.journal_entry_id,
            'account_id': self.account_id,
            'account_name': self.account.name,
            'debit': float(self.debit),
            'credit': float(self.credit),
            'description': self.description,
            'business_model_id': self.business_model_id,
            'business_model_name': self.business_model.name if self.business_model else None,
            'quantity': self.quantity
        }

class StakeholderType(Enum):
    FOUNDER = 'Founder'
    INVESTOR = 'Investor'
    EMPLOYEE = 'Employee'
    OPTION_POOL = 'Option Pool'
    ADVISOR = 'Advisor'

class CapTableEntry(db.Model):
    __tablename__ = 'cap_table_entries'

    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    stakeholder_name = db.Column(db.String(255), nullable=False)
    stakeholder_type = db.Column(db.Enum(StakeholderType), default=StakeholderType.FOUNDER)
    shares = db.Column(db.Integer, default=0)

    startup = db.relationship('Startup', backref=db.backref('cap_table', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'stakeholder_name': self.stakeholder_name,
            'stakeholder_type': self.stakeholder_type.value,
            'shares': self.shares
        }

class StartupSnapshot(db.Model):
    """Daily snapshot of startup health and derived insights."""
    __tablename__ = 'startup_snapshots'

    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow)

    # Key Indices (0-100 or specific metrics)
    founder_maturity_score = db.Column(db.Float, nullable=True)
    product_readiness_score = db.Column(db.Float, nullable=True)
    market_fit_score = db.Column(db.Float, nullable=True)
    runway_months = db.Column(db.Float, nullable=True)
    
    # Detailed Insight Payloads
    financial_data = db.Column(db.JSON, nullable=True) # Burn, Trend, Unit Economics
    product_data = db.Column(db.JSON, nullable=True) # Velocity, Technical Debt
    growth_data = db.Column(db.JSON, nullable=True) # CAC, Channels, Content
    team_data = db.Column(db.JSON, nullable=True) # Focus allocation, Overload

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('snapshots', lazy=True, order_by='desc(StartupSnapshot.date)'))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'date': self.date.isoformat(),
            'founder_maturity_score': self.founder_maturity_score,
            'product_readiness_score': self.product_readiness_score,
            'market_fit_score': self.market_fit_score,
            'runway_months': self.runway_months,
            'financial_data': self.financial_data,
            'product_data': self.product_data,
            'growth_data': self.growth_data,
            'team_data': self.team_data,
            'created_at': self.created_at.isoformat()
        }
    investment_amount = db.Column(db.Float, default=0.0)
    date_issued = db.Column(db.Date, default=datetime.utcnow)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'stakeholder_name': self.stakeholder_name,
            'stakeholder_type': self.stakeholder_type.value,
            'shares': self.shares,
            'investment_amount': self.investment_amount,
            'date_issued': self.date_issued.isoformat() if self.date_issued else None
        }

class JobStatus(Enum):
    DRAFT = "DRAFT"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"

class Job(db.Model):
    """Represents a job position within a startup."""
    __tablename__ = 'jobs'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True) # Full HTML/Markdown description
    requirements = db.Column(db.JSON, nullable=True) # List of requirements
    
    status = db.Column(db.Enum(JobStatus), default=JobStatus.DRAFT)
    location = db.Column(db.String(255), nullable=True) # Remote, Hybrid, City
    
    # Salary Range
    salary_min = db.Column(db.Float, nullable=True)
    salary_max = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default="USD")
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('jobs', lazy=True))
    applications = db.relationship('Application', back_populates='job', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'title': self.title,
            'description': self.description,
            'requirements': self.requirements,
            'status': self.status.value,
            'location': self.location,
            'salary_min': self.salary_min,
            'salary_max': self.salary_max,
            'currency': self.currency,
            'application_count': len(self.applications) if self.applications else 0,
            'created_at': self.created_at.isoformat(),
        }

class Candidate(db.Model):
    """Represents a candidate who can apply to multiple jobs."""
    __tablename__ = 'candidates'
    id = db.Column(db.Integer, primary_key=True)
    # startup_id removed to make candidates global or we can keep it optional if needed. 
    # For now, let's keep it simple: Candidates are linked to applications. 
    # But to prevent data leaks between startups, we should probably link to Organization or Startup.
    # Plan said "Reusable across multiple applications".
    # Let's add startup_id as nullable for now, or assume they are created in context of a startup.
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=True) 
    
    name = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=False) # Email unique per startup? Or global?
    # If we want one candidate per startup, we need compound unique constraint.
    phone = db.Column(db.String(50), nullable=True)
    
    resume_url = db.Column(db.String(500), nullable=True) # Link to Artifact (S3)
    parsed_data = db.Column(db.JSON, nullable=True) # AI Extracted Skills, Experience
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    startup = db.relationship('Startup', backref=db.backref('candidates', lazy=True))
    applications = db.relationship('Application', back_populates='candidate', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'resume_url': self.resume_url,
            'parsed_data': self.parsed_data,
            'created_at': self.created_at.isoformat(),
        }

class ApplicationStatus(Enum):
    APPLIED = "APPLIED"
    SCREENING = "SCREENING"
    INTERVIEW = "INTERVIEW"
    OFFER = "OFFER"
    HIRED = "HIRED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"

class Application(db.Model):
    """Links a Candidate to a specific Job with progress tracking."""
    __tablename__ = 'applications'
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    candidate_id = db.Column(db.Integer, db.ForeignKey('candidates.id'), nullable=False)
    
    status = db.Column(db.Enum(ApplicationStatus), default=ApplicationStatus.APPLIED)
    stage = db.Column(db.String(50), default="Applied") # Kanban Column Name
    
    # AI Scoring
    ai_score = db.Column(db.Integer, default=0) # 0-100
    ai_analysis = db.Column(db.JSON, nullable=True) # Why match/mismatch
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job = db.relationship('Job', back_populates='applications')
    candidate = db.relationship('Candidate', back_populates='applications')
    interviews = db.relationship('Interview', back_populates='application', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('RecruitmentActivity', back_populates='application', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'job_id': self.job_id,
            'job_title': self.job.title if self.job else None,
            'candidate_id': self.candidate_id,
            'candidate_name': self.candidate.name if self.candidate else None,
            'candidate': self.candidate.to_dict() if self.candidate else None,
            'status': self.status.value,
            'stage': self.stage,
            'ai_score': self.ai_score,
            'ai_analysis': self.ai_analysis,
            'created_at': self.created_at.isoformat(),
        }

class InterviewStatus(Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"

class Interview(db.Model):
    """Represents a scheduled interview for an application."""
    __tablename__ = 'interviews'
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False)
    interviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    scheduled_at = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(InterviewStatus), default=InterviewStatus.SCHEDULED)
    
    meeting_link = db.Column(db.String(500), nullable=True)

    application = db.relationship('Application', back_populates='interviews')
    interviewer = db.relationship('User')

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'interviewer_id': self.interviewer_id,
            'interviewer_name': self.interviewer.full_name if self.interviewer else None,
            'scheduled_at': self.scheduled_at.isoformat(),
            'notes': self.notes,
            'status': self.status.value,
            'meeting_link': self.meeting_link
        }


class CalendarEventType(Enum):
    MEETING = 'MEETING'
    REMINDER = 'REMINDER'
    BLOCKER = 'BLOCKER'
    OTHER = 'OTHER'

# Association table for event attendees
event_attendees = db.Table('event_attendees',
    db.Column('event_id', db.Integer, db.ForeignKey('calendar_events.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class CalendarEvent(db.Model):
    """Represents a manually created calendar event."""
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_time = db.Column(db.DateTime, nullable=False, index=True)
    end_time = db.Column(db.DateTime, nullable=False, index=True)
    event_type = db.Column(db.Enum(CalendarEventType), default=CalendarEventType.MEETING)
    location = db.Column(db.String(200))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='calendar_events')
    startup = db.relationship('Startup', backref='calendar_events')
    
    # Attendees relationship
    attendees = db.relationship('User', secondary=event_attendees, lazy='subquery',
        backref=db.backref('attending_events', lazy=True))

    def to_dict(self):
        start_iso = self.start_time.isoformat()
        if not self.start_time.tzinfo:
            start_iso += 'Z'
            
        end_iso = self.end_time.isoformat()
        if not self.end_time.tzinfo:
            end_iso += 'Z'
            
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'start': start_iso,
            'end': end_iso,
            'type': self.event_type.value,
            'location': self.location,
            'created_at': self.created_at.isoformat(),
            'user_name': self.user.full_name if self.user else None,
            'attendees': [{
                'id': u.id,
                'name': u.full_name,
                'email': u.email
            } for u in self.attendees]
        }

class RecruitmentActivity(db.Model):
    """Audit log for recruitment actions."""
    __tablename__ = 'recruitment_activities'
    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Who performed action
    action = db.Column(db.String(255), nullable=False) # "Moved to Interview", "Added Note"
    details = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    application = db.relationship('Application', back_populates='activities')

    def to_dict(self):
        return {
            'id': self.id,
            'application_id': self.application_id,
            'user_id': self.user_id,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat()
        }

