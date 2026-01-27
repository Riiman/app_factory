from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.models import Startup, User, UserRole, FundingRound, Investor, RoundInvestor, Fundraise, NextFundingGoal, ActivityLog, TeamMember, GlobalInvestor, InvestorStage, InteractionLog
from app.models import Startup, User, UserRole, FundingRound, Investor, RoundInvestor, Fundraise, NextFundingGoal, ActivityLog, TeamMember, GlobalInvestor, InvestorStage, InteractionLog, CapTableEntry, StakeholderType
from app.services.fundraising_service import FundraisingService
from app.services.scenario_service import ScenarioService
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
    
    db.session.commit()
    
    publish_update("funding_round_updated", {"startup_id": startup_id, "round": funding_round.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='updated',
        target_type='Funding',
        target_id=funding_round.round_id,
        details=f"Updated {funding_round.round_type} Round details"
    )
    db.session.add(activity)
    db.session.commit()

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
    investors = Investor.query.filter_by(startup_id=startup_id).all()
    return jsonify({'success': True, 'investors': [i.to_dict() for i in investors]}), 200

@fundraising_bp.route('/<int:startup_id>/global-investors', methods=['GET'])
@jwt_required()
def get_global_investors(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    limit = min(limit, 100)  # Max 100 per page
    
    # Sorting parameters
    sort_by = request.args.get('sort_by', 'name')
    order = request.args.get('order', 'asc')
    
    # Search parameters
    search = request.args.get('search')
    bio_keywords = request.args.get('bio_keywords')
    investment_keywords = request.args.get('investment_keywords')
    
    # Filter parameters
    types_filter = request.args.get('types')  # Comma-separated
    sectors_filter = request.args.get('sectors')  # Comma-separated
    stages_filter = request.args.get('stages')  # Comma-separated
    locations_filter = request.args.get('locations')  # Comma-separated
    min_check = request.args.get('min_check', type=float)
    max_check = request.args.get('max_check', type=float)
    
    # Build query
    query = GlobalInvestor.query
    
    # Apply name search
    if search:
        query = query.filter(
            db.or_(
                GlobalInvestor.name.ilike(f'%{search}%'),
                GlobalInvestor.firm_name.ilike(f'%{search}%')
            )
        )
    
    # Apply metadata search (bio)
    if bio_keywords:
        # SQLite JSON search - check if bio contains keywords
        query = query.filter(
            GlobalInvestor.meta_data['bio'].astext.ilike(f'%{bio_keywords}%')
        )
    
    # Apply metadata search (recent investments)
    if investment_keywords:
        query = query.filter(
            GlobalInvestor.meta_data['recent_investments'].astext.ilike(f'%{investment_keywords}%')
        )
    
    # Apply type filter
    if types_filter:
        types_list = [t.strip() for t in types_filter.split(',')]
        # JSON array contains - need to check if any type matches
        for inv_type in types_list:
            query = query.filter(GlobalInvestor.types.contains([inv_type]))
    
    # Apply sectors filter
    if sectors_filter:
        sectors_list = [s.strip() for s in sectors_filter.split(',')]
        for sector in sectors_list:
            query = query.filter(GlobalInvestor.focus_sectors.contains([sector]))
    
    # Apply stages filter
    if stages_filter:
        stages_list = [s.strip() for s in stages_filter.split(',')]
        for stage in stages_list:
            query = query.filter(GlobalInvestor.focus_stages.contains([stage]))
    
    # Apply locations filter
    if locations_filter:
        locations_list = [l.strip() for l in locations_filter.split(',')]
        for location in locations_list:
            query = query.filter(GlobalInvestor.locations.contains([location]))
    
    # Apply check size filters
    if min_check is not None:
        query = query.filter(
            db.or_(
                GlobalInvestor.max_check_size >= min_check,
                GlobalInvestor.sweet_spot >= min_check
            )
        )
    
    if max_check is not None:
        query = query.filter(
            db.or_(
                GlobalInvestor.min_check_size <= max_check,
                GlobalInvestor.sweet_spot <= max_check
            )
        )
    
    # Apply sorting
    sort_column = getattr(GlobalInvestor, sort_by, GlobalInvestor.name)
    if order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Execute pagination
    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    
    # Build response
    return jsonify({
        'success': True,
        'investors': [i.to_dict() for i in pagination.items],
        'pagination': {
            'total': pagination.total,
            'page': pagination.page,
            'limit': limit,
            'total_pages': pagination.pages,
            'has_next': pagination.has_next,
            'has_prev': pagination.has_prev
        }
    }), 200

@fundraising_bp.route('/<int:startup_id>/global-investors/recommended', methods=['GET'])
@jwt_required()
def get_recommended_investors(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    recommended = FundraisingService.get_recommendations(startup_id, limit=50)
    
    return jsonify({
        'success': True,
        'recommended': recommended,
        'count': len(recommended)
    }), 200

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
    
    new_investor = Investor(startup_id=startup_id, **data)
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

@fundraising_bp.route('/<int:startup_id>/investors/<int:investor_id>', methods=['PUT'])
@jwt_required()
def update_investor(startup_id, investor_id):
    """
    Update an existing investor's details (e.g., stage, notes, next action).
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    investor = Investor.query.get_or_404(investor_id)
    # Ensure investor belongs to this startup (conceptually, though currently investors might be shared if not filtered right, but my Refactor made them startup-specific usually. Let's check.)
    # In my 'Refactor', I added 'startup_id' to Investor.
    if investor.startup_id is not None and investor.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Investor does not belong to this startup.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    # Fields to update
    editable_fields = ['name', 'firm_name', 'type', 'email', 'website', 'notes', 'stage', 'check_size_interest', 'next_action_date', 'next_action_type']
    
    for field in editable_fields:
        if field in data:
            if field == 'stage':
                 # Validate Enum if possible, or trust client/marshmallow (using simple assignment for now)
                 setattr(investor, field, data[field])
            elif field == 'next_action_date':
                # Parse date if string? Assuming simplified handling or ISO string
                try:
                    if data[field]:
                         # setattr(investor, field, parse_date(data[field])) # If implementing parsing
                         # For now assume string or let SQLAlchemy handle if it's DateTime
                         # SQLAlchemy often needs Python datetime objects.
                         from dateutil import parser
                         setattr(investor, field, parser.parse(data[field]))
                    else:
                        setattr(investor, field, None)
                except:
                     pass # Ignore date errors for prototype
            else:
                setattr(investor, field, data[field])

    db.session.commit()
    
    publish_update("investor_updated", {"startup_id": startup_id, "investor": investor.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='updated',
        target_type='Investor',
        target_id=investor.investor_id,
        details=f"Updated investor {investor.name}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'investor': investor.to_dict()}), 200

# --- Interaction Logs ---

@fundraising_bp.route('/<int:startup_id>/investors/<int:investor_id>/interactions', methods=['GET'])
@jwt_required()
def get_interactions(startup_id, investor_id):
    # Verify access
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    investor = Investor.query.get_or_404(investor_id)
    if investor.startup_id != startup_id:
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    interactions = InteractionLog.query.filter_by(investor_id=investor_id).order_by(InteractionLog.date.desc()).all()
    return jsonify({'success': True, 'interactions': [i.to_dict() for i in interactions]}), 200

@fundraising_bp.route('/<int:startup_id>/investors/<int:investor_id>/interactions', methods=['POST'])
@jwt_required()
def create_interaction(startup_id, investor_id):
    # Verify access
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    investor = Investor.query.get_or_404(investor_id)
    if investor.startup_id != startup_id:
         return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'type' not in data or 'summary' not in data:
        return jsonify({'success': False, 'error': 'Type and Summary are required'}), 400

    from app.models import InteractionLog
    from datetime import datetime

    new_log = InteractionLog(
        investor_id=investor_id,
        user_id=user_id,
        date=datetime.utcnow(), # Or data.get('date')
        type=data['type'],
        summary=data['summary']
    )
    
    # Optional: Update next action or stage based on log?
    # e.g., if Log Type is "Meeting", maybe update investor.next_action_date?
    
    db.session.add(new_log)
    db.session.commit()
    
    return jsonify({'success': True, 'interaction': new_log.to_dict()}), 201

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

@fundraising_bp.route('/<int:startup_id>/rounds/<int:round_id>/investments', methods=['POST'])
@jwt_required()
def create_investment(startup_id, round_id):
    # Verify access
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    funding_round = FundingRound.query.get_or_404(round_id)
    if funding_round.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    investor_id = data.get('investor_id')
    amount = data.get('amount')
    shares = data.get('shares') # Optional
    
    if not investor_id or not amount:
        return jsonify({'success': False, 'error': 'Investor and Amount are required'}), 400

    from app.models import RoundInvestor, CapTableEntry, StakeholderType, Investor
    from datetime import datetime
    
    investor = Investor.query.get_or_404(investor_id)
    
    new_investment = RoundInvestor(
        round_id=round_id,
        investor_id=investor_id,
        amount=amount,
        shares=shares,
        date_invested=datetime.utcnow()
    )
    
    db.session.add(new_investment)
    
    # --- Auto-Sync with Cap Table ---
    # Check if this investor is already on the Cap Table
    cap_entry = CapTableEntry.query.filter_by(startup_id=startup_id, stakeholder_name=investor.name).first()
    
    if cap_entry:
        # Update existing
        cap_entry.investment_amount += float(amount)
        if shares:
            cap_entry.shares += int(shares)
    else:
        # Create new
        new_cap_entry = CapTableEntry(
            startup_id=startup_id,
            stakeholder_name=investor.name,
            stakeholder_type=StakeholderType.INVESTOR.value,
            shares=int(shares) if shares else 0,
            investment_amount=float(amount),
            date_issued=datetime.utcnow()
        )
        db.session.add(new_cap_entry)
        
    # Also update Investor Stage to PORTFOLIO logic
    if investor.stage != InvestorStage.PORTFOLIO.value:
         investor.stage = InvestorStage.PORTFOLIO.value
    
    # --- Sync with Accounting ---
    if startup.accounting_initialized:
        try:
            from app.models import Account, AccountType
            from app.services.accounting_service import create_manual_journal_entry
            
            # 1. Find Bank Account (Asset) -> Debit
            bank_account = Account.query.filter_by(startup_id=startup_id, subtype='Bank').first()
            
            # 2. Find Equity Account -> Credit
            equity_account_name = f"Share Capital - {funding_round.name}"
            equity_account = Account.query.filter_by(startup_id=startup_id, name=equity_account_name, type=AccountType.EQUITY).first()
            
            if not equity_account:
                # Create if doesn't exist
                equity_account = Account(
                    startup_id=startup_id,
                    name=equity_account_name,
                    type=AccountType.EQUITY,
                    subtype="Equity"
                )
                db.session.add(equity_account)
                db.session.flush()
            
            if bank_account and equity_account:
                # Create Journal Entry
                journal_data = {
                    'date': datetime.utcnow().strftime('%Y-%m-%d'),
                    'description': f"Investment from {investor.name}",
                    'reference': f"Round #{round_id}",
                    'lines': [
                        {
                            'account_id': bank_account.id,
                            'debit': float(amount),
                            'credit': 0,
                            'description': 'Cash received'
                        },
                        {
                            'account_id': equity_account.id,
                            'debit': 0,
                            'credit': float(amount),
                            'description': 'Shares issued'
                        }
                    ]
                }
                create_manual_journal_entry(startup_id, journal_data)
                
        except Exception as e:
            print(f"Failed to sync with accounting: {e}")
            # Do not rollback the investment if accounting fails, just log it.
            # Or should we? Ideally yes, but for now let's keep it loose to avoid blocking fundraising if accounting is buggy.
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
    
    return jsonify({'success': True, 'investment': new_investment.to_dict()}), 201

# --- Cap Table & Scenario Planning ---

@fundraising_bp.route('/<int:startup_id>/cap-table', methods=['GET'])
@jwt_required()
def get_cap_table(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    entries = CapTableEntry.query.filter_by(startup_id=startup_id).all()
    return jsonify({'success': True, 'cap_table': [e.to_dict() for e in entries]}), 200

@fundraising_bp.route('/<int:startup_id>/cap-table', methods=['POST'])
@jwt_required()
def add_cap_table_entry(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    if not data or 'stakeholder_name' not in data or 'shares' not in data:
        return jsonify({'success': False, 'error': 'Name and Shares are required.'}), 400

    new_entry = CapTableEntry(
        startup_id=startup_id,
        stakeholder_name=data['stakeholder_name'],
        stakeholder_type=data.get('stakeholder_type', 'FOUNDER').upper(),
        shares=data['shares'],
        investment_amount=data.get('investment_amount', 0.0),
        date_issued=datetime.utcnow() 
    )
    db.session.add(new_entry)
    db.session.commit()
    
    return jsonify({'success': True, 'entry': new_entry.to_dict()}), 201

@fundraising_bp.route('/<int:startup_id>/cap-table/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def delete_cap_table_entry(startup_id, entry_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
        
    entry = CapTableEntry.query.get_or_404(entry_id)
    if entry.startup_id != startup_id:
        return jsonify({'success': False, 'error': 'Entry does not belong to this startup.'}), 403
        
    db.session.delete(entry)
    db.session.commit()
    
    # Log Activity
    activity = ActivityLog(
        user_id=user_id,
        startup_id=startup_id,
        action='deleted',
        target_type='CapTable',
        target_id=entry_id,
        details=f"Deleted cap table entry for {entry.stakeholder_name}"
    )
    db.session.add(activity)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Entry deleted'}), 200

@fundraising_bp.route('/<int:startup_id>/scenarios/calculate-dilution', methods=['POST'])
@jwt_required()
def calculate_dilution_scenario(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not validate_startup_access(startup, user, required_scope='FUNDRAISE'):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403

    data = request.get_json()
    new_investment = float(data.get('new_investment', 0))
    pre_money_val = float(data.get('pre_money_valuation', 0))
    
    # Get current cap table
    current_entries = CapTableEntry.query.filter_by(startup_id=startup_id).all()
    current_cap_table_data = [{'shares': e.shares, 'stakeholder_name': e.stakeholder_name} for e in current_entries]
    
    result = ScenarioService.calculate_dilution(current_cap_table_data, new_investment, pre_money_val)
    
    return jsonify({'success': True, 'scenario': result}), 200
