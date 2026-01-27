
from urllib.parse import urlparse, parse_qs, unquote
import json

url = "http://localhost:5000/api/startups/5/marketing/callback/generic?profileId=69720a94b07e24be8747ab1c&platform=linkedin&step=select_organization&pendingDataToken=a68723f0c7193c44335056135d1a957b33083a3cb31957b1bdb01488602f7252&connect_token=67ee232f3e8fbd67908e591a9d4cf714f3e7797706233b5e&tempToken=AQVqjNyU5_OIgNNhRN-0fUa9JXHEqXtU8r2zZI-XwtYdCByW4H4gglrumYPxu3i3HEWKGjz8sVX1fpj2YtPKaHeXEBj-ZAkjQZD0Hh2adlXUyeAV3UHELf48-O9FILT3brms_5cqqTIkuRXhXB95RWAGlSrkxOF6T2O1HbzTvjJUkPuMslGmpjM_D7AueGyWnB9twfS9ckliOkNHcJOa9BcowAFFPQQgNb63641RbM8zVPAVJ14azgOPwDw8m7GhcIcISSBfcWPa46__q4wI0fB3GBxdZbEYh_VQvDBmwirW-NGYNIDtxGMFbfBSendSPeFqVT3YrRWcD52jnusP6Sr0YjDDAw&userProfile=%257B%2522id%2522%253A%2522sccKRM_7Qu%2522%252C%2522username%2522%253A%2522Rimanshu%2520Pandey%2522%252C%2522displayName%2522%253A%2522Rimanshu%2520Pandey%2522%252C%2522profilePicture%2522%253A%2522https%253A%252F%252Fmedia.licdn.com%252Fdms%252Fimage%252Fv2%252FD4D03AQGclpL4oaFe2Q%252Fprofile-displayphoto-shrink_100_100%252Fprofile-displayphoto-shrink_100_100%252F0%252F1684820759871%253Fe%253D1770854400%2526v%253Dbeta%2526t%253DQV-VEI5qyxxtpbb9Jomz6SOhK_qSVqxcU1URrBFJMOY%2522%252C%2522profileUrl%2522%253A%2522https%253A%252F%252Fwww.linkedin.com%252Fin%252Frimanshu-pandey-tsaw%252F%2522%257D&organizations=%255B%257B%2522id%2522%253A%252228728847%2522%252C%2522urn%2522%253A%2522urn%253Ali%253Aorganization%253A28728847%2522%252C%2522name%2522%253A%2522Droneco%2522%252C%2522vanityName%2522%253A%2522godroneco%2522%257D%252C%257B%2522id%2522%253A%252277170717%2522%252C%2522urn%2522%253A%2522urn%253Ali%253Aorganization%253A77170717%2522%252C%2522name%2522%253A%2522KAWA%2520TECH%2522%252C%2522vanityName%2522%253A%2522kawa-tech%2522%257D%252C%257B%2522id%2522%253A%2522108138474%2522%252C%2522urn%2522%253A%2522urn%253Ali%253Aorganization%253A108138474%2522%252C%2522name%2522%253A%2522Rimanshu%2520Pandey%2522%252C%2522vanityName%2522%253A%2522rimanshu-pandey%2522%257D%252C%257B%2522id%2522%253A%2522111151116%2522%252C%2522urn%2522%253A%2522urn%253Ali%253Aorganization%253A111151116%2522%252C%2522name%2522%253A%2522VentureStackAI%2522%252C%2522vanityName%2522%253A%2522venturestackai%2522%257D%255D&refreshToken=AQVC6cQAqwrh1txtnj5L107C1UGKieFWAV55qg1WQ5wSDiUpz-dJxBZ6EqC-7EFS3nOQc7jxT8lLs-4HWLR4unctHVO0E0yjMPWwNPhHsmtveDup-uAZWjVC4dv7m-EW_CY8wkO_I1U0jC02A1tx_w03PmBSl4ApBHRiESFyYZo8rjEV69vQaFOdypUO6-1fMf61HSlh3BdVFIi6_oZhA_VhXP2QMnmkkUB3zIfVovJcOJgI2rraHYX3EmLmGKbyT6iPWP2nAhvU0vYzXSDDnzEMcboKhKchfG-O9626loZUr2V7nCcsQ5OcEHVaXL1uHOc3ki0cdr36B9rjAwLKg3mndGmF8g&expiresIn=5183999"

parsed = urlparse(url)
qs = parse_qs(parsed.query)

print("--- RAW QUERY PARAM ---")
raw_orgs = qs.get('organizations', [None])[0]
print(raw_orgs)

print("\n--- DECODING STEP 1 (Standard) ---")
# parse_qs ALREADY decodes standard % encodings (like %22 -> ")
# EXCEPT if it's double encoded.
# The URL has `%255B`. `%25` is encoded `%`. 
# Or is it `%5B`?
# In the string provided: `organizations=%255B...`
# Wait, %25 is %. So %255B is %5B.
# So parse_qs will decode %25 -> %
# So we get %5B... which IS url encoded.
# So we need ONE more unquote.

decoded_1 = unquote(raw_orgs) if raw_orgs else None
print(decoded_1)

print("\n--- JSON PARSE ---")
if decoded_1:
    try:
        data = json.loads(decoded_1)
        print("Success!")
        print(json.dumps(data, indent=2))
        
        ids = [o.get('id') for o in data]
        print(f"\nExtracted IDs: {','.join(ids)}")
    except Exception as e:
        print(f"Fail 1: {e}")
        # Try one more decode?
        decoded_2 = unquote(decoded_1)
        try:
             data = json.loads(decoded_2)
             print("Success after 2nd decode!")
             print(json.dumps(data, indent=2))
        except Exception as e2:
             print(f"Fail 2: {e2}")

