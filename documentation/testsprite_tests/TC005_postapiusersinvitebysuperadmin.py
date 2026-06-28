import requests
import random
import string

def test_post_api_users_invite_by_superadmin():
    base_url = "http://localhost:3000"
    login_url = f"{base_url}/api/auth/login"
    invite_url = f"{base_url}/api/users/invite"

    session = requests.Session()
    timeout = 30

    # Credentials from instructions
    username = "test12@gmail.com"
    password = "test12@2003"

    # First, login to get authentication cookie/session and token
    login_payload = {
        "email": username,
        "password": password
    }
    login_resp = session.post(login_url, json=login_payload, timeout=timeout)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

    login_data = login_resp.json()
    token = login_data.get("token")
    assert token, "Login response missing token"

    # Set Authorization header with Bearer token for subsequent requests
    session.headers.update({"Authorization": f"Bearer {token}"})

    def random_email():
        return "testinvite+" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=8)) + "@example.com"

    invite_payload = {
        "email": random_email(),
        "role": "warehouse_manager",
        "assignedWarehouses": []
    }

    # Send invitation request
    response = session.post(invite_url, json=invite_payload, timeout=timeout)

    try:
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}, body: {response.text}"
        # Validate response contains invitation record with expected fields
        resp_json = response.json()
        assert "email" in resp_json, "Response missing 'email'"
        assert resp_json["email"] == invite_payload["email"], "Invitation email mismatch"
        assert "role" in resp_json, "Response missing 'role'"
        assert resp_json["role"] == invite_payload["role"], "Invitation role mismatch"
    finally:
        pass

test_post_api_users_invite_by_superadmin()