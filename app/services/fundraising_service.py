from app.models import GlobalInvestor, Startup, db
from sqlalchemy.orm.attributes import flag_modified

class FundraisingService:
    @staticmethod
    def get_recommendations(startup_id, limit=100):
        """
        Robust recommendation engine for matching investors to startups.
        Scoring (Total 100):
        - Sector Alignment: 40 pts
        - Stage Fit: 30 pts
        - Check Size Compatibility: 20 pts
        - Location Preference: 10 pts
        """
        startup = Startup.query.get(startup_id)
        if not startup:
            return []

        # 1. Get Startup Profile
        s_sectors = set(startup.focus_sectors) if startup.focus_sectors else set()
        if not s_sectors and startup.submission and startup.submission.startup_type:
             # Fallback to submission type if not set
             s_sectors = {startup.submission.startup_type}
             
        s_stage = startup.fundraising_stage
        
        # Map rough stage if not set
        if not s_stage and startup.current_stage:
            stage_map = {
                'IDEA': 'Pre-Seed',
                'MVP': 'Seed',
                'GROWTH': 'Series A',
                'ADMITTED': 'Pre-Seed'
            }
            s_stage = stage_map.get(startup.current_stage.name, 'Seed')

        s_raise = startup.target_raise
        s_location = startup.primary_location

        # 2. Fetch all Global Investors
        # Ideally this would be a filtered query, but for <2000 items, in-memory scoring is fast enough and flexible
        all_investors = GlobalInvestor.query.all()
        
        scored_investors = []
        
        for inv in all_investors:
            score = 0
            reasons = []
            
            # --- 1. Sector Alignment (40 pts) ---
            if s_sectors and inv.focus_sectors:
                # Count matches
                inv_sectors = set(inv.focus_sectors)
                # Flexible matching (substring or exact)
                matches = 0
                for ss in s_sectors:
                    for ids in inv_sectors:
                        if ss.lower() in ids.lower() or ids.lower() in ss.lower():
                            matches += 1
                            break
                
                if matches > 0:
                    # Proportional score
                    sector_score = min(40, (matches / len(s_sectors)) * 40)
                    score += sector_score
                    if sector_score >= 20:
                        reasons.append("Matches your sector")
            
            # --- 2. Stage Fit (30 pts) ---
            if s_stage and inv.focus_stages:
                if s_stage in inv.focus_stages:
                    score += 30
                    reasons.append(f"Invests in {s_stage}")
                else:
                    # Adjacent stage logic (simplified)
                    stages = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C']
                    try:
                        idx = stages.index(s_stage)
                        adjacent = []
                        if idx > 0: adjacent.append(stages[idx-1])
                        if idx < len(stages)-1: adjacent.append(stages[idx+1])
                        
                        if any(adj in inv.focus_stages for adj in adjacent):
                            score += 20
                            reasons.append("Invests in adjacent stages")
                    except ValueError:
                        pass # Unknown stage string

            # --- 3. Check Size Compatibility (20 pts) ---
            if s_raise:
                inv_min = inv.min_check_size
                inv_max = inv.max_check_size
                
                if inv_min and inv_max:
                    if inv_min <= s_raise <= inv_max:
                        score += 20
                        reasons.append("Target raise fits check size")
                    elif (inv_min * 0.75) <= s_raise <= (inv_max * 1.25):
                        score += 10 # Close enough
                elif inv.sweet_spot:
                    # Within 50% of sweet spot
                    if (inv.sweet_spot * 0.5) <= s_raise <= (inv.sweet_spot * 1.5):
                        score += 20
                        reasons.append("Matches sweet spot")

            # --- 4. Location Preference (10 pts) ---
            if s_location and inv.locations:
                match = False
                for loc in inv.locations:
                    if s_location.lower() in loc.lower() or loc.lower() in s_location.lower():
                        match = True
                        break
                
                if match:
                    score += 10
                    reasons.append("Location match")
                elif "Global" in inv.locations or "Remote" in inv.locations:
                    score += 5
            
            # Penalize if score is decent but no sector match (sector is key)
            if score > 0 and not any("sector" in r.lower() for r in reasons) and s_sectors:
               score = score * 0.5 # Halve score if sector doesn't match
               
            if score >= 40: # Threshold
                scored_investors.append({
                    "investor": inv.to_dict(),
                    "score": round(score),
                    "match_reasons": reasons
                })
        
        # Sort by score descending
        scored_investors.sort(key=lambda x: x['score'], reverse=True)
        
        return scored_investors[:limit]
