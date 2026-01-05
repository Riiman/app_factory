import sqlite3
import sys
import os

# Default to the path where the app likely runs
DB_PATH = "v3_checkpoints.sqlite"

def clean_state(startup_id, last_only=False):
    if not os.path.exists(DB_PATH):
        # Try looking one directory up just in case
        if os.path.exists(f"../{DB_PATH}"):
            db_path = f"../{DB_PATH}"
        else:
            print(f"Error: Database {DB_PATH} not found in current directory.")
            print("Please run this script from the root directory of the application.")
            return
    else:
        db_path = DB_PATH

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    thread_id = str(startup_id)
    print(f"Accessing state for thread_id: {thread_id} in {db_path}")
    
    try:
        # Check if it exists first
        c.execute("SELECT count(*) FROM checkpoints WHERE thread_id=?", (thread_id,))
        count = c.fetchone()[0]
        if count == 0:
            print(f"No checkpoints found for ID {thread_id}.")
            return

        if last_only:
             # Find the latest checkpoint
             c.execute("SELECT thread_ts FROM checkpoints WHERE thread_id=? ORDER BY thread_ts DESC LIMIT 1", (thread_id,))
             row = c.fetchone()
             if row:
                 latest_ts = row[0]
                 print(f"Deleting LATEST checkpoint only (ts={latest_ts})...")
                 
                 c.execute("DELETE FROM checkpoints WHERE thread_id=? AND thread_ts=?", (thread_id, latest_ts))
                 c.execute("DELETE FROM writes WHERE thread_id=? AND thread_ts=?", (thread_id, latest_ts))
                 try:
                     c.execute("DELETE FROM checkpoints_blobs WHERE thread_id=? AND thread_ts=?", (thread_id, latest_ts))
                 except sqlite3.OperationalError: pass
                 
                 print("Latest snapshot deleted. Previous state preserved.")
             else:
                 print("No results to delete.")
        else:
            print(f"Deleting ALL {count} checkpoints (Full Reset)...")
            c.execute("DELETE FROM checkpoints WHERE thread_id=?", (thread_id,))
            c.execute("DELETE FROM writes WHERE thread_id=?", (thread_id,))
            try:
                c.execute("DELETE FROM checkpoints_blobs WHERE thread_id=?", (thread_id,))
            except sqlite3.OperationalError: pass
            
            print("All state cleared successfully.")
            
        conn.commit()
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 clean_v3_state.py <startup_id> [--last]")
        print("  --last  : Delete only the most recent snapshot (Undo last step)")
        print("  (default): Delete ALL history for this agent (Full Reset)")
    else:
        last_only = "--last" in sys.argv
        clean_state(sys.argv[1], last_only)
