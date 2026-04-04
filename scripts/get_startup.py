import sys
import os

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import Startup

def get_first():
    app = create_app()
    with app.app_context():
        s = Startup.query.first()
        if s:
            print(f"ID: {s.id}, Name: {s.name}")
        else:
            print("No startup found")

if __name__ == "__main__":
    os.environ['FLASK_DB_CREATION'] = '1'
    get_first()
