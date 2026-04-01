import sys
import os
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.llm_company_simulator import LlmCompanySimulator

def generate_simulation_json(industry="Manufacturing", maturity=1, output_file=None):
    """
    Triggers the LLM-powered simulation and saves the output to a JSON file.
    """
    print(f"--- [LLM Generator] Creating simulation for {industry} ({maturity}yr) ---")
    
    simulator = LlmCompanySimulator(industry, maturity)
    full_data = simulator.generate_full_simulation()
    
    if not output_file:
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_file = f"simulations/{industry.lower()}_{maturity}yr_{timestamp}.json"
    
    # Ensure simulations directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w') as f:
        json.dump(full_data, f, indent=4)
        
    print(f"\n--- [LLM Generator] Success! ---")
    print(f"Simulation saved to: {output_file}")
    return output_file

if __name__ == "__main__":
    industry = sys.argv[1] if len(sys.argv) > 1 else "Manufacturing"
    maturity = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    output = sys.argv[3] if len(sys.argv) > 3 else None
    
    generate_simulation_json(industry, maturity, output)
