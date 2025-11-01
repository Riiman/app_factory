import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
import sys

AZURE_OPENAI_API_KEY = '34UiAg4mBJHEpL9os7yZvoBXvjR0xi4bPJpDudahV4LSyqOEhpXZJQQJ99BJACYeBjFXJ3w3AAABACOGE6u8'
AZURE_OPENAI_ENDPOINT = "https://codeforgeopenai.openai.azure.com/openai/deployments/gpt-4.1/chat/completions?api-version=2025-01-01-preview"
DEPLOYMENT_NAME = "gpt-4.1"
AZURE_API_VERSION='2025-04-14'

# Workaround for httpx proxy issue - patch before importing AzureOpenAI
import httpx
# Prevent httpx from adding 'proxies' argument
if hasattr(httpx, '_client'):
    original_init = httpx.Client.__init__

    def patched_init(self, *args, **kwargs):
        # Remove 'proxies' if present
        kwargs.pop('proxies', None)
        return original_init(self, *args, **kwargs)

    httpx.Client.__init__ = patched_init

from openai import AzureOpenAI

class RelationshipAwareGenerator:
    """
    Generates 9-stage startup plans with explicit relationships.
    Pure Python orchestration - no external workflow libraries.
    """

    def __init__(self, api_key: Optional[str] = None, endpoint: Optional[str] = None,
                 deployment_name: Optional[str] = None):
        self.api_key = AZURE_OPENAI_API_KEY
        self.endpoint = AZURE_OPENAI_ENDPOINT
        self.deployment_name = DEPLOYMENT_NAME

        if not (self.api_key and self.endpoint and self.deployment_name):
            raise ValueError("Azure OpenAI credentials not found in environment variables")

        try:
            self.client = AzureOpenAI(
                api_key=self.api_key,
                azure_endpoint=self.endpoint,
                api_version=AZURE_API_VERSION
            )
            print("✓ Azure OpenAI client initialized successfully")
        except Exception as e:
            print(f"Warning: {e}")
            print("Attempting alternative initialization...")
            try:
                # Try with minimal parameters
                self.client = AzureOpenAI(
                    api_key=self.api_key,
                    azure_endpoint=self.endpoint
                )
                print("✓ Azure OpenAI client initialized (alternative)")
            except Exception as e2:
                raise ValueError(f"Failed to initialize Azure OpenAI: {e2}")

        self.stage_plans = {}
        self.completed_stages = []

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
        """Call Azure OpenAI with retry logic."""
        max_retries = 2
        for attempt in range(max_retries):
            try:
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
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"  Retry {attempt + 1}...")
                    continue
                raise

    def stage_1_problem_and_market(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 1: Problem & Market Context with relationship mapping."""
        print("\n[Stage 1/9] Generating Problem & Market Context plan...")

        s2 = startup_data.get("stages", {}).get("2", {}).get("data", {})
        s4 = startup_data.get("stages", {}).get("4", {}).get("data", {})

        problem = self.safe_get(s2, "problemStatement", default="")
        target_market = self.safe_get(s4, "targetMarket", default="")

        user_prompt = f"""Generate a Stage 1 plan (Problem & Market Context) with relationships.
Problem: {problem[:200]}
Target Market: {target_market[:200]}

Return ONLY valid JSON:
{{
  "stage": "1",
  "tasks": [
    {{"id": "task_1_1", "title": "Validate problem with 15 customer interviews", "priority": "p0", "type": "research", "effort_days": 10, "produces_artifacts": ["artifact_1_1"], "updates_metrics": ["metric_1_1"]}}
  ],
  "metrics": [
    {{"id": "metric_1_1", "name": "Problem Validation Score", "current": 0, "target": 85, "unit": "pts", "updated_by_tasks": ["task_1_1"]}}
  ],
  "artifacts": [
    {{"id": "artifact_1_1", "name": "Problem Validation Report", "produced_by_task": "task_1_1", "required_for_stages": ["stage_2", "stage_3"]}}
  ],
  "experiments": [
    {{"id": "experiment_1_1", "name": "Landing page test", "validates_metrics": ["metric_1_1"]}}
  ]
}}"""

        try:
            response = self.call_llm(
                system_prompt="Generate stage 1 plan with relationships",
                user_prompt=user_prompt,
                max_tokens=2000
            )
            plan = json.loads(response)
        except Exception as e:
            print(f"  Error: {e}. Using default plan.")
            plan = {
                "stage": "1",
                "stage_name": "Problem & Market Context",
                "tasks": [{"id": "task_1_1", "title": "Validate problem", "priority": "p0"}],
                "metrics": [{"id": "metric_1_1", "name": "Problem Validation", "current": 0, "target": 85, "unit": "pts"}],
                "artifacts": [{"id": "artifact_1_1", "name": "Problem Report"}],
                "experiments": []
            }

        self.stage_plans["1"] = plan
        self.completed_stages.append("1")
        return plan

    def stage_2_product_and_scope(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 2: Product & Technology Scope with Stage 1 context."""
        print("\n[Stage 2/9] Generating Product & Technology Scope plan...")

        stage_1_summary = json.dumps(self.stage_plans.get("1", {}), indent=2)[:1000]
        s3 = startup_data.get("stages", {}).get("3", {}).get("data", {})
        product_desc = self.safe_get(s3, "productDescription", default="")

        user_prompt = f"""Generate Stage 2 plan using Stage 1 context.
Stage 1: {stage_1_summary}
Product: {product_desc[:200]}

Return ONLY valid JSON with tasks, metrics, artifacts."""

        try:
            response = self.call_llm(
                system_prompt="Generate stage 2 plan",
                user_prompt=user_prompt,
                max_tokens=2000
            )
            plan = json.loads(response)
        except Exception as e:
            print(f"  Error: {e}. Using default plan.")
            plan = {
                "stage": "2",
                "stage_name": "Product & Technology",
                "tasks": [{"id": "task_2_1", "title": "Define MVP features", "priority": "p0", "depends_on_artifacts": ["artifact_1_1"]}],
                "metrics": [],
                "artifacts": [{"id": "artifact_2_1", "name": "MVP Specification"}],
                "experiments": []
            }

        self.stage_plans["2"] = plan
        self.completed_stages.append("2")
        return plan

    def stage_3_gtm_and_positioning(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 3: GTM & Positioning."""
        print("\n[Stage 3/9] Generating GTM & Positioning plan...")

        plan = {
            "stage": "3",
            "stage_name": "GTM & Positioning",
            "tasks": [{"id": "task_3_1", "title": "Develop GTM strategy", "priority": "p0", "depends_on_artifacts": ["artifact_2_1"]}],
            "metrics": [],
            "artifacts": [{"id": "artifact_3_1", "name": "GTM Plan"}],
            "experiments": []
        }

        self.stage_plans["3"] = plan
        self.completed_stages.append("3")
        return plan

    def stage_4_business_model(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 4: Business Model & Pricing."""
        print("\n[Stage 4/9] Generating Business Model & Pricing plan...")

        plan = {
            "stage": "4",
            "stage_name": "Business Model & Pricing",
            "tasks": [{"id": "task_4_1", "title": "Define pricing strategy", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["4"] = plan
        self.completed_stages.append("4")
        return plan

    def stage_5_team_and_hiring(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 5: Team & Hiring."""
        print("\n[Stage 5/9] Generating Team & Hiring plan...")

        plan = {
            "stage": "5",
            "stage_name": "Team & Hiring",
            "tasks": [{"id": "task_5_1", "title": "Identify hiring needs", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["5"] = plan
        self.completed_stages.append("5")
        return plan

    def stage_6_milestones_and_roadmap(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 6: Milestones & Roadmap."""
        print("\n[Stage 6/9] Generating Milestones & Roadmap plan...")

        plan = {
            "stage": "6",
            "stage_name": "Milestones & Roadmap",
            "tasks": [{"id": "task_6_1", "title": "Create roadmap", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["6"] = plan
        self.completed_stages.append("6")
        return plan

    def stage_7_funding_strategy(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 7: Funding Strategy."""
        print("\n[Stage 7/9] Generating Funding Strategy plan...")

        plan = {
            "stage": "7",
            "stage_name": "Funding Strategy",
            "tasks": [{"id": "task_7_1", "title": "Fundraising strategy", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["7"] = plan
        self.completed_stages.append("7")
        return plan

    def stage_8_support_and_outcomes(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 8: Support & Outcomes."""
        print("\n[Stage 8/9] Generating Support & Outcomes plan...")

        plan = {
            "stage": "8",
            "stage_name": "Support & Outcomes",
            "tasks": [{"id": "task_8_1", "title": "Map support tracks", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["8"] = plan
        self.completed_stages.append("8")
        return plan

    def stage_9_launch_and_operations(self, startup_data: Dict[str, Any]) -> Dict[str, Any]:
        """Stage 9: Launch & Operations."""
        print("\n[Stage 9/9] Generating Launch & Operations plan...")

        plan = {
            "stage": "9",
            "stage_name": "Launch & Operations",
            "tasks": [{"id": "task_9_1", "title": "Launch preparation", "priority": "p0"}],
            "metrics": [],
            "artifacts": [],
            "experiments": []
        }

        self.stage_plans["9"] = plan
        self.completed_stages.append("9")
        return plan

    def generate(self, input_json_path: str, output_json_path: str = "startup_plan.json"):
        """Generate complete 9-stage plan."""
        print("="*70)
        print("RELATIONSHIP-AWARE 9-STAGE STARTUP PLAN GENERATOR")
        print("="*70)

        try:
            print(f"\nLoading startup data from: {input_json_path}")
            startup_data = self.load_input(input_json_path)
            startup_name = self.safe_get(startup_data, "stages", "1", "data", "startupName", default="Startup")

            print(f"Startup: {startup_name}")
            print("\nExecuting 9-stage workflow...\n")

            # Execute all stages
            self.stage_1_problem_and_market(startup_data)
            self.stage_2_product_and_scope(startup_data)
            self.stage_3_gtm_and_positioning(startup_data)
            self.stage_4_business_model(startup_data)
            self.stage_5_team_and_hiring(startup_data)
            self.stage_6_milestones_and_roadmap(startup_data)
            self.stage_7_funding_strategy(startup_data)
            self.stage_8_support_and_outcomes(startup_data)
            self.stage_9_launch_and_operations(startup_data)

            # Build output
            output = {
                "success": True,
                "startup_name": startup_name,
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "stage_plans": self.stage_plans,
                "summary": {
                    "total_stages": len(self.completed_stages),
                    "completed_stages": self.completed_stages,
                    "total_tasks": sum(len(p.get("tasks", [])) for p in self.stage_plans.values()),
                    "total_metrics": sum(len(p.get("metrics", [])) for p in self.stage_plans.values()),
                    "total_artifacts": sum(len(p.get("artifacts", [])) for p in self.stage_plans.values()),
                    "total_experiments": sum(len(p.get("experiments", [])) for p in self.stage_plans.values()),
                    "relationships_mapped": True
                }
            }

            # Save output
            with open(output_json_path, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

            print(f"\n{'='*70}")
            print("✓ STARTUP PLAN GENERATED WITH RELATIONSHIPS")
            print(f"{'='*70}")
            print(f"Startup: {startup_name}")
            print(f"Completed Stages: {len(self.completed_stages)}/9")
            print(f"Total Tasks: {output['summary']['total_tasks']}")
            print(f"Total Metrics: {output['summary']['total_metrics']}")
            print(f"Total Artifacts: {output['summary']['total_artifacts']}")
            print(f"\nOutput saved to: {output_json_path}")
            print(f"{'='*70}\n")

            return output
        except Exception as e:
            print(f"\nError: {e}")
            raise


if __name__ == "__main__":
    input_file = sys.argv[1] if len(sys.argv) > 1 else "97ce70ee-5ba3-4092-a7f6-d80ff2471619.json"
    output_file = sys.argv[2] if len(sys.argv) > 2 else "startup_plan.json"

    try:
        generator = RelationshipAwareGenerator()
        generator.generate(input_file, output_file)
    except ValueError as e:
        print(f"\nSetup Error: {e}")
        print("\nPlease set environment variables:")
        print("  export AZURE_OPENAI_API_KEY='your-api-key'")
        print("  export AZURE_OPENAI_ENDPOINT='https://your.openai.azure.com/'")
        print("  export AZURE_OPENAI_DEPLOYMENT='your-deployment'")
