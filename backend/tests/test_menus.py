"""메뉴/카테고리 조회 테스트 (US-C2)."""


def test_list_categories(client, table_headers):
    resp = client.get("/api/menus/categories", headers=table_headers)
    assert resp.status_code == 200
    cats = resp.json()
    assert len(cats) == 4
    # display_order 오름차순
    orders = [c["display_order"] for c in cats]
    assert orders == sorted(orders)
    assert {"id", "name", "display_order"} <= set(cats[0].keys())


def test_list_menus_all(client, table_headers):
    resp = client.get("/api/menus", headers=table_headers)
    assert resp.status_code == 200
    menus = resp.json()
    assert len(menus) == 12
    first = menus[0]
    assert {"id", "category_id", "name", "price", "display_order"} <= set(first.keys())
    assert isinstance(first["price"], int)


def test_list_menus_by_category(client, table_headers):
    cats = client.get("/api/menus/categories", headers=table_headers).json()
    cat_id = cats[0]["id"]
    resp = client.get(f"/api/menus?category_id={cat_id}", headers=table_headers)
    assert resp.status_code == 200
    menus = resp.json()
    assert all(m["category_id"] == cat_id for m in menus)


def test_menus_accessible_by_admin(client, admin_headers):
    resp = client.get("/api/menus", headers=admin_headers)
    assert resp.status_code == 200
