from flask import request, jsonify, current_app, redirect, url_for, Blueprint, session
from app.extensions import db, oauth
from app.models import User, Submission, Organization, UserRole
from app.services.chatbot_orchestrator import SUBMISSION_FIELDS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app.utils.decorators import jwt_session_required
from firebase_admin import auth # Added Firebase Auth import

from app.services.notification_service import publish_update

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/status')
@jwt_required(optional=True)
def status():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify({"is_logged_in": False})

    user = User.query.get(user_id)
    if not user:
        return jsonify({"is_logged_in": False, "error": "User not found"}), 404

    submission = Submission.query.filter_by(user_id=user.id).order_by(Submission.submitted_at.desc()).first()
    submission_status = submission.status.value if submission else "not_started"
    
    response = {
        "is_logged_in": True,
        "user": user.to_dict(),
        "submission_status": submission_status,
        "submission_data": submission.to_dict() if submission else None,
    }

    if submission and submission_status == 'DRAFT':
        # Determine the next question for the frontend
        current_step_key = submission.chat_progress_step
        if current_step_key == 'start':
            response["next_question"] = SUBMISSION_FIELDS[0]['question']
        elif current_step_key == 'completed':
             response["next_question"] = "Your submission is complete. We will get back to you shortly."
        else:
            try:
                current_step_index = [i for i, f in enumerate(SUBMISSION_FIELDS) if f['key'] == current_step_key][0]
                response["next_question"] = SUBMISSION_FIELDS[current_step_index]['question']
            except (IndexError, TypeError):
                 # Default to the first question if the step is invalid or not found
                response["next_question"] = SUBMISSION_FIELDS[0]['question']

    return jsonify(response)


