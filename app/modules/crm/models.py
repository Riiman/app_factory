from app.extensions import db
from datetime import datetime
from enum import Enum

class CrmLifecycleStage(Enum):
    SUBSCRIBER = "SUBSCRIBER"
    LEAD = "LEAD"
    MARKETING_QUALIFIED_LEAD = "MQL"
    SALES_QUALIFIED_LEAD = "SQL"
    OPPORTUNITY = "OPPORTUNITY"
    CUSTOMER = "CUSTOMER"
    EVANGELIST = "EVANGELIST"
    OTHER = "OTHER"

    def __str__(self):
        return self.value

class CrmLeadStatus(Enum):
    NEW = "NEW"
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    OPEN_DEAL = "OPEN_DEAL"
    UNQUALIFIED = "UNQUALIFIED"
    ATTEMPTED_TO_CONTACT = "ATTEMPTED_TO_CONTACT"
    CONNECTED = "CONNECTED"
    BAD_TIMING = "BAD_TIMING"

    def __str__(self):
        return self.value

class CrmDealStage(Enum):
    APPOINTMENT_SCHEDULED = "APPOINTMENT_SCHEDULED"
    QUALIFIED_TO_BUY = "QUALIFIED_TO_BUY"
    PRESENTATION_SCHEDULED = "PRESENTATION_SCHEDULED"
    DECISION_MAKER_BOUGHT_IN = "DECISION_MAKER_BOUGHT_IN"
    CONTRACT_SENT = "CONTRACT_SENT"
    CLOSED_WON = "CLOSED_WON"
    CLOSED_LOST = "CLOSED_LOST"

    def __str__(self):
        return self.value

class CrmCompany(db.Model):
    __tablename__ = 'crm_companies'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    domain_name = db.Column(db.String(255), nullable=True)
    industry = db.Column(db.String(100), nullable=True)
    about_us = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Assigned owner
    
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contacts = db.relationship('CrmContact', back_populates='company')
    deals = db.relationship('CrmDeal', back_populates='company')
    
    startup = db.relationship('Startup', backref=db.backref('crm_companies', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'name': self.name,
            'domain_name': self.domain_name,
            'industry': self.industry,
            'about_us': self.about_us,
            'city': self.city,
            'state': self.state,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class CrmContact(db.Model):
    __tablename__ = 'crm_contacts'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('crm_companies.id'), nullable=True)
    
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    job_title = db.Column(db.String(100), nullable=True)
    
    lifecycle_stage = db.Column(db.Enum(CrmLifecycleStage), default=CrmLifecycleStage.LEAD)
    lead_status = db.Column(db.Enum(CrmLeadStatus), default=CrmLeadStatus.NEW)
    
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = db.relationship('CrmCompany', back_populates='contacts')
    deals = db.relationship('CrmDeal', back_populates='contact')
    interactions = db.relationship('CrmInteraction', back_populates='contact', cascade='all, delete-orphan')

    startup = db.relationship('Startup', backref=db.backref('crm_contacts', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'job_title': self.job_title,
            'lifecycle_stage': self.lifecycle_stage.value,
            'lead_status': self.lead_status.value,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class CrmDeal(db.Model):
    __tablename__ = 'crm_deals'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    
    # Can be associated with a contact OR a company OR both
    contact_id = db.Column(db.Integer, db.ForeignKey('crm_contacts.id'), nullable=True)
    company_id = db.Column(db.Integer, db.ForeignKey('crm_companies.id'), nullable=True)
    
    name = db.Column(db.String(255), nullable=False) # Deal Name
    amount = db.Column(db.Numeric(15,2), nullable=True)
    stage = db.Column(db.Enum(CrmDealStage), default=CrmDealStage.APPOINTMENT_SCHEDULED)
    close_date = db.Column(db.Date, nullable=True)
    
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    contact = db.relationship('CrmContact', back_populates='deals')
    company = db.relationship('CrmCompany', back_populates='deals')

    startup = db.relationship('Startup', backref=db.backref('crm_deals', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'contact_id': self.contact_id,
            'contact_name': f"{self.contact.first_name} {self.contact.last_name}" if self.contact else None,
            'company_id': self.company_id,
            'company_name': self.company.name if self.company else None,
            'name': self.name,
            'amount': float(self.amount) if self.amount else 0,
            'stage': self.stage.value,
            'close_date': self.close_date.isoformat() if self.close_date else None,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

class InteractionType(Enum):
    NOTE = "NOTE"
    EMAIL = "EMAIL"
    CALL = "CALL"
    MEETING = "MEETING"

    def __str__(self):
        return self.value

class CrmInteraction(db.Model):
    __tablename__ = 'crm_interactions'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey('crm_contacts.id'), nullable=False)
    
    type = db.Column(db.Enum(InteractionType), default=InteractionType.NOTE)
    content = db.Column(db.Text, nullable=True) # The note content or email body summary
    
    # Provision for future email integration
    email_message_id = db.Column(db.String(255), nullable=True) 
    
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contact = db.relationship('CrmContact', back_populates='interactions')
    creator = db.relationship('User')

    startup = db.relationship('Startup', backref=db.backref('crm_interactions', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'startup_id': self.startup_id,
            'contact_id': self.contact_id,
            'type': self.type.value,
            'content': self.content,
            'created_by': self.created_by,
            'creator_name': self.creator.full_name if self.creator else None,
            'created_at': self.created_at.isoformat()
        }

class CrmList(db.Model):
    __tablename__ = 'crm_lists'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship('CrmContact', secondary='crm_list_memberships', backref='lists')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'member_count': len(self.members)
        }

class CrmListMembership(db.Model):
    __tablename__ = 'crm_list_memberships'
    list_id = db.Column(db.Integer, db.ForeignKey('crm_lists.id'), primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('crm_contacts.id'), primary_key=True)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

class SyncRuleType(Enum):
    DOMAIN = "DOMAIN"
    EMAIL = "EMAIL"
    SUBJECT = "SUBJECT"

class CrmSyncRule(db.Model):
    __tablename__ = 'crm_sync_rules'
    id = db.Column(db.Integer, primary_key=True)
    startup_id = db.Column(db.Integer, db.ForeignKey('startups.id'), nullable=False)
    rule_type = db.Column(db.Enum(SyncRuleType), nullable=False)
    value = db.Column(db.String(255), nullable=False) # The domain, email, or keyword
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'rule_type': self.rule_type.value,
            'value': self.value
        }
