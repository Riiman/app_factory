
# Environment Setup Guide

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn
- Azure OpenAI account with API access

## Quick Setup

### Automated Setup (Recommended)

**Linux/Mac:**
```bash
chmod +x setup.sh
./setup.sh
```
Windows:
setup.bat
Manual Setup
1.
Create Environment File
bash
cp .env.example .env
2.
Edit .env File
Open .env and configure the following required variables:
bash
# Required
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=your-azure-openai-endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
3.
Create Virtual Environment
bash
python -m venv venv
4.
Activate Virtual Environment
Linux/Mac:
bash
source venv/bin/activate
Windows:
venv\Scripts\activate
5.
Install Python Dependencies
bash
pip install -r requirements.txt
6.
Initialize Database
bash
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()"
7.
Install Frontend Dependencies
bash
npm install
8.
Validate Configuration
bash
python validate_env.py
## Configuration Details
Required Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret key for session management | `your-secret-key-123` |
| `JWT_SECRET_KEY` | Secret key for JWT token generation | `jwt-secret-456` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key | `abc123...` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint 
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL | `https://your-resource.openai.azure.com/` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Your deployment model name | `gpt-4` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `sqlite:///turning_ideas.db` |
| `MAIL_USERNAME` | Email account for notifications | None |
| `MAIL_PASSWORD` | Email account password | None |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` |
| `BACKEND_URL` | Backend API URL | `http://localhost:5000` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |

## Getting Azure OpenAI Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy:
   - **KEY 1** or **KEY 2** → `AZURE_OPENAI_API_KEY`
   - **Endpoint** → `AZURE_OPENAI_ENDPOINT`
5. Go to "Model deployments" to find your deployment name → `AZURE_OPENAI_DEPLOYMENT_NAME`

## Email Configuration (Optional)

For Gmail:
1. Enable 2-Factor Authentication
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password in `MAIL_PASSWORD`

```bash
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-specific-password
Database Configuration
Development (SQLite - Default)
bash
DATABASE_URL=sqlite:///turning_ideas.db
Production (PostgreSQL)
bash
DATABASE_URL=postgresql://username:password@localhost:5432/turning_ideas
Running the Application
Backend
bash
# Activate virtual environment first
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Run Flask server
python run.py
Frontend
bash
# In a separate terminal
npm start
Troubleshooting
Issue: "Module not found" errors
Solution: Ensure virtual environment is activated and dependencies are installed
bash
source venv/bin/activate
pip install -r requirements.txt
Issue: Database errors
Solution: Reinitialize the database
bash
python -c "from app import create_app, db; app = create_app(); app.app_context().push(); db.drop_all(); db.create_all()"
Issue: CORS errors in browser
Solution: Check CORS_ORIGINS in .env matches your frontend URL
Issue: Azure OpenAI authentication errors
Solution: Verify your credentials:
bash
python validate_env.py
Security Best Practices
1.
Never commit `.env` file - It's in .gitignore by default
2.
Use strong secret keys - Generate with:
import secrets
print(secrets.token_hex(32))
3.
Rotate keys regularly in production
4.
Use environment-specific configurations - Different keys for dev/staging/prod
5.
Enable HTTPS in production (set SESSION_COOKIE_SECURE=True)
Production Deployment
For production deployment, ensure:
1.
Set FLASK_ENV=production
2.
Use PostgreSQL instead of SQLite
3.
Set strong, unique secret keys
4.
Enable HTTPS
5.
Configure proper CORS origins
6.
Set up proper logging
7.
Use environment variables from your hosting platform (not .env file)
Example production .env:
bash
FLASK_ENV=production
SECRET_KEY=<strong-random-key>
JWT_SECRET_KEY=<strong-random-key>
DATABASE_URL=postgresql://user:pass@host:5432/db
FRONTEND_URL=https://app.turningideas.in
BACKEND_URL=https://api.turningideas.in
SESSION_COOKIE_SECURE=True

### 3.14 Create environment configuration helper:

```python
# File: /home/rimanshu/Desktop/Turning Idea/app/utils/config_helper.py

import os
from typing import Any, Optional

class ConfigHelper:
    """Helper class for accessing configuration values"""
    
    @staticmethod
    def get_env(key: str, default: Any = None, required: bool = False) -> Any:
        """
        Get environment variable with optional default and required check
        
        Args:
            key: Environment variable name
            default: Default value if not found
            required: If True, raises error if not found
            
        Returns:
            Environment variable value or default
            
        Raises:
            ValueError: If required=True and variable not found
        """
        value = os.getenv(key, default)
        
        if required and value is None:
            raise ValueError(f"Required environment variable '{key}' is not set")
        
        return value
    
    @staticmethod
    def get_bool(key: str, default: bool = False) -> bool:
        """Get boolean environment variable"""
        value = os.getenv(key, str(default))
        return value.lower() in ('true', '1', 'yes', 'on')
    
    @staticmethod
    def get_int(key: str, default: int = 0) -> int:
        """Get integer environment variable"""
        value = os.getenv(key, str(default))
        try:
            return int(value)
        except ValueError:
            return default
    
    @staticmethod
    def get_list(key: str, separator: str = ',', default: Optional[list] = None) -> list:
        """Get list from comma-separated environment variable"""
        value = os.getenv(key)
        if not value:
            return default or []
        return [item.strip() for item in value.split(separator) if item.strip()]
    
    @staticmethod
    def is_production() -> bool:
        """Check if running in production environment"""
        return os.getenv('FLASK_ENV', 'development') == 'production'
    
    @staticmethod
    def is_development() -> bool:
        """Check if running in development environment"""
        return os.getenv('FLASK_ENV', 'development') == 'development'
    
    @staticmethod
    def is_testing() -> bool:
        """Check if running in testing environment"""
        return os.getenv('FLASK_ENV', 'development') == 'testing'
3.15 Create a constants file for application-wide constants:
constants.py
Apply

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
