import os
import json
from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.tools import Tool
from langchain_openai import AzureChatOpenAI
import requests # Import requests for Serper API

# Load environment variables from .env file
load_dotenv()

# --- Azure OpenAI Configuration ---
# Ensure these are set in your .env file
AZURE_OPENAI_API_KEY = os.environ.get("AZURE_OPENAI_API_KEY")
AZURE_API_VERSION = os.environ.get("AZURE_API_VERSION")
AZURE_OPENAI_ENDPOINT = os.environ.get("AZURE_OPENAI_ENDPOINT")
DEPLOYMENT_NAME = os.environ.get("DEPLOYMENT_NAME")

# --- Serper API Configuration ---
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

# Initialize the Azure OpenAI LLM for CrewAI
llm = AzureChatOpenAI(
    azure_deployment=DEPLOYMENT_NAME,
    api_version=AZURE_API_VERSION,
    openai_api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    temperature=0.7,
    max_tokens=2000,
)

# --- Tools Definition ---
# Serper Web Search Tool
def serper_web_search_function(query: str) -> str:
    """Performs a web search using Serper API and returns the results. Use this tool to find external information, validate market size, research competitors, or find industry trends."""
    if not SERPER_API_KEY:
        return "Error: Serper API Key not configured."

    url = "https://google.serper.dev/search"
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }
    payload = json.dumps({"q": query})

    try:
        response = requests.post(url, headers=headers, data=payload)
        response.raise_for_status() # Raise an exception for HTTP errors
        search_results = response.json()

        formatted_results = []
        if 'organic' in search_results:
            for item in search_results['organic'][:5]: # Get top 5 organic results
                formatted_results.append(f"Title: {item.get('title')}\nLink: {item.get('link')}\nSnippet: {item.get('snippet')}\n")
        
        if not formatted_results:
            return f"No search results found for '{query}'."

        return "\n".join(formatted_results)
    except requests.exceptions.RequestException as e:
        return f"Error performing Serper search for '{query}': {e}"
    except Exception as e:
        return f"An unexpected error occurred during Serper search for '{query}': {e}"

# --- Load Startup Data ---
def load_startup_data(file_path="startup_info.json"):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Startup data file not found: {file_path}")
    with open(file_path, "r") as f:
        return json.load(f)

# --- Helper to format startup data for agents ---
def format_startup_data_for_agents(startup_data):
    formatted_data = ""
    for key, value in startup_data.items():
        if key == "startup_type":
            formatted_data += f"Startup Type: {value}\n\n"
        else:
            formatted_data += f"--- {key.replace('_', ' ').title()} ---\n"
            formatted_data += f"{value}\n"
            formatted_data += "\n"
    return formatted_data

serper_web_search_tool = Tool(
    name="Serper Web Search",
    func=serper_web_search_function,
    description="Performs a web search using Serper API and returns the results. Use this tool to find external information, validate market size, research competitors, or find industry trends."
)

