
"""
Seed script for stage templates
Run with: python scripts/seed_stage_templates.py
"""

import sys
import os

# Add parent directory to Python path so we can import 'app'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# NOW we can import from app
from app import create_app, db
from app.models import StageTemplate
import json

def seed_stage_templates():
    """Create the 9 stage templates with default configurations"""
    
    templates = [
        {
            'key': 'founder_specifications',
            'name': 'Founder Specifications',
            'description': 'Define your team, roles, and organizational structure',
            'order': 1,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'startup_name', 'label': 'Startup Name', 'type': 'text', 'required': True},
                    {'name': 'founders', 'label': 'Number of Founders', 'type': 'number', 'required': True},
                    {'name': 'team_size', 'label': 'Team Size', 'type': 'number', 'required': True},
                    {'name': 'headquarters', 'label': 'Headquarters', 'type': 'text', 'required': True},
                    {'name': 'team_description', 'label': 'Team Description', 'type': 'textarea', 'required': False}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Complete founder profiles', 'priority': 'p1'},
                {'title': 'Define roles and responsibilities', 'priority': 'p1'},
                {'title': 'Identify skill gaps', 'priority': 'p2'},
                {'title': 'Create hiring roadmap', 'priority': 'p2'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'team_completeness', 'name': 'Team Completeness', 'unit': 'percentage', 'default_target': 100},
                {'key': 'critical_gaps', 'name': 'Critical Gaps Resolved', 'unit': 'number', 'default_target': 0}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'All founder profiles completed', 'rule': 'founders_defined'},
                {'description': 'Roles mapped for all team members', 'rule': 'roles_mapped'}
            ])
        },
        {
            'key': 'product_scope',
            'name': 'Product Scope',
            'description': 'Define MVP features, user stories, and acceptance criteria',
            'order': 2,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'overview', 'label': 'Product Overview', 'type': 'textarea', 'required': True},
                    {'name': 'problem', 'label': 'Problem Statement', 'type': 'textarea', 'required': True},
                    {'name': 'solution', 'label': 'Solution', 'type': 'textarea', 'required': True},
                    {'name': 'value_prop', 'label': 'Unique Value Proposition', 'type': 'textarea', 'required': True},
                    {'name': 'tech_stack', 'label': 'Tech Stack', 'type': 'tags', 'required': False},
                    {'name': 'features', 'label': 'Key Features', 'type': 'textarea', 'required': True}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Define MVP scope', 'priority': 'p0'},
                {'title': 'Create user stories', 'priority': 'p1'},
                {'title': 'Write acceptance criteria', 'priority': 'p1'},
                {'title': 'Prioritize features (P1/P2)', 'priority': 'p1'},
                {'title': 'Lock scope and get approval', 'priority': 'p0'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'scope_completion', 'name': 'Scope Completion', 'unit': 'percentage', 'default_target': 100},
                {'key': 'p1_features', 'name': 'P1 Features Defined', 'unit': 'number', 'default_target': 10}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'MVP scope locked', 'rule': 'scope_locked'},
                {'description': 'All P1 features have acceptance criteria', 'rule': 'p1_criteria_complete'}
            ])
        },
        {
            'key': 'gtm_scope',
            'name': 'GTM Scope',
            'description': 'Define go-to-market strategy, ICP, and channels',
            'order': 3,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'target_market', 'label': 'Target Market', 'type': 'textarea', 'required': True},
                    {'name': 'segments', 'label': 'Customer Segments', 'type': 'textarea', 'required': True},
                    {'name': 'competition', 'label': 'Competition Analysis', 'type': 'textarea', 'required': False},
                    {'name': 'advantage', 'label': 'Competitive Advantage', 'type': 'textarea', 'required': True},
                    {'name': 'pricing', 'label': 'Pricing Strategy', 'type': 'textarea', 'required': True},
                    {'name': 'gtm_strategy', 'label': 'GTM Strategy', 'type': 'textarea', 'required': True}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Define ICP (Ideal Customer Profile)', 'priority': 'p0'},
                {'title': 'Create positioning statement', 'priority': 'p1'},
                {'title': 'Identify distribution channels', 'priority': 'p1'},
                {'title': 'Plan initial experiments', 'priority': 'p1'},
                {'title': 'Set success metrics', 'priority': 'p1'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'experiments_planned', 'name': 'Experiments Planned', 'unit': 'number', 'default_target': 5},
                {'key': 'channels_identified', 'name': 'Channels Identified', 'unit': 'number', 'default_target': 3}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'ICP documented', 'rule': 'icp_defined'},
                {'description': 'At least 3 experiments planned', 'rule': 'experiments_min'}
            ])
        },
        {
            'key': 'product_ux',
            'name': 'Product UX',
            'description': 'Design user flows, wireframes, and prototypes',
            'order': 4,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'design_tool', 'label': 'Design Tool', 'type': 'select', 'options': [
                        {'value': 'figma', 'label': 'Figma'},
                        {'value': 'sketch', 'label': 'Sketch'},
                        {'value': 'adobe_xd', 'label': 'Adobe XD'}
                    ]},
                    {'name': 'design_system_url', 'label': 'Design System URL', 'type': 'url'},
                    {'name': 'prototype_url', 'label': 'Prototype URL', 'type': 'url'}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Create user flows', 'priority': 'p1'},
                {'title': 'Design wireframes', 'priority': 'p1'},
                {'title': 'Build clickable prototype', 'priority': 'p1'},
                {'title': 'Conduct usability testing', 'priority': 'p1'},
                {'title': 'Handoff to development', 'priority': 'p0'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'ux_completeness', 'name': 'UX Completeness', 'unit': 'percentage', 'default_target': 100},
                {'key': 'usability_issues', 'name': 'Usability Issues Resolved', 'unit': 'number', 'default_target': 0}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'Prototype tested with 5+ users', 'rule': 'usability_tests'},
                {'description': 'Design handoff complete', 'rule': 'handoff_complete'}
            ])
        },
        {
            'key': 'product_code',
            'name': 'Product Code',
            'description': 'Develop MVP features and architecture',
            'order': 5,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'repo_url', 'label': 'Repository URL', 'type': 'url'},
                    {'name': 'architecture', 'label': 'Architecture Description', 'type': 'textarea'},
                    {'name': 'deployment_url', 'label': 'Deployment URL', 'type': 'url'}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Set up repository and CI/CD', 'priority': 'p0'},
                {'title': 'Implement P1 features', 'priority': 'p0'},
                {'title': 'Write unit tests', 'priority': 'p1'},
                {'title': 'Code review process', 'priority': 'p1'},
                {'title': 'Documentation', 'priority': 'p2'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'code_coverage', 'name': 'Code Coverage', 'unit': 'percentage', 'default_target': 80},
                {'key': 'build_success_rate', 'name': 'Build Success Rate', 'unit': 'percentage', 'default_target': 95},
                {'key': 'features_completed', 'name': 'Features Completed', 'unit': 'number', 'default_target': 10}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'All P1 features implemented', 'rule': 'p1_complete'},
                {'description': 'Code coverage above 80%', 'rule': 'coverage_threshold'}
            ])
        },
        {
            'key': 'test_deploy',
            'name': 'Test and Deploy',
            'description': 'QA, testing, and production deployment',
            'order': 6,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'staging_url', 'label': 'Staging URL', 'type': 'url'},
                    {'name': 'production_url', 'label': 'Production URL', 'type': 'url'},
                    {'name': 'qa_plan', 'label': 'QA Plan', 'type': 'textarea'}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Create QA test plan', 'priority': 'p0'},
                {'title': 'Execute integration tests', 'priority': 'p0'},
                {'title': 'User acceptance testing (UAT)', 'priority': 'p0'},
                {'title': 'Security audit', 'priority': 'p1'},
                {'title': 'Deploy to production', 'priority': 'p0'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'defects_resolved', 'name': 'Defects Resolved', 'unit': 'number', 'default_target': 0},
                {'key': 'uat_pass_rate', 'name': 'UAT Pass Rate', 'unit': 'percentage', 'default_target': 100},
                {'key': 'uptime', 'name': 'System Uptime', 'unit': 'percentage', 'default_target': 99.9}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'UAT signed off', 'rule': 'uat_approved'},
                {'description': 'Zero P0 defects', 'rule': 'no_critical_bugs'}
            ])
        },
        {
            'key': 'share_monitor',
            'name': 'Share and Monitor',
            'description': 'Launch product and monitor key metrics',
            'order': 7,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'analytics_setup', 'label': 'Analytics Setup', 'type': 'select', 'options': [
                        {'value': 'ga4', 'label': 'Google Analytics 4'},
                        {'value': 'mixpanel', 'label': 'Mixpanel'},
                        {'value': 'amplitude', 'label': 'Amplitude'}
                    ]},
                    {'name': 'monitoring_url', 'label': 'Monitoring Dashboard URL', 'type': 'url'}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Set up analytics tracking', 'priority': 'p0'},
                {'title': 'Configure monitoring alerts', 'priority': 'p0'},
                {'title': 'Launch to beta users', 'priority': 'p0'},
                {'title': 'Collect user feedback', 'priority': 'p1'},
                {'title': 'Monitor key metrics daily', 'priority': 'p1'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'active_users', 'name': 'Monthly Active Users', 'unit': 'number', 'default_target': 100},
                {'key': 'activation_rate', 'name': 'Activation Rate', 'unit': 'percentage', 'default_target': 40},
                {'key': 'retention_rate', 'name': '7-Day Retention', 'unit': 'percentage', 'default_target': 30}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'Analytics tracking live', 'rule': 'analytics_active'},
                {'description': 'At least 50 active users', 'rule': 'user_threshold'}
            ])
        },
        {
            'key': 'monetize_gtm',
            'name': 'Monetize and GTM',
            'description': 'Implement pricing, billing, and scale GTM efforts',
            'order': 8,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'pricing_model', 'label': 'Pricing Model', 'type': 'select', 'options': [
                        {'value': 'subscription', 'label': 'Subscription'},
                        {'value': 'usage', 'label': 'Usage-based'},
                        {'value': 'freemium', 'label': 'Freemium'},
                        {'value': 'one_time', 'label': 'One-time payment'}
                    ]},
                    {'name': 'payment_provider', 'label': 'Payment Provider', 'type': 'select', 'options': [
                        {'value': 'stripe', 'label': 'Stripe'},
                        {'value': 'razorpay', 'label': 'Razorpay'},
                        {'value': 'paypal', 'label': 'PayPal'}
                    ]}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Implement billing system', 'priority': 'p0'},
                {'title': 'Launch pricing tiers', 'priority': 'p0'},
                {'title': 'Execute GTM campaigns', 'priority': 'p1'},
                {'title': 'Track channel ROI', 'priority': 'p1'},
                {'title': 'Optimize conversion funnel', 'priority': 'p1'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'mrr', 'name': 'Monthly Recurring Revenue', 'unit': 'currency', 'default_target': 10000},
                {'key': 'customer_count', 'name': 'Paying Customers', 'unit': 'number', 'default_target': 50},
                {'key': 'cac', 'name': 'Customer Acquisition Cost', 'unit': 'currency', 'default_target': 100},
                {'key': 'ltv', 'name': 'Lifetime Value', 'unit': 'currency', 'default_target': 500}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'First paying customer', 'rule': 'revenue_started'},
                {'description': 'LTV > 3x CAC', 'rule': 'unit_economics'}
            ])
        },
        {
            'key': 'fundraise',
            'name': 'Fundraise',
            'description': 'Prepare for fundraising and investor outreach',
            'order': 9,
            'form_schema': json.dumps({
                'fields': [
                    {'name': 'funding_required', 'label': 'Funding Required', 'type': 'text'},
                    {'name': 'pitch_deck_url', 'label': 'Pitch Deck URL', 'type': 'url'},
                    {'name': 'data_room_url', 'label': 'Data Room URL', 'type': 'url'},
                    {'name': 'target_investors', 'label': 'Target Investors', 'type': 'textarea'}
                ]
            }),
            'default_checklist': json.dumps([
                {'title': 'Create pitch deck', 'priority': 'p0'},
                {'title': 'Prepare financial model', 'priority': 'p0'},
                {'title': 'Assemble data room', 'priority': 'p1'},
                {'title': 'Build investor list', 'priority': 'p1'},
                {'title': 'Schedule investor meetings', 'priority': 'p1'}
            ]),
            'default_metrics': json.dumps([
                {'key': 'meetings_scheduled', 'name': 'Investor Meetings Scheduled', 'unit': 'number', 'default_target': 20},
                {'key': 'term_sheets', 'name': 'Term Sheets Received', 'unit': 'number', 'default_target': 2},
                {'key': 'data_room_readiness', 'name': 'Data Room Readiness', 'unit': 'percentage', 'default_target': 100}
            ]),
            'acceptance_criteria': json.dumps([
                {'description': 'Pitch deck complete', 'rule': 'deck_ready'},
                {'description': 'Data room assembled', 'rule': 'dataroom_ready'}
            ])
        }
    ]
    
    for template_data in templates:
        existing = StageTemplate.query.filter_by(key=template_data['key']).first()
        if not existing:
            template = StageTemplate(**template_data)
            db.session.add(template)
            print(f"✓ Created template: {template_data['name']}")
        else:
            print(f"⊘ Template already exists: {template_data['name']}")
    
    db.session.commit()
    print("\n✓ Stage templates seeded successfully!")

if __name__ == '__main__':
    # Create Flask app and push context
    app = create_app()
    
    with app.app_context():  # ← THIS IS CRITICAL
        print("🌱 Starting stage template seeding...")
        seed_stage_templates()
        print("✅ Seeding complete!")
