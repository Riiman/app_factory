from app import create_app
from app.extensions import celery as celery_instance

# The Celery command line tool needs to be able to find this 'celery' object.
# We create the Flask app, which in turn configures the shared celery_instance
# via the configure_celery() function called within create_app().
app = create_app()

# Expose the configured Celery instance as a top-level variable named 'celery'
celery = celery_instance