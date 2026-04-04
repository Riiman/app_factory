
import requests
import os
from dotenv import load_dotenv

# Force load .env
load_dotenv('.env')

# Try to get from env, else fallback to the config.py default for testing compatibility
api_key = os.getenv('GETLATE_API_KEY')
if not api_key:
    msg = "No GETLATE_API_KEY in .env. Using hardcoded default from config.py check..."
    print(msg)
    api_key = 'sk_0b138c1c46622852bf949abc534b0305905133b5cebd34e266756804c90fe2a3'

print(f"Testing Key: {api_key[:6]}...{api_key[-4:]} (Length: {len(api_key)})")

url = "https://getlate.dev/api/v1/profiles"
payload = {"internalId": "debug_test_123", "name": "Debug Startup"}

headers_variations = [
    {"X-Api-Key": api_key},
    {"x-api-key": api_key},
    {"Authorization": f"Bearer {api_key}"},
    {"Authorization": f"Basic {api_key}"},
    {"ApiKey": api_key}
]

for h in headers_variations:
    print(f"\nTesting Headers: {list(h.keys())[0]}")
    try:
        resp = requests.post(url, headers=h, json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")
