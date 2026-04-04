import json
import dataclasses
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime, timedelta

# --- MOCK MODELS ---

class StartupStatus(Enum):
    ACTIVE = "active"

@dataclasses.dataclass
class MockStartup:
    name: str
    slug: str
    startup_type: str
    industry: str
    status: StartupStatus = StartupStatus.ACTIVE
    mission: Optional[str] = None

@dataclasses.dataclass
class MockBusinessModel:
    name: str
    model_type: str
    pricing: str
    target_margin: Optional[float] = None
    revenue_streams: List[str] = dataclasses.field(default_factory=list)

@dataclasses.dataclass
class MockProduct:
    name: str
    features: List[Dict[str, str]] = dataclasses.field(default_factory=list) # {name, status}
    tech_stack: List[str] = dataclasses.field(default_factory=list)

@dataclasses.dataclass
class MockTask:
    title: str
    description: str
    priority: str = "Medium"
    status: str = "Pending"

@dataclasses.dataclass
class MockFundraise:
    goal_amount: float
    valuation_target: Optional[float] = None
    runway_months: Optional[int] = None
    status: str = "Planning"

@dataclasses.dataclass
class DashboardState:
    startup: MockStartup
    business_model: Optional[MockBusinessModel] = None
    products: List[MockProduct] = dataclasses.field(default_factory=list)
    tasks: List[MockTask] = dataclasses.field(default_factory=list)
    fundraise: Optional[MockFundraise] = None
    messages: List[Dict[str, str]] = dataclasses.field(default_factory=list) # Chat history

    def to_json(self):
        return json.dumps(dataclasses.asdict(self), default=str, indent=4)

# --- ARCHETYPES ---

ARCHETYPES = {
    "Logistics_Drone": {
        "required_entities": ["Product", "BusinessModel", "RegulatoryCompliance"],
        "critical_keywords": ["BVLOS", "Insurance", "Payload", "Range"],
        "milestones": [
            "Secure BVLOS Approval",
            "Stable Flight Test (>30 mins)",
            "Pilot Certification"
        ],
        "business_model_defaults": {
            "type": "B2B_Contract",
            "revenue": "Per Delivery or Retainer"
        }
    },
    "B2B_SaaS": {
        "required_entities": ["Product", "BusinessModel", "MarketingSite"],
        "critical_keywords": ["MVP", "Churn", "CAC", "LTV"],
        "milestones": [
            "MVP Launch",
            "First 10 Paying Customers",
            "incorporation"
        ],
        "business_model_defaults": {
            "type": "Subscription",
            "revenue": "Monthly Recurring Revenue (MRR)"
        }
    }
}

# --- GAP ANALYSIS ---

@dataclasses.dataclass
class Gap:
    category: str # Regulatory, Product, Business, Finance
    description: str
    severity: str # Critical, Warning

