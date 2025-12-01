from flask_sqlalchemy import SQLAlchemy
from flask_session import Session
from celery import Celery
from authlib.integrations.flask_client import OAuth

db = SQLAlchemy()
sess = Session()
celery = Celery(__name__, include=['app.tasks'])
oauth = OAuth()
redis_client = None # Initialize as None, will be set in create_app
