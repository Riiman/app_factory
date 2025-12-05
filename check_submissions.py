from app import create_app
from app.models import User, Submission
from app.config import Config

app = create_app(Config)
with app.app_context():
    users = User.query.all()
    for u in users:
        print(f"User: {u.email} (ID: {u.id})")
        submissions = Submission.query.filter_by(user_id=u.id).all()
        for s in submissions:
            print(f"  - Submission ID: {s.id}, Status: {s.status}")
