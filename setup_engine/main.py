import sys
import os

# Add the project root to sys.path to allow running this script directly
# Add the project root to sys.path to allow running this script directly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv() # Load .env variables

from setup_engine.core.orchestrator import Orchestrator

def main():
    print("="*50)
    print("Agentic Startup Platform v1.0")
    print("="*50)
    
    # 1. Gather Initial Input
    name = input("Startup Name: ")
    idea = input("Idea: ")
    industry = input("Industry: ") # e.g. "Drone Logistics"
    
    user_input = {
        "startup_name": name,
        "product_service_idea": idea,
        "industry": industry
    }
    
    # 2. Start Engine
    orchestrator = Orchestrator()
    orchestrator.start(user_input)
    orchestrator.run_loop()

if __name__ == "__main__":
    main()
