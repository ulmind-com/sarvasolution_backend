import requests
import pytest
import random

BASE_URL = "http://localhost:8000/api/v1"

@pytest.fixture(scope="module")
def admin_token():
    response = requests.post(f"{BASE_URL}/auth/admin/login", 
        json={"email": "admin@ssvpl.com", "password": "adminpassword123"})
    assert response.status_code == 200
    return response.json()["data"]["token"]

def test_system_status(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/admin/debug/status", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["dbStatus"] == "Connected"

def test_create_product_gst(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    name = f"Pytest Product {random.randint(1000,9999)}"
    payload = {
        "productName": name,
        "price": 5000,
        "mrp": 5900,
        "gstRate": 18,
        "stockQuantity": 10
    }
    response = requests.post(f"{BASE_URL}/admin/product/create", headers=headers, json=payload)
    assert response.status_code == 201
    data = response.json()["data"]
    
    # GST Check
    assert data["gstAmount"] == 900 # 18% of 5000
    assert data["finalPriceIncGST"] == 5900

if __name__ == "__main__":
    print("Run with: pytest test_api.py")
