#!/usr/bin/env python3
"""
Script to reset product stages back to IDEA so Initialize button shows instead of Resume.
"""
import sqlite3

def reset_product_stages(db_path="instance/turningidea.db"):
    """Reset all products to IDEA stage."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current product stages
        cursor.execute("SELECT id, name, stage, startup_id FROM products")
        products = cursor.fetchall()
        
        print("Current product stages:")
        for p in products:
            print(f"  Product ID: {p[0]}, Name: {p[1]}, Stage: {p[2]}, Startup ID: {p[3]}")
        
        # Reset all to IDEA stage
        cursor.execute("UPDATE products SET stage = 'IDEA'")
        affected = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        print(f"\n✅ Successfully reset {affected} products to IDEA stage!")
        print("Now refresh the page and you should see 'Initialize' instead of 'Resume'")
        return True
        
    except Exception as e:
        print(f"❌ Error resetting product stages: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    reset_product_stages()
