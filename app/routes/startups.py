from flask import request, jsonify, Blueprint, session
from app import db
from app.models import Startup, Evaluation, Submission, Product, BusinessOverview, MarketingCampaign, MarketingOverview, Fundraise, Founder, Task, Experiment, Artifact, ProductBusinessDetails, BusinessMonthlyData, MarketingContentCalendar, MarketingContentItem
from app.utils.decorators import session_required

startups_bp = Blueprint('startups', __name__, url_prefix='/startups')

@startups_bp.route('/<int:startup_id>', methods=['GET'])
@session_required
def get_startup(startup_id):
    startup = Startup.query.get_or_404(startup_id)
    
    # Ensure the logged-in user owns this startup
    if startup.user_id != session.get('user_id'):
        return jsonify({'success': False, 'error': 'Unauthorized access to startup data.'}), 403

    startup_data = startup.to_dict()
    
    # Fetch associated evaluation data
    evaluation = Evaluation.query.filter_by(submission_id=startup.submission_id).first()
    if evaluation:
        startup_data['evaluation'] = {
            'overall_score': evaluation.overall_score,
            'final_decision': evaluation.final_decision,
            'overall_summary': evaluation.overall_summary,
            'problem_analysis': evaluation.problem_analysis,
            'solution_analysis': evaluation.solution_analysis,
            'market_analysis': evaluation.market_analysis,
            'growth_analysis': evaluation.growth_analysis,
            'competitor_analysis': evaluation.competitor_analysis,
            'risks_analysis': evaluation.risks_analysis,
        }
    else:
        startup_data['evaluation'] = None # No evaluation yet

    # Fetch associated Product data
    products = Product.query.filter_by(startup_id=startup.id).all()
    startup_data['products'] = [p.to_dict() for p in products]

    # Fetch associated Business data
    business = BusinessOverview.query.filter_by(startup_id=startup.id).first()
    startup_data['business'] = business.to_dict() if business else None

    # Fetch associated Marketing data
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    startup_data['marketing_overview'] = marketing_overview.to_dict() if marketing_overview else None

    marketing_campaigns = MarketingCampaign.query.filter_by(startup_id=startup.id).all()
    startup_data['marketing_campaigns'] = [c.to_dict() for c in marketing_campaigns]

    # Fetch associated Fundraise data
    fundraise = Fundraise.query.filter_by(startup_id=startup.id).first()
    startup_data['fundraise'] = fundraise.to_dict() if fundraise else None

    # Fetch associated Founders data
    founders = Founder.query.filter_by(startup_id=startup.id).all()
    startup_data['founders'] = [f.to_dict() for f in founders]

    # Fetch associated Tasks and their artifacts
    tasks = Task.query.filter_by(startup_id=startup.id).all()
    startup_data['tasks'] = []
    for task in tasks:
        task_data = task.to_dict()
        task_data['artifacts'] = [a.to_dict() for a in Artifact.query.filter_by(linked_to_id=task.id, linked_to_type='task').all()]
        startup_data['tasks'].append(task_data)

    # Fetch associated Experiments and their artifacts
    experiments = Experiment.query.filter_by(startup_id=startup.id).all()
    startup_data['experiments'] = []
    for experiment in experiments:
        experiment_data = experiment.to_dict()
        experiment_data['artifacts'] = [a.to_dict() for a in Artifact.query.filter_by(linked_to_id=experiment.id, linked_to_type='experiment').all()]
        startup_data['experiments'].append(experiment_data)



    return jsonify({
        'success': True,
        'startup': startup_data
    }), 200
