import os
from app import db
from app.models import Startup, ScopeDocument, Product, Feature, ProductMetric, MarketingCampaign, MarketingContentCalendar, MarketingContentItem, MarketingOverview
from langchain_core.prompts import PromptTemplate
from langchain_openai import AzureChatOpenAI
import json
from datetime import datetime, timedelta
from app.services.notification_service import publish_update
from app.services.image_service import generate_marketing_image

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

        # Notify product generated
        try:
            publish_update("product_generated", 
                           {"startup_id": startup.id, "product": product.to_dict()}, 
                           rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
             print(f"Error publishing product_generated event: {e}")


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
                        "For each content item, provide:\n"
                        "1. 'title' (string): A catchy headline.\n"
                        "2. 'description' (string): The caption or body copy.\n"
                        "3. 'platform' (string): Best platform for this content (e.g., LinkedIn, Instagram, Blog).\n"
                        "4. 'image_idea' (string): A detailed visual description for an AI image generator to create an accompanying image.\n\n"
                        "Output a JSON array of objects, e.g., [{{'title': '...', 'description': '...', 'platform': 'LinkedIn', 'image_idea': 'A professional photo of...'}}].\n\n"
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
                                        content_brief=item_data.get('description'), # Map description to brief
                                        content_body=None, # Leave body empty for generation
                                        platform=item_data.get('platform', 'General'),
                                        media_type='image' if item_data.get('image_idea') else 'text_only',
                                        image_prompt=item_data.get('image_idea'),
                                        created_by=startup.user_id,
                                        publish_date=publish_date,
                                        created_at=datetime.utcnow()
                                    )
                                    
                                    # Generate Image if prompt exists
                                    if content_item.image_prompt:
                                        image_url = generate_marketing_image(content_item.image_prompt)
                                        content_item.image_url = image_url

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

        # Notify campaigns generated
        try:
            # Re-fetch campaigns to ensure we have all data if needed, or just send a signal
            campaigns = MarketingCampaign.query.filter_by(startup_id=startup.id).all()
            if campaigns:
                publish_update("campaigns_generated", 
                               {"startup_id": startup.id, "campaigns": [c.to_dict() for c in campaigns]}, 
                               rooms=[f"user_{startup.user_id}", "admin"])
        except Exception as e:
            print(f"Error publishing campaigns_generated event: {e}")


        # --- Generate Brand Identity (Positioning + Voice) ---
        brand_prompt = PromptTemplate.from_template(
            "Based on the following scope document, define the brand identity for the startup.\n"
            "1. Write a concise positioning statement (single sentence).\n"
            "2. Define the Tone of Voice (e.g., Professional, Witty, Empathetic).\n"
            "3. Identify the Brand Archetype (e.g., The Creator, The Ruler).\n"
            "4. List 3 key Target Audiences.\n"
            "5. List 3 Key Messaging Pillars.\n\n"
            "Output a JSON object with keys:\n"
            "- 'positioning_statement' (string)\n"
            "- 'brand_details' (object with keys: 'tone_of_voice' (string), 'brand_archetype' (string), 'target_audience' (list of strings), 'key_messaging_pillars' (list of strings)).\n\n"
            "Scope Document:\n{scope_content}"
        )
        brand_chain = brand_prompt | llm
        brand_json_str = brand_chain.invoke({"scope_content": scope_content}).content

        try:
            brand_data = json.loads(brand_json_str)
            positioning_statement = brand_data.get('positioning_statement')
            brand_details = brand_data.get('brand_details')

            if positioning_statement or brand_details:
                marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
                if not marketing_overview:
                    marketing_overview = MarketingOverview(startup_id=startup.id)
                    db.session.add(marketing_overview)
                
                if positioning_statement:
                    marketing_overview.positioning_statement = positioning_statement
                
                if brand_details:
                    marketing_overview.brand_details = brand_details
                
        except json.JSONDecodeError:
            print(f"--- [Generation Task] Warning: Failed to decode JSON for brand identity for startup ID: {startup_id}. Raw output: {brand_json_str} ---")


    db.session.commit()
    
    publish_update("assets_generated", {"startup_id": startup.id}, rooms=[f"user_{startup.user_id}", "admin"])
    
    print(f"--- [Generation Task] Successfully generated assets for startup ID: {startup.id} ---")

