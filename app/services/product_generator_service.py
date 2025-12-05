import os
import json
from app.models import ScopeDocument
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI

def extract_product_scope(scope_content: str) -> str:
    """
    Extracts the 'Product Scope' section from the full document content.
    This function looks for the '## Product Scope' heading and extracts
    the content until the next major heading.
    """
    try:
        # Split the content by the Product Scope heading
        after_product_scope_heading = scope_content.split('## Product Scope')[1]
        # Split by the next heading to isolate the section
        product_scope_section = after_product_scope_heading.split('## ')[0]
        return product_scope_section.strip()
    except IndexError:
        # If '## Product Scope' is not found, return the whole content as a fallback
        return scope_content.strip()

def generate_product_from_scope(startup_id: int):
    """
    Generates a structured Product and Features JSON from a startup's scope document
    using an LLM.

    Args:
        startup_id: The ID of the startup to generate the product for.

    Returns:
        A dictionary with product and feature data, or None if an error occurs.
    """
    print(f"--- [Product Generator] Starting product generation for startup ID: {startup_id} ---")
    
    scope_document = ScopeDocument.query.filter_by(startup_id=startup_id).first()
    if not scope_document:
        print(f"--- [Product Generator] Error: Scope document not found for startup ID {startup_id}. ---")
        return None

    product_scope_text = extract_product_scope(scope_document.content)
    if not product_scope_text:
        print(f"--- [Product Generator] Error: Could not extract product scope from document for startup ID {startup_id}. ---")
        return None

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.4, # Lower temperature for more structured, predictable output
        max_tokens=2000,
    )

    json_prompt_template = """
    You are a product manager AI. Based on the following product scope document, generate a product definition.

    Your output MUST be a single, valid JSON object. Do not include any text, notes, or markdown formatting (like ```json) before or after the JSON object.

    The JSON object must strictly follow this structure:
    {
      "name": "A concise and catchy product name derived from the scope",
      "description": "A one or two-sentence high-level description of the product's purpose and value.",
        {
          "name": "Feature Name 1",
          "description": "A brief description of what this feature does and its primary benefit.",
          "acceptance_criteria": "A list of specific conditions that must be met for this feature to be considered complete."
        },
        {
          "name": "Feature Name 2",
          "description": "A brief description of what this feature does and its primary benefit.",
          "acceptance_criteria": "A list of specific conditions that must be met for this feature to be considered complete."
        }
      ]
    }

    Here is the product scope document:
    ---
    {scope_data}
    ---

    Now, generate the JSON object.
    """

    product_prompt = PromptTemplate.from_template(json_prompt_template)
    
    product_chain = product_prompt | llm

    print(f"--- [Product Generator] Invoking LLM for startup ID: {startup_id} ---")
    llm_response_content = product_chain.invoke({"scope_data": product_scope_text}).content

    try:
        # The response should be a clean JSON string, so we attempt to parse it directly.
        product_data = json.loads(llm_response_content)
        print(f"--- [Product Generator] Successfully generated and parsed product data for startup ID: {startup_id} ---")
        return product_data
    except json.JSONDecodeError as e:
        print(f"--- [Product Generator] Error: Failed to decode JSON from LLM response for startup ID {startup_id}. Error: {e} ---")
        print(f"--- Raw LLM Output: ---\n{llm_response_content}\n--------------------")
        return None
    except Exception as e:
        print(f"--- [Product Generator] An unexpected error occurred: {e} ---")
        return None
