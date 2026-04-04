from urllib.parse import quote

# Configuration relative to what we found in .env and routes
BACKEND_URL = "http://localhost:5000"
STARTUP_ID = 5
REDIRECT_URI = f"{BACKEND_URL}/api/startups/{STARTUP_ID}/marketing/linkedin/callback"

print("\n" + "="*60)
print("LINKEDIN INTEGRATION DIAGNOSTIC")
print("="*60)
print("\n[1] EXPECTED REDIRECT URI:")
print(f"    {REDIRECT_URI}")
print("\n[2] INSTRUCTIONS:")
print("    Please copy the above URL exactly.")
print("    Go to: LinkedIn Developers -> Your App -> Auth -> OAuth 2.0 settings -> Redirect URLs")
print("    Ensure this EXACT URL is added there.")
print("    Make sure there are no trailing slashes or http/https mismatches.")
print("\n" + "="*60 + "\n")
