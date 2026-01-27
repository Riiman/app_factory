import sys
import os
import builtins
from io import StringIO

# Add project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from setup_engine.core.orchestrator import Orchestrator

# Mock Inputs
# 1. Name
# 2. Idea
# 3. Industry
# 4. Turn 1 Answer (BVLOS - Lie)
# 5. Turn 2 Answer (BVLOS - Truth)
# 6. Turn 3 Answer (Range - Lie)
# 7. Turn 4 Answer (Range - Truth)
# 8. Turn 5 Answer (Unit Econ - Generic)

inputs = iter([
    "SkyMule",
    "Drone delivery for medicines in rural India", 
    "Drone Logistics",
    "", # Press Enter for Blueprint
    
    # Gap: BVLOS (Auto-Resolved) -> No Input needed
    
    # Gap: Battery Range - Detail 1: Battery Chemistry
    "Li-Po Batteries",
    
    # Gap: Battery Range - Detail 2: Max Flight Time
    "300 mins", # Lie
    "45 mins", # Truth
    
    # Gap: Battery Range - Detail 3: Payload Impact
    "Reduces by 20%",
    
    # Gap: Unit Economics - Detail 1: Cost Per Flight
    "$2",
    # Gap: Unit Economics - Detail 2: Target Price
    "$5",
     # Gap: Unit Economics - Detail 3: Break Even Volume
    "1000 flights/mo"
])

def mock_input(prompt=""):
    print(f"[MockInput] Prompt: {prompt}")
    try:
        val = next(inputs)
        print(f"[MockInput] Returning: {val}")
        return val
    except StopIteration:
        print("[MockInput] End of inputs")
        return ""

builtins.input = mock_input

def run_test():
    print("STARTING SIMULATION")
    orchestrator = Orchestrator()
    
    # 1. Setup
    name = input("Name: ")
    idea = input("Idea: ")
    ind = input("Industry: ")
    
    user_input = {
        "startup_name": name,
        "product_service_idea": idea,
        "industry": ind
    }
    
    orchestrator.start(user_input)
    orchestrator.run_loop()
    print("SIMULATION ENDED")

if __name__ == "__main__":
    run_test()
