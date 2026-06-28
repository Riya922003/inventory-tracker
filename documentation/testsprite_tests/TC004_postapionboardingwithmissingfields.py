import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
AUTH_USERNAME = "test12@gmail.com"
AUTH_PASSWORD = "test12@2003"
TIMEOUT = 30

def test_postapionboardingwithmissingfields():
    url = f"{BASE_URL}/api/onboarding"
    # Missing required fields: all fields empty
    payloads = [
        {},  # completely empty payload
        {"companyName": "", "adminEmail": "", "adminPassword": "", "warehouseName": "", "categories": []},
        {"companyName": "ValidName"},  # partial data missing required fields
        {"adminEmail": "user@example.com"},  # partial data missing others
        {"companyName": "ValidName", "adminEmail": "invalid-email", "adminPassword": "pass", "warehouseName": "", "categories": []},  # invalid email and missing fields
        {"companyName": "ValidName", "adminEmail": "valid@example.com", "adminPassword": "", "warehouseName": "Warehouse1", "categories": ["cat1", "cat2"]},  # password missing
        {"companyName": "ValidName", "adminEmail": "valid@example.com", "adminPassword": "password", "warehouseName": "", "categories": ["cat1"]},  # warehouseName missing
        {"companyName": "ValidName", "adminEmail": "valid@example.com", "adminPassword": "password", "warehouseName": "Warehouse1"}  # categories missing
    ]

    headers = {
        "Content-Type": "application/json"
    }

    for payload in payloads:
        response = None
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                auth=HTTPBasicAuth(AUTH_USERNAME, AUTH_PASSWORD),
                timeout=TIMEOUT
            )
        except requests.RequestException as e:
            assert False, f"Request failed: {e}"

        assert response is not None, "No response received"
        assert response.status_code == 400, (
            f"Expected status 400 Validation error for payload {payload}, "
            f"got {response.status_code} with response body: {response.text}"
        )

test_postapionboardingwithmissingfields()