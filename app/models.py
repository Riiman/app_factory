from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from enum import Enum
class UserRole(Enum):
    """Defines the roles a user can have within the application."""
    USER = "user"
    ADMIN = "admin"

class SubmissionStatus(Enum):
    PENDING = 'PENDING'
    IN_REVIEW = 'IN_REVIEW'
    APPROVED = 'APPROVED'
    REJECTED = 'REJECTED'
    COMPLETED = 'COMPLETED'

class StartupStatus(Enum):
    """Defines the operational status of a startup within the incubator program."""
    INACTIVE = "inactive"
    ACTIVE = "active"
    INCUBATING = "incubating"
    GRADUATED = "graduated"
    ARCHIVED = "archived"

    def __str__(self):
        return self.value

class StartupStage(Enum):
    """Represents the current stage of a startup in its lifecycle within the program."""
    EVALUATION = "EVALUATION"
    SCOPING = "SCOPING"
    CONTRACT = "CONTRACT"
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

    def __str__(self):
        return self.value

class ArtifactType(Enum):
    """Specifies the type of an artifact, e.g., file, link, or text content."""
    FILE = "file"
    LINK = "link"
    TEXT = "text"

    def __str__(self):
        return self.value

class TaskStatus(Enum):
    """Indicates the current status of a task."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

    def __str__(self):
        return self.value

class RequestStatus(Enum):
    """Represents the status of a request, e.g., for resources or mentorship."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

    def __str__(self):
        return self.value

class ExperimentStatus(Enum):
    """Describes the current state of an experiment."""
    PLANNED = "planned"
    RUNNING = "running"
    COMPLETED = "completed"

    def __str__(self):
        return self.value

class ProductStage(Enum):
    """Indicates the development stage of a product."""
    CONCEPT = "concept"
    DEVELOPMENT = "development"
    BETA = "beta"
    LIVE = "live"

    def __str__(self):
        return self.value

class Scope(Enum):
    """Defines the functional area or domain a task, experiment, or artifact belongs to."""
    PRODUCT = "product"
    BUSINESS = "business"
    FUNDRAISE = "fundraise"
    MARKETING = "marketing"
    GENERAL = "general"

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='tasks')

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
    """Represents a digital artifact (file, link, text) associated with a startup or other entities."""
    __tablename__ = 'artifacts'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    scope = db.Column(db.Enum(Scope), default=Scope.GENERAL, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    type = db.Column(db.Enum(ArtifactType), nullable=False)
    location = db.Column(db.Text, nullable=False) # URL for links, file path for files, or content for text
    linked_to_id = db.Column(db.Integer) # ID of the linked entity (e.g., Task, Experiment, FundingRound)
    linked_to_type = db.Column(db.String(50)) # Type of the linked entity (e.g., 'task', 'experiment', 'funding_round')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    startup = db.relationship('Startup', back_populates='artifacts')

    def to_dict(self):
        return {
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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
        return {
            'id': self.id,
            'firebase_uid': self.firebase_uid,
            'email': self.email,
            'phone_number': self.phone_number,
            'email_verified': self.email_verified,
            'phone_verified': self.phone_verified,
            'full_name': self.full_name,
            'is_verified': self.is_verified,
            'role': self.role.name,
            'created_at': self.created_at.isoformat(),
            'startup_id': startup.id if startup else None
        }

class Startup(db.Model):
    """Represents a startup being incubated, linking to various operational and strategic details."""
    __tablename__ = 'startups'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    submission_id = db.Column(db.Integer, db.ForeignKey('submissions.id'), unique=True, nullable=False)
    
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    status = db.Column(db.Enum(StartupStatus), default=StartupStatus.ACTIVE, nullable=False)
    overall_progress = db.Column(db.Float, default=0.0)
    current_stage = db.Column(db.Enum(StartupStage), default=StartupStage.EVALUATION, nullable=False)
    next_milestone = db.Column(db.String(255), nullable=True)
    recent_activity = db.Column(db.JSON, nullable=True) # Store as JSON array of strings
    
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
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None,
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
            })
        return data

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
    
    startup = db.relationship('Startup', back_populates='products')
    features = db.relationship('Feature', back_populates='product', lazy=True, cascade='all, delete-orphan')
    product_metrics = db.relationship('ProductMetric', back_populates='product', lazy=True, cascade='all, delete-orphan')
    product_issues = db.relationship('ProductIssue', back_populates='product', lazy=True, cascade='all, delete-orphan')
    business_details = db.relationship('ProductBusinessDetails', back_populates='product', uselist=False, cascade='all, delete-orphan')
    marketing_campaigns = db.relationship('MarketingCampaign', back_populates='product', lazy=True)

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
        }