@auth_bp.route('/organization/signup', methods=['POST'])
def organization_signup():
    data = request.get_json()
    firebase_id_token = data.get('firebase_id_token')
    organization_name = data.get('organization_name')
    full_name = data.get('full_name')
    phone_number = data.get('phone_number')
    email = data.get('email')

    if not firebase_id_token or not organization_name:
        return jsonify({'success': False, 'error': 'Firebase ID token and Organization Name are required.'}), 400

    try:
        # 1. Verify Firebase Token
        decoded_token = auth.verify_id_token(firebase_id_token)
        firebase_uid = decoded_token['uid']
        token_email = decoded_token['email']

        if email and email != token_email:
             return jsonify({'success': False, 'error': 'Email mismatch.'}), 400

        # 2. Check if user already exists
        if User.query.filter_by(firebase_uid=firebase_uid).first():
            return jsonify({'success': False, 'error': 'User already exists. Please login.'}), 400

        # 3. Create Organization
        new_org = Organization(name=organization_name)
        db.session.add(new_org)
        db.session.flush() # Get ID

        # 4. Create Admin User
        firebase_user = auth.get_user(firebase_uid)
        
        user = User(
            firebase_uid=firebase_uid,
            email=token_email,
            full_name=full_name or firebase_user.display_name or token_email,
            phone_number=phone_number or firebase_user.phone_number,
            email_verified=firebase_user.email_verified,
            phone_verified=firebase_user.phone_number is not None,
            role=UserRole.ADMIN, # Org Admin
            organization_id=new_org.id
        )
        db.session.add(user)
        db.session.commit()

        # 5. Generate Token
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value, "organization_id": new_org.id})
        
        publish_update("user_signup", {"user": user.to_dict()}, rooms=["admin"])

        return jsonify({
            'success': True, 
            'message': 'Organization created successfully.',
            'organization': new_org.to_dict(),
            'invite_code': new_org.invite_code, 
            'user': user.to_dict(),
            'access_token': access_token
        }), 201

    except auth.InvalidIdTokenError:
        return jsonify({'success': False, 'error': 'Invalid Firebase ID token.'}), 401
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Org Signup error: {e}")
        return jsonify({'success': False, 'error': 'Failed to create organization.'}), 500

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    firebase_id_token = data.get('firebase_id_token')
    organization_id = data.get('organization_id') # REQUIRED now
    full_name = data.get('full_name')
    phone_number = data.get('phone_number')
    email = data.get('email')

    if not firebase_id_token:
        return jsonify({'success': False, 'error': 'Firebase ID token is required.'}), 400
    
    if not organization_id:
        return jsonify({'success': False, 'error': 'Invitation Code is required to join.'}), 400

    # Verify Organization exists by invite_code
    # Frontend might send 'organization_id' key, but value is now invite code
    # We should probably rename the key in frontend, but backend can handle it.
    invite_code = organization_id 
    org = Organization.query.filter_by(invite_code=invite_code).first()
    
    if not org:
        return jsonify({'success': False, 'error': 'Invalid Invitation Code.'}), 400

    try:
        # 1. Verify the Firebase ID token
        decoded_token = auth.verify_id_token(firebase_id_token)
        firebase_uid = decoded_token['uid']
        token_email = decoded_token['email']
        
        # Verify email matches token (security check)
        if email and email != token_email:
             return jsonify({'success': False, 'error': 'Email mismatch.'}), 400

        # 2. Check if user already exists
        user = User.query.filter_by(firebase_uid=firebase_uid).first()
        if user:
             return jsonify({'success': False, 'error': 'User already exists. Please login.'}), 400
             
        # Check by email
        if User.query.filter_by(email=token_email).first():
             return jsonify({'success': False, 'error': 'User with this email already exists.'}), 400

        # 3. Create User linked to Organization
        firebase_user = auth.get_user(firebase_uid)
        
        user = User(
            firebase_uid=firebase_uid,
            email=token_email,
            full_name=full_name or firebase_user.display_name or token_email,
            phone_number=phone_number or firebase_user.phone_number,
            email_verified=firebase_user.email_verified,
            phone_verified=firebase_user.phone_number is not None,
            organization_id=org.id,
            role=UserRole.USER 
        )
        db.session.add(user)
        db.session.commit()

        # 4. Generate internal JWT
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value, "organization_id": org.id})
        
        publish_update("user_signup", {"user": user.to_dict()}, rooms=["admin"])

        return jsonify({
            'success': True, 
            'message': 'Account created successfully.',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201

    except auth.InvalidIdTokenError:
        return jsonify({'success': False, 'error': 'Invalid Firebase ID token.'}), 401
    except Exception as e:
        current_app.logger.error(f"Signup error: {e}")
        return jsonify({'success': False, 'error': 'Failed to create user account.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    print("DEBUG: /auth/login called")
    data = request.get_json()
    print(f"DEBUG: Request data: {data}")
    firebase_id_token = data.get('firebase_id_token')

    if not firebase_id_token:
        return jsonify({'success': False, 'error': 'Firebase ID token is required.'}), 400

    try:
        # 1. Verify the Firebase ID token
        decoded_token = auth.verify_id_token(firebase_id_token)
        firebase_uid = decoded_token['uid']
        email = decoded_token['email']
        phone_number = decoded_token.get('phone_number')

        # 2. Get Firebase user record to check verification status
        firebase_user = auth.get_user(firebase_uid)

        # 3. Find or create user in our local database
        user = User.query.filter_by(firebase_uid=firebase_uid).first()

        if not user:
            # If user doesn't exist locally, create a new record
            user = User(
                firebase_uid=firebase_uid,
                email=email,
                full_name=firebase_user.display_name or email,
                phone_number=phone_number,
                email_verified=firebase_user.email_verified,
                phone_verified=firebase_user.phone_number is not None # Check if phone number exists
            )
            db.session.add(user)
        else:
            # Update existing user's details and verification status
            user.email = email
            user.full_name = firebase_user.display_name or email
            user.phone_number = phone_number
            user.email_verified = firebase_user.email_verified # Removed trailing comma
            user.phone_verified = firebase_user.phone_number is not None # Removed trailing comma
            
        db.session.commit()

        # Enforce verification (Disabled for now)
        # if not user.phone_verified:
        #      return jsonify({
        #         'success': False, 
        #         'error': 'Please verify your phone number before logging in.'
        #     }), 403

        # 4. Create our internal JWT
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role.value})

        # Check the user's most recent submission (existing logic)
        submission = Submission.query.filter_by(user_id=user.id).order_by(Submission.submitted_at.desc()).first()
        submission_status = submission.status.value if submission else "not_started"

        response = {
            'success': True,
            'is_logged_in': True, # For consistency with useAuth hook
            'access_token': access_token,
            'user': user.to_dict(),
            'submission_status': submission_status,
            'submission_data': submission.to_dict() if submission else None,
        }

        if submission and submission_status == 'DRAFT':
            current_step_key = submission.chat_progress_step
            if current_step_key == 'start':
                response["next_question"] = SUBMISSION_FIELDS[0]['question']
            elif current_step_key == 'completed':
                response["next_question"] = "Your submission is complete. We will get back to you shortly."
            else:
                try:
                    current_step_index = [i for i, f in enumerate(SUBMISSION_FIELDS) if f['key'] == current_step_key][0]
                    response["next_question"] = SUBMISSION_FIELDS[current_step_index]['question']
                except (IndexError, TypeError):
                    response["next_question"] = SUBMISSION_FIELDS[0]['question']

        return jsonify(response), 200

    except auth.InvalidIdTokenError:
        return jsonify({'success': False, 'error': 'Invalid Firebase ID token.'}), 401
    except Exception as e:
        import traceback
        traceback.print_exc()
        current_app.logger.error(f"Firebase login error: {e}")
        return jsonify({'success': False, 'error': f'Authentication failed: {str(e)}'}), 500

@auth_bp.route('/assign-organization', methods=['POST'])
@jwt_required()
def assign_organization():
    """
    Assign an organization to an OAuth user who signed in without one.
    Supports both creating a new organization or joining an existing one.
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'success': False, 'error': 'User not found.'}), 404
    
    # Check if user already has an organization
    if user.organization_id:
        return jsonify({'success': False, 'error': 'User already belongs to an organization.'}), 400
    
    data = request.get_json()
    mode = data.get('mode')  # 'create' or 'join'
    
    try:
        if mode == 'create':
            organization_name = data.get('organization_name')
            if not organization_name:
                return jsonify({'success': False, 'error': 'Organization name is required.'}), 400
            
            # Create new organization
            new_org = Organization(name=organization_name)
            db.session.add(new_org)
            db.session.flush()
            
            # Assign user to organization and make them admin
            user.organization_id = new_org.id
            user.role = UserRole.ADMIN
            db.session.commit()
            
            # Generate new token with organization info
            access_token = create_access_token(
                identity=str(user.id), 
                additional_claims={"role": user.role.value, "organization_id": new_org.id}
            )
            
            return jsonify({
                'success': True,
                'message': 'Organization created successfully.',
                'organization': new_org.to_dict(),
                'invite_code': new_org.invite_code,
                'user': user.to_dict(),
                'access_token': access_token
            }), 201
            
        elif mode == 'join':
            invite_code = data.get('invite_code')
            if not invite_code:
                return jsonify({'success': False, 'error': 'Invite code is required.'}), 400
            
            # Find organization by invite code
            org = Organization.query.filter_by(invite_code=invite_code).first()
            if not org:
                return jsonify({'success': False, 'error': 'Invalid invite code.'}), 400
            
            # Assign user to organization
            user.organization_id = org.id
            user.role = UserRole.USER
            db.session.commit()
            
            # Generate new token with organization info
            access_token = create_access_token(
                identity=str(user.id), 
                additional_claims={"role": user.role.value, "organization_id": org.id}
            )
            
            return jsonify({
                'success': True,
                'message': 'Successfully joined organization.',
                'organization': org.to_dict(),
                'user': user.to_dict(),
                'access_token': access_token
            }), 200
            
        else:
            return jsonify({'success': False, 'error': 'Invalid mode. Use "create" or "join".'}), 400
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Assign organization error: {e}")
        return jsonify({'success': False, 'error': 'Failed to assign organization.'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # With JWT, logout is handled on the client by deleting the token.
    # We can optionally implement a token blocklist if we need true server-side logout.
    # For now, a simple success message is sufficient.
    return jsonify({'success': True, 'message': 'Logged out successfully'}), 200

@auth_bp.route('/debug-routes')
def debug_routes():
    import urllib
    from flask import current_app
    output = []
    for rule in current_app.url_map.iter_rules():
        options = {}
        for arg in rule.arguments:
            options[arg] = f"[{arg}]"

        methods = ','.join(rule.methods)
        url = urllib.parse.unquote(rule.rule)
        line = f"{url:50s} {methods:20s} {rule.endpoint}"
        output.append(line)
    
    for line in sorted(output):
        print(line)

    return jsonify({"message": "Routes printed to backend console"}), 200

