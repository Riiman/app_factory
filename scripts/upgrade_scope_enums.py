import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db
from app.models import Experiment, Task, Scope

def upgrade_enum_values():
    """
    Upgrades lowercase enum values in the database to their uppercase equivalents.
    """
    app = create_app()
    with app.app_context():
        print("--- Starting database enum upgrade ---")

        # Upgrade Experiments
        updated_experiments = 0
        experiments_to_update = Experiment.query.all()
        for exp in experiments_to_update:
            if exp.scope and isinstance(exp.scope, str) and exp.scope.lower() in ['product', 'business', 'fundraise', 'marketing', 'general']:
                try:
                    new_scope = Scope[exp.scope.upper()]
                    exp.scope = new_scope
                    updated_experiments += 1
                except KeyError:
                    print(f"  - Warning: Could not find uppercase mapping for experiment scope '{exp.scope}' (ID: {exp.id})")
        
        if updated_experiments > 0:
            print(f"--- Found and staged {updated_experiments} experiments for scope upgrade ---")
        else:
            print("--- No experiments found with lowercase scope values to upgrade ---")

        # Upgrade Tasks
        updated_tasks = 0
        tasks_to_update = Task.query.all()
        for task in tasks_to_update:
            if task.scope and isinstance(task.scope, str) and task.scope.lower() in ['product', 'business', 'fundraise', 'marketing', 'general']:
                try:
                    new_scope = Scope[task.scope.upper()]
                    task.scope = new_scope
                    updated_tasks += 1
                except KeyError:
                    print(f"  - Warning: Could not find uppercase mapping for task scope '{task.scope}' (ID: {task.id})")

        if updated_tasks > 0:
            print(f"--- Found and staged {updated_tasks} tasks for scope upgrade ---")
        else:
            print("--- No tasks found with lowercase scope values to upgrade ---")

        # Commit changes if any updates were made
        if updated_experiments > 0 or updated_tasks > 0:
            try:
                db.session.commit()
                print("--- Successfully committed all enum upgrades to the database! ---")
            except Exception as e:
                db.session.rollback()
                print(f"--- Erorr committing changes: {e} ---")
        else:
            print("--- No changes to commit ---")

if __name__ == '__main__':
    upgrade_enum_values()
