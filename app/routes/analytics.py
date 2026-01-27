"""
Analytics API Routes
Provides analytics endpoints for dashboard visualizations
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Startup, User, UserRole
from app.services.business_analytics_service import (
    calculate_unit_economics,
    calculate_customer_growth,
    calculate_revenue_breakdown,
    calculate_burn_metrics
)
from app.services.executive_analytics_service import calculate_executive_summary


analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/startups')


def validate_startup_access(startup, user):
    """Validate user has access to startup"""
    if not user:
        return False
    
    # Super Admin
    if user.organization_id == 1 and user.role == UserRole.ADMIN:
        return True
    
    if startup.organization_id != user.organization_id:
        return False
    
    # Owner or Org Admin
    if startup.user_id == user.id or user.role == UserRole.ADMIN:
        return True
    
    return False


# Executive Dashboard Endpoint

@analytics_bp.route('/<int:startup_id>/analytics/executive-summary', methods=['GET'])
@jwt_required()
def get_executive_summary(startup_id):
    """
    Get comprehensive executive summary for main dashboard
    
    Returns:
    - financial_health: Core financial metrics with trends
    - growth_metrics: Growth and traction indicators
    - module_health: Status of each module
    - acquisition_funnel: Marketing to customer funnel
    - sales_pipeline: CRM pipeline summary
    - alerts: Critical items requiring attention
    - recent_wins: Recent successes
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_executive_summary(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Business Analytics Endpoints

@jwt_required()
def get_unit_economics(startup_id):
    """
    Get unit economics analytics for all business models
    
    Returns:
    - ARPU (actual vs target)
    - CAC (actual vs target)
    - LTV
    - LTV:CAC ratio
    - Margin (actual vs target)
    - Revenue and transaction count
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_unit_economics(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/customer-growth', methods=['GET'])
@jwt_required()
def get_customer_growth(startup_id):
    """
    Get customer growth trends
    
    Returns monthly data:
    - New customers
    - Total customers
    - Churn rate
    - Churned customers
    - Net growth
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_customer_growth(startup_id, months=12)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/revenue-breakdown', methods=['GET'])
@jwt_required()
def get_revenue_breakdown(startup_id):
    """
    Get revenue breakdown by business model
    
    Returns:
    - Revenue per model
    - Percentage contribution
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_revenue_breakdown(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/burn-metrics', methods=['GET'])
@jwt_required()
def get_burn_metrics(startup_id):
    """
    Get burn rate and runway metrics
    
    Returns:
    - Burn rate
    - Cash balance
    - Runway months
    - Burn multiple
    - Revenue
    """
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_burn_metrics(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# CRM Analytics Endpoints

@analytics_bp.route('/<int:startup_id>/analytics/crm/sales-funnel', methods=['GET'])
@jwt_required()
def get_sales_funnel(startup_id):
    """
    Get sales pipeline funnel data
    """
    from app.services.crm_analytics_service import calculate_sales_funnel
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_sales_funnel(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/crm/conversion-rates', methods=['GET'])
@jwt_required()
def get_conversion_rates(startup_id):
    """
    Get conversion rates between pipeline stages
    """
    from app.services.crm_analytics_service import calculate_conversion_rates
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_conversion_rates(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/crm/deal-velocity', methods=['GET'])
@jwt_required()
def get_deal_velocity(startup_id):
    """
    Get deal velocity metrics
    """
    from app.services.crm_analytics_service import calculate_deal_velocity
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_deal_velocity(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/crm/win-rate', methods=['GET'])
@jwt_required()
def get_win_rate(startup_id):
    """
    Get win rate metrics
    """
    from app.services.crm_analytics_service import calculate_win_rate
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_win_rate(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/crm/pipeline-health', methods=['GET'])
@jwt_required()
def get_pipeline_health(startup_id):
    """
    Get overall pipeline health metrics
    """
    from app.services.crm_analytics_service import calculate_pipeline_health
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_pipeline_health(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/crm/activity-metrics', methods=['GET'])
@jwt_required()
def get_activity_metrics(startup_id):
    """
    Get sales activity metrics
    """
    from app.services.crm_analytics_service import calculate_activity_metrics
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_activity_metrics(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Marketing Analytics Endpoints

@analytics_bp.route('/<int:startup_id>/analytics/marketing/channel-performance', methods=['GET'])
@jwt_required()
def get_channel_performance(startup_id):
    """
    Get marketing channel performance metrics
    """
    from app.services.marketing_analytics_service import calculate_channel_performance
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_channel_performance(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/marketing/cac-by-channel', methods=['GET'])
@jwt_required()
def get_cac_by_channel(startup_id):
    """
    Get CAC by marketing channel
    """
    from app.services.marketing_analytics_service import calculate_cac_by_channel
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_cac_by_channel(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/marketing/funnel', methods=['GET'])
@jwt_required()
def get_marketing_funnel(startup_id):
    """
    Get marketing funnel data
    """
    from app.services.marketing_analytics_service import calculate_marketing_funnel
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_marketing_funnel(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/marketing/campaign-roi', methods=['GET'])
@jwt_required()
def get_campaign_roi(startup_id):
    """
    Get ROI for marketing campaigns
    """
    from app.services.marketing_analytics_service import calculate_campaign_roi
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_campaign_roi(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/marketing/spend-allocation', methods=['GET'])
@jwt_required()
def get_spend_allocation(startup_id):
    """
    Get marketing spend allocation by channel
    """
    from app.services.marketing_analytics_service import calculate_spend_allocation
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_spend_allocation(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/marketing/trends', methods=['GET'])
@jwt_required()
def get_marketing_trends(startup_id):
    """
    Get marketing performance trends
    """
    from app.services.marketing_analytics_service import calculate_marketing_trends
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_marketing_trends(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# Accounting Analytics Endpoints

@analytics_bp.route('/<int:startup_id>/analytics/accounting/cash-flow', methods=['GET'])
@jwt_required()
def get_cash_flow(startup_id):
    """
    Get cash flow waterfall data
    """
    from app.services.accounting_analytics_service import calculate_cash_flow
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_cash_flow(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/accounting/pnl', methods=['GET'])
@jwt_required()
def get_pnl(startup_id):
    """
    Get Profit & Loss statement
    """
    from app.services.accounting_analytics_service import calculate_pnl
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_pnl(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/accounting/expense-breakdown', methods=['GET'])
@jwt_required()
def get_expense_breakdown(startup_id):
    """
    Get expense breakdown by category
    """
    from app.services.accounting_analytics_service import calculate_expense_breakdown
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_expense_breakdown(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/accounting/burn-rate-trend', methods=['GET'])
@jwt_required()
def get_burn_rate_trend(startup_id):
    """
    Get burn rate trend over time
    """
    from app.services.accounting_analytics_service import calculate_burn_rate_trend
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_burn_rate_trend(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@analytics_bp.route('/<int:startup_id>/analytics/accounting/balance-sheet', methods=['GET'])
@jwt_required()
def get_balance_sheet(startup_id):
    """
    Get balance sheet summary
    """
    from app.services.accounting_analytics_service import calculate_balance_sheet_summary
    
    startup = Startup.query.get_or_404(startup_id)
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not validate_startup_access(startup, user):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    try:
        data = calculate_balance_sheet_summary(startup_id)
        return jsonify({
            'success': True,
            'data': data
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
