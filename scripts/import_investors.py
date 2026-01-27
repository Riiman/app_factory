
import os
import sys
import csv
import re
import math
from sqlalchemy import create_engine, inspect, text

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import Model
try:
    from app.models import GlobalInvestor, db
except ImportError:
    print("Could not import app.models. Falling back to manual table definition if needed.")
    GlobalInvestor = None

# DATABASE CONFIGURATION
# List of potential DBs
DB_FILES = [
    'turningidea.db',
    'turning_ideas.db',
    'app.db',
    'instance/turning_ideas.db',
    'instance/turningidea.db'
]

def parse_money(money_str):
    if not money_str: return None
    try:
        clean_str = money_str.replace('$', '').replace(',', '').strip()
        if not clean_str: return None
        multiplier = 1.0
        if 'K' in clean_str:
            multiplier = 1000.0
            clean_str = clean_str.replace('K', '')
        elif 'M' in clean_str:
            multiplier = 1000000.0
            clean_str = clean_str.replace('M', '')
        elif 'B' in clean_str:
            multiplier = 1000000000.0
            clean_str = clean_str.replace('B', '')
        return float(clean_str) * multiplier
    except: return None

def setup_and_import():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    
    for db_file in DB_FILES:
        db_path = os.path.join(base_dir, db_file)
        if not os.path.exists(db_path):
             print(f"Skipping {db_file} (Not found)")
             continue
             
        DB_URI = f"sqlite:///{db_path}"
        print(f"\n--- Processing {db_file} ---")
        print(f"Connecting to {DB_URI}...")
        engine = create_engine(DB_URI)
        
        # 3. Import Data
        # prioritizing enriched csv
        enrich_csv_path = os.path.join(os.path.dirname(__file__), '..', 'investors_enriched.csv')
        csv_path = enrich_csv_path if os.path.exists(enrich_csv_path) else os.path.join(os.path.dirname(__file__), '..', 'investors.csv')
        
        if not os.path.exists(csv_path):
            print(f"CSV not found at {csv_path}")
            return
    
        print(f"Starting Import from {os.path.basename(csv_path)}...")
        # Use SQLAlchemy Session
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()
        
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                count = 0
                u_count = 0
                
                for row in reader:
                    name = row.get('Name', '').strip()
                    firm = row.get('Firm', '').strip()
                    if not name and not firm: continue
                    
                    # Parse
                    title = row.get('Title', '').strip()
                    sweet_raw = row.get('Sweet Spot', '').strip()
                    range_raw = row.get('Range', '').strip()
                    loc_raw = row.get('Locations', '').strip()
                    sec_raw = row.get('Sectors', '').strip()
                    source = row.get('Source', '').strip()
                    website = row.get('Website', '').strip()
                    
                    # New Enriched Fields
                    linkedin = row.get('LinkedIn', '').strip()
                    bio = row.get('Bio', '').strip()
                    recent_inv = row.get('Recent_Investments', '').strip()
                    prof_sweet = row.get('Profile_Sweet_Spot', '').strip()
                    prof_range = row.get('Profile_Range', '').strip()
                    
                    # Logic
                    types = []
                    if 'Partner' in title or 'Director' in title: types.append('VC')
                    elif 'Angel' in title: types.append('Angel')
                    elif 'Scout' in title: types.append('Scout')
                    else: types.append(title)
                    
                    sweet_val = parse_money(sweet_raw.split('(')[0])
                    min_c, max_c = None, None
                    range_match = re.search(r'\((.*?)\)', sweet_raw)
                    if range_match:
                        parts = range_match.group(1).split('-')
                        if len(parts) >= 1: min_c = parse_money(parts[0])
                        if len(parts) >= 2: max_c = parse_money(parts[1])
                    
                    locs = [l.strip() for l in loc_raw.split(',') if l.strip()]
                    
                    sectors = set()
                    stages = set()
                    raw_secs = [x.strip() for x in sec_raw.split(',')]
                    for item in raw_secs:
                        m = re.match(r'^(.*?) \((.*)\)$', item)
                        if m:
                            sectors.add(m.group(1).strip())
                            stages.add(m.group(2).strip())
                        elif item:
                            sectors.add(item)
                    
                    # Upsert
                    existing = session.query(GlobalInvestor).filter_by(name=name, firm_name=firm).first()
                    
                    # Store only data provenance in meta_data (not display fields)
                    meta = {
                        "original_range": range_raw,
                        "raw_sweet_spot": sweet_raw,
                        "profile_sweet_spot": prof_sweet,
                        "profile_range": prof_range
                    }
                    
                    # Clean empty meta keys
                    meta = {k: v for k, v in meta.items() if v}
                    
                    # Skip "N/A" values for bio
                    bio_clean = bio if bio and bio != "N/A" else None
                    recent_inv_clean = recent_inv if recent_inv and recent_inv != "N/A" else None
                    
                    if existing:
                        # Update fields
                        if not existing.sweet_spot and sweet_val: existing.sweet_spot = sweet_val
                        if not existing.min_check_size and min_c: existing.min_check_size = min_c
                        if not existing.max_check_size and max_c: existing.max_check_size = max_c
                        if website: existing.website = website
                        if linkedin: existing.linkedin = linkedin
                        if title: existing.title = title
                        if bio_clean: existing.bio = bio_clean
                        if recent_inv_clean: existing.recent_investments = recent_inv_clean
                        
                        # Merge Meta
                        import json
                        from sqlalchemy.orm.attributes import flag_modified
                        
                        curr_meta = existing.meta_data or {}
                        if isinstance(curr_meta, str):
                            try: curr_meta = json.loads(curr_meta)
                            except: curr_meta = {}
                        else:
                            curr_meta = dict(curr_meta)
                        
                        curr_meta.update(meta)
                        existing.meta_data = curr_meta
                        flag_modified(existing, "meta_data")
                        
                        u_count += 1
                    else:
                        new_inv = GlobalInvestor(
                            name=name,
                            firm_name=firm,
                            title=title,
                            types=types,
                            focus_sectors=list(sectors),
                            focus_stages=list(stages),
                            min_check_size=min_c,
                            max_check_size=max_c,
                            sweet_spot=sweet_val,
                            locations=locs,
                            website=website,
                            linkedin=linkedin,
                            bio=bio_clean,
                            recent_investments=recent_inv_clean,
                            meta_data=meta
                        )
                        session.add(new_inv)
                        count += 1
                    
                    if (count + u_count) % 500 == 0:
                        print(f"Processed {count + u_count}...")
                        session.commit()
                
                session.commit()
                print(f"Finished {db_file}! Created: {count}, Updated: {u_count}")
                
        except Exception as e:
            print(f"Import Error on {db_file}: {e}")
            import traceback
            traceback.print_exc()
        finally:
            session.close()

if __name__ == '__main__':
    setup_and_import()
