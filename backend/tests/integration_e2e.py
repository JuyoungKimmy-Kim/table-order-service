"""E2E integration verification against running backend (contract v1.0 §8 checklist)."""
import json, sys, threading, time, urllib.request, urllib.error, queue

BASE = "http://localhost:8000"
results = []

def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(f"{'PASS' if cond else 'FAIL'}  {name}  {detail}")

def req(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return resp.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw

# --- SSE listener thread ---
sse_events = queue.Queue()
def sse_listen(token, stop):
    r = urllib.request.Request(BASE + "/api/admin/stream")
    r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            ev = None
            for line in resp:
                if stop.is_set():
                    break
                line = line.decode().rstrip("\n")
                if line.startswith("event:"):
                    ev = line[6:].strip()
                elif line.startswith("data:"):
                    payload = line[5:].strip()
                    if ev:
                        sse_events.put((ev, payload))
                        ev = None
    except Exception:
        pass

# 1. Auth: admin login
st, admin = req("POST", "/api/admin/login", body={"store_code":"store1","username":"admin1","password":"admin1234"})
check("admin login 200 + access_token", st==200 and admin and "access_token" in admin, f"status={st}")
admin_token = admin["access_token"] if isinstance(admin, dict) else None

# auth failure -> 401
st_bad, _ = req("POST", "/api/admin/login", body={"store_code":"store1","username":"admin1","password":"WRONG"})
check("admin login wrong pw -> 401", st_bad==401, f"status={st_bad}")

# table login
st, table = req("POST", "/api/table/login", body={"store_code":"store1","table_number":"3","table_password":"table1234"})
check("table login 200 + table_token", st==200 and table and "table_token" in table, f"status={st}")
table_token = table["table_token"] if isinstance(table, dict) else None
table_id = table["table_id"] if isinstance(table, dict) else None

# protected endpoint without token -> 401
st_noauth, _ = req("GET", "/api/admin/dashboard")
check("protected endpoint no token -> 401", st_noauth==401, f"status={st_noauth}")

# 2. Menus
st, cats = req("GET", "/api/menus/categories", token=table_token)
ok = st==200 and isinstance(cats, list) and cats and all("id" in c and "name" in c and "display_order" in c for c in cats)
check("categories shape matches contract", ok, f"status={st} n={len(cats) if isinstance(cats,list) else 'NA'}")

st, menus = req("GET", "/api/menus", token=table_token)
ok = st==200 and isinstance(menus, list) and menus and all(isinstance(m["price"], int) for m in menus)
check("menus shape + price is int", ok, f"status={st} n={len(menus) if isinstance(menus,list) else 'NA'}")
menu_id = menus[0]["id"]; menu2 = menus[1]["id"]

# start SSE AFTER we have admin token, BEFORE creating order
stop = threading.Event()
t = threading.Thread(target=sse_listen, args=(admin_token, stop), daemon=True)
t.start()
time.sleep(1.0)

# 3. Order create
t0 = time.time()
st, order = req("POST", "/api/orders", token=table_token, body={"items":[{"menu_id":menu_id,"quantity":2},{"menu_id":menu2,"quantity":1}]})
ok = st==201 and order and order.get("status")=="pending" and "order_number" in order and isinstance(order.get("total_amount"), int)
check("order create 201 pending + int total", ok, f"status={st}")
import re
onum = order.get("order_number","") if isinstance(order, dict) else ""
check("order_number format T{n}-{seq:04d}", bool(re.match(r"^T\d+-\d{4}$", onum)), f"order_number={onum}")
order_id = order.get("order_id") if isinstance(order, dict) else None
# item snapshot
items = order.get("items", []) if isinstance(order, dict) else []
check("order items carry menu_name+unit_price snapshot", bool(items) and all("menu_name" in i and "unit_price" in i for i in items), f"items={len(items)}")

# order validation: empty items -> 400
st_e, _ = req("POST", "/api/orders", token=table_token, body={"items":[]})
check("order empty items -> 400", st_e==400, f"status={st_e}")

# 4. SSE order_created within 2s
got = None
deadline = t0 + 3.0
while time.time() < deadline:
    try:
        ev, payload = sse_events.get(timeout=0.2)
    except queue.Empty:
        continue
    if ev == "order_created":
        got = (ev, payload, time.time()-t0)
        break
check("SSE order_created received <=2s", got is not None and got[2] <= 2.0, f"latency={got[2]:.2f}s" if got else "not received")

# 5. current session orders
st, cur = req("GET", "/api/orders/current", token=table_token)
ok = st==200 and isinstance(cur, list) and any(o["order_id"]==order_id for o in cur)
check("GET orders/current returns active session order", ok, f"status={st} n={len(cur) if isinstance(cur,list) else 'NA'}")

# 6. status change -> event
st, sc = req("PATCH", f"/api/admin/orders/{order_id}/status", token=admin_token, body={"status":"preparing"})
check("PATCH status -> 200 preparing", st==200 and sc.get("status")=="preparing", f"status={st}")
got_sc = None; dl = time.time()+2.5
while time.time() < dl:
    try: ev,payload = sse_events.get(timeout=0.2)
    except queue.Empty: continue
    if ev=="order_status_changed": got_sc=payload; break
check("SSE order_status_changed received", got_sc is not None, "")

# invalid transition -> 400  (non-adjacent: create fresh pending order, jump to completed)
st_no, ono = req("POST", "/api/orders", token=table_token, body={"items":[{"menu_id":menu_id,"quantity":1}]})
st_inv, _ = req("PATCH", f"/api/admin/orders/{ono['order_id']}/status", token=admin_token, body={"status":"completed"})
check("invalid non-adjacent transition (pending->completed) -> 400", st_inv==400, f"status={st_inv}")

# 7. dashboard shape
st, dash = req("GET", "/api/admin/dashboard", token=admin_token)
ok = st==200 and isinstance(dash, list) and any("table_total" in d and "recent_orders" in d for d in dash)
check("dashboard shape (table_total + recent_orders)", ok, f"status={st} n={len(dash) if isinstance(dash,list) else 'NA'}")

# create a 2nd order to delete
st, o2 = req("POST", "/api/orders", token=table_token, body={"items":[{"menu_id":menu_id,"quantity":1}]})
o2id = o2.get("order_id")
# 8. delete order -> event + total recalculated
st, dele = req("DELETE", f"/api/admin/orders/{o2id}", token=admin_token)
ok = st==200 and "table_total" in dele
check("DELETE order -> 200 + table_total recalculated", ok, f"status={st}")
got_del=None; dl=time.time()+2.5
while time.time()<dl:
    try: ev,payload=sse_events.get(timeout=0.2)
    except queue.Empty: continue
    if ev=="order_deleted": got_del=payload; break
check("SSE order_deleted received", got_del is not None, "")

# delete missing -> 404
st_404, _ = req("DELETE", "/api/admin/orders/999999", token=admin_token)
check("DELETE missing order -> 404", st_404==404, f"status={st_404}")

# 9. menu management CRUD status codes
st, newm = req("POST", "/api/admin/menus", token=admin_token, body={"category_id":cats[0]["id"],"name":"E2E테스트메뉴","price":5000})
check("POST menu -> 201", st==201, f"status={st}")
nm_id = newm.get("id") if isinstance(newm,dict) else None
st, _ = req("PUT", f"/api/admin/menus/{nm_id}", token=admin_token, body={"category_id":cats[0]["id"],"name":"E2E수정","price":6000})
check("PUT menu -> 200", st==200, f"status={st}")
st, _ = req("DELETE", f"/api/admin/menus/{nm_id}", token=admin_token)
check("DELETE menu -> 204", st==204, f"status={st}")
st_404m, _ = req("PUT", "/api/admin/menus/999999", token=admin_token, body={"category_id":cats[0]["id"],"name":"x","price":1})
check("PUT missing menu -> 404", st_404m==404, f"status={st_404m}")

# table create + duplicate 409
st, _ = req("POST", "/api/admin/tables", token=admin_token, body={"table_number":"99","table_password":"pw123456"})
check("POST table -> 201", st==201, f"status={st}")
st_dup, _ = req("POST", "/api/admin/tables", token=admin_token, body={"table_number":"99","table_password":"pw123456"})
check("POST duplicate table -> 409", st_dup==409, f"status={st_dup}")

# 10. session close -> history move + event + reset
st, closed = req("POST", f"/api/admin/tables/{table_id}/close", token=admin_token)
ok = st==200 and "moved_count" in closed and closed["moved_count"]>=1
check("close session -> 200 + moved_count>=1", ok, f"status={st} moved={closed.get('moved_count') if isinstance(closed,dict) else 'NA'}")
got_close=None; dl=time.time()+2.5
while time.time()<dl:
    try: ev,payload=sse_events.get(timeout=0.2)
    except queue.Empty: continue
    if ev=="table_session_closed": got_close=payload; break
check("SSE table_session_closed received", got_close is not None, "")

# history endpoint
st, hist = req("GET", f"/api/admin/tables/{table_id}/history", token=admin_token)
ok = st==200 and isinstance(hist, list) and any("history_id" in h for h in hist)
check("history endpoint returns moved orders", ok, f"status={st} n={len(hist) if isinstance(hist,list) else 'NA'}")

# close with no active session -> 400
st_noact, _ = req("POST", f"/api/admin/tables/{table_id}/close", token=admin_token)
check("close with no active session -> 400", st_noact==400, f"status={st_noact}")

# error body shape {detail}
st_err, errbody = req("POST", "/api/admin/login", body={"store_code":"store1","username":"admin1","password":"WRONG"})
check("error body has {detail}", isinstance(errbody, dict) and "detail" in errbody, "")

stop.set()
time.sleep(0.3)

passed = sum(1 for _,ok,_ in results if ok)
total = len(results)
print(f"\n=== E2E SUMMARY: {passed}/{total} passed ===")
sys.exit(0 if passed==total else 1)
