import requests
from requests.auth import HTTPBasicAuth

def test_postapiauthloginwithinvalidcredentials():
    base_url = "http://localhost:3000"
    endpoint = "/api/auth/login"
    url = base_url + endpoint

    payload = {
        "email": "test12@gmail.com",
        "password": "test12@2003"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 401, f"Expected status code 401, got {response.status_code}"

test_postapiauthloginwithinvalidcredentials()