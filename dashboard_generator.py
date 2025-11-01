import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

class DashboardDataGenerator:
    """
    Generates dashboard-compatible data structure for all 9 stages
    based on startup input JSON. No API calls, pure data transformation.
    """

    def __init__(self):
        self.stage_definitions = {
            "1": {
                "title": "Founders & Context",
                "purpose": "Capture founder specs, roles, gaps, and support needs.",
                "description": "Understanding the founding team's background, capabilities, and what support they need to succeed.",
                "form_schema": [
                    {"key": "founderBackground", "label": "Founder Background", "type": "textarea", "required": False},
                    {"key": "teamRoles", "label": "Team Roles & Structure", "type": "textarea", "required": False},
                    {"key": "skillGaps", "label": "Key Skill Gaps", "type": "textarea", "required": False},
                    {"key": "supportNeeds", "label": "Support Needs", "type": "textarea", "required": False},
                ]
            },
            "2": {
                "title": "Problem & Proposition",
                "purpose": "Validate problem, define ICP, JTBD, and value proposition.",
                "description": "Deeply understand the problem you're solving, who you're solving it for, and why your solution matters.",
                "form_schema": [
                    {"key": "problemValidation", "label": "Problem Validation", "type": "textarea", "required": False},
                    {"key": "icpDefinition", "label": "Ideal Customer Profile", "type": "textarea", "required": False},
                    {"key": "jtbd", "label": "Jobs to be Done", "type": "textarea", "required": False},
                    {"key": "valuePropositionCanvas", "label": "Value Proposition", "type": "textarea", "required": False},
                ]
            },
            "3": {
                "title": "Product & Technology",
                "purpose": "Define MVP scope, architecture, and data models.",
                "description": "Build clarity on what you're building, how it works, and the technical approach.",
                "form_schema": [
                    {"key": "mvpScope", "label": "MVP Scope & Features", "type": "textarea", "required": False},
                    {"key": "architecture", "label": "Technical Architecture", "type": "textarea", "required": False},
                    {"key": "dataModel", "label": "Data Model & APIs", "type": "textarea", "required": False},
                    {"key": "techStack", "label": "Technology Stack", "type": "textarea", "required": False},
                ]
            },
            "4": {
                "title": "Market & Competition",
                "purpose": "Analyze market, competition, and positioning.",
                "description": "Understand the market landscape, competitive set, and how you'll differentiate.",
                "form_schema": [
                    {"key": "marketAnalysis", "label": "Market Analysis", "type": "textarea", "required": False},
                    {"key": "competitorTeardown", "label": "Competitor Teardown", "type": "textarea", "required": False},
                    {"key": "differentiation", "label": "Differentiation & Positioning", "type": "textarea", "required": False},
                    {"key": "acquisitionChannels", "label": "Acquisition Channels", "type": "textarea", "required": False},
                ]
            },
            "5": {
                "title": "Business Model & Pricing",
                "purpose": "Define pricing, revenue, and unit economics.",
                "description": "Establish how you'll make money, price your product, and achieve unit economics.",
                "form_schema": [
                    {"key": "businessModel", "label": "Business Model", "type": "textarea", "required": False},
                    {"key": "pricingStrategy", "label": "Pricing Strategy", "type": "textarea", "required": False},
                    {"key": "unitEconomics", "label": "Unit Economics", "type": "textarea", "required": False},
                    {"key": "revenueProjection", "label": "Revenue Projections", "type": "textarea", "required": False},
                ]
            },
            "6": {
                "title": "Milestones & Funding",
                "purpose": "Set roadmap, milestones, and resource plan.",
                "description": "Define your 12-month roadmap, key milestones, and resource allocation.",
                "form_schema": [
                    {"key": "roadmap", "label": "12-Month Roadmap", "type": "textarea", "required": False},
                    {"key": "milestones", "label": "Key Milestones", "type": "textarea", "required": False},
                    {"key": "resourcePlan", "label": "Resource & Budget Plan", "type": "textarea", "required": False},
                    {"key": "fundingNeeds", "label": "Funding Needs", "type": "textarea", "required": False},
                ]
            },
            "7": {
                "title": "Team & Hiring",
                "purpose": "Plan team structure, gaps, and hiring.",
                "description": "Build your ideal team structure, identify hiring needs, and create a recruitment plan.",
                "form_schema": [
                    {"key": "teamStructure", "label": "Desired Team Structure", "type": "textarea", "required": False},
                    {"key": "hiringPlan", "label": "Hiring Plan & Timeline", "type": "textarea", "required": False},
                    {"key": "compensationStrategy", "label": "Compensation Strategy", "type": "textarea", "required": False},
                    {"key": "cultureBuildout", "label": "Culture & Onboarding", "type": "textarea", "required": False},
                ]
            },
            "8": {
                "title": "Support & Outcomes",
                "purpose": "Align incubator support and success criteria.",
                "description": "Define what support you need from the incubator and the success metrics for your cohort.",
                "form_schema": [
                    {"key": "supportTracks", "label": "Support Tracks Needed", "type": "textarea", "required": False},
                    {"key": "successCriteria", "label": "Success Criteria", "type": "textarea", "required": False},
                    {"key": "riskMitigation", "label": "Risk Mitigation Plans", "type": "textarea", "required": False},
                    {"key": "advisorEngagement", "label": "Advisor & Mentor Needs", "type": "textarea", "required": False},
                ]
            },
            "9": {
                "title": "Launch & Operations",
                "purpose": "QA, runbooks, SLAs, and incident management.",
                "description": "Prepare for launch with operational readiness, monitoring, and incident response.",
                "form_schema": [
                    {"key": "qaAndTesting", "label": "QA & Testing Plan", "type": "textarea", "required": False},
                    {"key": "operationalRunbooks", "label": "Operational Runbooks", "type": "textarea", "required": False},
                    {"key": "slaAndMetrics", "label": "SLAs & Monitoring", "type": "textarea", "required": False},
                    {"key": "incidentResponse", "label": "Incident Response Plan", "type": "textarea", "required": False},
                ]
            },
        }

    def load_input_json(self, json_file_path: str) -> Dict[str, Any]:
        """Load startup input data from JSON file."""
        with open(json_file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_field(self, data: Dict, *keys, default="") -> str:
        """Safely extract nested field from data dict."""
        current = data
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key, default)
            else:
                return default
        return current if current not in (None, "") else default

    def create_tasks(self, stage_key: str) -> List[Dict[str, Any]]:
        """Generate task checklist for each stage."""
        tasks_map = {
            "1": [
                {"title": "Document founder backgrounds and expertise", "status": "todo", "priority": "p1"},
                {"title": "Map team roles and responsibilities (RACI)", "status": "todo", "priority": "p1"},
                {"title": "Identify top 3 skill gaps", "status": "todo", "priority": "p2"},
                {"title": "List specific incubator support needs", "status": "todo", "priority": "p1"},
                {"title": "Schedule founder onboarding session", "status": "todo", "priority": "p2"},
            ],
            "2": [
                {"title": "Conduct 10+ customer discovery interviews", "status": "todo", "priority": "p1"},
                {"title": "Validate core problem assumptions", "status": "todo", "priority": "p1"},
                {"title": "Define ICP (Ideal Customer Profile)", "status": "todo", "priority": "p1"},
                {"title": "Map customer Jobs to be Done (JTBD)", "status": "todo", "priority": "p1"},
                {"title": "Create value proposition canvas", "status": "todo", "priority": "p2"},
                {"title": "Validate with at least 3 target customers", "status": "todo", "priority": "p2"},
            ],
            "3": [
                {"title": "Define MVP feature scope", "status": "todo", "priority": "p1"},
                {"title": "Draft system architecture diagram", "status": "todo", "priority": "p1"},
                {"title": "Create data model and database schema", "status": "todo", "priority": "p1"},
                {"title": "Define API contracts and specifications", "status": "todo", "priority": "p1"},
                {"title": "Document tech stack and tooling decisions", "status": "todo", "priority": "p2"},
                {"title": "Create development environment setup guide", "status": "todo", "priority": "p2"},
            ],
            "4": [
                {"title": "Research and map competitive landscape", "status": "todo", "priority": "p1"},
                {"title": "Complete competitor feature teardown", "status": "todo", "priority": "p1"},
                {"title": "Document pricing and positioning of competitors", "status": "todo", "priority": "p2"},
                {"title": "Define unique differentiation points", "status": "todo", "priority": "p1"},
                {"title": "Write positioning statement and messaging", "status": "todo", "priority": "p1"},
                {"title": "Identify top 3 initial acquisition channels", "status": "todo", "priority": "p2"},
            ],
            "5": [
                {"title": "Define revenue model and pricing tiers", "status": "todo", "priority": "p1"},
                {"title": "Estimate Customer Acquisition Cost (CAC)", "status": "todo", "priority": "p1"},
                {"title": "Project Lifetime Value (LTV) per customer", "status": "todo", "priority": "p1"},
                {"title": "Model unit economics (CAC payback, margins)", "status": "todo", "priority": "p1"},
                {"title": "Create 3-year financial projections", "status": "todo", "priority": "p2"},
                {"title": "Validate pricing with 5+ target customers", "status": "todo", "priority": "p2"},
            ],
            "6": [
                {"title": "Create 12-month product roadmap", "status": "todo", "priority": "p1"},
                {"title": "Define quarterly milestones and KPIs", "status": "todo", "priority": "p1"},
                {"title": "Map hiring plan and team growth", "status": "todo", "priority": "p1"},
                {"title": "Create resource and budget allocation plan", "status": "todo", "priority": "p1"},
                {"title": "Identify funding timeline and requirements", "status": "todo", "priority": "p2"},
                {"title": "Set up reporting and review cadence", "status": "todo", "priority": "p2"},
            ],
            "7": [
                {"title": "Define ideal team structure (next 12 months)", "status": "todo", "priority": "p1"},
                {"title": "Create detailed job descriptions for open roles", "status": "todo", "priority": "p1"},
                {"title": "Develop hiring strategy and sourcing plan", "status": "todo", "priority": "p1"},
                {"title": "Set compensation benchmarks and packages", "status": "todo", "priority": "p2"},
                {"title": "Create interview process and scorecard", "status": "todo", "priority": "p2"},
                {"title": "Design onboarding and culture plan", "status": "todo", "priority": "p2"},
            ],
            "8": [
                {"title": "List specific incubator support tracks needed", "status": "todo", "priority": "p1"},
                {"title": "Define success criteria for each support track", "status": "todo", "priority": "p1"},
                {"title": "Map top 3 risks and mitigation strategies", "status": "todo", "priority": "p1"},
                {"title": "Identify and reach out to key advisors/mentors", "status": "todo", "priority": "p2"},
                {"title": "Schedule monthly check-ins with cohort manager", "status": "todo", "priority": "p2"},
                {"title": "Create quarterly retrospective plan", "status": "todo", "priority": "p2"},
            ],
            "9": [
                {"title": "Create comprehensive QA and test plan", "status": "todo", "priority": "p1"},
                {"title": "Define launch readiness checklist", "status": "todo", "priority": "p1"},
                {"title": "Write operational runbooks for key processes", "status": "todo", "priority": "p1"},
                {"title": "Set up monitoring and alerting (SLAs)", "status": "todo", "priority": "p1"},
                {"title": "Create incident response and escalation plan", "status": "todo", "priority": "p2"},
                {"title": "Conduct launch dry-run and fix issues", "status": "todo", "priority": "p2"},
            ],
        }
        return tasks_map.get(stage_key, [])

    def create_metrics(self, stage_key: str) -> List[Dict[str, Any]]:
        """Generate KPI metrics for each stage."""
        metrics_map = {
            "1": [
                {"key": "founder_score", "name": "Founder Capability Score", "current": 0, "target": 85, "unit": "pts"},
                {"key": "team_readiness", "name": "Team Readiness", "current": 0, "target": 100, "unit": "%"},
                {"key": "support_gaps_identified", "name": "Support Gaps Identified", "current": 0, "target": 5, "unit": "count"},
            ],
            "2": [
                {"key": "interviews_conducted", "name": "Customer Discovery Interviews", "current": 0, "target": 10, "unit": "count"},
                {"key": "problem_validation_score", "name": "Problem Validation Score", "current": 0, "target": 80, "unit": "pts"},
                {"key": "icp_clarity", "name": "ICP Definition Clarity", "current": 0, "target": 90, "unit": "%"},
            ],
            "3": [
                {"key": "mvp_completeness", "name": "MVP Feature Completeness", "current": 0, "target": 100, "unit": "%"},
                {"key": "architecture_ready", "name": "Architecture Document Ready", "current": 0, "target": 1, "unit": "doc"},
                {"key": "api_endpoints", "name": "API Endpoints Documented", "current": 0, "target": 15, "unit": "count"},
            ],
            "4": [
                {"key": "competitors_analyzed", "name": "Competitors Analyzed", "current": 0, "target": 8, "unit": "count"},
                {"key": "positioning_clarity", "name": "Positioning & Messaging Clarity", "current": 0, "target": 85, "unit": "pts"},
                {"key": "channels_identified", "name": "Acquisition Channels Identified", "current": 0, "target": 5, "unit": "count"},
            ],
            "5": [
                {"key": "pricing_validated", "name": "Pricing Validated with Customers", "current": 0, "target": 5, "unit": "count"},
                {"key": "ltv_cac_ratio", "name": "LTV/CAC Ratio Target", "current": 0, "target": 3, "unit": "ratio"},
                {"key": "unit_econ_model", "name": "Unit Economics Model Ready", "current": 0, "target": 1, "unit": "doc"},
            ],
            "6": [
                {"key": "roadmap_milestones", "name": "Roadmap Milestones Defined", "current": 0, "target": 4, "unit": "count"},
                {"key": "kpi_clarity", "name": "KPI Clarity by Quarter", "current": 0, "target": 100, "unit": "%"},
                {"key": "hiring_plan_ready", "name": "Hiring Plan Ready", "current": 0, "target": 1, "unit": "doc"},
            ],
            "7": [
                {"key": "critical_hires", "name": "Critical Hires Filled", "current": 0, "target": 3, "unit": "count"},
                {"key": "hiring_pipeline", "name": "Hiring Pipeline Health", "current": 0, "target": 80, "unit": "pts"},
                {"key": "offer_acceptance_rate", "name": "Offer Acceptance Rate", "current": 0, "target": 70, "unit": "%"},
            ],
            "8": [
                {"key": "support_tracks_engaged", "name": "Support Tracks Engaged", "current": 0, "target": 5, "unit": "count"},
                {"key": "mentor_meetings", "name": "Mentor Meetings Scheduled", "current": 0, "target": 8, "unit": "count"},
                {"key": "risk_mitigation", "name": "Top Risks Mitigated", "current": 0, "target": 100, "unit": "%"},
            ],
            "9": [
                {"key": "test_coverage", "name": "Test Coverage (Critical Paths)", "current": 0, "target": 95, "unit": "%"},
                {"key": "launch_readiness", "name": "Launch Readiness Score", "current": 0, "target": 100, "unit": "pts"},
                {"key": "p0_defects", "name": "P0 Defects at Launch", "current": 0, "target": 0, "unit": "count"},
            ],
        }
        return metrics_map.get(stage_key, [])

    def create_artifacts(self, stage_key: str) -> List[Dict[str, Any]]:
        """Generate required artifacts for each stage."""
        artifacts_map = {
            "1": [
                {"name": "Founder Background Summary", "url": ""},
                {"name": "RACI Matrix", "url": ""},
                {"name": "Support Needs Assessment", "url": ""},
            ],
            "2": [
                {"name": "Customer Interview Summary", "url": ""},
                {"name": "ICP Definition Document", "url": ""},
                {"name": "Value Proposition Canvas", "url": ""},
                {"name": "Problem Validation Report", "url": ""},
            ],
            "3": [
                {"name": "MVP Feature Specification", "url": ""},
                {"name": "Architecture Diagram", "url": ""},
                {"name": "Data Model & Schema", "url": ""},
                {"name": "API Documentation", "url": ""},
            ],
            "4": [
                {"name": "Competitive Analysis Report", "url": ""},
                {"name": "Competitor Feature Teardown", "url": ""},
                {"name": "Positioning & Messaging Document", "url": ""},
                {"name": "Market Size & TAM Analysis", "url": ""},
            ],
            "5": [
                {"name": "Pricing Strategy Document", "url": ""},
                {"name": "Unit Economics Model", "url": ""},
                {"name": "Revenue Projection Spreadsheet", "url": ""},
                {"name": "CAC/LTV Analysis", "url": ""},
            ],
            "6": [
                {"name": "12-Month Roadmap", "url": ""},
                {"name": "Quarterly Milestone Plan", "url": ""},
                {"name": "Resource & Budget Allocation", "url": ""},
                {"name": "Funding Strategy Document", "url": ""},
            ],
            "7": [
                {"name": "Organizational Structure Chart", "url": ""},
                {"name": "Job Descriptions (All Roles)", "url": ""},
                {"name": "Hiring Plan & Timeline", "url": ""},
                {"name": "Compensation & Benefits Package", "url": ""},
            ],
            "8": [
                {"name": "Support Engagement Plan", "url": ""},
                {"name": "Success Criteria Framework", "url": ""},
                {"name": "Risk Register & Mitigation Plan", "url": ""},
                {"name": "Advisor & Mentor Engagement Plan", "url": ""},
            ],
            "9": [
                {"name": "QA & Test Plan", "url": ""},
                {"name": "Launch Readiness Checklist", "url": ""},
                {"name": "Operational Runbooks", "url": ""},
                {"name": "Incident Response Plan", "url": ""},
            ],
        }
        return artifacts_map.get(stage_key, [])

    def create_experiments(self, stage_key: str) -> List[Dict[str, Any]]:
        """Generate experiments for each stage."""
        experiments_map = {
            "1": [
                {"name": "Founder Capability Assessment", "status": "not_started"},
                {"name": "Team Dynamics Assessment", "status": "not_started"},
            ],
            "2": [
                {"name": "Problem Validation Sprint", "status": "not_started"},
                {"name": "Landing Page Smoke Test", "status": "not_started"},
                {"name": "ICP Targeting Experiment", "status": "not_started"},
            ],
            "3": [
                {"name": "MVP Prototype Usability Test", "status": "not_started"},
                {"name": "Feature Priority Validation", "status": "not_started"},
                {"name": "Tech Stack Performance Benchmark", "status": "not_started"},
            ],
            "4": [
                {"name": "Positioning A/B Test", "status": "not_started"},
                {"name": "Channel Effectiveness Test", "status": "not_started"},
                {"name": "Competitor Comparison Survey", "status": "not_started"},
            ],
            "5": [
                {"name": "Price Sensitivity Analysis", "status": "not_started"},
                {"name": "Pricing Tier Experiment", "status": "not_started"},
                {"name": "Revenue Model Validation", "status": "not_started"},
            ],
            "6": [
                {"name": "Milestone Achievability Review", "status": "not_started"},
                {"name": "Resource Allocation Scenario Test", "status": "not_started"},
                {"name": "Funding Timeline Validation", "status": "not_started"},
            ],
            "7": [
                {"name": "Hiring Channel Effectiveness Test", "status": "not_started"},
                {"name": "Interview Process Optimization", "status": "not_started"},
                {"name": "Contractor vs. FTE Comparison", "status": "not_started"},
            ],
            "8": [
                {"name": "Mentor Matching Pilot", "status": "not_started"},
                {"name": "Support Track Effectiveness Measurement", "status": "not_started"},
                {"name": "Incubator Engagement Optimization", "status": "not_started"},
            ],
            "9": [
                {"name": "Chaos Engineering Drill", "status": "not_started"},
                {"name": "Load Testing & Performance Tuning", "status": "not_started"},
                {"name": "Compliance & Security Review", "status": "not_started"},
            ],
        }
        return experiments_map.get(stage_key, [])

    def create_stage(self, stage_key: str, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a complete stage object for dashboard consumption."""
        definition = self.stage_definitions.get(stage_key, {})

        # Set initial status (only stage 1 starts in progress)
        status = "in_progress" if stage_key == "1" else "not_started"

        stage = {
            "key": stage_key,
            "title": definition.get("title", f"Stage {stage_key}"),
            "status": status,
            "template": {
                "description": definition.get("description", ""),
                "form_schema": definition.get("form_schema", []),
            },
            "form_data": {},
            "tasks": self.create_tasks(stage_key),
            "checklist": self.create_tasks(stage_key),  # Same as tasks for now
            "metrics": self.create_metrics(stage_key),
            "artifacts": self.create_artifacts(stage_key),
            "experiments": self.create_experiments(stage_key),
        }
        return stage

    def generate_dashboard_payload(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate complete dashboard payload with all 9 stages."""
        stages = []
        for stage_key in ["1", "2", "3", "4", "5", "6", "7", "8", "9"]:
            stage = self.create_stage(stage_key, startup_data)
            stages.append(stage)

        # Extract startup info for overview
        startup_info = startup_data.get("stages", {}).get("1", {}).get("data", {})
        startup_name = startup_info.get("startupName", "Unnamed Startup")

        dashboard_payload = {
            "success": True,
            "data": {
                "startup": {
                    "name": startup_name,
                    "website": startup_info.get("websiteUrl", ""),
                    "headquarters": startup_info.get("headquarters", ""),
                },
                "stages": stages,
                "overall_progress": 0,  # Will be updated as user progresses
                "kpis": [
                    {"label": "Total Stages", "value": len(stages)},
                    {"label": "Total Tasks", "value": sum(len(s["tasks"]) for s in stages)},
                    {"label": "Total Metrics", "value": sum(len(s["metrics"]) for s in stages)},
                    {"label": "Stages Completed", "value": 0},
                ],
                "alerts": [
                    {"type": "info", "message": "Welcome to your incubation journey! Start with Stage 1: Founders & Context."},
                ],
                "activity": [
                    {"type": "stage_created", "stage": "1", "message": "Incubation program initialized", "timestamp": datetime.utcnow().isoformat()},
                ],
                "generated_at": datetime.utcnow().isoformat() + "Z",
            }
        }
        return dashboard_payload

    def save_to_json(self, data: Dict[str, Any], output_path: str):
        """Save payload to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Dashboard payload saved to: {output_path}")

    def generate(self, input_json_path: str, output_json_path: str = "dashboard_payload.json"):
        """Main orchestration: load input, generate payload, save output."""
        print(f"Loading startup data from: {input_json_path}")
        startup_data = self.load_input_json(input_json_path)

        print("Generating dashboard payload for 9 stages...")
        dashboard_payload = self.generate_dashboard_payload(startup_data)

        print("Saving output...")
        self.save_to_json(dashboard_payload, output_json_path)

        # Print summary
        print("\n" + "="*60)
        print("DASHBOARD PAYLOAD GENERATED SUCCESSFULLY")
        print("="*60)
        print(f"Startup: {dashboard_payload['data']['startup']['name']}")
        print(f"Stages: {len(dashboard_payload['data']['stages'])}")
        print(f"Total Tasks: {sum(len(s['tasks']) for s in dashboard_payload['data']['stages'])}")
        print(f"Total Metrics: {sum(len(s['metrics']) for s in dashboard_payload['data']['stages'])}")
        print(f"Total Artifacts: {sum(len(s['artifacts']) for s in dashboard_payload['data']['stages'])}")
        print(f"Total Experiments: {sum(len(s['experiments']) for s in dashboard_payload['data']['stages'])}")
        print("="*60)

        return dashboard_payload


# Main execution
if __name__ == "__main__":
    import sys

    input_file = sys.argv[1] if len(sys.argv) > 1 else "97ce70ee-5ba3-4092-a7f6-d80ff2471619.json"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "dashboard_payload.json"

    generator = DashboardDataGenerator()
    generator.generate(input_file, output_file)
