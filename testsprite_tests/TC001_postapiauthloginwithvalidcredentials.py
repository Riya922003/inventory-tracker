import requests

def test_post_api_auth_login_with_valid_credentials():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/auth/login"
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

    assert response.status_code == 200, f"Expected status code 200 but got {response.status_code}"

    # Validate response JSON structure
    try:
        data = response.json()
    except ValueError:
        assert False, "Response is not valid JSON"

    assert "user" in data, "Response JSON does not contain 'user'"
    assert isinstance(data["user"], dict), "'user' should be a dictionary"

    assert "token" in data, "Response JSON does not contain 'token'"
    assert isinstance(data["token"], str) and data["token"], "'token' should be a non-empty string"

    # Validate cookie/session for JWT token presence
    cookies = response.cookies
    jwt_cookie_found = any("token" in cookie.name.lower() or "jwt" in cookie.name.lower() for cookie in cookies)
    assert jwt_cookie_found, "JWT token cookie/session not found in response cookies"

test_post_api_auth_login_with_valid_credentials()