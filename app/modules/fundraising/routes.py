from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, FundingRound, Investor, RoundInvestor, Fundraise, NextFundingGoal, ActivityLog, TeamMember
from app import db
from app.services.notification_service import publish_update
from decimal import Decimal

fundraising_bp = Blueprint('fundraising', __name__, url_prefix='/api/startups')

def validate_startup_access(startup, user, required_scope=None):
    if not user: return False
    # Super Admin
    if user.organization_id == 1 and user.role == UserRole.ADMIN: return True
    if startup.organization_id != user.organization_id: return False
    # Owner
    if startup.user_id == user.id: return True
    # Org Admin
    if user.role == UserRole.ADMIN: return True
    # Team Member
    member = TeamMember.query.filter_by(startup_id=startup.id, user_id=user.id).first()
    if member:
        if required_scope is None: return True
        if member.scopes and required_scope in member.scopes: return True
            
    return False

@fundraising_bp.route('/<int:startup_id>/funding-rounds', methods=['GET'])
@jwt_required()
def get_funding_rounds(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    rounds = [r.to_dict() for r in startup.funding_rounds]
    return jsonify({'success': True, 'rounds': rounds}), 200

@fundraising_bp.route('/<int:startup_id>/funding-rounds', methods=['POST'])
@jwt_required()
def create_funding_round(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'round_type' not in data:
        return jsonify({'success': False, 'error': 'Round type is required.'}), 400

    try:
        if 'date_opened' in data:
            if data['date_opened']:
                data['date_opened'] = datetime.strptime(data['date_opened'], '%Y-%m-%d').date()
            else:
                data['date_opened'] = None
        if 'date_closed' in data:
            if data['date_closed']:
                data['date_closed'] = datetime.strptime(data['date_closed'], '%Y-%m-%d').date()
            else:
                 data['date_closed'] = None
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid date format. Expected YYYY-MM-DD.'}), 400

    new_round = FundingRound(startup_id=startup_id, **data)
    db.session.add(new_round)
    db.session.commit()
    
    publish_update("funding_round_created", {"startup_id": startup_id, "round": new_round.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Funding',
        target_id=new_round.round_id,
        details=f"{new_round.round_type} Round"
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'round': new_round.to_dict()}), 201

@fundraising_bp.route('/<int:startup_id>/funding-rounds/<int:round_id>', methods=['PUT'])
@jwt_required()
def update_funding_round(startup_id, round_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    funding_round = FundingRound.query.get_or_404(round_id)
    if funding_round.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Funding round does not belong to this startup.'}), 400

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    for key, value in data.items():
        if key in ['date_opened', 'date_closed']:
            if value:
                try:
                    if isinstance(value, str):
                        value = datetime.strptime(value, '%Y-%m-%d').date()
                except ValueError:
                    pass
            else:
                value = None
        setattr(funding_round, key, value)
    db.session.commit()
    
    publish_update("funding_round_updated", {"startup_id": startup_id, "round": funding_round.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    return jsonify({'success': True, 'round': funding_round.to_dict()}), 200

@fundraising_bp.route('/<int:startup_id>/investors', methods=['GET'])
@jwt_required()
def get_investors(startup_id):
    # Investors are global for now (per original code `Investor.query.all()`) or startup specific?
    # Original: `investors = [i.to_dict() for i in Investor.query.all()]`
    # This seems to be a shared CRM? Let's keep it as is.
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    investors = [i.to_dict() for i in Investor.query.all()]
    return jsonify({'success': True, 'investors': investors}), 200

@fundraising_bp.route('/<int:startup_id>/investors', methods=['POST'])
@jwt_required()
def create_investor(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'success': False, 'error': 'Investor name is required.'}), 400
    new_investor = Investor(**data)
    db.session.add(new_investor)
    db.session.commit()
    
    publish_update("investor_created", {"startup_id": startup_id, "investor": new_investor.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='added',
        target_type='Investor',
        target_id=new_investor.investor_id,
        details=new_investor.name
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'investor': new_investor.to_dict()}), 201

@fundraising_bp.route('/<int:startup_id>/funding-rounds/<int:round_id>/investments', methods=['POST'])
@jwt_required()
def create_investment(startup_id, round_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    funding_round = FundingRound.query.get_or_404(round_id)
    if funding_round.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Funding round does not belong to this startup.'}), 400

    data = request.get_json()
    if not data or 'investor_id' not in data or 'amount_invested' not in data:
        return jsonify({'success': False, 'error': 'Investor ID and Amount Invested are required.'}), 400

    investor_id = data['investor_id']
    amount_invested = data['amount_invested']

    # Check if investment already exists
    existing_investment = RoundInvestor.query.filter_by(round_id=round_id, investor_id=investor_id).first()
    if existing_investment:
         return jsonify({'success': False, 'error': 'This investor has already invested in this round.'}), 400

    new_investment = RoundInvestor(
        round_id=round_id,
        investor_id=investor_id,
        amount_invested=amount_invested
    )
    db.session.add(new_investment)
    
    # Update amount raised for the round
    funding_round.amount_raised = (funding_round.amount_raised or Decimal(0)) + Decimal(str(amount_invested))
    
    db.session.commit()
    
    investor = Investor.query.get(investor_id)
    
    publish_update("investment_added", {
        "startup_id": startup_id, 
        "round_id": round_id,
        "investment": new_investment.to_dict()
    }, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='invested',
        target_type='Funding',
        target_id=funding_round.round_id,
        details=f"{investor.name if investor else 'Investor'} invested {amount_invested}"
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'investment': new_investment.to_dict()}), 201

@fundraising_bp.route('/<int:startup_id>/fundraise-details', methods=['GET'])
@jwt_required()
def get_fundraise_details(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    fundraise = startup.fundraise_details
    next_goal = fundraise.next_funding_goal if fundraise else None
    
    return jsonify({
        'success': True, 
        'fundraise_details': fundraise.to_dict() if fundraise else None,
        'next_funding_goal': next_goal.to_dict() if next_goal else None
    }), 200

@fundraising_bp.route('/<int:startup_id>/fundraise-details', methods=['PUT'])
@jwt_required()
def update_fundraise_details(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided.'}), 400

    fundraise_data = data.get('fundraise', {})
    next_funding_goal_data = data.get('next_funding_goal', {})

    fundraise = startup.fundraise_details
    if not fundraise:
        fundraise = Fundraise(startup_id=startup_id)
        db.session.add(fundraise)
        db.session.flush()

    fundraise.funding_stage = fundraise_data.get('funding_stage', fundraise.funding_stage)
    fundraise.amount_raised = fundraise_data.get('amount_raised', fundraise.amount_raised)

    next_funding_goal = fundraise.next_funding_goal
    if not next_funding_goal:
        next_funding_goal = NextFundingGoal(fundraise_id=fundraise.id)
        db.session.add(next_funding_goal)

    next_funding_goal.target_amount = next_funding_goal_data.get('target_amount', next_funding_goal.target_amount)
    next_funding_goal.target_valuation = next_funding_goal_data.get('target_valuation', next_funding_goal.target_valuation)
    
    target_close_date_str = next_funding_goal_data.get('target_close_date')
    if target_close_date_str:
        next_funding_goal.target_close_date = datetime.strptime(target_close_date_str, '%Y-%m-%d').date()
    else:
        next_funding_goal.target_close_date = None

    db.session.commit()
    
    publish_update("fundraise_details_updated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])

    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup.id,
        action='updated',
        target_type='Fundraising',
        target_id=fundraise.id,
        details='Updated fundraising goals'
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({
        'success': True,
        'fundraise_details': fundraise.to_dict(),
        'next_funding_goal': fundraise.next_funding_goal.to_dict()
    }), 200
