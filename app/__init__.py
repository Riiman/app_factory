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

from .extensions import db, sess, celery, oauth, redis_client, mail
from .celery_utils import configure_celery
import redis

# Configure logging
logging.basicConfig(level=logging.DEBUG)

migrate = Migrate()
jwt = JWTManager()

def create_app(config_class=Config):
    # Serve static files from the root 'static' directory, not 'app/static'
    app = Flask(__name__, static_folder='../static')
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
    # app.config['SESSION_TYPE'] = 'sqlalchemy'
    # app.config['SESSION_SQLALCHEMY'] = db

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    oauth.init_app(app)
    # sess.init_app(app)
    cors_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000'])
    CORS(app, supports_credentials=True, origins=cors_origins)
    
    from .extensions import socketio
    if not os.environ.get('FLASK_DB_CREATION'):
        socketio.init_app(app, cors_allowed_origins="*", async_mode='gevent', message_queue='redis://localhost:6379/0')

    # Configure the shared Celery instance
    configure_celery(app)

    # Initialize Redis
    # Use the same settings as in websocket_server.py
    from . import extensions
    extensions.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    app.extensions['redis'] = extensions.redis_client


    with app.app_context():
        from .routes.auth import auth_bp
        from .routes.submissions import submissions_bp
        from .routes.startups import startups_bp
        from .routes.stages import stages_bp
        from .routes.admin import admin_bp
        from .routes.admin_scope import admin_scope_bp
        from .routes.admin_contract import admin_contract_bp
        from .routes.notifications import notifications_bp
        app.register_blueprint(auth_bp)

        app.register_blueprint(submissions_bp)
        app.register_blueprint(startups_bp)
        
        # Register separated services
        from .modules.marketing.routes import marketing_bp
        from .modules.product.routes import product_bp

        from .modules.business.routes import business_bp
        from .modules.business.models_routes import business_models_bp
        from .modules.fundraising.routes import fundraising_bp
        from .modules.dashboard.routes import dashboard_bp
        
        app.register_blueprint(marketing_bp)
        app.register_blueprint(product_bp)
        app.register_blueprint(business_bp)
        app.register_blueprint(business_models_bp)
        app.register_blueprint(fundraising_bp)
        app.register_blueprint(dashboard_bp)
        app.register_blueprint(stages_bp)
        app.register_blueprint(admin_bp)
        app.register_blueprint(admin_scope_bp)

        app.register_blueprint(admin_contract_bp)
        app.register_blueprint(notifications_bp)

        from .routes.contact import contact_bp
        app.register_blueprint(contact_bp)

        # Email Module
        from .modules.email.routes import email_bp
        app.register_blueprint(email_bp)

        # Accounting Module
        from .routes.accounting import accounting_bp
        app.register_blueprint(accounting_bp)

        # CRM Module
        from .modules.crm.routes import crm_bp
        app.register_blueprint(crm_bp)
        
        # Analytics Module
        from .routes.analytics import analytics_bp
        app.register_blueprint(analytics_bp)

        # OAuth Providers
        oauth.register(
            name='google',
            client_id=os.getenv('GOOGLE_CLIENT_ID'),
            client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={'scope': 'openid email profile https://mail.google.com/'},
        )
        
        oauth.register(
            name='microsoft',
            client_id=os.getenv('MICROSOFT_CLIENT_ID'),
            client_secret=os.getenv('MICROSOFT_CLIENT_SECRET'),
            access_token_url='https://login.microsoftonline.com/common/oauth2/v2.0/token',
            authorize_url='https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            api_base_url='https://graph.microsoft.com/v1.0/',
            client_kwargs={'scope': 'User.Read Mail.ReadWrite Mail.Send offline_access'},
        )

        from .startup_builder import builder_bp
        from .startup_builder import builder_bp
        app.register_blueprint(builder_bp)
        
        # Register V4 routes
        from .routes.v4_builder import v4_builder
        app.register_blueprint(v4_builder)

        # Register Organization routes
        from .routes.organization import organization_bp
        app.register_blueprint(organization_bp)



        from .services.chatbot.routes import ai_bp
        app.register_blueprint(ai_bp)
        
        # Import sockets to register events
        from .startup_builder import sockets


        # Import tasks so that they are registered with Celery
        from . import tasks
    
    # Register cleanup handler for server shutdown
    # DISABLED: This cleanup is too aggressive - it stops containers even on server restart
    # Users should manually stop containers via the UI when needed
    # import atexit
    # def cleanup_containers_on_shutdown():
    #     """Cleanup all Docker containers when server stops."""
    #     try:
    #         from .startup_builder.manager import DockerManager
    #         from .models import Startup
    #         from sqlalchemy.exc import OperationalError
    #         
    #         with app.app_context():
    #             try:
    #                     manager = DockerManager()
    #                     startups = Startup.query.filter(Startup.container_name.isnot(None)).all()
    #                     
    #                     for startup in startups:
    #                         try:
    #                             print(f"Cleaning up container {startup.container_name} for startup {startup.id}")
    #                             manager.cleanup_container(startup.container_name)
    #                             startup.container_name = None
    #                         except Exception as e:
    #                             print(f"Error cleaning up container {startup.container_name}: {e}")
    #                     
    #                     db.session.commit()
    #                     print("Container cleanup completed")
    #             except OperationalError as e:
    #                 # Column doesn't exist yet (during migration)
    #                 if "no such column" in str(e):
    #                     print("Skipping container cleanup - database migration pending")
    #                 else:
    #                     raise
    #     except Exception as e:
    #         print(f"Error during container cleanup: {e}")
    # 
    # atexit.register(cleanup_containers_on_shutdown)

    return app