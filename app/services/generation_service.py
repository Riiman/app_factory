import os
from app import db
from app.models import Startup, ScopeDocument, Product, Feature, ProductMetric, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, MarketingOverview
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
import json
from datetime import datetime, timedelta
from app.services.notification_service import publish_update

# Remove extract_json_from_string function, as model_kwargs will handle JSON output

def generate_startup_assets(startup_id, generate_product=True, generate_gtm=True):
    """
    Generates product, features, metrics, marketing campaigns, and content calendar
    for a startup based on its scope document.
    """
    startup = Startup.query.get(startup_id)
    if not startup or not startup.scope_document:
        print(f"--- [Generation Task] Error: Startup or scope document not found for ID {startup_id}. ---")
        return

    scope_content = startup.scope_document.content

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=4000,
        model_kwargs={"response_format": {"type": "json_object"}} # Enable JSON mode
    )

    product = None
    if generate_product:
        # --- Generate Product and Features ---
        print(f"--- [Generation Task] Generating Product for startup ID: {startup_id} ---")
        product_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define a product with a name and description. "
            "Also, define a list of key features for the MVP. "
            "Output a JSON object with keys 'product_name' (string), 'product_description' (string), and 'features' (array of strings).\n\n"
            "Scope Document:\n{scope_content}"
        )
        product_chain = product_prompt | llm
        product_json_str = product_chain.invoke({"scope_content": scope_content}).content
        
        try:
            product_data = json.loads(product_json_str)

            product = Product(
                startup_id=startup.id,
                name=product_data.get('product_name'),
                description=product_data.get('product_description'),
                created_at=datetime.utcnow()
            )
            db.session.add(product)
            db.session.flush() # to get product.id

            for feature_name in product_data.get('features', []):
                feature = Feature(
                    product_id=product.id,
                    name=feature_name,
                    created_at=datetime.utcnow()
                )
                db.session.add(feature)
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Error: Failed to decode JSON for product generation for startup ID: {startup_id}. Raw output: {product_json_str} ---")
            return


        # --- Generate Product Metrics ---
        metrics_data = [] # Initialize metrics_data to an empty list
        metrics_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define 3-5 key product metrics to track for the MVP. "
            "Output a JSON array of strings, e.g., ['Metric 1', 'Metric 2'].\n\n"
            "Scope Document:\n{scope_content}"
        )
        metrics_chain = metrics_prompt | llm
        metrics_json_str = metrics_chain.invoke({"scope_content": scope_content}).content
        
        try:
            raw_metrics_output = json.loads(metrics_json_str)
            if isinstance(raw_metrics_output, list):
                metrics_data = raw_metrics_output
            elif isinstance(raw_metrics_output, dict) and "metrics" in raw_metrics_output and isinstance(raw_metrics_output["metrics"], list):
                metrics_data = raw_metrics_output["metrics"]
            else:
                print(f"--- [Generation Task] Warning: Metrics data is not a list or a dictionary with a list under 'metrics' key for startup ID: {startup_id}. Raw output: {metrics_json_str} ---")
                
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for metrics generation for startup ID: {startup_id}. Raw output: {metrics_json_str} ---")

        if metrics_data:
            for metric_name in metrics_data:
                # Ensure each metric_name is a string if the LLM outputted an array of strings
                if isinstance(metric_name, str):
                    metric = ProductMetric(
                        product_id=product.id,
                        metric_name=metric_name,
                        date_recorded=datetime.utcnow()
                    )
                    db.session.add(metric)
                else:
                    print(f"--- [Generation Task] Warning: Metric item is not a string for startup ID: {startup_id}. Item: {metric_name} ---")


    if generate_gtm:
        # --- Generate Marketing Campaigns ---
        print(f"--- [Generation Task] Generating GTM for startup ID: {startup_id} ---")
        campaigns_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define 2-3 high-level marketing campaigns. "
            "For each campaign, provide a name and objective. "
            "Output a JSON array of objects, each with 'name' (string) and 'objective' (string) keys, e.g., [{{'name': 'Campaign 1', 'objective': '...'}}].\n\n"
            "Scope Document:\n{scope_content}"
        )
        campaigns_chain = campaigns_prompt | llm
        campaigns_json_str = campaigns_chain.invoke({"scope_content": scope_content}).content
        campaigns_data = [] # Initialize campaigns_data to an empty list
        
        try:
            raw_campaigns_output = json.loads(campaigns_json_str)
            if isinstance(raw_campaigns_output, list):
                campaigns_data = raw_campaigns_output
            elif isinstance(raw_campaigns_output, dict) and "campaigns" in raw_campaigns_output and isinstance(raw_campaigns_output["campaigns"], list):
                campaigns_data = raw_campaigns_output["campaigns"]
            else:
                print(f"--- [Generation Task] Warning: Campaigns data is not a list or a dictionary with a list under 'campaigns' key for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")

        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for marketing campaigns for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")
        
        if campaigns_data:
            for campaign_data_item in campaigns_data:
                if isinstance(campaign_data_item, dict):
                    campaign = MarketingCampaign(
                        startup_id=startup.id,
                        campaign_name=campaign_data_item.get('name'),
                        objective=campaign_data_item.get('objective'),
                        created_by=startup.user_id,
                        content_mode=True, # Set content_mode to True
                        start_date=datetime.utcnow()
                    )
                    db.session.add(campaign)
                    db.session.flush() # to get campaign.id

                    # --- Generate Content Calendar ---
                    content_calendar_prompt = PromptTemplate.from_template(
                        "For the '{campaign_name}' marketing campaign, generate a content calendar with 3-5 content ideas. "
                        "For each content item, provide a title and a brief description. "
                        "Output a JSON array of objects, each with 'title' (string) and 'description' (string) keys, e.g., [{{'title': 'Content 1', 'description': '...'}}].\n\n"
                        "Campaign Objective:\n{campaign_objective}"
                    )
                    content_calendar_chain = content_calendar_prompt | llm
                    content_calendar_json_str = content_calendar_chain.invoke({
                        "campaign_name": campaign.campaign_name,
                        "campaign_objective": campaign.objective
                    }).content
                    content_calendar_data = [] # Initialize content_calendar_data to an empty list
                    
                    try:
                        raw_content_calendar_output = json.loads(content_calendar_json_str)
                        if isinstance(raw_content_calendar_output, list):
                            content_calendar_data = raw_content_calendar_output
                        elif isinstance(raw_content_calendar_output, dict) and "content_calendar" in raw_content_calendar_output and isinstance(raw_content_calendar_output["content_calendar"], list):
                            content_calendar_data = raw_content_calendar_output["content_calendar"]
                        elif isinstance(raw_content_calendar_output, dict) and "content" in raw_content_calendar_output and isinstance(raw_content_calendar_output["content"], list):
                            content_calendar_data = raw_content_calendar_output["content"]
                        else:
                            print(f"--- [Generation Task] Warning: Content calendar data is not a list or a dictionary with a list under 'content_calendar' key for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                        
                        if content_calendar_data:
                            content_calendar = MarketingContentCalendar(
                                campaign_id=campaign.campaign_id,
                                title=f"Content Calendar for {campaign.campaign_name}",
                                owner_id=startup.user_id,
                                start_date=datetime.utcnow()
                            )
                            db.session.add(content_calendar)
                            db.session.flush() # to get content_calendar.id

                            publish_date = datetime.utcnow()
                            for item_data in content_calendar_data:
                                if isinstance(item_data, dict):
                                    content_item = MarketingContentItem(
                                        calendar_id=content_calendar.calendar_id,
                                        title=item_data.get('title'),
                                        content_body=item_data.get('description'),
                                        created_by=startup.user_id,
                                        publish_date=publish_date,
                                        created_at=datetime.utcnow()
                                    )
                                    db.session.add(content_item)
                                    publish_date += timedelta(days=3)
                                else:
                                    print(f"--- [Generation Task] Warning: Content item is not a dictionary for campaign '{campaign.campaign_name}'. Item: {item_data} ---")
                        else:
                            print(f"--- [Generation Task] Warning: No content calendar data to process for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                    except json.JSONDecodeError:
                        print(f"--- [Generation Task] Warning: Failed to decode JSON for content calendar for campaign '{campaign.campaign_name}'. Raw output: {content_calendar_json_str} ---")
                else:
                    print(f"--- [Generation Task] Warning: Campaign item is not a dictionary for startup ID: {startup_id}. Item: {campaign_data_item} ---")
        else:
            print(f"--- [Generation Task] Warning: No campaigns data to process for startup ID: {startup_id}. Raw output: {campaigns_json_str} ---")


        # --- Generate Positioning Statement ---
        positioning_prompt = PromptTemplate.from_template(
            "Based on the following scope document, write a concise and compelling positioning statement for the startup. "
            "The positioning statement should be a single sentence. "
            "Output a JSON object with a single key 'positioning_statement' and the statement as the value.\n\n"
            "Scope Document:\n{scope_content}"
        )
        positioning_chain = positioning_prompt | llm
        positioning_json_str = positioning_chain.invoke({"scope_content": scope_content}).content

        try:
            positioning_data = json.loads(positioning_json_str)
            positioning_statement = positioning_data.get('positioning_statement')

            if positioning_statement:
                marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
                if not marketing_overview:
                    marketing_overview = MarketingOverview(startup_id=startup.id)
                    db.session.add(marketing_overview)
                
                marketing_overview.positioning_statement = positioning_statement
                
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for positioning statement for startup ID: {startup_id}. Raw output: {positioning_json_str} ---")


    db.session.commit()
    
    publish_update("assets_generated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])
    
    print(f"--- [Generation Task] Successfully generated assets for startup ID: {startup.id} ---")