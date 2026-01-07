
import sys
import os
from app import create_app, db
from app.models import Startup
import json
from decimal import Decimal
from datetime import date, datetime

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError ("Type %s not serializable" % type(obj))

app = create_app()

with app.app_context():
    startup_id = 5
    startup = Startup.query.get(startup_id)
    if not startup:
        print(f"Startup {startup_id} not found")
        sys.exit(1)
    
    try:
        data = startup.to_dict(include_relations=['funding_rounds', 'investors'])
        print(json.dumps(data, indent=2, default=json_serial))
        
        # Specifically check funding rounds
        rounds = data.get('funding_rounds', [])
        print(f"\nFunding Rounds Count: {len(rounds)}")
        for i, r in enumerate(rounds):
            print(f"Round {i}: ID={r.get('round_id')}, Investors={len(r.get('investors', []))}")
            for j, inv in enumerate(r.get('investors', [])):
                print(f"  Investor {j}: {inv}")
                
    except Exception as e:
        print(f"Error generating dictionary: {e}")
        import traceback
        traceback.print_exc()
