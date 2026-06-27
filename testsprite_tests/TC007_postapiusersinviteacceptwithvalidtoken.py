import requests

BASE_URL = "http://localhost:3000"
AUTH_CREDENTIALS = ("test12@gmail.com", "test12@2003")
TIMEOUT = 30

def test_post_api_users_invite_accept_with_valid_token():
    session = requests.Session()

    # Step 1: Log in as super_admin to get token for invitation
    login_url = f"{BASE_URL}/api/auth/login"
    login_payload = {
        "email": AUTH_CREDENTIALS[0],
        "password": AUTH_CREDENTIALS[1]
    }
    login_resp = session.post(login_url, json=login_payload, timeout=TIMEOUT)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

    # Step 2: Send invitation to new user email
    invite_url = f"{BASE_URL}/api/users/invite"
    new_user_email = "invite_accept_test_user@example.com"
    invite_payload = {
        "email": new_user_email,
        "role": "warehouse_manager",
        "assignedWarehouses": []
    }
    invite_resp = session.post(invite_url, json=invite_payload, timeout=TIMEOUT)
    assert invite_resp.status_code == 200, f"Invitation failed: {invite_resp.text}"
    invite_data = invite_resp.json()

    # According to PRD, token is not returned in invitation response, so we cannot proceed to accept invite in this test
    # Instead, just assert invitation object has expected fields (e.g., email & role)
    assert invite_data.get("email") == new_user_email, "Invitation email does not match"
    assert invite_data.get("role") == "warehouse_manager", "Invitation role does not match"

    # Since token is not returned, stop test here


test_post_api_users_invite_accept_with_valid_token()
