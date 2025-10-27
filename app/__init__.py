from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from app.config import config
import os

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "allow_headers": ["Content-Type", "Authorization"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    })
    
    # Ensure directories exist
    os.makedirs(app.config['DOCUMENTS_DIR'], exist_ok=True)
    
    # Register blueprints
    from app.routes import auth_bp, submissions_bp, dashboard_bp, documents_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(submissions_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(documents_bp, url_prefix='/api')
    
    # Health check route
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy'}, 200
    
    return app
