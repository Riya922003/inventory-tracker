import requests
from requests.auth import HTTPBasicAuth

def test_get_api_users_with_super_admin():
    base_url = "http://localhost:3000"
    auth_username = "test12@gmail.com"
    auth_password = "test12@2003"
    timeout = 30

    session = requests.Session()
    try:
        # Login to get JWT cookie/session
        login_url = f"{base_url}/api/auth/login"
        login_payload = {"email": auth_username, "password": auth_password}
        login_resp = session.post(login_url, json=login_payload, timeout=timeout)
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data, "Login response missing 'user'"
        assert "token" in login_data, "Login response missing 'token'"

        # Use session cookies for authenticated requests
        users_url = f"{base_url}/api/users"
        users_resp = session.get(users_url, timeout=timeout)
        assert users_resp.status_code == 200, f"GET /api/users failed with status {users_resp.status_code}"
        users_list = users_resp.json()
        assert isinstance(users_list, list), "Response is not a list"
        # Optionally check that each user has expected keys (e.g., id, email, role)
        if len(users_list) > 0:
            user = users_list[0]
            assert isinstance(user, dict), "User item is not a dict"
            assert "email" in user, "User missing email field"
            assert "role" in user, "User missing role field"

    finally:
        # Logout to clear session cookie
        logout_url = f"{base_url}/api/auth/logout"
        try:
            logout_resp = session.post(logout_url, timeout=timeout)
            assert logout_resp.status_code == 200, f"Logout failed with status {logout_resp.status_code}"
        except Exception:
            pass

test_get_api_users_with_super_admin()