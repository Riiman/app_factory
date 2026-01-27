"""
Admin Insights API Endpoints
Provides access to startup insights snapshots and historical trends for admin dashboard
"""

from flask import Blueprint, jsonify
from app.models import StartupSnapshot, Startup
from app.utils.decorators import admin_required
from flask_jwt_extended import get_jwt_identity
from app.models import User
from sqlalchemy import desc

@admin_bp.route('/startups/<int:startup_id>/insights/latest', methods=['GET'])
@admin_required
def get_latest_insights(startup_id):
    """Get the latest insights snapshot for a startup"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    startup = Startup.query.get_or_404(startup_id)
    
    # Validate admin access
    if not validate_admin_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403
    
    # Get latest snapshot
    latest_snapshot = StartupSnapshot.query.filter_by(
        startup_id=startup_id
    ).order_by(desc(StartupSnapshot.date)).first()
    
    if not latest_snapshot:
        return jsonify({
            'success': True,
            'data': None,
            'message': 'No insights snapshot available yet'
        }), 200
    
    return jsonify({
        'success': True,
        'data': {
            'date': latest_snapshot.date.isoformat(),
            'founder_maturity_score': latest_snapshot.founder_maturity_score,
            'product_readiness_score': latest_snapshot.product_readiness_score,
            'market_fit_score': latest_snapshot.market_fit_score,
            'runway_months': latest_snapshot.runway_months,
            'financial_data': latest_snapshot.financial_data,
            'product_data': latest_snapshot.product_data,
            'growth_data': latest_snapshot.growth_data,
            'team_data': latest_snapshot.team_data
        }
    }), 200


@admin_bp.route('/startups/<int:startup_id>/insights/history', methods=['GET'])
@admin_required
def get_insights_history(startup_id):
    """Get historical insights snapshots for trend analysis"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    startup = Startup.query.get_or_404(startup_id)
    
    # Validate admin access
    if not validate_admin_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup.'}), 403
    
    # Get query parameters
    limit = request.args.get('limit', 30, type=int)  # Default last 30 snapshots
    
    # Get snapshots ordered by date descending
    snapshots = StartupSnapshot.query.filter_by(
        startup_id=startup_id
    ).order_by(desc(StartupSnapshot.date)).limit(limit).all()
    
    if not snapshots:
        return jsonify({
            'success': True,
            'data': [],
            'message': 'No historical insights available yet'
        }), 200
    
    # Format data for trends
    history = [{
        'date': snapshot.date.isoformat(),
        'founder_maturity_score': snapshot.founder_maturity_score,
        'product_readiness_score': snapshot.product_readiness_score,
        'market_fit_score': snapshot.market_fit_score,
        'runway_months': snapshot.runway_months,
        'financial_data': snapshot.financial_data,
        'product_data': snapshot.product_data,
        'growth_data': snapshot.growth_data
    } for snapshot in reversed(snapshots)]  # Reverse to get chronological order
    
    return jsonify({
        'success': True,
        'data': history
    }), 200
