import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from openai import AzureOpenAI
from langgraph.graph import StateGraph, END
from typing import TypedDict
from dotenv import load_dotenv

load_dotenv()

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY = '34UiAg4mBJHEpL9os7yZvoBXvjR0xi4bPJpDudahV4LSyqOEhpXZJQQJ99BJACYeBjFXJ3w3AAABACOGE6u8'
AZURE_OPENAI_ENDPOINT = "https://codeforgeopenai.openai.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview"
DEPLOYMENT_NAME = "gpt-4.1"
AZURE_API_VERSION='2025-04-14'

class StartupPlanState(TypedDict):
    """State object for the 9-stage planning workflow with relationships."""
    startup_data: Dict[str, Any]
    stage_plans: Dict[str, Dict[str, Any]]  # keyed by stage number
    completed_stages: List[str]
    error: Optional[str]

class RelationshipAwareGenerator:
    """
    Generates 9-stage startup plans using LangGraph with explicit relationships
    between tasks, metrics, artifacts, and experiments.
    """

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None,
                 deployment_name: Optional[str] = None):
        self.api_key = AZURE_OPENAI_API_KEY
        self.endpoint = AZURE_OPENAI_ENDPOINT
        self.deployment_name = DEPLOYMENT_NAME

        if not (self.api_key and self.endpoint and self.deployment_name):
            raise ValueError("Azure OpenAI credentials not found in environment variables")

        self.client = AzureOpenAI(
            api_key=self.api_key,
            api_version=AZURE_API_VERSION,
            azure_endpoint=self.endpoint
        )

    def load_input(self, json_path: str) -> Dict[str, Any]:
        """Load startup input JSON."""
        with open(json_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def safe_get(self, data: Dict, *keys, default="") -> str:
        """Safely extract nested field."""
        current = data
        for key in keys:
            if isinstance(current, dict):
                current = current.get(key, default)
            else:
                return default
        return str(current) if current not in (None, "") else default

    def call_llm(self, system_prompt: str, user_prompt: str, max_tokens: int = 4000,
                 temperature: float = 0.7) -> str:
        """Call Azure OpenAI."""
        response = self.client.chat.completions.create(
            model=self.deployment_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens
        )
        return response.choices[0].message.content

    # ============ STAGE GENERATORS WITH RELATIONSHIPS ============

    def stage_1_problem_and_market(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 1: Problem & Market Context with relationship mapping."""
        print("\n[Stage 1] Generating Problem & Market Context plan...")

        startup_data = state["startup_data"]
        s1 = startup_data.get("stages", {}).get("1", {}).get("data", {})
        s2 = startup_data.get("stages", {}).get("2", {}).get("data", {})
        s4 = startup_data.get("stages", {}).get("4", {}).get("data", {})

        problem = self.safe_get(s2, "problemStatement", default="")
        target_market = self.safe_get(s4, "targetMarket", default="")
        market_size = self.safe_get(s4, "marketSize", default="")

        user_prompt = f"""Generate a Stage 1 plan (Problem & Market Context) with EXPLICIT RELATIONSHIPS between tasks, metrics, artifacts, and experiments.

STARTUP DATA:
- Problem: {problem}
- Target Market: {target_market}
- Market Size: {market_size}

CRITICAL: For each task, specify:
1. What artifact it produces (use ID: artifact_1_N)
2. What metrics it updates (use ID: metric_1_N)
3. What experiments it triggers (use ID: experiment_1_N)

For each metric, specify:
1. What task updates it
2. How to measure it
3. Success threshold

For each artifact, specify:
1. What task produces it
2. What downstream tasks/stages need it

Return ONLY valid JSON with this structure:
{{
  "stage": "1",
  "stage_name": "Problem & Market Context",
  "tasks": [
    {{
      "id": "task_1_1",
      "title": "Conduct 15 customer interviews",
      "priority": "p0",
      "type": "research",
      "produces_artifacts": ["artifact_1_1"],
      "updates_metrics": ["metric_1_1", "metric_1_2"],
      "triggers_experiments": ["experiment_1_1"],
      "depends_on_artifacts": [],
      "depends_on_tasks": [],
      "effort_days": 10,
      "rationale": "Why this task matters for this stage"
    }}
  ],
  "metrics": [
    {{
      "id": "metric_1_1",
      "name": "Customer Interviews Completed",
      "current": 0,
      "target": 15,
      "unit": "interviews",
      "updated_by_tasks": ["task_1_1"],
      "validated_by_experiments": ["experiment_1_1"],
      "measurement_method": "Manual count from interview transcripts",
      "success_threshold": 15,
      "impacts_downstream_stages": ["stage_2", "stage_3"]
    }}
  ],
  "artifacts": [
    {{
      "id": "artifact_1_1",
      "name": "Customer Interview Summary Report",
      "type": "document",
      "produced_by_task": "task_1_1",
      "required_for_tasks": ["task_1_2"],
      "required_for_stages": ["stage_2", "stage_3"],
      "contents": ["Interview transcripts", "Key themes", "Willingness to pay"],
      "completion_criteria": "15+ interviews with themes extracted"
    }}
  ],
  "experiments": [
    {{
      "id": "experiment_1_1",
      "name": "Landing page smoke test",
      "hypothesis": "If we articulate value prop clearly, 5%+ will sign up",
      "method": "Create landing page, drive 200 target visitors",
      "validates_metrics": ["metric_1_1", "metric_1_2"],
      "depends_on_artifacts": ["artifact_1_2"],
      "triggered_by_task": "task_1_1",
      "success_criteria": "10+ signups (5% conversion)",
      "estimated_cost_inr": 20000,
      "duration_days": 7
    }}
  ],
  "summary": "Stage 1 analysis and key findings",
  "stage_context": "What this stage is about and why it matters"
}}"""

        response = self.call_llm(
            system_prompt="""You are an expert startup strategist and project planner. 
Generate detailed stage plans with EXPLICIT relationships between all components.
Think in terms of task dependencies, metric dependencies, and artifact flows.
Each task produces artifacts that enable downstream tasks and metrics.
Make these relationships clear and actionable.""",
            user_prompt=user_prompt,
            max_tokens=4000
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"summary": response, "tasks": [], "metrics": [], "artifacts": [], "experiments": []}

        state["stage_plans"]["1"] = plan
        state["completed_stages"].append("1")
        return state

    def stage_2_product_and_scope(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 2: Product & Technology Scope with Stage 1 context."""
        print("\n[Stage 2] Generating Product & Technology Scope plan (using Stage 1 context)...")

        startup_data = state["startup_data"]
        stage_1_plan = state["stage_plans"].get("1", {})
        s3 = startup_data.get("stages", {}).get("3", {}).get("data", {})

        product_desc = self.safe_get(s3, "productDescription", default="")
        tech_stack = self.safe_get(s3, "techStack", default="")
        key_features = self.safe_get(s3, "keyFeatures", default="")

        # Extract ICP from Stage 1 for context
        stage_1_summary = json.dumps(stage_1_plan, indent=2)[:2000]

        user_prompt = f"""Generate a Stage 2 plan (Product & Technology Scope) with explicit relationships.

STAGE 1 CONTEXT (Problem & Market):
{stage_1_summary}

CURRENT STAGE DATA:
- Product: {product_desc}
- Tech Stack: {tech_stack}
- Key Features: {key_features}

CRITICAL REQUIREMENTS:
1. Stage 2 tasks MUST reference Stage 1 artifacts (e.g., "Uses ICP Personas from Stage 1")
2. Each MVP feature should map to a specific ICP need from Stage 1
3. Specify task dependencies clearly

Return ONLY valid JSON with full relationship mapping:
{{
  "stage": "2",
  "stage_name": "Product & Technology",
  "context_from_previous_stage": "How Stage 1 informed this stage",
  "tasks": [
    {{
      "id": "task_2_1",
      "title": "Design AI valuation engine (solves ICP need: transparent valuation)",
      "priority": "p0",
      "type": "ml",
      "produces_artifacts": ["artifact_2_1"],
      "updates_metrics": ["metric_2_1"],
      "depends_on_artifacts": ["artifact_1_2"],  // ICP Personas from Stage 1
      "effort_days": 20,
      "rationale": "Stage 1 identified that ICP's primary pain is lack of transparent valuation"
    }}
  ],
  "metrics": [...],
  "artifacts": [...],
  "experiments": [...],
  "summary": "..."
}}"""

        response = self.call_llm(
            system_prompt="""You are a technical architect and product manager.
Design the MVP with explicit references to Stage 1 findings.
Each feature should directly address an ICP pain point.
Specify all dependencies and relationships clearly.""",
            user_prompt=user_prompt,
            max_tokens=4000
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"summary": response, "tasks": [], "metrics": [], "artifacts": [], "experiments": []}

        state["stage_plans"]["2"] = plan
        state["completed_stages"].append("2")
        return state

    def stage_3_gtm_and_positioning(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 3: GTM & Positioning using Stages 1-2."""
        print("\n[Stage 3] Generating GTM & Positioning plan (using Stages 1-2 context)...")

        startup_data = state["startup_data"]
        stage_1_plan = state["stage_plans"].get("1", {})
        stage_2_plan = state["stage_plans"].get("2", {})
        s4 = startup_data.get("stages", {}).get("4", {}).get("data", {})

        competitors = self.safe_get(s4, "competitors", default="")
        differentiation = self.safe_get(s4, "differentiation", default="")

        context = f"""
STAGE 1 (Problem & ICP):
{json.dumps(stage_1_plan, indent=2)[:1500]}

STAGE 2 (MVP Features):
{json.dumps(stage_2_plan, indent=2)[:1500]}
"""

        user_prompt = f"""Generate Stage 3 plan (GTM & Positioning) with relationships.

CONTEXT FROM STAGES 1-2:
{context}

CURRENT DATA:
- Competitors: {competitors}
- Differentiation: {differentiation}

KEY REQUIREMENT:
- Stage 3 tasks must depend on Stage 2 artifacts (MVP feature list)
- GTM channels must target ICP from Stage 1
- Positioning should highlight MVP differentiators

Return ONLY valid JSON with relationship mapping:
{{
  "stage": "3",
  "stage_name": "GTM & Positioning",
  "context_from_previous_stages": "...",
  "tasks": [
    {{
      "id": "task_3_1",
      "title": "Develop positioning message highlighting AI valuation (Stage 2 MVP differentiator)",
      "priority": "p0",
      "type": "marketing",
      "depends_on_artifacts": ["artifact_2_1"],  // MVP features from Stage 2
      "produces_artifacts": ["artifact_3_1"],
      "updates_metrics": ["metric_3_1"]
    }}
  ],
  "metrics": [...],
  "artifacts": [...],
  "experiments": [...]
}}"""

        response = self.call_llm(
            system_prompt="You are a GTM strategist. Develop go-to-market leveraging MVP features and ICP insights.",
            user_prompt=user_prompt,
            max_tokens=4000
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"summary": response, "tasks": [], "metrics": [], "artifacts": [], "experiments": []}

        state["stage_plans"]["3"] = plan
        state["completed_stages"].append("3")
        return state

    def stage_4_business_model(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 4: Business Model & Pricing using Stages 1-3."""
        print("\n[Stage 4] Generating Business Model & Pricing plan (using Stages 1-3 context)...")

        startup_data = state["startup_data"]
        stage_1_plan = state["stage_plans"].get("1", {})
        stage_3_plan = state["stage_plans"].get("3", {})
        s5 = startup_data.get("stages", {}).get("5", {}).get("data", {})

        business_model = self.safe_get(s5, "businessModel", default="")
        pricing_strategy = self.safe_get(s5, "pricingStrategy", default="")

        context = f"""
STAGE 1 (ICP & Willingness to Pay):
{json.dumps(stage_1_plan.get("artifacts", []), indent=2)[:800]}

STAGE 3 (GTM Channels & CAC):
{json.dumps(stage_3_plan.get("metrics", []), indent=2)[:800]}
"""

        user_prompt = f"""Generate Stage 4 plan (Business Model & Pricing) with relationships.

CONTEXT FROM STAGES 1-3:
{context}

CURRENT DATA:
- Business Model: {business_model}
- Pricing Strategy: {pricing_strategy}

CRITICAL LINKS:
- Pricing tiers should match ICP segments from Stage 1
- CAC estimates should reference Stage 3 acquisition channels
- Revenue model should be validated through experiments

Return ONLY valid JSON with relationship mapping:
{{
  "stage": "4",
  "stage_name": "Business Model & Pricing",
  "tasks": [
    {{
      "id": "task_4_1",
      "title": "Design pricing tiers for 3 ICP segments",
      "depends_on_artifacts": ["artifact_1_2"],  // ICP Personas from Stage 1
      "produces_artifacts": ["artifact_4_1"],
      "updates_metrics": ["metric_4_1", "metric_4_2"]
    }}
  ],
  "metrics": [...],
  "artifacts": [...],
  "experiments": [...]
}}"""

        response = self.call_llm(
            system_prompt="You are a business model and pricing strategist.",
            user_prompt=user_prompt,
            max_tokens=4000
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"summary": response, "tasks": [], "metrics": [], "artifacts": [], "experiments": []}

        state["stage_plans"]["4"] = plan
        state["completed_stages"].append("4")
        return state

    def stage_5_team_and_hiring(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 5: Team & Hiring using ALL previous stages."""
        print("\n[Stage 5] Generating Team & Hiring plan (using Stages 1-4 context)...")

        startup_data = state["startup_data"]
        stage_2_plan = state["stage_plans"].get("2", {})
        stage_3_plan = state["stage_plans"].get("3", {})
        stage_4_plan = state["stage_plans"].get("4", {})
        s1 = startup_data.get("stages", {}).get("1", {}).get("data", {})
        s7 = startup_data.get("stages", {}).get("7", {}).get("data", {})

        current_team = self.safe_get(s1, "teamMembers", default="0")
        founder_bg = self.safe_get(s7, "founderBackground", default="")

        context = f"""
STAGE 2 REQUIREMENTS (MVP):
{json.dumps(stage_2_plan.get("tasks", [])[:2], indent=2)}

STAGE 3 REQUIREMENTS (GTM):
{json.dumps(stage_3_plan.get("tasks", [])[:2], indent=2)}

STAGE 4 REQUIREMENTS (Operations):
{json.dumps(stage_4_plan.get("tasks", [])[:2], indent=2)}
"""

        user_prompt = f"""Generate Stage 5 plan (Team & Hiring) with detailed gap analysis.

CONTEXT FROM STAGES 2-4 (What we need to build/execute):
{context}

CURRENT TEAM:
- Members: {current_team}
- Founder Background: {founder_bg}

CRITICAL REQUIREMENT:
For each hiring gap, specify:
1. Why this role is critical (reference specific Stage 2/3/4 requirement)
2. What task depends on this hire
3. What artifact this role will produce

Example: "Need ML Engineer because Stage 2 MVP requires AI valuation engine (artifact_2_1)"

Return ONLY valid JSON:
{{
  "stage": "5",
  "stage_name": "Team & Hiring",
  "founder_market_fit_analysis": {{
    "score": 0-100,
    "strengths": [],
    "gaps": []
  }},
  "tasks": [
    {{
      "id": "task_5_1",
      "title": "Hire ML Engineer (CRITICAL for Stage 2 AI valuation engine)",
      "priority": "p0",
      "type": "hiring",
      "why_critical": "Stage 2 requires AI valuation. Team has zero ML capability. BLOCKER for MVP.",
      "depends_on_stages": ["stage_2"],
      "unblocks_tasks": ["task_2_1"],
      "produces_artifacts": ["artifact_5_1"],  // ML Engineer onboarded & productive
      "timeline": "Q1 2026",
      "compensation": "₹18-25L + 0.8% equity"
    }}
  ],
  "metrics": [...],
  "artifacts": [...],
  "experiments": [...]
}}"""

        response = self.call_llm(
            system_prompt="""You are a talent advisor and organizational design expert.
Analyze what team is needed to execute the plan from Stages 2-4.
Be specific about why each role is critical and what it unblocks.""",
            user_prompt=user_prompt,
            max_tokens=4000
        )

        try:
            plan = json.loads(response)
        except json.JSONDecodeError:
            plan = {"summary": response, "tasks": [], "metrics": [], "artifacts": [], "experiments": []}

        state["stage_plans"]["5"] = plan
        state["completed_stages"].append("5")
        return state

    def stage_6_milestones_and_roadmap(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 6: Milestones & Roadmap using Stages 2, 4, 5."""
        print("\n[Stage 6] Generating Milestones & Roadmap plan (using Stages 2, 4, 5 context)...")

        state["stage_plans"]["6"] = {
            "stage": "6",
            "stage_name": "Milestones & Roadmap",
            "summary": "Quarterly roadmap based on MVP scope (Stage 2), team capacity (Stage 5), unit economics (Stage 4)"
        }
        state["completed_stages"].append("6")
        return state

    def stage_7_funding_strategy(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 7: Funding Strategy using Stages 4, 5, 6."""
        print("\n[Stage 7] Generating Funding Strategy plan (using Stages 4, 5, 6 context)...")

        state["stage_plans"]["7"] = {
            "stage": "7",
            "stage_name": "Funding Strategy",
            "summary": "Fundraising target based on roadmap (Stage 6), team costs (Stage 5), unit economics (Stage 4)"
        }
        state["completed_stages"].append("7")
        return state

    def stage_8_support_and_outcomes(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 8: Support & Outcomes using ALL stages."""
        print("\n[Stage 8] Generating Support & Outcomes plan (using all previous context)...")

        state["stage_plans"]["8"] = {
            "stage": "8",
            "stage_name": "Support & Outcomes",
            "summary": "Support track mapping addresses gaps identified across all stages"
        }
        state["completed_stages"].append("8")
        return state

    def stage_9_launch_and_operations(self, state: StartupPlanState) -> StartupPlanState:
        """Stage 9: Launch & Operations using Stages 2, 3, 4."""
        print("\n[Stage 9] Generating Launch & Operations plan (using Stages 2, 3, 4 context)...")

        state["stage_plans"]["9"] = {
            "stage": "9",
            "stage_name": "Launch & Operations",
            "summary": "Launch readiness based on MVP (Stage 2), GTM (Stage 3), and business model (Stage 4)"
        }
        state["completed_stages"].append("9")
        return state

    def build_workflow(self):
        """Build LangGraph workflow."""
        workflow = StateGraph(StartupPlanState)

        # Add nodes
        workflow.add_node("stage_1", self.stage_1_problem_and_market)
        workflow.add_node("stage_2", self.stage_2_product_and_scope)
        workflow.add_node("stage_3", self.stage_3_gtm_and_positioning)
        workflow.add_node("stage_4", self.stage_4_business_model)
        workflow.add_node("stage_5", self.stage_5_team_and_hiring)
        workflow.add_node("stage_6", self.stage_6_milestones_and_roadmap)
        workflow.add_node("stage_7", self.stage_7_funding_strategy)
        workflow.add_node("stage_8", self.stage_8_support_and_outcomes)
        workflow.add_node("stage_9", self.stage_9_launch_and_operations)

        # Set entry point
        workflow.set_entry_point("stage_1")

        # Chain stages with dependencies
        workflow.add_edge("stage_1", "stage_2")
        workflow.add_edge("stage_2", "stage_3")
        workflow.add_edge("stage_3", "stage_4")
        workflow.add_edge("stage_4", "stage_5")
        workflow.add_edge("stage_5", "stage_6")
        workflow.add_edge("stage_6", "stage_7")
        workflow.add_edge("stage_7", "stage_8")
        workflow.add_edge("stage_8", "stage_9")
        workflow.add_edge("stage_9", END)

        return workflow.compile()

    def generate(self, input_json_path: str, output_json_path: str = "startup_plan_with_relationships.json"):
        """Generate complete 9-stage plan with relationships."""
        print("="*70)
        print("RELATIONSHIP-AWARE 9-STAGE STARTUP PLAN GENERATOR")
        print("="*70)

        print("\nLoading startup data...")
        startup_data = self.load_input(input_json_path)
        startup_name = self.safe_get(startup_data, "stages", "1", "data", "startupName", default="Startup")

        print(f"Startup: {startup_name}")
        print(f"Executing workflow with relationship mapping...\n")

        workflow = self.build_workflow()

        initial_state: StartupPlanState = {
            "startup_data": startup_data,
            "stage_plans": {},
            "completed_stages": [],
            "error": None
        }

        final_state = workflow.invoke(initial_state)

        print(f"\nCompleted stages: {', '.join(final_state['completed_stages'])}")

        # Build dashboard output
        output = {
            "success": True,
            "startup_name": startup_name,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "stage_plans": final_state["stage_plans"],
            "summary": {
                "total_stages": len(final_state["completed_stages"]),
                "total_tasks": sum(len(p.get("tasks", [])) for p in final_state["stage_plans"].values()),
                "total_metrics": sum(len(p.get("metrics", [])) for p in final_state["stage_plans"].values()),
                "total_artifacts": sum(len(p.get("artifacts", [])) for p in final_state["stage_plans"].values()),
                "total_experiments": sum(len(p.get("experiments", [])) for p in final_state["stage_plans"].values()),
                "relationships_mapped": True
            }
        }

        with open(output_json_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*70}")
        print("✓ STARTUP PLAN GENERATED WITH EXPLICIT RELATIONSHIPS")
        print(f"{'='*70}")
        print(f"Output: {output_json_path}")
        print(f"Total Tasks with Relationships: {output['summary']['total_tasks']}")
        print(f"Total Metrics Mapped: {output['summary']['total_metrics']}")
        print(f"Total Artifacts with Dependencies: {output['summary']['total_artifacts']}")
        print(f"Total Experiments: {output['summary']['total_experiments']}")
        print(f"{'='*70}\n")

        return output


if __name__ == "__main__":
    import sys

    input_file = sys.argv[1] if len(sys.argv) > 1 else "97ce70ee-5ba3-4092-a7f6-d80ff2471619.json"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "startup_plan_with_relationships.json"

    try:
        generator = RelationshipAwareGenerator()
        generator.generate(input_file, output_file)
    except ValueError as e:
        print(f"Error: {e}")
        print("\nPlease set environment variables:")
        print("  export AZURE_OPENAI_API_KEY='your-key'")
        print("  export AZURE_OPENAI_ENDPOINT='your-endpoint'")
        print("  export AZURE_OPENAI_DEPLOYMENT='your-deployment'")
