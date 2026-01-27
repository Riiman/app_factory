
import requests
import os
from dotenv import load_dotenv

load_dotenv('.env')

api_key = os.getenv('GETLATE_API_KEY')
if not api_key:
    api_key = 'sk_0b138c1c46622852bf949abc534b0305905133b5cebd34e266756804c90fe2a3'

# Token from user logs
temp_token = "a1b9693cd782c6e1ce7cb0741763cb1a2eb5b8b2a4ec2e86"
profile_id = "69720a94b07e24be8747ab1c"

# Testing URL construction
url = "https://getlate.dev/api/v1/connect/linkedin/organizations"

headers = {
    "Authorization": f"Bearer {api_key}"
}

print("--- Test 1: Without orgIds (Expect Fail) ---")
params = {
    "tempToken": temp_token,
    "profileId": profile_id
}
resp = requests.get(url, headers=headers, params=params)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")

print("\n--- Test 2: With Dummy orgIds (Expect Success/Error but not Missing Param) ---")
# We don't know real org IDs, but we can send dummy ones to see if error changes
params["orgIds"] = "12345,67890" 
resp = requests.get(url, headers=headers, params=params)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")
