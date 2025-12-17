from app import create_app, db
from app.models import Startup

app = create_app()
with app.app_context():
    startup = Startup.query.get(5)
    if startup:
        print(f"Startup 5 found: {startup.email}")
        print(f"Container Name: '{startup.container_name}'")
    else:
        print("Startup 5 not found")
