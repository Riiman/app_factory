# import trio
# import eventlet
# eventlet.monkey_patch()

from app import create_app
from app.extensions import celery as celery_instance
from config import get_config

# The Celery command line tool needs to be able to find this 'celery' object.
# We create the Flask app, which in turn configures the shared celery_instance
# via the configure_celery() function called within create_app().
app = create_app(get_config())

# Expose the configured Celery instance as a top-level variable named 'celery'
celery = celery_instance