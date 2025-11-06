from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from .config import Config
from authlib.integrations.flask_client import OAuth
from flask_session import Session
import logging
import os
from datetime import timedelta

logging.basicConfig(level=logging.DEBUG)

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()
oauth = OAuth()
sess = Session()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure server-side sessions
    app.config['SESSION_TYPE'] = 'sqlalchemy'
    app.config['SESSION_SQLALCHEMY'] = db
    app.config['SESSION_PERMANENT'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    oauth.init_app(app)
    sess.init_app(app)
    CORS(app, supports_credentials=True)

    # Only call db.create_all() if not in a migration context
    # Flask-Migrate will handle table creation/upgrades
    with app.app_context():
        if not app.config.get('ALEMBIC_CONTEXT'):
            db.create_all() # Create sessions table if it doesn't exist

    @app.before_request
    def log_request_info():
        app.logger.debug('Headers: %s', request.headers)
        app.logger.debug('Body: %s', request.get_data())

    with app.app_context():
    from .routes.auth import auth_bp
    from .routes.submissions import submissions_bp
    from .routes.startups import startups_bp
    from .routes.stages import stages_bp
    from .routes.admin import admin_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(submissions_bp)
    app.register_blueprint(startups_bp)
    app.register_blueprint(stages_bp)
    app.register_blueprint(admin_bp)

    return app