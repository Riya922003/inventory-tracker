import requests

def test_postapiusersinvitebynonsuperadmin():
    base_url = "http://localhost:3000"
    invite_url = f"{base_url}/api/users/invite"
    # Use bearer token for JWT authentication - non-super_admin user token
    headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer NON_SUPER_ADMIN_USER_JWT_TOKEN'
    }
    payload = {
        "email": "invitee@example.com",
        "role": "warehouse_manager",
        "assignedWarehouses": []
    }

    try:
        response = requests.post(invite_url, json=payload, headers=headers, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"


test_postapiusersinvitebynonsuperadmin()