
import requests
import json

BASE_URL = "http://localhost:5000"

def test_submit_stage():
    """Test submitting a stage"""
    # First login to get token
    login_response = requests.post(f"{BASE_URL}/api/login", json={
        "email": "test@example.com",
        "password": "testpassword"
    })
    
    if login_response.status_code != 200:
        print("Login failed:", login_response.json())
        return
    
    token = login_response.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test submitting stage 1
    stage_data = {
        "stage": 1,
        "data": {
            "startup_name": "Test Startup",
            "founder_name": "John Doe",
            "email": "john@test.com",
            "phone": "1234567890",
            "location": "Bangalore"
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/api/submit-stage",
        json=stage_data,
        headers=headers
    )
    
    print("Submit Stage Response:", response.status_code)
    print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    test_submit_stage()
