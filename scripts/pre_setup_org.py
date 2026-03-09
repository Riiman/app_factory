import sys
import os
import argparse
import secrets
import string
import re

# Add the root directory to sys.path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.extensions import db
from app.models import User, Organization, UserRole
from firebase_admin import auth
from app.email_utils import send_org_ready_credentials_email

def slugify(text):
    text = text.lower()
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

def generate_temp_password(length=12):
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for i in range(length))

def pre_setup_organization(name, email, org_name, slug=None, logo=None):
    app = create_app()
    with app.app_context():
        # 1. Handle Slug uniqueness
        if not slug:
            base_slug = slugify(org_name)
            slug = base_slug
        else:
            base_slug = slugify(slug)
            slug = base_slug

        counter = 1
        while Organization.query.filter_by(slug=slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # 2. Check if User already exists
        if User.query.filter_by(email=email).first():
            print(f"Error: User with email '{email}' already exists in local DB.")
            return

        # 3. Generate Temporary Password
        temp_password = generate_temp_password()
        
        # 4. Create Firebase User
        fb_user = None
        try:
            # Check if user already exists in Firebase
            try:
                fb_user = auth.get_user_by_email(email)
                print(f"User already exists in Firebase: {fb_user.uid}. Updating password...")
                auth.update_user(fb_user.uid, password=temp_password)
            except auth.UserNotFoundError:
                fb_user = auth.create_user(
                    email=email,
                    password=temp_password,
                    display_name=name,
                    email_verified=True
                )
                print(f"Firebase user created: {fb_user.uid}")
        except Exception as e:
            print(f"Error handling Firebase user: {str(e)}")
            return

        # 5. Create Organization
        new_org = Organization(
            name=org_name,
            slug=slug,
            logo_url=logo
        )
        db.session.add(new_org)
        db.session.flush() # Get ID
        
        # 6. Create local User
        new_user = User(
            email=email,
            full_name=name,
            firebase_uid=fb_user.uid,
            organization_id=new_org.id,
            role=UserRole.ADMIN,
            email_verified=True,
            is_verified=True
        )
        db.session.add(new_user)
        
        try:
            db.session.commit()
            print(f"Organization '{org_name}' and Admin '{name}' created successfully.")
            print(f"Slug: {slug}")
            print(f"Invite Code: {new_org.invite_code}")
            print(f"Temporary Password: {temp_password}")
            
            # 7. Send Email
            result = send_org_ready_credentials_email(email, name, org_name, slug, temp_password)
            if result.get('success'):
                print("Welcome email sent successfully.")
            else:
                print(f"Failed to send welcome email: {result.get('error')}")
                
        except Exception as e:
            db.session.rollback()
            print(f"Error saving to database: {str(e)}")
            # Note: We don't delete the Firebase user if they already existed prior to this script
            print("Database transaction failed. Please check for partial data.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pre-setup Organization and Admin User")
    parser.add_argument("--name", required=True, help="Full Name of the Admin User")
    parser.add_argument("--email", required=True, help="Email of the Admin User")
    parser.add_argument("--org", required=True, help="Name of the Organization")
    parser.add_argument("--slug", help="Custom Slug for the Organization")
    parser.add_argument("--logo", help="Logo URL for the Organization")
    
    args = parser.parse_args()
    pre_setup_organization(args.name, args.email, args.org, args.slug, args.logo)
