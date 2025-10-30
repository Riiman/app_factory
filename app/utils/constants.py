
"""Application-wide constants"""

# Startup Status
class StartupStatus:
    NOT_STARTED = 'not_started'
    IN_PROGRESS = 'in_progress'
    SUBMITTED = 'submitted'
    UNDER_REVIEW = 'under_review'
    ACCEPTED = 'accepted'
    REJECTED = 'rejected'
    
    ALL = [NOT_STARTED, IN_PROGRESS, SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED]


# Document Types
class DocumentType:
    PRODUCT_SCOPE = 'product_scope'
    GTM_STRATEGY = 'gtm_strategy'
    FINANCIAL_PROJECTIONS = 'financial_projections'
    TECHNICAL_ARCHITECTURE = 'technical_architecture'
    
    ALL = [PRODUCT_SCOPE, GTM_STRATEGY, FINANCIAL_PROJECTIONS, TECHNICAL_ARCHITECTURE]


# User Roles
class UserRole:
    FOUNDER = 'founder'
    ADMIN = 'admin'
    MENTOR = 'mentor'
    
    ALL = [FOUNDER, ADMIN, MENTOR]


# Evaluation Stages
class EvaluationStage:
    BASIC_INFO = 1
    PROBLEM_SOLUTION = 2
    PRODUCT_TECH = 3
    MARKET_COMPETITION = 4
    BUSINESS_MODEL = 5
    TEAM_TRACTION = 6
    
    TOTAL_STAGES = 6
    
    STAGE_NAMES = {
        1: 'Basic Information',
        2: 'Problem & Solution',
        3: 'Product & Technology',
        4: 'Market & Competition',
        5: 'Business Model',
        6: 'Team & Traction'
    }


# File Upload
class FileUpload:
    MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB
    ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg'}
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg'
    }


# Email Templates
class EmailTemplate:
    WELCOME = 'welcome'
    VERIFICATION = 'verification'
    PASSWORD_RESET = 'password_reset'
    SUBMISSION_RECEIVED = 'submission_received'
    APPLICATION_ACCEPTED = 'application_accepted'
    APPLICATION_REJECTED = 'application_rejected'


# API Response Messages
class ResponseMessage:
    SUCCESS = 'Operation completed successfully'
    CREATED = 'Resource created successfully'
    UPDATED = 'Resource updated successfully'
    DELETED = 'Resource deleted successfully'
    NOT_FOUND = 'Resource not found'
    UNAUTHORIZED = 'Unauthorized access'
    FORBIDDEN = 'Access forbidden'
    BAD_REQUEST = 'Invalid request data'
    INTERNAL_ERROR = 'Internal server error'
    VALIDATION_ERROR = 'Validation error'


# Pagination
class Pagination:
    DEFAULT_PAGE = 1
    DEFAULT_PER_PAGE = 10
    MAX_PER_PAGE = 100


# Cache Keys
class CacheKey:
    USER_PREFIX = 'user:'
    STARTUP_PREFIX = 'startup:'
    DOCUMENT_PREFIX = 'document:'
    STATS_PREFIX = 'stats:'
    
    @staticmethod
    def user(user_id: int) -> str:
        return f"{CacheKey.USER_PREFIX}{user_id}"
    
    @staticmethod
    def startup(startup_id: int) -> str:
        return f"{CacheKey.STARTUP_PREFIX}{startup_id}"
    
    @staticmethod
    def document(doc_id: int) -> str:
        return f"{CacheKey.DOCUMENT_PREFIX}{doc_id}"
