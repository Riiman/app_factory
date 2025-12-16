from flask_sqlalchemy import SQLAlchemy
from flask_session import Session
from celery import Celery
from authlib.integrations.flask_client import OAuth
from flask_socketio import SocketIO
from flask_mail import Mail

db = SQLAlchemy()
sess = Session()
celery = Celery(__name__, include=['app.tasks'])
oauth = OAuth()
socketio = SocketIO(cors_allowed_origins="*") # Allow all origins for dev
mail = Mail()
redis_client = None # Initialize as None, will be set in create_app
