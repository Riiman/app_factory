import sys
import requests

def check_react_app():
    try:
        resp = requests.get("http://localhost:3000", timeout=5)
        if resp.status_code != 200:
            return False, f"React app returned status code {resp.status_code}"
        # Check for typical React content
        if "react" not in resp.text.lower() and "<div" not in resp.text.lower():
            return False, "React app response does not contain expected content"
        return True, ""
    except Exception as e:
        return False, f"React app not reachable: {e}"

def check_flask_app():
    try:
        resp = requests.get("http://localhost:5000", timeout=5)
        if resp.status_code != 200:
            return False, f"Flask app returned status code {resp.status_code}"
        # Check for typical Flask content (HTML or JSON)
        content_type = resp.headers.get("Content-Type", "")
        if "html" not in content_type and "json" not in content_type:
            return False, "Flask app response does not have expected Content-Type"
        return True, ""
    except Exception as e:
        return False, f"Flask app not reachable: {e}"

def main():
    react_ok, react_msg = check_react_app()
    flask_ok, flask_msg = check_flask_app()

    if not react_ok:
        print(f"VERIFICATION FAILED: {react_msg}")
        sys.exit(1)
    if not flask_ok:
        print(f"VERIFICATION FAILED: {flask_msg}")
        sys.exit(1)

    print("VERIFICATION PASSED")
    sys.exit(0)

if __name__ == "__main__":
    main()