import os
import json
from openai import AzureOpenAI

def generate_marketing_image(prompt, size="1024x1024", quality="standard", style="natural"):
    """
    Generates an image using DALL-E 3 via Azure OpenAI.
    
    Args:
        prompt (str): The description of the image to generate.
        size (str): Image resolution (default '1024x1024').
        quality (str): 'standard' or 'hd'.
        style (str): 'natural' or 'vivid'.
        
    Returns:
        str: The URL of the generated image, or None if generation failed.
    """
    try:
        client = AzureOpenAI(
            api_version="2024-02-01",
            azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
            api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
        )
        
        # DALL-E 3 requires specific deployment name
        deployment_name = "dalle3" 
        
        print(f"--- [Image Service] Generating image for prompt: '{prompt[:50]}...' ---")
        
        result = client.images.generate(
            model=deployment_name, 
            prompt=prompt,
            n=1,
            size=size
        )

        image_url = json.loads(result.model_dump_json())['data'][0]['url']
        print(f"--- [Image Service] Image generated successfully. URL: {image_url[:50]}... ---")
        return image_url

    except Exception as e:
        print(f"--- [Image Service] Error generating image: {e} ---")
        return None
