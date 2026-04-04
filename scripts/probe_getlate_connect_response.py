
import requests
import os
from dotenv import load_dotenv

load_dotenv('.env')

api_key = os.getenv('GETLATE_API_KEY')
if not api_key:
    api_key = 'sk_0b138c1c46622852bf949abc534b0305905133b5cebd34e266756804c90fe2a3'

# We need a profile ID to simulate correctly
# I'll create one temporary, probe, then delete.
internal_id = "probe_test_temp"
profile_url = "https://getlate.dev/api/v1/profiles"
headers = {"Authorization": f"Bearer {api_key}"}

try:
    # 1. Create Profile
    print("Creating Temp Profile...")
    p_resp = requests.post(profile_url, headers=headers, json={"internalId": internal_id, "name": "Probe"})
    if p_resp.status_code not in [200, 201]:
        print(f"Failed to create profile: {p_resp.text}")
        exit(1)
        
    p_data = p_resp.json()
    profile_id = p_data.get('id') or p_data.get('profile', {}).get('_id')
    print(f"Profile ID: {profile_id}")

    # 2. Probe Connect
    connect_url = "https://getlate.dev/api/v1/connect/linkedin"
    params = {
        "headless": "true",
        "redirect_url": "http://localhost:5000/callback",
        "profileId": profile_id
    }
    
    print("\nProbing Connect Endpoint...")
    resp = requests.get(connect_url, headers=headers, params=params, allow_redirects=False)
    
    print(f"Status: {resp.status_code}")
    print(f"Headers: {resp.headers}")
    print(f"Is Redirect: {resp.is_redirect}")
    
    if resp.status_code == 200:
        print("\n--- Response Body (200 OK) ---")
        try:
            print(resp.json())
        except:
            print(resp.text[:500] + "...")
            
    # 3. Cleanup
    print("\nDeleting Temp Profile...")
    requests.delete(f"{profile_url}/{profile_id}", headers=headers)

except Exception as e:
    print(f"Error: {e}")