class SetupEngine:
    def __init__(self, submission_data: Dict[str, Any]):
        self.submission = submission_data
        self.archetype_key = self._detect_archetype()
        self.archetype = ARCHETYPES.get(self.archetype_key, {})
        self.dashboard = self._init_dashboard()
        self.gaps: List[Gap] = []

    def _detect_archetype(self):
        # ROI: Simple rule-based detection for prototype
        idea = self.submission.get("product_service_idea", "").lower()
        if "drone" in idea:
            return "Logistics_Drone"
        if "saas" in idea or "platform" in idea:
            return "B2B_SaaS"
        return "Generic"

    def _init_dashboard(self):
        return DashboardState(
            startup=MockStartup(
                name=self.submission.get("startup_name", "My Startup"),
                slug=self.submission.get("startup_name", "my-startup").lower().replace(" ", "-"),
                startup_type=self.archetype_key,
                industry=self.submission.get("industry", "Unknown"),
                mission=self.submission.get("problem_statement")
            )
        )

    def logger(self, type, message):
        colors = {
            "THOUGHT": "\033[95m", # Pink
            "ACTION": "\033[94m",  # Blue
            "GAP": "\033[93m",     # Yellow
            "RESET": "\033[0m"
        }
        print(f"{colors.get(type, '')}[{type}] {message}{colors['RESET']}")

    def analyze_gaps(self):
        self.logger("THOUGHT", f"Analyzing Inputs for Archetype: {self.archetype_key}...")
        
        # 1. Regulatory Check (Drone Specific)
        if self.archetype_key == "Logistics_Drone":
            if "bvlos" not in str(self.submission).lower():
                self.gaps.append(Gap("Regulatory", "BVLOS Approval missing", "Critical"))
                self.logger("GAP", "Found CRITICAL GAP: Regulatory/BVLOS not mentioned.")
        
        # 2. Tech Check
        if "mvp" not in str(self.submission).lower() and "prototype" not in str(self.submission).lower():
             self.gaps.append(Gap("Product", "MVP/Prototype status unclear", "Warning"))
             self.logger("GAP", "Found GAP: Tech Readiness unclear (MVP/Prototype).")

        # 3. Finance Check
        if "fund" in str(self.submission).lower() or "invest" in str(self.submission).lower():
             # Check for runway details? 
             # For now, just assume we need to ask.
             self.logger("THOUGHT", "User mentioned funding. Will need to verify runway and valuation goals.")
             pass
        else:
             self.gaps.append(Gap("Finance", "Funding strategy undefined", "Warning"))
             self.logger("GAP", "Found GAP: No funding strategy mentioned.")

        return self.gaps

    def parse_input(self, user_input, type="number"):
        import re
        if type == "number":
            # Extract first number found
            matches = re.findall(r'\d+', user_input)
            if matches:
                return float(matches[0])
        return None

    def _simulate_research(self, topic):
        self.logger("THOUGHT", f"Researching external data for: {topic}...")
        # Mocked external knowledge
        if "BVLOS" in topic and "India" in topic:
            return "DGCA (India) allows BVLOS under specific trials (Digital Sky Platform). Not fully commercial yet."
        return "No specific data found."

    def run_conversation_simulation(self, interactive=False):
        """
        Simulates the AI filling the gaps with Dynamic Branching.
        """
        self.dashboard.messages.append({"role": "system", "content": f"Archetype Detected: {self.archetype_key}"})
        
        # Phase 1: Address Critical Gaps
        for gap in self.gaps:
            if gap.severity == "Critical":
                # Regulatory Dynamic Logic
                if gap.category == "Regulatory" and "BVLOS" in gap.description:
                    user_response = self._simulate_turn(
                        ai_q=f"I see you are in {self.archetype_key}. Do you have BVLOS (Beyond Visual Line of Sight) approval yet?",
                        user_mock_a="i dont think that is required in india for now",
                        interactive=interactive
                    )
                    
                    if "no" in user_response.lower() or "don't" in user_response.lower() or "required" in user_response.lower():
                        # Trigger Research
                        if "india" in user_response.lower():
                            research = self._simulate_research("BVLOS India")
                            self.logger("ACTION", f"Sharing Research: {research}")
                        
                        self.logger("ACTION", "Created Critical Task: 'Secure BVLOS Approval'")
                        self.dashboard.tasks.append(MockTask("Secure BVLOS Approval", "Regulatory requirement for commercial Ops", "High"))
                    else:
                        self.logger("ACTION", "Logged: Regulatory Status OK")

            if gap.category == "Finance":
                 user_response = self._simulate_turn(
                    ai_q="How are you funding this? Bootstrapping or Raising?",
                    user_mock_a="Raising a seed round of $1M.",
                    interactive=interactive
                 )
                 # Simple parsing
                 if "raising" in user_response.lower() or "raise" in user_response.lower():
                     amount = self.parse_input(user_response) or 1000000
                     self.logger("ACTION", f"Setup Fundraising Goals: ${amount}")
                     self.dashboard.fundraise = MockFundraise(goal_amount=amount, status="Seed Planning")
                 else:
                     self.logger("ACTION", "Logged: Bootstrapped Strategy")

        # Phase 2: Product Strategy (Dynamic Tech Check)
        if self.archetype_key == "Logistics_Drone":
             user_response = self._simulate_turn(
                 ai_q="What's your drone's range? For rural delivery you need >30 mins flight time.",
                 user_mock_a="Currently 15 mins.",
                 interactive=interactive
             )
             
             range_val = self.parse_input(user_response)
             
             if range_val and range_val < 30:
                 self.logger("GAP", f"Range {range_val}mins is below archetype threshold (30mins).")
                 self.logger("ACTION", "Flagged Tech Gap. Pivot suggested: Focus on R&D.")
                 self.dashboard.tasks.append(MockTask("R&D: Extend Battery Life", "Critical for rural viability", "High"))
             else:
                 self.logger("ACTION", f"Tech Validation Passed: {range_val}mins > 30mins.")
                 self.dashboard.products.append(MockProduct(name="SkyDrop VTOL v1", features=[
                    {"name": "Long Range verified", "status": "Ready"}
                 ]))

        # Phase 3: Business Model
        defaults = self.archetype.get("business_model_defaults", {})
        self.logger("ACTION", f"Auto-Generating Business Model: {defaults.get('type')}")
        self.dashboard.business_model = MockBusinessModel(
            name="Core Operations",
            model_type=defaults.get("type", "Unknown"),
            pricing="To Be Determined",
            revenue_streams=[defaults.get("revenue", "Sales")]
        )
    
    def _simulate_turn(self, ai_q, user_mock_a, interactive=False):
        print(f"\n\033[92mAI: {ai_q}\033[0m")
        
        if interactive:
            user_a = input("User (You): ")
        else:
            user_a = user_mock_a
            print(f"User (Simulated): {user_a}")
        
        self.dashboard.messages.append({"role": "ai", "content": ai_q})
        self.dashboard.messages.append({"role": "user", "content": user_a})
        return user_a

    def export_state(self):
        return self.dashboard.to_json()

if __name__ == "__main__":
    # Test Run
    pass
