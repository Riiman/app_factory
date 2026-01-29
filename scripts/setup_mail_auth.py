import os
import sys
try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("Please install required packages: pip install google-auth-oauthlib")
    sys.exit(1)

def generate_creds():
    print("--- Gmail API Auth Setup ---")
    print("This script will generate a Refresh Token for your application.")
    
    # Credentials provided by env or prompt
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id or not client_secret:
         print("Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in your environment variables.")
         return
    
    print(f"Using Client ID: {client_id}")

    # Configuration
    SCOPES = ['https://www.googleapis.com/auth/gmail.send']
    
    # Create the flow manually
    flow = InstalledAppFlow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES
    )

    print(f"\nLaunching browser for authentication...")
    print(f"Please sign in with the account you want to send emails as (e.g., support@turningideas.com)")
    
    try:
        creds = flow.run_local_server(port=8080)
    except OSError as e:
        print(f"\nError starting local server: {e}")
        print("Make sure port 8080 is free or try a different configuration.")
        return
    
    print("\n--- Authentication Successful! ---")
    print("\nAdd the following lines to your .env file:\n")
    print(f"GOOGLE_OAUTH_CLIENT_ID={client_id}")
    print(f"GOOGLE_OAUTH_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_OAUTH_REFRESH_TOKEN={creds.refresh_token}")
    print(f"USE_GMAIL_API=True")
    
    if not creds.refresh_token:
        print("\nWARNING: No refresh token returned!")
        print("This usually happens if you have already authorized this app.")
        print("Go to https://myaccount.google.com/permissions and remove the app, then run this script again.")

if __name__ == '__main__':
    generate_creds()
