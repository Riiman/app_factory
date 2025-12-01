import sqlite3

def add_columns():
    conn = sqlite3.connect('instance/turningidea.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE scope_documents ADD COLUMN founder_accepted BOOLEAN DEFAULT 0")
        print("Added founder_accepted column")
    except sqlite3.OperationalError as e:
        print(f"Error adding founder_accepted: {e}")

    try:
        cursor.execute("ALTER TABLE scope_documents ADD COLUMN admin_accepted BOOLEAN DEFAULT 0")
        print("Added admin_accepted column")
    except sqlite3.OperationalError as e:
        print(f"Error adding admin_accepted: {e}")

    conn.commit()
    conn.close()

if __name__ == '__main__':
    add_columns()
