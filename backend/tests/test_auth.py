"""인증 테스트 (US-A1 / US-C1, BR-1)."""


def test_admin_login_success(client):
    resp = client.post(
        "/api/admin/login",
        json={"store_code": "store1", "username": "admin1", "password": "admin1234"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 57600  # 16h (BR-1.1)
    assert body["access_token"]


def test_admin_login_wrong_password_401(client):
    resp = client.post(
        "/api/admin/login",
        json={"store_code": "store1", "username": "admin1", "password": "wrong"},
    )
    assert resp.status_code == 401
    assert "detail" in resp.json()


def test_admin_login_lockout_429(client):
    # BR-1.3: 5회 실패 후 잠금 → 429
    for _ in range(5):
        client.post(
            "/api/admin/login",
            json={"store_code": "store1", "username": "admin1", "password": "wrong"},
        )
    resp = client.post(
        "/api/admin/login",
        json={"store_code": "store1", "username": "admin1", "password": "admin1234"},
    )
    assert resp.status_code == 429


def test_table_login_success(client):
    resp = client.post(
        "/api/table/login",
        json={"store_code": "store1", "table_number": "1", "table_password": "table1234"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["table_token"]
    assert body["table_number"] == "1"
    assert body["store_name"] == "데모 식당"


def test_table_login_wrong_password_401(client):
    resp = client.post(
        "/api/table/login",
        json={"store_code": "store1", "table_number": "1", "table_password": "nope"},
    )
    assert resp.status_code == 401


def test_protected_endpoint_without_token_401(client):
    resp = client.get("/api/admin/dashboard")
    assert resp.status_code == 401