# --- Agent Definitions ---
# Placeholder for Langchain agent definitions
# --- Main Execution ---
if __name__ == "__main__":
    try:
        startup_data = load_startup_data()
        formatted_startup_data = format_startup_data_for_agents(startup_data)

        # --- Define Prompt Templates for each section ---
        problem_prompt = PromptTemplate.from_template(
            """You are an expert Problem Analyst. Analyze the following startup data and summarize the core problem the startup is solving, and assess its reality and urgency.
            
            Startup Data:
            {startup_data}
            
            Generate the 'Problem' section of the report, including:
            - Describe the Problem (Evaluator Summary)
            - Evaluator Rating (1-5): How real, pressing, and validated is this problem?
            - Notes: Any gaps in understanding, validation, or problem framing.
            
            Ensure the output is in Markdown format."""
        )

        solution_prompt = PromptTemplate.from_template(
            """You are an expert Solution Architect. Analyze the following startup data and describe the proposed solution, how it addresses the problem, and evaluate its practicality and innovation.
            
            Startup Data:
            {startup_data}
            
            Generate the 'Solution' section of the report, including:
            - Describe the Proposed Solution
            - Evaluator Rating (1-5): Is the solution practical, clear, and achievable?
            - Notes: Feasibility concerns, innovation, or simplicity of execution.
            
            Ensure the output is in Markdown format."""
        )

        market_prompt = PromptTemplate.from_template(
            """You are an expert Market Researcher. Analyze the following startup data and identify the target market, assess its size and potential, and evaluate market feasibility for the startup.
            
            Startup Data:
            {startup_data}
            
            Use the 'Serper Web Search' tool if necessary to validate market size or potential.
            
            Generate the 'Market Feasibility' section of the report, including:
            - Target Market
            - Market Size / Potential
            - Evaluator Rating (1-5): Is the market accessible and realistic for a new entrant?
            - Notes: Mention if niche, emerging, or over-competitive market.
            
            Ensure the output is in Markdown format."""
        )

        growth_prompt = PromptTemplate.from_template(
            """You are an expert Growth Strategist. Analyze the following startup data and evaluate the scalability and revenue potential of the startup, and project its growth over 2-3 years.
            
            Startup Data:
            {startup_data}
            
            Generate the 'Growth Potential' section of the report, including:
            - Scalability Assessment
            - Revenue Potential
            - Evaluator Rating (1-5): Overall potential to grow over 2-3 years.
            - Notes: Key growth levers or limiting factors.
            
            Ensure the output is in Markdown format."""
        )

        competitor_prompt = PromptTemplate.from_template(
            """You are an expert Competitor Analyst. Analyze the following startup data and identify key competitors and alternatives, and determine the startup's differentiation and competitive advantages.
            
            Startup Data:
            {startup_data}
            
            Use the 'Serper Web Search' tool if necessary to find additional competitors or validate existing ones.
            
            Generate the 'Competitor Analysis' section of the report, including:
            - Known Competitors
            - Differentiation
            - Evaluator Rating (1-5): Does it offer clear, defensible differentiation?
            - Notes: Barriers to entry, technology edge, or brand moat.
            
            Ensure the output is in Markdown format."""
        )

        risks_prompt = PromptTemplate.from_template(
            """You are an expert Risk Assessor. Analyze the following startup data and identify key advantages and potential risks (execution, technical, market), and assess the overall risk/reward balance.
            
            Startup Data:
            {startup_data}
            
            Generate the 'Advantages & Risks' section of the report, including:
            - Key Advantages
            - Risks
            - Evaluator Rating (1-5): Overall risk/reward balance.
            - Notes: Critical dependencies or failure points.
            
            Ensure the output is in Markdown format."""
        )

        compiler_prompt = PromptTemplate.from_template(
            """You are a detail-oriented editor and strategic advisor. Compile all the provided analysis sections into a single, comprehensive startup evaluation report.
            Make a final recommendation (Proceed, Needs Refinement, Not Ready) and provide a 2-3 line overall summary.
            Calculate the 'Auto-Metrics' total evaluation score based on the individual section ratings and weights:
            - Problem: 20%
            - Solution: 20%
            - Market Feasibility: 20%
            - Growth Potential: 15%
            - Competitor Analysis: 15%
            - Advantages & Risk: 10%
            
            Ensure the final output is a complete Markdown document, strictly following the overall report structure.
            
            Analysis Sections:
            {problem_analysis}
            {solution_analysis}
            {market_analysis}
            {growth_analysis}
            {competitor_analysis}
            {risks_analysis}
            """
        )

        # --- Initialize LLMChains ---
        problem_chain = LLMChain(llm=llm, prompt=problem_prompt, verbose=True)
        solution_chain = LLMChain(llm=llm, prompt=solution_prompt, verbose=True)
        market_chain = LLMChain(llm=llm, prompt=market_prompt, verbose=True)
        growth_chain = LLMChain(llm=llm, prompt=growth_prompt, verbose=True)
        competitor_chain = LLMChain(llm=llm, prompt=competitor_prompt, verbose=True)
        risks_chain = LLMChain(llm=llm, prompt=risks_prompt, verbose=True)
        compiler_chain = LLMChain(llm=llm, prompt=compiler_prompt, verbose=True)

        # --- Execute Chains ---
        problem_analysis = problem_chain.run(startup_data=formatted_startup_data)
        solution_analysis = solution_chain.run(startup_data=formatted_startup_data)
        
        # For market and competitor analysis, we can optionally use the search tool
        # For simplicity, we'll just pass the startup data for now.
        # If search is needed, it would be called here and its result passed to the chain.
        market_analysis = market_chain.run(startup_data=formatted_startup_data)
        growth_analysis = growth_chain.run(startup_data=formatted_startup_data)
        competitor_analysis = competitor_chain.run(startup_data=formatted_startup_data)
        risks_analysis = risks_chain.run(startup_data=formatted_startup_data)

        final_report = compiler_chain.run(
            problem_analysis=problem_analysis,
            solution_analysis=solution_analysis,
            market_analysis=market_analysis,
            growth_analysis=growth_analysis,
            competitor_analysis=competitor_analysis,
            risks_analysis=risks_analysis
        )

        # Save the final report
        output_filename = "startup_analysis_report_langchain.md"
        with open(output_filename, "w") as f:
            f.write(final_report)
        print(f"\nLangchain generated report saved to {output_filename}")
        print("\n--- Final Report ---")
        print(final_report)

    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please ensure 'startup_info.json' exists and is populated by the chatbot script.")
    except ValueError as e:
        print(f"Configuration Error: {e}")
        print("Please ensure all Azure OpenAI and Serper API environment variables are set in your .env file.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
