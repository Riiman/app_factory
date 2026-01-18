from app import create_app, db
from app.models import MarketingSettings

app = create_app()

with app.app_context():
    print("Creating marketing_settings table...")
    try:
        MarketingSettings.__table__.create(db.session.bind)
        print("Table created successfully.")
    except Exception as e:
        print(f"Error creating table (might already exist): {e}")
