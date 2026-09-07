"""관리자 주문/세션 관리 테스트 (US-A3/A4/A5/A6, BR-3/BR-4/BR-5)."""


def _menu_ids(client, headers):
    return [m["id"] for m in client.get("/api/menus", headers=headers).json()]


def _create_order(client, table_headers, menu_id, qty=1):
    return client.post(
        "/api/orders", headers=table_headers, json={"items": [{"menu_id": menu_id, "quantity": qty}]}
    ).json()


def _table_id(client, table_login):
    return table_login["table_id"]


def test_status_transition_allowed(client, table_headers, admin_headers):
    ids = _menu_ids(client, table_headers)
    order = _create_order(client, table_headers, ids[0])
    oid = order["order_id"]

    r1 = client.patch(f"/api/admin/orders/{oid}/status", headers=admin_headers, json={"status": "preparing"})
    assert r1.status_code == 200
    assert r1.json()["status"] == "preparing"

    r2 = client.patch(f"/api/admin/orders/{oid}/status", headers=admin_headers, json={"status": "completed"})
    assert r2.status_code == 200
    assert r2.json()["status"] == "completed"


def test_status_transition_invalid_400(client, table_headers, admin_headers):
    ids = _menu_ids(client, table_headers)
    order = _create_order(client, table_headers, ids[0])
    oid = order["order_id"]
    # pending → completed 는 비인접 → 400
    resp = client.patch(f"/api/admin/orders/{oid}/status", headers=admin_headers, json={"status": "completed"})
    assert resp.status_code == 400


def test_status_idempotent_same(client, table_headers, admin_headers):
    ids = _menu_ids(client, table_headers)
    order = _create_order(client, table_headers, ids[0])
    oid = order["order_id"]
    resp = client.patch(f"/api/admin/orders/{oid}/status", headers=admin_headers, json={"status": "pending"})
    assert resp.status_code == 200  # 동일 상태 멱등


def test_status_not_found_404(client, admin_headers):
    resp = client.patch("/api/admin/orders/999999/status", headers=admin_headers, json={"status": "preparing"})
    assert resp.status_code == 404


def test_delete_order_recalculates_total(client, table_headers, admin_headers, table_login):
    ids = _menu_ids(client, table_headers)
    o1 = _create_order(client, table_headers, ids[0], qty=2)
    o2 = _create_order(client, table_headers, ids[1], qty=1)
    resp = client.delete(f"/api/admin/orders/{o1['order_id']}", headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["order_id"] == o1["order_id"]
    # 남은 주문(o2) 총액과 일치
    assert body["table_total"] == o2["total_amount"]


def test_delete_order_404(client, admin_headers):
    resp = client.delete("/api/admin/orders/999999", headers=admin_headers)
    assert resp.status_code == 404


def test_close_session_moves_to_history(client, table_headers, admin_headers, table_login):
    ids = _menu_ids(client, table_headers)
    _create_order(client, table_headers, ids[0])
    _create_order(client, table_headers, ids[1])
    table_id = table_login["table_id"]

    resp = client.post(f"/api/admin/tables/{table_id}/close", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["moved_count"] == 2

    # 현재 세션 주문 비어야 함
    current = client.get("/api/orders/current", headers=table_headers).json()
    assert current == []

    # 이력 조회
    history = client.get(f"/api/admin/tables/{table_id}/history", headers=admin_headers).json()
    assert len(history) == 2
    assert history[0]["session_closed_at"]
    assert history[0]["items"]


def test_close_session_no_active_400(client, admin_headers, table_login):
    table_id = table_login["table_id"]
    resp = client.post(f"/api/admin/tables/{table_id}/close", headers=admin_headers)
    assert resp.status_code == 400


def test_new_session_after_close(client, table_headers, admin_headers, table_login):
    ids = _menu_ids(client, table_headers)
    _create_order(client, table_headers, ids[0])
    table_id = table_login["table_id"]
    client.post(f"/api/admin/tables/{table_id}/close", headers=admin_headers)
    # 종료 후 새 주문 → 새 세션
    order = _create_order(client, table_headers, ids[0])
    assert order["session_id"]
    current = client.get("/api/orders/current", headers=table_headers).json()
    assert len(current) == 1