def generate_ad_hoc_content(startup_id, topic, channel, content_type='text_only'):
    """
    Generates a single ad-hoc content item for a startup.
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        print(f"--- [Ad-Hoc Task] Error: Startup not found for ID {startup_id}. ---")
        return None

    # Get Brand Voice context
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    brand_context = ""
    if marketing_overview and marketing_overview.brand_details:
        details = marketing_overview.brand_details
        brand_context = (
            f"Tone: {details.get('tone_of_voice', 'Professional')}.\n"
            f"Target Audience: {', '.join(details.get('target_audience', []))}.\n"
            f"Brand Archetype: {details.get('brand_archetype', 'N/A')}."
        )

    # Find or Create "Ad-Hoc" Campaign and Calendar
    ad_hoc_campaign = MarketingCampaign.query.filter_by(startup_id=startup.id, campaign_name="Ad-Hoc Content").first()
    if not ad_hoc_campaign:
        ad_hoc_campaign = MarketingCampaign(
            startup_id=startup.id,
            campaign_name="Ad-Hoc Content",
            objective="To store single, quick-create content items.",
            created_by=startup.user_id,
            content_mode=True,
            start_date=datetime.utcnow()
        )
        db.session.add(ad_hoc_campaign)
        db.session.flush()

    ad_hoc_calendar = MarketingContentCalendar.query.filter_by(campaign_id=ad_hoc_campaign.campaign_id).first()
    if not ad_hoc_calendar:
        ad_hoc_calendar = MarketingContentCalendar(
            campaign_id=ad_hoc_campaign.campaign_id,
            title="Ad-Hoc Content Calendar",
            description="Calendar for ad-hoc items",
            owner_id=startup.user_id,
            start_date=datetime.utcnow()
        )
        db.session.add(ad_hoc_calendar)
        db.session.flush()
    
    # Initialize LLM
    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=2000,
        model_kwargs={"response_format": {"type": "json_object"}}
    )

    # Generate Content
    prompt = PromptTemplate.from_template(
        "Generate a marketing content item for specific channel.\n"
        "Brand Context:\n{brand_context}\n\n"
        "Topic: {topic}\n"
        "Channel: {channel}\n"
        "Content Type: {content_type}\n\n"
        "If content type implies an image (like 'Post with Image'), provide a detailed 'image_idea' prompt for DALL-E.\n"
        "Output JSON with keys: 'title', 'content_body', 'image_idea' (optional)."
    )
    
    chain = prompt | llm
    result_json = chain.invoke({
        "brand_context": brand_context,
        "topic": topic,
        "channel": channel,
        "content_type": content_type
    }).content

    try:
        data = json.loads(result_json)
        
        content_item = MarketingContentItem(
            calendar_id=ad_hoc_calendar.calendar_id,
            title=data.get('title', f"Ad-Hoc: {topic[:20]}..."),
            content_body=data.get('content_body'),
            channel=channel,
            media_type='image' if data.get('image_idea') else 'text_only',
            image_prompt=data.get('image_idea'),
            created_by=startup.user_id,
            publish_date=datetime.utcnow(),
            status='DRAFT'
        )

        if content_item.image_prompt:
            image_url = generate_marketing_image(content_item.image_prompt)
            content_item.image_url = image_url

        db.session.add(content_item)
        db.session.commit()
        
        return content_item.to_dict()

    except Exception as e:
        print(f"Error generating ad-hoc content: {e}")
        return None

def generate_final_content(startup_id, content_id):
    """
    Generates the final content body for a content item based on its brief and optional brand context.
    """
    startup = Startup.query.get(startup_id)
    if not startup:
        print(f"--- [Generate Content] Error: Startup not found for ID {startup_id}. ---")
        return None

    content_item = MarketingContentItem.query.get(content_id)
    if not content_item:
        print(f"--- [Generate Content] Error: Content item not found for ID {content_id}. ---")
        return None

    # Get Brand Voice context
    marketing_overview = MarketingOverview.query.filter_by(startup_id=startup.id).first()
    brand_context = ""
    if marketing_overview and marketing_overview.brand_details:
        details = marketing_overview.brand_details
        brand_context = (
            f"Tone: {details.get('tone_of_voice', 'Professional')}.\n"
            f"Target Audience: {', '.join(details.get('target_audience', []))}.\n"
            f"Brand Archetype: {details.get('brand_archetype', 'N/A')}."
        )

    llm = AzureChatOpenAI(
        azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME"),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
        openai_api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
        temperature=0.7,
        max_tokens=2000,
    )

    prompt = PromptTemplate.from_template(
        "You are an expert content creator. Generate the final, publication-ready content body for a marketing post.\n\n"
        "Brand Identity:\n{brand_context}\n\n"
        "Content Channel: {channel} (Format the content appropriately for this specific platform, e.g., hashtags for Twitter/Instagram, subject line if Email).\n"
        "Content Type: {content_type}\n"
        "Content Brief/Instruction: {content_brief}\n\n"
        "Task: Write the final content body text. Do not include 'Title:' or metadata, just the actual post content."
    )

    chain = prompt | llm
    result = chain.invoke({
        "brand_context": brand_context,
        "channel": content_item.channel or "General",
        "content_type": content_item.content_type or "Post",
        "content_brief": content_item.content_brief or content_item.title
    }).content

    # Clean up result (remove quotes if wrapped)
    final_content = result.strip().strip('"')

    content_item.content_body = final_content
    content_item.status = 'DRAFT' # Ensure it's in draft mode after generation
    db.session.commit()

    return content_item.to_dict()