from flask import Flask
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_mail import Mail
from flask_cors import CORS
from .config import Config
from authlib.integrations.flask_client import OAuth
import logging
import os
import firebase_admin
from firebase_admin import credentials

from .extensions import db, sess, celery, oauth
from .celery_utils import configure_celery

# Configure logging
logging.basicConfig(level=logging.DEBUG)

migrate = Migrate()
jwt = JWTManager()
mail = Mail()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        firebase_cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
        if firebase_cred_path and os.path.exists(firebase_cred_path):
            cred = credentials.Certificate(firebase_cred_path)
            firebase_admin.initialize_app(cred)
            app.logger.info("Firebase Admin SDK initialized.")
        else:
            app.logger.error("Firebase service account path not found or invalid. Firebase Admin SDK not initialized.")
            raise RuntimeError("Firebase Admin SDK not initialized. Check FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.")

    # Configure server-side sessions to use our db instance
    app.config['SESSION_TYPE'] = 'sqlalchemy'
    app.config['SESSION_SQLALCHEMY'] = db

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    oauth.init_app(app)
    sess.init_app(app)
    cors_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000'])
    CORS(app, supports_credentials=True, origins=cors_origins)

    # Configure the shared Celery instance
    configure_celery(app)

    with app.app_context():
        from .routes.auth import auth_bp
        from .routes.submissions import submissions_bp
        from .routes.startups import startups_bp
        from .routes.stages import stages_bp
        from .routes.admin import admin_bp
        from .routes.admin_scope import admin_scope_bp
        from .routes.admin_contract import admin_contract_bp
        app.register_blueprint(auth_bp)
        app.register_blueprint(submissions_bp)
        app.register_blueprint(startups_bp)
        app.register_blueprint(stages_bp)
        app.register_blueprint(admin_bp)
        app.register_blueprint(admin_scope_bp)
        app.register_blueprint(admin_contract_bp)

        # Import tasks so that they are registered with Celery
        from . import tasks

    return app