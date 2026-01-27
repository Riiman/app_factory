
import requests
import os

# Mocking the config for testing - assuming the key is in env or I need to fetch it
# For this script I will try to read it from app config if possible, or just fail if not set.
from app import create_app

app = create_app()
api_key = app.config.get('GETLATE_API_KEY')
backend_url = app.config.get('BACKEND_URL') or 'http://localhost:5000'
startup_id = 5
redirect_url = f"{backend_url}/api/startups/{startup_id}/marketing/callback/generic"

print(f"Testing GetLate Connect with Key: {api_key[:5]}... (Redacted)")
print(f"Redirect URL: {redirect_url}")

url = f"https://getlate.dev/api/v1/connect/linkedin?headless=true&redirect_url={redirect_url}"

try:
    # Try 1: GET with header, allowing redirects to see where it goes
    print("\n--- Attempt 1: Server-side GET with X-Api-Key ---")
    resp = requests.get(url, headers={'X-Api-Key': api_key}, allow_redirects=False)
    print(f"Status: {resp.status_code}")
    print(f"Headers: {resp.headers}")
    print(f"Content: {resp.text}")
    
    if resp.status_code == 302 or resp.status_code == 301:
        print(f"Redirect Location: {resp.headers.get('Location')}")

except Exception as e:
    print(f"Error: {e}")
