from flask import Blueprint

auth_bp = Blueprint('auth', __name__)
submissions_bp = Blueprint('submissions', __name__)
dashboard_bp = Blueprint('dashboard', __name__)
documents_bp = Blueprint('documents', __name__)

from app.routes import auth, submissions, dashboard, documents
