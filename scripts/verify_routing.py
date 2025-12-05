import sys
import os

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.startup_builder.graph import overseer_route, reviewer_route, AgentStateEnum

def test_overseer_routing():
    print("Testing Overseer Routing...")
    
    # Case 1: QA Failed + Infrastructure -> Architect
    state = {"status": "qa_failed", "error_category": "INFRASTRUCTURE"}
    route = overseer_route(state)
    assert route == "architect", f"Expected architect, got {route}"
    print("PASS: QA Failed (Infra) -> Architect")

    # Case 2: QA Failed + Logic -> Developer
    state = {"status": "qa_failed", "error_category": "LOGIC_SYNTAX"}
    route = overseer_route(state)
    assert route == "developer", f"Expected developer, got {route}"
    print("PASS: QA Failed (Logic) -> Developer")
    
    # Case 3: QA Failed + Missing -> Developer
    state = {"status": "qa_failed", "error_category": "MISSING_IMPLEMENTATION"}
    route = overseer_route(state)
    assert route == "developer", f"Expected developer, got {route}"
    print("PASS: QA Failed (Missing) -> Developer")

def test_reviewer_routing():
    print("\nTesting Reviewer Routing...")
    
    # Case 1: Failed + Infrastructure -> Architect
    state = {"status": "failed", "error_category": "INFRASTRUCTURE", "error_history": []}
    route = reviewer_route(state)
    assert route == "architect", f"Expected architect, got {route}"
    print("PASS: Failed (Infra) -> Architect")
    
    # Case 2: Failed + Logic -> Debugger
    state = {"status": "failed", "error_category": "LOGIC_SYNTAX", "error_history": []}
    route = reviewer_route(state)
    assert route == "debugger", f"Expected debugger, got {route}"
    print("PASS: Failed (Logic) -> Debugger")
    
    # Case 3: Loop Detection -> Strategist
    state = {"status": "failed", "error_category": "LOGIC_SYNTAX", "error_history": ["e1", "e2", "e3", "e4", "e5", "e6"]}
    route = reviewer_route(state)
    assert route == "strategist", f"Expected strategist, got {route}"
    print("PASS: Loop Detection -> Strategist")

if __name__ == "__main__":
    try:
        test_overseer_routing()
        test_reviewer_routing()
        print("\nAll routing tests passed!")
    except AssertionError as e:
        print(f"\nTEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)
