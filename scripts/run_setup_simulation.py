import os
import json
from setup_engine_prototype import SetupEngine

# --- SCENARIOS ---

SCENARIOS = {
    "Drone_Logistics": {
        "startup_name": "SkyDrop",
        "industry": "Logistics",
        "product_service_idea": "we are building a drone logistics service for quick commerce", # Matching User Input
        "problem_statement": "Rural hospitals lack blood supplies.",
        "intended_users_customers": "Hospitals",
        "startup_type": "DeepTech"
    },
    "Project_Management_SaaS": {
        "startup_name": "TaskMaster",
        "industry": "Software",
        "product_service_idea": "AI-powered project management platform for dev teams.",
        "problem_statement": "Jira is too complex.",
        "intended_users_customers": "Software Engineers",
        "startup_type": "B2B_SaaS" # Explicitly hinting
    }
}

def run_simulation(scenario_name, data):
    print(f"\n{'='*20} Running Scenario: {scenario_name} {'='*20}\n")
    
    engine = SetupEngine(data)
    
    # 1. Analyze
    gaps = engine.analyze_gaps()
    print(f"Detected {len(gaps)} Gaps:")
    for gap in gaps:
        print(f" - [{gap.severity}] {gap.category}: {gap.description}")
        
    print("\n--- Starting Conversation Simulation ---\n")
    
    # 2. Simulate
    engine.run_conversation_simulation()
    
    # 3. Export
    output_json = engine.export_state()
    
    # Save to file
    os.makedirs("scenarios", exist_ok=True)
    filename = f"scenarios/output_{scenario_name.lower()}.json"
    with open(filename, "w") as f:
        f.write(output_json)
    
    print(f"\n[SUCCESS] Simulation complete. Output saved to {filename}")

if __name__ == "__main__":
    for name, data in SCENARIOS.items():
        run_simulation(name, data)
