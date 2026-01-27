# Global Investors API - Usage Examples

## Base Endpoint
```
GET /api/startups/:startup_id/global-investors
```

## Example Requests

### 1. Basic Pagination
Get first 50 investors (default):
```
GET /api/startups/5/global-investors?page=1&limit=50
```

### 2. Search by Name or Firm
```
GET /api/startups/5/global-investors?search=sequoia
```

### 3. Filter by Investor Type
Get only VCs:
```
GET /api/startups/5/global-investors?types=VC
```

Get VCs and Angels:
```
GET /api/startups/5/global-investors?types=VC,Angel
```

### 4. Filter by Sector
Get fintech investors:
```
GET /api/startups/5/global-investors?sectors=FinTech
```

### 5. Filter by Stage
Get Series A investors:
```
GET /api/startups/5/global-investors?stages=Series A
```

### 6. Filter by Location
Get SF Bay Area investors:
```
GET /api/startups/5/global-investors?locations=SF Bay Area (CA)
```

### 7. Filter by Check Size
Get investors who invest $1M-$5M:
```
GET /api/startups/5/global-investors?min_check=1000000&max_check=5000000
```

### 8. Metadata Search - Bio Keywords
Find investors interested in "AI" or "fintech":
```
GET /api/startups/5/global-investors?bio_keywords=AI
GET /api/startups/5/global-investors?bio_keywords=fintech
```

### 9. Metadata Search - Recent Investments
Find investors who recently backed similar companies:
```
GET /api/startups/5/global-investors?investment_keywords=SaaS
```

### 10. Combined Filters
Get SF-based VCs who invest $1M-$10M in Series A fintech companies:
```
GET /api/startups/5/global-investors?types=VC&sectors=FinTech&stages=Series A&locations=SF Bay Area (CA)&min_check=1000000&max_check=10000000
```

### 11. Sorting
Sort by sweet spot (descending):
```
GET /api/startups/5/global-investors?sort_by=sweet_spot&order=desc
```

Sort by name (ascending, default):
```
GET /api/startups/5/global-investors?sort_by=name&order=asc
```

## Response Format
```json
{
  "success": true,
  "investors": [
    {
      "id": 1,
      "name": "Aaref Hilaly",
      "firm_name": "Bain Capital Ventures",
      "types": ["VC", "Partner"],
      "focus_sectors": ["SaaS", "Analytics", "AI"],
      "focus_stages": ["Seed", "Series A"],
      "min_check_size": 1000000,
      "max_check_size": 100000000,
      "sweet_spot": 10000000,
      "locations": ["SF Bay Area (CA)"],
      "website": "https://signal.nfx.com/investors/aaref-hilaly",
      "email": null,
      "phone": null,
      "linkedin": "https://www.linkedin.com/in/aarefhilaly/",
      "meta_data": {
        "bio": "N/A",
        "recent_investments": "Echelon, EvenUp, Cognition",
        "source": "Signal NFX"
      }
    }
  ],
  "pagination": {
    "total": 1866,
    "page": 1,
    "limit": 50,
    "total_pages": 38,
    "has_next": true,
    "has_prev": false
  }
}
```

## Performance Notes
- Default page size: 50 investors
- Maximum page size: 100 investors
- Average response time: <100ms (vs 2-3s for loading all 1,866)
- Metadata search uses SQLite JSON operators for efficient querying
