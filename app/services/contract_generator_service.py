import os
from app import db
from app.models import Startup, ScopeDocument, Contract, ContractStatus
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
from app.services.notification_service import publish_update

def format_data_for_contract_generator(startup, scope_document):
    """Formats the startup and scope data into a readable string for the LLM."""
    formatted_data = f"Startup Name: {startup.name}\n"
    formatted_data += f"Founder(s): {', '.join([f.name for f in startup.founders])}\n\n"
    formatted_data += """--- Approved Scope of Engagement ---""" + "\n"
    formatted_data += scope_document.content
    return formatted_data

def generate_contract_document(startup_id):
    """
    Celery task to generate a contract for a startup using Azure OpenAI.
    """
    print(f"--- [Celery Task] Starting contract generation for startup ID: {startup_id} ---")
    startup = Startup.query.get(startup_id)
    if not startup or not startup.scope_document:
        print(f"--- [Celery Task] Error: Startup or scope document not found for ID {startup_id}. ---")
        return

    contract = startup.contract
    if not contract:
        print(f"--- [Celery Task] Error: No contract found for startup ID {startup_id}. ---")
        return

    formatted_data = format_data_for_contract_generator(startup, startup.scope_document)

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.5,
        max_tokens=4000,
    )

    contract_prompt = PromptTemplate.from_template(
        """
        Act as a legal assistant for a startup incubator named 'StartupOS'. Draft a simple and clear incubator agreement based on the provided startup information and scope of engagement.

        **Agreement Details:**
        - **Parties:** 'StartupOS Incubator' and the startup '{startup_name}'.
        - **Services by Incubator:** 
            1. Develop a Minimum Viable Product (MVP) as detailed in the 'Product Scope'.
            2. Provide strategic guidance for the Go-to-Market (GTM) plan as detailed in the 'Go-to-Market Strategy'.
        - **Consideration:** In exchange for the services, StartupOS Incubator will receive 7% of the startup's common stock equity.
        - **Term:** The initial term of this agreement is 6 months.
        - **Confidentiality:** Both parties agree to keep all proprietary information confidential.
        - **Governing Law:** The agreement shall be governed by the laws of the State of Delaware.

        **Instructions:**
        - Use the startup data and scope below to fill in the specifics.
        - The output must be in Markdown format.
        - Structure the document with clear headings for each clause.
        - Keep the language straightforward and easy to understand.

        **Startup and Scope Data:**
        {data}
        """
    )

    contract_chain = contract_prompt | llm
    contract_content = contract_chain.invoke({
        "startup_name": startup.name,
        "data": formatted_data
    }).content

    # --- Update and save Contract ---
    contract.content = contract_content
    contract.status = ContractStatus.DRAFT
    db.session.commit()
    
    publish_update("contract_generated", {"startup_id": startup.id, "contract": contract.to_dict()}, rooms=[f"user_{startup.user_id}", "admin"])

    print(f"--- [Celery Task] Contract document generated for startup ID: {startup.id} ---")
