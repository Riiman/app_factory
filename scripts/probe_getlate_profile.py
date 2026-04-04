
import requests
import os
import secrets
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get('GETLATE_API_KEY')
if not api_key:
    # Try to extract from config if possible (hacky)
    try:
         from app import create_app
         app = create_app()
         api_key = app.config.get('GETLATE_API_KEY')
    except:
         pass

if not api_key:
    print("API Key missing")
    exit(1)

base_url = "https://getlate.dev/api/v1/profiles"
print(f"Probing {base_url} with Key: {api_key[:5]}...")

# 1. Try to create a profile
# internal_id to link it to our startup ID 5
internal_id = "startup_5" 
payload = {
    "internalId": internal_id,
    "name": "Startup 5"
}

try:
    print("\n--- Attempt: Create Profile ---")
    resp = requests.post(base_url, headers={'X-Api-Key': api_key}, json=payload)
    print(f"Status: {resp.status_code}")
    print(f"Body: {resp.text}")
    
    if resp.status_code == 200 or resp.status_code == 201:
        data = resp.json()
        profile_id = data.get('id')
        print(f"SUCCESS: Created Profile ID: {profile_id}")
        
        # 2. Try to connect URL WITH profileId
        connect_url = f"https://getlate.dev/api/v1/connect/linkedin?profileId={profile_id}&headless=true&redirect_url=http://localhost:5000/callback"
        print(f"\n--- Attempt: Connect with Profile ID ---")
        resp2 = requests.get(connect_url, headers={'X-Api-Key': api_key}, allow_redirects=False)
        print(f"Status: {resp2.status_code}")
        print(f"Headers: {resp2.headers}")
        
except Exception as e:
    print(f"Error: {e}")
