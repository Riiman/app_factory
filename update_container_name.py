#!/usr/bin/env python3
from app import create_app
from app.config import Config
from app.models import Startup
from app.extensions import db

app = create_app(Config)

with app.app_context():
    startup = Startup.query.get(1)
    if startup:
        startup.container_name = 'startup_dev_fbff6ad5ce1a'
        db.session.commit()
        print(f"Updated startup {startup.id}: container_name = {startup.container_name}")
    else:
        print("Startup 1 not found")
