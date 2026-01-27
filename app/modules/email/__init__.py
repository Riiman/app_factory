from flask import Blueprint

# Define the Blueprint
email_bp = Blueprint('email', __name__, url_prefix='/api/email')

# Import routes to register them with the Blueprint
from . import routes
