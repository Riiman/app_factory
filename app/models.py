from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json
from enum import Enum

# ============================================================================
# ENUMS
# ============================================================================

class StageStatus(str, Enum):
    NOT_STARTED = 'not_started'
    IN_PROGRESS = 'in_progress'
    BLOCKED = 'blocked'
    IN_REVIEW = 'in_review'
    COMPLETED = 'completed'
    SKIPPED = 'skipped'

class TaskStatus(str, Enum):
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    BLOCKED = 'blocked'
    DONE = 'done'

class TaskPriority(str, Enum):
    P0 = 'p0'  # Critical
    P1 = 'p1'  # High
    P2 = 'p2'  # Medium
    P3 = 'p3'  # Low

class ArtifactType(str, Enum):
    DOCUMENT = 'document'
    LINK = 'link'
    FILE = 'file'
    CODE_REPO = 'code_repo'
    DESIGN = 'design'
    VIDEO = 'video'

class IntegrationStatus(str, Enum):
    CONNECTED = 'connected'
    DISCONNECTED = 'disconnected'
    ERROR = 'error'
    PENDING = 'pending'

class ExperimentStatus(str, Enum):
    DRAFT = 'draft'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'

# ============================================================================
# CORE USER & STARTUP MODELS
# ============================================================================

class User(db.Model):
    """One user per startup (1:1 relationship)"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128))
    full_name = db.Column(db.String(100), nullable=False)
    mobile = db.Column(db.String(20))
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # One-to-one relationships
    startup = db.relationship('Startup', back_populates='user', uselist=False, cascade='all, delete-orphan')
    submission = db.relationship('Submission', back_populates='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'mobile': self.mobile,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Submission(db.Model):
    """Initial form submitted by user - seeds stage 1-3 data"""
    __tablename__ = 'submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    submission_id = db.Column(db.String(100), unique=True, nullable=False)
    
    # Stage 1: Founder Specifications
    startup_name = db.Column(db.String(200))
    website_url = db.Column(db.String(500))
    founding_year = db.Column(db.Integer)
    number_of_founders = db.Column(db.Integer)
    team_size = db.Column(db.Integer)
    headquarters = db.Column(db.String(200))
    founder_linkedin = db.Column(db.String(500))
    team_description = db.Column(db.Text)
    
    # Stage 2: Product Scope
    company_overview = db.Column(db.Text)
    problem_statement = db.Column(db.Text)
    solution = db.Column(db.Text)
    unique_value_proposition = db.Column(db.Text)
    tech_stack = db.Column(db.Text)  # JSON
    key_features = db.Column(db.Text)  # JSON array
    
    # Stage 3: GTM Scope
    target_market = db.Column(db.Text)
    customer_segments = db.Column(db.Text)  # JSON
    competition = db.Column(db.Text)
    competitive_advantage = db.Column(db.Text)
    pricing_strategy = db.Column(db.Text)
    go_to_market_strategy = db.Column(db.Text)
    
    # Stage 9: Fundraise
    funding_required = db.Column(db.String(100))
    current_stage = db.Column(db.String(50))
    revenue_streams = db.Column(db.Text)
    business_model = db.Column(db.Text)
    pitch_deck_url = db.Column(db.String(500))
    demo_url = db.Column(db.String(500))
    
    status = db.Column(db.String(50), default='pending')
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    
    # Relationships
    user = db.relationship('User', back_populates='submission')
    startup = db.relationship('Startup', back_populates='submission', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'submission_id': self.submission_id,
            'startup_name': self.startup_name,
            'company_overview': self.company_overview,
            'status': self.status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None
        }

class Startup(db.Model):
    """Core startup entity - owns all stage instances"""
    __tablename__ = 'startups'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), unique=True)
    
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, index=True)
    current_stage_key = db.Column(db.String(50), default='founder_specifications')
    overall_progress = db.Column(db.Float, default=0.0)  # 0-100
    
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='startup')
    submission = db.relationship('Submission', back_populates='startup')
    stage_instances = db.relationship('StageInstance', back_populates='startup', cascade='all, delete-orphan')
    documents = db.relationship('Document', back_populates='startup', cascade='all, delete-orphan')
    integrations = db.relationship('Integration', back_populates='startup', cascade='all, delete-orphan')
    
    def initialize_stages(self):
        """Create all 9 stage instances for this startup"""
        stages_config = [
            {'key': 'founder_specifications', 'order': 1},
            {'key': 'product_scope', 'order': 2},
            {'key': 'gtm_scope', 'order': 3},
            {'key': 'product_ux', 'order': 4},
            {'key': 'product_code', 'order': 5},
            {'key': 'test_deploy', 'order': 6},
            {'key': 'share_monitor', 'order': 7},
            {'key': 'monetize_gtm', 'order': 8},
            {'key': 'fundraise', 'order': 9}
        ]
        
        for config in stages_config:
            template = StageTemplate.query.filter_by(key=config['key']).first()
            if template:
                instance = StageInstance(
                    startup_id=self.id,
                    template_id=template.id,
                    stage_key=config['key'],
                    order=config['order'],
                    status=StageStatus.NOT_STARTED
                )
                db.session.add(instance)
        
        db.session.commit()
    
    def compute_progress(self):
        """Calculate overall progress from stage completions"""
        total_stages = len(self.stage_instances)
        if total_stages == 0:
            return 0.0
        
        completed = sum(1 for si in self.stage_instances if si.status == StageStatus.COMPLETED)
        in_progress = sum(si.progress / 100.0 for si in self.stage_instances if si.status == StageStatus.IN_PROGRESS)
        
        return ((completed + in_progress) / total_stages) * 100
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'current_stage_key': self.current_stage_key,
            'overall_progress': self.overall_progress,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ============================================================================
# STAGE TEMPLATE & INSTANCE
# ============================================================================

class StageTemplate(db.Model):
    """Global template defining each of the 9 stages"""
    __tablename__ = 'stage_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    order = db.Column(db.Integer, nullable=False)
    
    # JSON schemas
    form_schema = db.Column(db.Text)  # JSON Schema for dynamic form
    default_checklist = db.Column(db.Text)  # JSON array of default tasks
    default_metrics = db.Column(db.Text)  # JSON array of metric definitions
    acceptance_criteria = db.Column(db.Text)  # JSON array of rules
    
    is_active = db.Column(db.Boolean, default=True)
    version = db.Column(db.String(20), default='1.0')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stage_instances = db.relationship('StageInstance', back_populates='template')
    
    def get_form_schema(self):
        return json.loads(self.form_schema) if self.form_schema else {}
    
    def get_default_checklist(self):
        return json.loads(self.default_checklist) if self.default_checklist else []
    
    def get_default_metrics(self):
        return json.loads(self.default_metrics) if self.default_metrics else []
    
    def get_acceptance_criteria(self):
        return json.loads(self.acceptance_criteria) if self.acceptance_criteria else []
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'description': self.description,
            'order': self.order,
            'form_schema': self.get_form_schema(),
            'default_checklist': self.get_default_checklist(),
            'default_metrics': self.get_default_metrics(),
            'acceptance_criteria': self.get_acceptance_criteria()
        }

class StageInstance(db.Model):
    """Per-startup instance of a stage"""
    __tablename__ = 'stage_instances'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    template_id = db.Column(db.Integer, db.ForeignKey('stage_templates.id'), nullable=False)
    
    stage_key = db.Column(db.String(50), nullable=False, index=True)
    order = db.Column(db.Integer, nullable=False)
    status = db.Column(db.Enum(StageStatus), default=StageStatus.NOT_STARTED)
    progress = db.Column(db.Float, default=0.0)  # 0-100
    
    # Stage-specific data
    form_data = db.Column(db.Text)  # JSON: user-filled form values
    
    # Ownership and dates
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.DateTime)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    # Notes and blockers
    notes = db.Column(db.Text)
    blockers = db.Column(db.Text)  # JSON array
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    startup = db.relationship('Startup', back_populates='stage_instances')
    template = db.relationship('StageTemplate', back_populates='stage_instances')
    tasks = db.relationship('Task', back_populates='stage_instance', cascade='all, delete-orphan')
    metrics = db.relationship('Metric', back_populates='stage_instance', cascade='all, delete-orphan')
    artifacts = db.relationship('Artifact', back_populates='stage_instance', cascade='all, delete-orphan')
    experiments = db.relationship('Experiment', back_populates='stage_instance', cascade='all, delete-orphan')
    
    __table_args__ = (
        db.Index('idx_startup_stage', 'startup_id', 'stage_key'),
    )
    
    def get_form_data(self):
        return json.loads(self.form_data) if self.form_data else {}
    
    def set_form_data(self, data):
        self.form_data = json.dumps(data)
    
    def get_blockers(self):
        return json.loads(self.blockers) if self.blockers else []
    
    def compute_progress(self):
        """Calculate progress from tasks and acceptance criteria"""
        total_tasks = len(self.tasks)
        if total_tasks == 0:
            return 0.0
        
        completed_tasks = sum(1 for t in self.tasks if t.status == TaskStatus.DONE)
        return (completed_tasks / total_tasks) * 100
    
    def check_acceptance_criteria(self):
        """Evaluate all acceptance criteria rules"""
        criteria = self.template.get_acceptance_criteria()
        results = []
        
        for rule in criteria:
            # Simple rule evaluation - extend with JSONLogic or custom evaluator
            passed = self._evaluate_rule(rule)
            results.append({
                'rule': rule,
                'passed': passed
            })
        
        return results
    
    def _evaluate_rule(self, rule):
        """Placeholder for rule evaluation logic"""
        # Implement JSONLogic or custom rule engine
        return True
    
    def to_dict(self, include_details=False):
        data = {
            'id': self.id,
            'stage_key': self.stage_key,
            'name': self.template.name if self.template else self.stage_key,
            'order': self.order,
            'status': self.status.value if isinstance(self.status, Enum) else self.status,
            'progress': self.progress,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'blockers': self.get_blockers()
        }
        
        if include_details:
            data.update({
                'form_data': self.get_form_data(),
                'tasks': [t.to_dict() for t in self.tasks],
                'metrics': [m.to_dict() for m in self.metrics],
                'artifacts': [a.to_dict() for a in self.artifacts],
                'experiments': [e.to_dict() for e in self.experiments],
                'acceptance_criteria': self.check_acceptance_criteria()
            })
        
        return data

# ============================================================================
# TASK MANAGEMENT
# ============================================================================

class Task(db.Model):
    """Checklist items within a stage"""
    __tablename__ = 'tasks'
    
    id = db.Column(db.Integer, primary_key=True)
    stage_instance_id = db.Column(db.Integer, db.ForeignKey('stage_instances.id'), nullable=False)
    
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.TODO)
    priority = db.Column(db.Enum(TaskPriority), default=TaskPriority.P2)
    
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    due_date = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    
    tags = db.Column(db.Text)  # JSON array
    order = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stage_instance = db.relationship('StageInstance', back_populates='tasks')
    
    def get_tags(self):
        return json.loads(self.tags) if self.tags else []
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status.value if isinstance(self.status, Enum) else self.status,
            'priority': self.priority.value if isinstance(self.priority, Enum) else self.priority,
            'assignee_id': self.assignee_id,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'tags': self.get_tags(),
            'order': self.order
        }

# ============================================================================
# METRICS
# ============================================================================

class Metric(db.Model):
    """KPIs tracked per stage"""
    __tablename__ = 'metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    stage_instance_id = db.Column(db.Integer, db.ForeignKey('stage_instances.id'), nullable=False)
    
    key = db.Column(db.String(100), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    value = db.Column(db.Float)
    target = db.Column(db.Float)
    unit = db.Column(db.String(50))
    
    source = db.Column(db.String(100))  # 'manual', 'integration', 'computed'
    source_integration_id = db.Column(db.Integer, db.ForeignKey('integrations.id'))
    
    last_synced_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stage_instance = db.relationship('StageInstance', back_populates='metrics')
    
    __table_args__ = (
        db.Index('idx_stage_metric', 'stage_instance_id', 'key'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'name': self.name,
            'value': self.value,
            'target': self.target,
            'unit': self.unit,
            'source': self.source,
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None
        }

# ============================================================================
# ARTIFACTS
# ============================================================================

class Artifact(db.Model):
    """Documents, files, links attached to stages"""
    __tablename__ = 'artifacts'
    
    id = db.Column(db.Integer, primary_key=True)
    stage_instance_id = db.Column(db.Integer, db.ForeignKey('stage_instances.id'), nullable=False)
    
    title = db.Column(db.String(500), nullable=False)
    artifact_type = db.Column(db.Enum(ArtifactType), nullable=False)
    url = db.Column(db.String(1000))
    file_path = db.Column(db.String(1000))
    
    description = db.Column(db.Text)
    version = db.Column(db.String(50))
    visibility = db.Column(db.String(50), default='private')  # 'private', 'team', 'public'
    
    artifact_metadata = db.Column(db.Text)  # JSON: file size, mime type, etc.
    
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stage_instance = db.relationship('StageInstance', back_populates='artifacts')
    
    def get_metadata(self):
        return json.loads(self.artifact_metadata) if self.artifact_metadata else {}
    
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'type': self.artifact_type.value if isinstance(self.artifact_type, Enum) else self.artifact_type,
            'url': self.url,
            'description': self.description,
            'version': self.version,
            'visibility': self.visibility,
            'metadata': self.get_metadata(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# ============================================================================
# EXPERIMENTS (GTM)
# ============================================================================

class Experiment(db.Model):
    """GTM experiments tracked per stage"""
    __tablename__ = 'experiments'
    
    id = db.Column(db.Integer, primary_key=True)
    stage_instance_id = db.Column(db.Integer, db.ForeignKey('stage_instances.id'), nullable=False)
    
    name = db.Column(db.String(200), nullable=False)
    hypothesis = db.Column(db.Text)
    status = db.Column(db.Enum(ExperimentStatus), default=ExperimentStatus.DRAFT)
    
    metric_keys = db.Column(db.Text)  # JSON array of metric keys to track
    results = db.Column(db.Text)  # JSON: outcome data
    learnings = db.Column(db.Text)
    
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stage_instance = db.relationship('StageInstance', back_populates='experiments')
    
    def get_metric_keys(self):
        return json.loads(self.metric_keys) if self.metric_keys else []
    
    def get_results(self):
        return json.loads(self.results) if self.results else {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'hypothesis': self.hypothesis,
            'status': self.status.value if isinstance(self.status, Enum) else self.status,
            'metric_keys': self.get_metric_keys(),
            'results': self.get_results(),
            'learnings': self.learnings,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

# ============================================================================
# INTEGRATIONS
# ============================================================================

class Integration(db.Model):
    """Third-party tool connections per startup"""
    __tablename__ = 'integrations'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    
    integration_type = db.Column(db.String(100), nullable=False)  # 'github', 'figma', 'ga4', etc.
    status = db.Column(db.Enum(IntegrationStatus), default=IntegrationStatus.PENDING)
    
    config = db.Column(db.Text)  # JSON: API keys, scopes, etc. (encrypted)
    scopes = db.Column(db.Text)  # JSON array
    
    last_synced_at = db.Column(db.DateTime)
    connected_at = db.Column(db.DateTime)
    error_message = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    startup = db.relationship('Startup', back_populates='integrations')
    
    def get_config(self):
        return json.loads(self.config) if self.config else {}
    
    def get_scopes(self):
        return json.loads(self.scopes) if self.scopes else []
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.integration_type,
            'status': self.status.value if isinstance(self.status, Enum) else self.status,
            'scopes': self.get_scopes(),
            'last_synced_at': self.last_synced_at.isoformat() if self.last_synced_at else None,
            'connected_at': self.connected_at.isoformat() if self.connected_at else None,
            'error_message': self.error_message
        }

# ============================================================================
# DOCUMENTS (LEGACY - Keep for backward compatibility)
# ============================================================================

class Document(db.Model):
    """Legacy document model - can migrate to Artifacts"""
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    document_type = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    file_path = db.Column(db.String(1000), nullable=False)
    file_size = db.Column(db.Integer)
    
    stage = db.Column(db.String(50))
    tags = db.Column(db.Text)  # JSON
    
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    startup = db.relationship('Startup', back_populates='documents')
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_type': self.document_type,
            'title': self.title,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'stage': self.stage,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
