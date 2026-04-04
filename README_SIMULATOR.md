# Startup Simulator Guide (v5 - High-Growth)

This tool generates a 12-month realistic, causal startup narrative and populates the dashboard with high-fidelity data.

## 🚀 Quick Start

### 1. Generate a Simulation
Run the generator with an industry, maturity (years), and output path.

```bash
# Example: 1-year old SaaS startup
python3 scripts/generate_simulation.py "SaaS" 1 "simulations/saas_growth.json"
```

### 2. Load into Database
Load the JSON into a specific user's startup dashboard.

```bash
# Example: Load for ashish@gigtap.in
python3 scripts/load_simulation.py "simulations/saas_growth.json" "ashish@gigtap.in"
```

---

## 🔬 Core Features (v5)

- **Causal Narrative**: Each month reacts to the previous one. Raising capital causes a spike in hiring and marketing spend.
- **High-Growth Mandate**: Investments are deployed over 24 months, and increased spending results in measurable **Revenue ROI** within 2-3 months.
- **Dashboard Automation**: Automatically populates:
    - **Financials**: Revenue, Expenses, MRR, Burn.
    - **Product**: 40+ Features with realistic statuses.
    - **Growth**: 10+ Experiments (Validated/Invalidated).
    - **Marketing**: Multi-channel campaigns with CAC/Spend.
    - **Investors**: Funding rounds linked to specific investor profiles.

## 📂 File Structure
- `app/services/llm_company_simulator.py`: Core LLM logic.
- `scripts/generate_simulation.py`: CLI for generating JSON.
- `scripts/load_simulation.py`: CLI for database ingestion.
- `simulations/`: Directory for JSON history.
