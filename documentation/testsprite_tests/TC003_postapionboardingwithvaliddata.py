import requests

def test_post_api_onboarding_with_valid_data():
    base_url = "http://localhost:3000"
    endpoint = "/api/onboarding"
    url = base_url + endpoint

    headers = {
        "Content-Type": "application/json"
    }
    payload = {
        "companyName": "Test Company TC003",
        "adminEmail": "admin_tc003@example.com",
        "adminPassword": "SecurePass123!",
        "warehouseName": "Main Warehouse TC003",
        "categories": ["electronics", "furniture", "apparel"]
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

        json_response = response.json()
        # Assert presence of company, user, warehouse keys in response
        assert "company" in json_response, "Response missing 'company' key"
        assert "user" in json_response, "Response missing 'user' key"
        assert "warehouse" in json_response, "Response missing 'warehouse' key"

        # Additional checks for subfields to confirm creation
        company = json_response["company"]
        user = json_response["user"]
        warehouse = json_response["warehouse"]

        assert isinstance(company, dict) and "name" in company and company["name"] == payload["companyName"], "Invalid company data"
        assert isinstance(user, dict) and "email" in user and user["email"] == payload["adminEmail"], "Invalid user data"
        assert isinstance(warehouse, dict) and "name" in warehouse and warehouse["name"] == payload["warehouseName"], "Invalid warehouse data"

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_onboarding_with_valid_data()