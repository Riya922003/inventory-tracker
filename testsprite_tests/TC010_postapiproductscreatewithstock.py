import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:3000"
LOGIN_PATH = "/api/auth/login"
CREATE_WITH_STOCK_PATH = "/api/products/create-with-stock"
DELETE_PRODUCT_PATH = "/api/products/{}"

USERNAME = "test12@gmail.com"
PASSWORD = "test12@2003"
TIMEOUT = 30

def test_postapi_products_create_with_stock():
    session = requests.Session()
    # Authenticate to get JWT cookie/session
    login_payload = {
        "email": USERNAME,
        "password": PASSWORD
    }
    login_resp = session.post(
        f"{BASE_URL}{LOGIN_PATH}",
        json=login_payload,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

    # Prepare product and opening stock data
    # Using example values, ensure they meet API schema requirements
    request_payload = {
        "name": "Test Product TC010",
        "sku": "TC010SKU001",
        "category": "Test Category",
        "unitPrice": 99.99,
        "unitType": "piece",
        "openingStock": {
            "warehouseId": None,  # Must obtain valid warehouseId
            "quantity": 100,
            "batchId": "batch-tc010",
            "expiryDate": None  # Optional. Can omit or provide ISO date string if required
        }
    }

    # To get a valid warehouseId, list warehouses first
    warehouses_resp = session.get(f"{BASE_URL}/api/warehouses", timeout=TIMEOUT)
    assert warehouses_resp.status_code == 200, f"Failed to get warehouses: {warehouses_resp.text}"
    warehouses = warehouses_resp.json()
    assert isinstance(warehouses, list) and len(warehouses) > 0, "No warehouses found to assign stock"
    request_payload["openingStock"]["warehouseId"] = warehouses[0].get("id") or warehouses[0].get("_id")
    assert request_payload["openingStock"]["warehouseId"], "Warehouse ID is missing"

    created_product_id = None
    try:
        # POST product with stock
        resp = session.post(
            f"{BASE_URL}{CREATE_WITH_STOCK_PATH}",
            json=request_payload,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Failed to create product with stock: {resp.text}"
        resp_json = resp.json()
        # Validate response contains 'product' and 'stock' keys
        assert "product" in resp_json, "Response missing 'product' data"
        assert "stock" in resp_json, "Response missing 'stock' data"

        product = resp_json["product"]
        stock = resp_json["stock"]
        created_product_id = product.get("id") or product.get("_id")
        assert created_product_id, "Created product ID missing"

        # Basic assertions about product and stock fields
        assert product.get("name") == request_payload["name"], "Product name mismatch"
        assert product.get("sku") == request_payload["sku"], "Product SKU mismatch"
        assert stock.get("quantity") == request_payload["openingStock"]["quantity"], "Stock quantity mismatch"
        assert stock.get("warehouseId") == request_payload["openingStock"]["warehouseId"], "Stock warehouseId mismatch"

    finally:
        if created_product_id:
            # Clean up - delete created product (soft-delete)
            del_resp = session.delete(
                f"{BASE_URL}{DELETE_PRODUCT_PATH.format(created_product_id)}",
                timeout=TIMEOUT
            )
            assert del_resp.status_code == 200, f"Failed to delete product during cleanup: {del_resp.text}"

test_postapi_products_create_with_stock()