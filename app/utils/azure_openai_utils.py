import os
import httpx
from openai import AzureOpenAI

print("Executing modified azure_openai_utils.py")

def generate_evaluation_insights(submission):
    """
    Analyzes submission data using the Azure OpenAI API to generate insights for
    Product Scope and GTM Scope.
    """
    try:
        # Load environment variables with safe defaults
        api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        api_version = os.environ.get("AZURE_API_VERSION")
        azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        deployment_name = os.environ.get("DEPLOYMENT_NAME")

        print(f"--- Azure OpenAI Config ---")
        print(f"AZURE_OPENAI_ENDPOINT: {azure_endpoint}")
        print(f"AZURE_API_VERSION: {api_version}")
        print(f"DEPLOYMENT_NAME: {deployment_name}")
        print(f"AZURE_OPENAI_API_KEY: {'*' * (len(api_key) - 4) + api_key[-4:] if api_key else None}")


        if not all([api_key, azure_endpoint, deployment_name]):
            raise ValueError(
                "Missing one or more required Azure OpenAI environment variables: "
                "AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT_NAME."
            )

        # Initialize Azure OpenAI client
        client = AzureOpenAI(
            api_key=api_key,
            api_version=api_version,
            azure_endpoint=azure_endpoint,
        )

        prompt = f"""Analyze the following startup submission and generate insights for Product Scope and Go-to-Market (GTM) Scope.

        **Submission Data:**
        - **Problem Statement:** {submission.problem_statement}
        - **Solution:** {submission.solution}
        - **Target Market:** {submission.target_market}
        - **Competition:** {submission.competition}
        - **Unique Value Proposition:** {submission.unique_value_proposition}
        - **Revenue Streams:** {submission.revenue_streams}
        - **Go-to-Market Strategy:** {submission.go_to_market_strategy}

        **Instructions:**
        Based on the submission data, provide the following:

        **1. Product Scope:**
        - **Key Features:** (List 3-5 key features that the product should have)
        - **Technical Stack:** (Suggest a suitable technical stack)

        **2. GTM Scope:**
        - **Ideal Customer Profile (ICP):** (Describe the ideal customer profile)
        - **Target Geographies:** (Suggest target geographies)
        - **Marketing Channels:** (Recommend primary marketing channels)
        - **Positioning Statement:** (Craft a concise positioning statement)
        """

        # Streamed chat completion
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are an AI assistant that helps evaluate startup submissions."},
                {"role": "user", "content": prompt}
            ],
            stream=True
        )
        print (response)

        def stream_response():
            for chunk in response:
                if chunk.choices:
                    yield chunk.choices[0].delta.content or ""

        return stream_response()

    except Exception as e:
        print(f"Error generating insights with Azure OpenAI: {e}")
        return iter([])
