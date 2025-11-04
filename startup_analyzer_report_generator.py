import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

import requests # Import requests for Serper API

# --- Serper API Configuration ---
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

# Serper Web Search Function
def serper_web_search_function(query: str) -> str:
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

# Load environment variables from .env file
load_dotenv()

class StartupReportGenerator:
    def __init__(self, startup_data_file="startup_info.json"):
        self.startup_data_file = startup_data_file
        self.client = self._initialize_azure_openai_client()
        self.startup_data = self._load_startup_data()

    def _initialize_azure_openai_client(self):
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        api_version = os.environ.get("AZURE_API_VERSION")
        azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        deployment_name = os.environ.get("DEPLOYMENT_NAME")

        if not all([api_key, api_version, azure_endpoint, deployment_name]):
            raise ValueError(
                "Missing one or more required Azure OpenAI environment variables: "
                "AZURE_OPENAI_API_KEY, AZURE_API_VERSION, AZURE_OPENAI_ENDPOINT, DEPLOYMENT_NAME."
            )
        if not os.environ.get("SERPER_API_KEY"):
            raise ValueError("Missing SERPER_API_KEY environment variable.")

        return AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

    def _load_startup_data(self):
        if not os.path.exists(self.startup_data_file):
            raise FileNotFoundError(f"Startup data file not found: {self.startup_data_file}")
        with open(self.startup_data_file, "r") as f:
            return json.load(f)

    def _generate_analysis_prompt(self):
        # Format the collected startup data for the prompt
        formatted_startup_data = ""
        for key, value in self.startup_data.items():
            if key == "startup_type":
                formatted_startup_data += f"Startup Type: {value}\n\n"
            else:
                formatted_startup_data += f"--- {key.replace('_', ' ').title()} ---\n"
                formatted_startup_data += f"Answer: {value}\n"
                formatted_startup_data += "\n"

        prompt = f"""You are an expert startup evaluator. Analyze the following startup information and generate a comprehensive evaluation report based on the provided structure. 
        The startup information is presented as a conversation history for each data point.

        You have access to a Serper Web Search tool. If you need to validate market size, research competitors, find industry trends, or gather any external information to complete your analysis, you can use the `serper_web_search_function` tool. 
        When using the tool, provide a concise and effective search query.

        Startup Information:
        {formatted_startup_data}

        Generate the report in Markdown format, strictly following the structure below. For each section, provide a 'Describe' summary, an 'Evaluator Rating' from 1 to 5 (where 1 is poor and 5 is excellent), and 'Notes' for any observations, gaps, or specific points.

        --- Startup Evaluation Report ---

        ## 1. Problem

        **Describe the Problem (Evaluator Summary):**
        [Summarize the specific problem the startup is solving and who experiences it, based on the provided information.]

        **Evaluator Rating (1-5):**
        [Rate how real, pressing, and validated this problem is. (1=Not a real problem, 5=Critical and well-validated problem)]

        **Notes:**
        [Any gaps in understanding, validation, or problem framing. Mention if the problem is clearly articulated or if more research is needed.]

        ## 2. Solution

        **Describe the Proposed Solution:**
        [Summarize the product or service idea and how it solves the problem, based on the provided information.]

        **Evaluator Rating (1-5):**
        [Rate if the solution is practical, clear, and achievable. (1=Impractical/unclear, 5=Highly practical/innovative)]

        **Notes:**
        [Feasibility concerns, innovation, or simplicity of execution. Comment on the uniqueness or complexity of the solution.]

        ## 3. Market Feasibility

        **Target Market:**
        [Identify the intended users/customers based on the provided information.]

        **Market Size / Potential:**
        [Assess if there is enough addressable demand for this solution. Use Google Search if needed to estimate or validate market size.]

        **Evaluator Rating (1-5):**
        [Rate if the market is accessible and realistic for a new entrant. (1=Highly competitive/inaccessible, 5=Large/growing/accessible market)]

        **Notes:**
        [Mention if niche, emerging, or over-competitive market. Comment on the clarity of the target market definition.]

        ## 4. Growth Potential

        **Scalability Assessment:**
        [Assess if this solution can scale beyond initial users.]

        **Revenue Potential:**
        [Assess if the model supports sustainable monetization.]

        **Evaluator Rating (1-5):**
        [Rate the overall potential to grow over 2-3 years. (1=Limited growth, 5=High growth potential)]

        **Notes:**
        [Key growth levers or limiting factors. Discuss potential for user acquisition and retention.]

        ## 5. Competitor Analysis

        **Known Competitors:**
        [List main competitors or alternatives mentioned in the information. Use Google Search to find additional competitors or validate existing ones.]

        **Differentiation:**
        [Explain how this startup stands out from competitors, based on the provided information.]

        **Evaluator Rating (1-5):**
        [Rate if it offers clear, defensible differentiation. (1=No clear differentiation, 5=Strong, defensible moat)]

        **Notes:**
        [Barriers to entry, technology edge, or brand moat. Comment on the competitive landscape.]

        ## 6. Advantages & Risks

        **Key Advantages:**
        [Summarize the strengths or unique advantages of this idea/team.]

        **Risks:**
        [Identify the biggest execution, technical, or market risks.]

        **Evaluator Rating (1-5):**
        [Rate the overall risk/reward balance. (1=High risk, low reward; 5=Low risk, high reward)]

        **Notes:**
        [Critical dependencies or failure points. Suggest mitigation strategies if applicable.]

        ## 7. Final Recommendation

        **Decision:**
        [Choose one: ☐ Proceed with the startup, ☐ Needs Refinement (Tasks to be assigned), ☐ Not Ready]

        **Evaluator Summary (2-3 lines):**
        [Provide an overall assessment of the startup’s potential in 2-3 concise lines.]

        **Auto-Metrics (for internal platform use)**
        Factor|Weight|Calculated
        ---|---|---
        Problem|20%|—
        Solution|20%|—
        Market Feasibility|20%|—
        Growth Potential|15%|—
        Competitor Analysis|15%|—
        Advantages & Risk|10%|—
        Total Evaluation Score|100%|—
        """
        return prompt

    def generate_report(self, output_filename="startup_analysis_report.md"):
        print("Generating startup analysis report...")
        
        messages = [
            {"role": "system", "content": "You are an expert startup evaluator, generating reports in Markdown format. You have access to a Google Search tool to gather external information."},
            {"role": "user", "content": self._generate_analysis_prompt()}
        ]

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "serper_web_search_function",
                    "description": "Performs a web search using Serper API and returns the results.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query to find information on the web."
                            }
                        },
                        "required": ["query"]
                    }
                }
            }
        ]

        report_content = None
        try:
            while report_content is None:
                response = self.client.chat.completions.create(
                    model=os.environ.get("DEPLOYMENT_NAME"),
                    messages=messages,
                    tools=tools,
                    tool_choice="auto", # Allow the model to choose whether to call a tool or respond
                    temperature=0.7,
                    max_tokens=2000,
                )

                response_message = response.choices[0].message

                if response_message.tool_calls:
                    tool_call = response_message.tool_calls[0] # Assuming one tool call at a time
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)

                    if function_name == "serper_web_search_function":
                        print(f"LLM requested Serper Web Search: {function_args['query']}")
                        tool_output = serper_web_search_function(query=function_args.get("query")) # Call the Serper search function
                        messages.append(response_message) # Append the tool call request
                        messages.append(
                            {
                                "tool_call_id": tool_call.id,
                                "role": "tool",
                                "name": function_name,
                                "content": tool_output, # tool_output is already a string
                            }
                        )
                    else:
                        print(f"Unknown tool call: {function_name}")
                        messages.append(response_message)
                        messages.append(
                            {
                                "tool_call_id": tool_call.id,
                                "role": "tool",
                                "name": function_name,
                                "content": "Error: Unknown tool.",
                            }
                        )
                else:
                    report_content = response_message.content

            with open(output_filename, "w") as f:
                f.write(report_content)
            print(f"Startup analysis report saved to {output_filename}")
            return report_content
        except Exception as e:
            print(f"Error generating report with Azure OpenAI: {e}")
            return None

if __name__ == "__main__":
    generator = StartupReportGenerator()
    report = generator.generate_report()

    if report:
        print("\n--- Generated Report Preview ---")
        print(report[:1000]) # Print first 1000 characters for preview
        print("...")
