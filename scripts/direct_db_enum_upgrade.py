import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from sqlalchemy import text

def direct_db_enum_upgrade():
    """
    Performs direct SQL updates to convert lowercase enum values to uppercase
    in the 'scope' columns of the 'experiments' and 'tasks' tables, and the
    'status' column of the 'experiments' table.
    """
    app = create_app()
    with app.app_context():
        print("--- Starting direct database enum upgrade ---")

        try:
            with db.engine.connect() as connection:
                # Update 'experiments' table 'scope' column
                connection.execute(
                    text("UPDATE experiments SET scope = UPPER(scope) WHERE scope IN ('product', 'business', 'fundraise', 'marketing', 'general')")
                )
                print("--- Updated 'experiments' table 'scope' column ---")

                # Update 'experiments' table 'status' column
                connection.execute(
                    text("UPDATE experiments SET status = UPPER(status) WHERE status IN ('planned', 'running', 'completed')")
                )
                print("--- Updated 'experiments' table 'status' column ---")

                # Update 'tasks' table
                connection.execute(
                    text("UPDATE tasks SET scope = UPPER(scope) WHERE scope IN ('product', 'business', 'fundraise', 'marketing', 'general')")
                )
                print("--- Updated 'tasks' table 'scope' column ---")

                # Update 'artifacts' table 'type' column
                connection.execute(
                    text("UPDATE artifacts SET type = UPPER(type) WHERE type IN ('file', 'link', 'text')")
                )
                print("--- Updated 'artifacts' table 'type' column ---")

                connection.commit()
                print("--- Successfully committed direct enum upgrades to the database! ---")

        except Exception as e:
            print(f"--- Error during direct database enum upgrade: {e} ---")

if __name__ == '__main__':
    direct_db_enum_upgrade()