class Feature(db.Model):
    """Represents a specific feature of a product."""
    __tablename__ = 'features'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    acceptance_criteria = db.Column(db.Text, nullable=True)

    product = db.relationship('Product', back_populates='features')

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'name': self.name,
            'description': self.description,
            'acceptance_criteria': self.acceptance_criteria,
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

class ProductBusinessDetails(db.Model):
    """Details the business aspects specific to a product, such as pricing and target customers."""
    __tablename__ = 'product_business_details'
    product_business_id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), unique=True, nullable=False)
    pricing_model = db.Column(db.String(255), nullable=True)
    target_customer = db.Column(db.Text, nullable=True)
    revenue_streams = db.Column(db.Text, nullable=True)
    distribution_channels = db.Column(db.Text, nullable=True)
    cost_structure = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = db.relationship('Product', back_populates='business_details')

    def to_dict(self):
        return {
            'product_business_id': self.product_business_id,
            'product_id': self.product_id,
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

    startup = db.relationship('Startup', back_populates='marketing_overview')

    def to_dict(self):
        return {
            'marketing_id': self.marketing_id,
            'startup_id': self.startup_id,
            'positioning_statement': self.positioning_statement,
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
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
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
    channel = db.Column(db.String(100), nullable=True)
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
            'channel': self.channel,
            'publish_date': self.publish_date.isoformat() if self.publish_date else None,
            'status': str(self.status),
            'performance': self.performance,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
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



class Investor(db.Model):
    """Represents an investor who has participated in funding rounds."""
    __tablename__ = 'investors'
    investor_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    firm_name = db.Column(db.String(255), nullable=True)
    type = db.Column(db.String(50), nullable=True) # Angel, VC, Fund, Accelerator
    email = db.Column(db.String(255), nullable=True)
    website = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    rounds = db.relationship('RoundInvestor', back_populates='investor')

    def to_dict(self):
        return {
            'investor_id': self.investor_id,
            'name': self.name,
            'firm_name': self.firm_name,
            'type': self.type,
            'email': self.email,
            'website': self.website,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class RoundInvestor(db.Model):
    """Link table between FundingRound and Investor."""
    __tablename__ = 'round_investors'
    round_id = db.Column(db.Integer, db.ForeignKey('funding_rounds.round_id'), primary_key=True)
    investor_id = db.Column(db.Integer, db.ForeignKey('investors.investor_id'), primary_key=True)
    amount_invested = db.Column(db.Numeric(15,2), nullable=True)
    
    funding_round = db.relationship('FundingRound', back_populates='investors')
    investor = db.relationship('Investor', back_populates='rounds')

    def to_dict(self):
        return {
            'round_id': self.round_id,
            'investor_id': self.investor_id,
            'amount_invested': float(self.amount_invested) if self.amount_invested is not None else None,
            'investor_name': self.investor.name,
            'firm_name': self.investor.firm_name
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
    startup = db.relationship('Startup', back_populates='submission', uselist=False)
    
    # New relationships for pre-admission stages
    evaluation_tasks = db.relationship('EvaluationTask', order_by=EvaluationTask.id, back_populates='submission', cascade="all, delete-orphan")

    def to_dict(self):
        data = {
            'id': self.id,
            'user_id': self.user_id,
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
    
    startup = db.relationship('Startup', back_populates='contract')
    signatories = db.relationship('ContractSignatory', back_populates='contract', cascade="all, delete-orphan")
    comments = db.relationship('ContractComment', back_populates='contract', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'title': self.title,
            'content': self.content,
            'document_url': self.document_url,
            'status': self.status.name,
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
