"""테이블 설정 + 메뉴 관리 테스트 (US-A7, BR-6)."""


def test_create_table_and_conflict(client, admin_headers):
    resp = client.post(
        "/api/admin/tables", headers=admin_headers, json={"table_number": "99", "table_password": "pw12345"}
    )
    assert resp.status_code == 201
    assert resp.json()["table_number"] == "99"

    # 중복 → 409
    dup = client.post(
        "/api/admin/tables", headers=admin_headers, json={"table_number": "99", "table_password": "pw12345"}
    )
    assert dup.status_code == 409


def test_list_tables(client, admin_headers):
    resp = client.get("/api/admin/tables", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 5  # 시드된 테이블 5개


def test_dashboard_shape(client, admin_headers):
    resp = client.get("/api/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    cards = resp.json()
    assert len(cards) == 5
    card = cards[0]
    assert {"table_id", "table_number", "table_total", "order_count", "recent_orders"} <= set(card.keys())
    # active 세션 없는 초기 상태
    assert card["table_total"] == 0
    assert card["session_id"] is None


def test_menu_crud(client, admin_headers):
    cats = client.get("/api/menus/categories", headers=admin_headers).json()
    cat_id = cats[0]["id"]

    # create
    created = client.post(
        "/api/admin/menus",
        headers=admin_headers,
        json={"category_id": cat_id, "name": "신메뉴", "price": 12000},
    )
    assert created.status_code == 201
    menu_id = created.json()["id"]

    # update
    updated = client.put(
        f"/api/admin/menus/{menu_id}",
        headers=admin_headers,
        json={"category_id": cat_id, "name": "신메뉴v2", "price": 13000},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "신메뉴v2"
    assert updated.json()["price"] == 13000

    # delete (soft) → 204
    deleted = client.delete(f"/api/admin/menus/{menu_id}", headers=admin_headers)
    assert deleted.status_code == 204

    # 삭제 후 목록에서 제외
    menus = client.get("/api/menus", headers=admin_headers).json()
    assert menu_id not in [m["id"] for m in menus]


def test_menu_validation_400(client, admin_headers):
    cats = client.get("/api/menus/categories", headers=admin_headers).json()
    cat_id = cats[0]["id"]
    # 음수 가격
    r1 = client.post(
        "/api/admin/menus", headers=admin_headers, json={"category_id": cat_id, "name": "x", "price": -1}
    )
    assert r1.status_code == 400
    # 빈 이름
    r2 = client.post(
        "/api/admin/menus", headers=admin_headers, json={"category_id": cat_id, "name": "  ", "price": 1000}
    )
    assert r2.status_code == 400


def test_menu_update_404(client, admin_headers):
    cats = client.get("/api/menus/categories", headers=admin_headers).json()
    resp = client.put(
        "/api/admin/menus/999999",
        headers=admin_headers,
        json={"category_id": cats[0]["id"], "name": "x", "price": 1000},
    )
    assert resp.status_code == 404


def test_menu_reorder(client, admin_headers):
    menus = client.get("/api/menus", headers=admin_headers).json()
    m1, m2 = menus[0], menus[1]
    resp = client.patch(
        "/api/admin/menus/reorder",
        headers=admin_headers,
        json=[{"menu_id": m1["id"], "display_order": 100}, {"menu_id": m2["id"], "display_order": 101}],
    )
    assert resp.status_code == 200
    updated = {m["id"]: m["display_order"] for m in resp.json()}
    assert updated[m1["id"]] == 100
    assert updated[m2["id"]] == 101
