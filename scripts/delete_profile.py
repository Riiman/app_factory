
import requests
import os
from dotenv import load_dotenv
import sys

load_dotenv('.env')

api_key = os.getenv('GETLATE_API_KEY')
if not api_key:
    # default fallback from config
    api_key = 'sk_0b138c1c46622852bf949abc534b0305905133b5cebd34e266756804c90fe2a3'

# ID from previous debug output
profile_id = "69720944860656c69e7af468"

if len(sys.argv) > 1:
    profile_id = sys.argv[1]

print(f"Deleting Profile ID: {profile_id}")
url = f"https://getlate.dev/api/v1/profiles/{profile_id}"

headers = {
    "Authorization": f"Bearer {api_key}"
}

try:
    resp = requests.delete(url, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
