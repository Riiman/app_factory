import sqlite3
import json
import os

DB_PATH = os.path.join(os.getcwd(), 'instance', 'turningidea.db')

def verify_linkedin_settings(startup_id):
    print(f"Checking Marketing Settings for Startup ID: {startup_id}")
    print(f"Database Path: {DB_PATH}")

    if not os.path.exists(DB_PATH):
        print("[-] Database file not found.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        # Check if table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='marketing_settings'")
        if not c.fetchone():
            print("[-] 'marketing_settings' table does not exist.")
            return

        c.execute("SELECT * FROM marketing_settings WHERE startup_id = ? AND provider = ?", (startup_id, 'linkedin'))
        row = c.fetchone()
        
        if not row:
            print("[-] No LinkedIn settings found for this startup.")
            return
            
        print(f"[+] Found LinkedIn settings (ID: {row['setting_id']})")
        
        credentials_json = row['credentials']
        credentials = {}
        if credentials_json:
            try:
                credentials = json.loads(credentials_json)
            except json.JSONDecodeError:
                print("[-] Error decoding credentials JSON.")
                print(f"Raw content: {credentials_json}")
        
        client_id = credentials.get('client_id')
        client_secret = credentials.get('client_secret')
        access_token = credentials.get('access_token')
        
        if client_id:
            print(f"[+] Client ID is present: {client_id[:4]}...{client_id[-4:]}")
        else:
            print("[-] Client ID is MISSING")
            
        if client_secret:
            print(f"[+] Client Secret is present: {'*' * 5}")
        else:
            print("[-] Client Secret is MISSING")
            
        if access_token:
            print(f"[+] Access Token is present (Auth flow completed)")
        else:
            print("[-] Access Token is MISSING (Auth flow NOT completed)")
            
        print(f"[*] Is Active: {row['is_active']}")
        
        conn.close()

    except Exception as e:
        print(f"[-] An error occurred: {e}")

if __name__ == "__main__":
    verify_linkedin_settings(5)
