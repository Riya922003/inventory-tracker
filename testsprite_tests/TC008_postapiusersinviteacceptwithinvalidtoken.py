import requests
from requests.auth import HTTPBasicAuth

def test_post_api_users_invite_accept_with_invalid_token():
    base_url = "http://localhost:3000"
    url = f"{base_url}/api/users/invite/accept"
    invalid_token = "this_is_an_invalid_token_1234567890"
    payload = {
        "token": invalid_token,
        "password": "AnyPassword123!"
    }
    auth = HTTPBasicAuth('test12@gmail.com', 'test12@2003')
    headers = {
        "Content-Type": "application/json"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, auth=auth, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

    assert response.status_code == 400, f"Expected status code 400 but got {response.status_code}"
    try:
        response_json = response.json()
    except ValueError:
        response_json = {}

    expected_message = "Invalid token"
    # Check if response contains this message either in a key or in text
    assert (("message" in response_json and expected_message.lower() in response_json["message"].lower()) or 
            (expected_message.lower() in response.text.lower())), \
        f"Expected error message containing '{expected_message}', got: {response.text}"

test_post_api_users_invite_accept_with_invalid_token()