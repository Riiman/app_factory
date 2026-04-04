
import requests
import os
import sys

# Quick hack to get the key without loading the whole app context if fails
# I'll try to grep it from config.py if os.environ doesn't have it, or just use a placeholder if I can't find it.
# Actually I will use the one I added in Step 576 if I can recall it? No I used current_app.config.
# I will try to read it from .env
from dotenv import load_dotenv
load_dotenv()

api_key = os.environ.get('GETLATE_API_KEY')
if not api_key:
    # Try to find it in config.py manually
    try:
        with open('app/config.py', 'r') as f:
            for line in f:
                if 'GETLATE_API_KEY' in line and '=' in line and 'os.environ' not in line:
                     # Hardcoded fallboack?
                     pass
    except:
        pass

if not api_key:
    print("ERROR: GETLATE_API_KEY not found in env. Please ensure .env is loaded or key is exported.")
    # For the purpose of this script, I will try to use the key if I can find it in the app/config.py file content from my memory of previous turns?
    # I don't have it.
    # I will try to load it via app if possible details are okay.
    from app import create_app
    app = create_app()
    api_key = app.config.get('GETLATE_API_KEY')

print(f"API Key: {api_key[:5]}... (Len: {len(api_key)})")

base_url = "https://getlate.dev/api/v1/connect/linkedin"
backend_url = "http://localhost:5000" # mocking
redirect_url = f"{backend_url}/callback"

print("\n--- Test 1: GET Request ---")
url_get = f"{base_url}?headless=true&redirect_url={redirect_url}"
try:
    resp = requests.get(url_get, headers={'X-Api-Key': api_key}, allow_redirects=False)
    print(f"Status: {resp.status_code}")
    print(f"Headers: {resp.headers}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"GET Error: {e}")

print("\n--- Test 2: POST Request ---")
try:
    payload = {"headless": True, "redirect_url": redirect_url}
    resp = requests.post(base_url, headers={'X-Api-Key': api_key}, json=payload, allow_redirects=False)
    print(f"Status: {resp.status_code}")
    print(f"Headers: {resp.headers}")
    print(f"Body: {resp.text}")
except Exception as e:
    print(f"POST Error: {e}")
