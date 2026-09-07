"""주문 생성/조회 테스트 (US-C4 / US-C5, BR-2/BR-4/BR-5/BR-7)."""
import re


def _menu_ids(client, headers):
    return [m["id"] for m in client.get("/api/menus", headers=headers).json()]


def test_create_order_success(client, table_headers):
    ids = _menu_ids(client, table_headers)
    resp = client.post(
        "/api/orders",
        headers=table_headers,
        json={"items": [{"menu_id": ids[0], "quantity": 2}, {"menu_id": ids[1], "quantity": 1}]},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert re.match(r"^T1-\d{4}$", body["order_number"])  # BR-2 형식
    assert body["session_id"]
    # 스냅샷 및 총액
    assert len(body["items"]) == 2
    assert all({"menu_name", "unit_price", "quantity"} == set(it.keys()) for it in body["items"])
    expected = body["items"][0]["unit_price"] * 2 + body["items"][1]["unit_price"] * 1
    assert body["total_amount"] == expected


def test_create_order_empty_items_400(client, table_headers):
    resp = client.post("/api/orders", headers=table_headers, json={"items": []})
    assert resp.status_code == 400


def test_create_order_invalid_quantity_400(client, table_headers):
    ids = _menu_ids(client, table_headers)
    resp = client.post(
        "/api/orders",
        headers=table_headers,
        json={"items": [{"menu_id": ids[0], "quantity": 0}]},
    )
    assert resp.status_code == 400


def test_create_order_invalid_menu_400(client, table_headers):
    resp = client.post(
        "/api/orders",
        headers=table_headers,
        json={"items": [{"menu_id": 999999, "quantity": 1}]},
    )
    assert resp.status_code == 400


def test_current_session_orders(client, table_headers):
    ids = _menu_ids(client, table_headers)
    client.post(
        "/api/orders", headers=table_headers, json={"items": [{"menu_id": ids[0], "quantity": 1}]}
    )
    client.post(
        "/api/orders", headers=table_headers, json={"items": [{"menu_id": ids[1], "quantity": 3}]}
    )
    resp = client.get("/api/orders/current", headers=table_headers)
    assert resp.status_code == 200
    orders = resp.json()
    assert len(orders) == 2
    # created_at 순
    assert orders[0]["order_number"].startswith("T1-")


def test_order_number_monotonic_per_table(client, table_headers):
    ids = _menu_ids(client, table_headers)
    n1 = client.post(
        "/api/orders", headers=table_headers, json={"items": [{"menu_id": ids[0], "quantity": 1}]}
    ).json()["order_number"]
    n2 = client.post(
        "/api/orders", headers=table_headers, json={"items": [{"menu_id": ids[0], "quantity": 1}]}
    ).json()["order_number"]
    assert n1 == "T1-0001"
    assert n2 == "T1-0002"
