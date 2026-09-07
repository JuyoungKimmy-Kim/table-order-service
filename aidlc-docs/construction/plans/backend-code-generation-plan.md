# Backend Code Generation Plan (Unit 1 — `backend`)

> **이 계획은 backend 유닛 Code Generation의 단일 기준(single source of truth)이다.**
> 모든 산출물은 frozen shared-contract(v1.0)를 **정확히** 구현한다. 경로·상태코드·필드명·타입·에러형식 임의 변경 금지.
> 원천: [`integration-contract.md`](../shared-contract/integration-contract.md) · [`api-contract.md`](../shared-contract/api-contract.md) · [`domain-entities.md`](../shared-contract/domain-entities.md) · [`sse-contract.md`](../shared-contract/sse-contract.md) · [`business-rules.md`](../shared-contract/business-rules.md)

## 유닛 컨텍스트

- **유닛**: Unit 1 `backend` (FastAPI 단일 프로세스, SQLite)
- **구조 결정**: 단순형(Router에서 직접 DB 접근, 재사용 로직은 헬퍼로 분리) — application-design 결정 반영
- **구현 스토리**: US-C1, US-C2, US-C4, US-C5, US-A1, US-A2, US-A3, US-A4, US-A5, US-A6, US-A7 (US-C3 장바구니는 클라이언트 전용, backend 책임 없음)
- **의존성**: frontend 유닛은 이 계약의 REST/SSE에만 의존. backend는 다른 유닛에 의존하지 않음(단방향)
- **소유 엔티티**: Store, AdminUser, Table, TableSession, Category, Menu, Order, OrderItem, OrderHistory (전부 backend 소유)
- **비활성 Extensions**: Security Baseline / Property-Based Testing / Resiliency Baseline = Disabled (강제 없음)

## 기술 스택 (Technical Decisions 반영)

- Python 3.11+, FastAPI, Uvicorn
- SQLAlchemy 2.x (ORM), SQLite
- Pydantic v2 (스키마/검증)
- python-jose (JWT), passlib[bcrypt] (비밀번호 해시)
- sse-starlette (SSE `EventSourceResponse`)
- pytest + httpx (테스트)

## 목표 디렉터리 구조 (workspace root `backend/` — NEVER aidlc-docs/)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱, 라우터 등록, CORS, startup(init_db+seed)
│   ├── config.py               # 설정(SECRET_KEY, TOKEN 만료, 로그인 시도제한 등)
│   ├── database.py             # engine, SessionLocal, Base, get_db
│   ├── models.py               # SQLAlchemy 모델(9 엔티티)
│   ├── schemas.py              # Pydantic 요청/응답 스키마
│   ├── security.py             # bcrypt 해시, JWT 생성/검증
│   ├── seed.py                 # 데모 데이터 시딩(store1/admin1/카테고리/메뉴/테이블)
│   ├── deps.py                 # get_current_admin, get_current_table 의존성
│   ├── realtime.py             # 인메모리 SSE pub/sub (publish/subscribe/unsubscribe)
│   ├── helpers.py              # order_number, table_total, ensure_active_session, move_to_history, items_summary
│   └── routers/
│       ├── __init__.py
│       ├── auth.py             # POST /api/admin/login, /api/table/login
│       ├── menus.py            # GET /api/menus/categories, /api/menus
│       ├── orders.py           # POST /api/orders, GET /api/orders/current
│       ├── admin_orders.py     # GET tables/{id}/orders, PATCH status, DELETE, POST close, GET history
│       ├── admin_dashboard.py  # GET /api/admin/dashboard, GET /api/admin/stream (SSE)
│       ├── admin_tables.py     # POST/GET /api/admin/tables
│       └── admin_menus.py      # POST/PUT/DELETE /api/admin/menus, PATCH reorder
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # 테스트 앱/클라이언트/인메모리 DB, 토큰 fixture
│   ├── test_auth.py
│   ├── test_menus.py
│   ├── test_orders.py
│   ├── test_admin_orders.py
│   ├── test_admin_tables_menus.py
│   └── test_sse.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env.example
└── README.md
```

---

## 실행 단계 (Steps)

### Step 1: 프로젝트 구조 및 설정 (greenfield setup)
- [x] `backend/` 디렉터리 및 하위 패키지 생성(`app/`, `app/routers/`, `tests/`)
- [x] `requirements.txt` (fastapi, uvicorn, sqlalchemy, pydantic, python-jose[cryptography], passlib[bcrypt], sse-starlette, pytest, httpx)
- [x] `app/config.py` — SECRET_KEY, ALGORITHM(HS256), ADMIN_TOKEN_EXPIRE=57600s(BR-1.1), TABLE_TOKEN 장기, MAX_LOGIN_ATTEMPTS=5, LOCK_MINUTES (BR-1.3), DATABASE_URL
- [x] `.env.example`, `.dockerignore`

### Step 2: Persistence & 도메인 모델 (C6 PersistenceComponent, domain-entities.md)
- [x] `app/database.py` — SQLAlchemy engine(SQLite), SessionLocal, Base, `get_db()` 의존성, `init_db()`
- [x] `app/models.py` — 9개 모델: Store, AdminUser, Table, TableSession, Category, Menu, Order, OrderItem, OrderHistory (필드/제약/FK/unique는 domain-entities.md 정확히 준수; 금액 int, is_deleted 등)
- _스토리: 전 스토리의 데이터 기반_

### Step 3: 데모 데이터 시딩 (C6 seed_demo_data, Q8=A)
- [x] `app/seed.py` — store1(store_code), admin1(bcrypt), 카테고리 수 개, 메뉴 10~15개, 테이블 4~6개(bcrypt 비밀번호). 이미 시드되어 있으면 skip(멱등)
- _컨텍스트: 데모/MVP 시연용_

### Step 4: 보안 유틸 & 인증 의존성 (C1 AuthComponent 일부)
- [x] `app/security.py` — `hash_password`/`verify_password`(bcrypt, BR-1.2), `create_access_token`/`decode_token`(JWT)
- [x] `app/deps.py` — `get_current_admin`(admin JWT 검증 → AdminUser, 실패 401), `get_current_table`(테이블 토큰 검증 → Table, 실패 401) (BR-1.1/1.4, 계약 401 흐름)

### Step 5: 인증 라우터 (C1, US-A1/US-C1)
- [x] `app/routers/auth.py`
  - `POST /api/admin/login` → `{access_token, token_type:"bearer", expires_in:57600}`; 시도제한(BR-1.3: 5회 실패→locked_until, 잠금 중 429, 성공 시 리셋); 자격오류 401
  - `POST /api/table/login` → `{table_token, table_id, table_number, store_name}`; store_code+table_number+table_password 검증(BR-1.4), 실패 401
- _스토리: US-A1, US-C1_

### Step 6: 메뉴 조회 라우터 (C2 조회, US-C2)
- [x] `app/routers/menus.py`
  - `GET /api/menus/categories` [table/admin] → `[{id,name,display_order}]` (display_order asc)
  - `GET /api/menus?category_id=` [table/admin] → `[{id,category_id,name,price,description?,image_url?,display_order}]` (is_deleted 제외, 정렬)
- _스토리: US-C2_

### Step 7: 실시간 SSE pub/sub (C5 RealtimeComponent, sse-contract.md)
- [x] `app/realtime.py` — 인메모리 broker: `subscribe()→asyncio.Queue`, `unsubscribe(q)`, `publish(event_type, payload)` 전 구독자 브로드캐스트. 4개 이벤트 타입 상수
- _스토리: US-A2 기반 인프라 (order_created/status_changed/deleted/session_closed)_

### Step 8: 헬퍼 (C3 헬퍼들, business-rules.md)
- [x] `app/helpers.py`
  - `generate_order_number(db, table)` → `T{table_number}-{seq:04d}` (BR-2, 테이블별 단조 증가 seq)
  - `ensure_active_session(db, table)` → active TableSession 확보/생성(BR-5.1, 테이블당 active 최대 1)
  - `calc_table_total(db, table_id)` → active 세션 Order.total_amount 합(BR-4.2)
  - `move_session_to_history(db, session)` → Order/OrderItem→OrderHistory(items_json 스냅샷) 이동 후 원본 삭제, 세션 closed(BR-5.3)
  - `build_items_summary(items)` → "김치찌개 x2 외 1건" 축약(SSE/대시보드용)

### Step 9: 주문 라우터 — 고객 (C3, US-C4/US-C5)
- [x] `app/routers/orders.py`
  - `POST /api/orders` [table] → 검증(BR-7: 빈 items/quantity<1/무효 menu_id → 400), 세션 확보, OrderItem 스냅샷 저장, total 계산, order_number 생성, 201 응답; `order_created` 이벤트 발행(table_total/items_summary 포함)
  - `GET /api/orders/current` [table] → active 세션 주문만 created_at 순(BR-5.2)
- _스토리: US-C4, US-C5_

### Step 10: 주문/세션 관리 라우터 — 관리자 (C3, US-A3/A4/A5/A6)
- [x] `app/routers/admin_orders.py`
  - `GET /api/admin/tables/{table_id}/orders` [admin] → active 세션 주문 상세
  - `PATCH /api/admin/orders/{order_id}/status` [admin] → 상태 전이 검증(BR-3.2: 인접 양방향 허용, 동일=멱등, 그외 400), 404; `order_status_changed` 발행
  - `DELETE /api/admin/orders/{order_id}` [admin] → 삭제 후 table_total 재계산 응답, 404; `order_deleted` 발행
  - `POST /api/admin/tables/{table_id}/close` [admin] → move_session_to_history 트랜잭션(BR-5.3), moved_count 응답, active 없으면 400(BR-5.4); `table_session_closed` 발행
  - `GET /api/admin/tables/{table_id}/history?date_from=&date_to=` [admin] → 시간 역순, items_json 역직렬화하여 items[] 반환
- _스토리: US-A3, US-A4, US-A5, US-A6_

### Step 11: 대시보드 & SSE 스트림 라우터 (C4/C5, US-A2)
- [x] `app/routers/admin_dashboard.py`
  - `GET /api/admin/dashboard` [admin] → 테이블별 TableSummary(session_id?, table_total, order_count, recent_orders[items_summary]); active 없으면 total 0
  - `GET /api/admin/stream` [admin] → `EventSourceResponse`, subscribe → 이벤트 브로드캐스트, `: ping` keep-alive, 연결종료 시 unsubscribe
- _스토리: US-A2_

### Step 12: 테이블 설정 라우터 (C4, US-A7/운영)
- [x] `app/routers/admin_tables.py`
  - `POST /api/admin/tables` [admin] → `{table_number, table_password}` 등록, 201 `{id, table_number}`, 중복 409(BR: (store_id, table_number) unique)
  - `GET /api/admin/tables` [admin] → `[{id, table_number}]`
- _스토리: US-A7(운영), US-A5 흐름 지원_

### Step 13: 메뉴 관리 라우터 (C2 관리, US-A7)
- [x] `app/routers/admin_menus.py`
  - `POST /api/admin/menus` [admin] → 검증(BR-6.1: name/price≥0/category_id, 실패 400), 201 Menu
  - `PUT /api/admin/menus/{menu_id}` [admin] → 200 Menu, 404
  - `DELETE /api/admin/menus/{menu_id}` [admin] → 204(soft-delete is_deleted, 스냅샷 보존 BR-6.2), 404
  - `PATCH /api/admin/menus/reorder` [admin] → display_order 일괄 갱신, 200 `[Menu]`
- _스토리: US-A7_

### Step 14: 애플리케이션 조립 (C6, main)
- [x] `app/main.py` — FastAPI 인스턴스, CORS(frontend 허용), 전 라우터 등록(`/api` prefix), startup 이벤트에서 `init_db()`+`seed_demo_data()`, 자동 OpenAPI(`/docs`)
- [x] `app/schemas.py` — 전 라우터 공유 Pydantic 스키마 확정(요청/응답, 상태 Literal 등)

### Step 15: 단위/통합 테스트 (pytest)
- [x] `tests/conftest.py` — 인메모리/임시 SQLite, TestClient(httpx), admin·table 토큰 fixture, 시드
- [x] `tests/test_auth.py` — admin/table 로그인 성공·실패(401)·시도제한(429)
- [x] `tests/test_menus.py` — 카테고리/메뉴 조회 형태·정렬
- [x] `tests/test_orders.py` — 주문 생성(order_number 형식·스냅샷·total), 검증 400, current 세션 필터
- [x] `tests/test_admin_orders.py` — 상태전이(허용/400), 삭제·total 재계산, close→history 이동·리셋
- [x] `tests/test_admin_tables_menus.py` — 테이블 등록/409, 메뉴 CRUD/reorder 상태코드
- [x] `tests/test_sse.py` — 주문 생성 시 order_created 이벤트 발행 확인
- _통합 계약 §8 체크리스트 커버_

### Step 16: 배포 산출물 & 문서
- [x] `backend/Dockerfile`, `.dockerignore`
- [x] `backend/README.md` — 실행/개발/테스트 방법, 시드 계정 정보
- [x] 루트 `docker-compose.yml`의 backend 서비스는 Build & Test/Infrastructure 단계에서 통합(여기서는 backend 단독 실행 가능하도록)

### Step 17: 코드 요약 문서 (documentation only)
- [x] `aidlc-docs/construction/backend/code/` 에 생성 파일 요약(markdown) 작성 — 애플리케이션 코드는 `backend/`에만

---

## 스토리 추적 (Story Traceability)

| 스토리 | 구현 Step | 엔드포인트/이벤트 |
|--------|-----------|-------------------|
| US-C1 | 5 | `POST /api/table/login` |
| US-C2 | 6 | `GET /api/menus/categories`, `GET /api/menus` |
| US-C4 | 8,9 | `POST /api/orders` + `order_created` |
| US-C5 | 9 | `GET /api/orders/current` |
| US-A1 | 5 | `POST /api/admin/login` (JWT 16h, bcrypt, 시도제한) |
| US-A2 | 7,11 | `GET /api/admin/dashboard`, `GET /api/admin/stream` (4 events) |
| US-A3 | 10 | `PATCH /api/admin/orders/{id}/status` + `order_status_changed` |
| US-A4 | 10 | `DELETE /api/admin/orders/{id}` + `order_deleted` |
| US-A5 | 8,10 | `POST /api/admin/tables/{id}/close` + `table_session_closed` |
| US-A6 | 10 | `GET /api/admin/tables/{id}/history` |
| US-A7 | 12,13 | `POST/PUT/DELETE /api/admin/menus`, `PATCH reorder`, `POST/GET /api/admin/tables` |

## 범위 및 규모

- **총 17 스텝**, 파일 ~30개(app 코드 + 테스트 + 배포)
- **커버리지**: 계약 18개 엔드포인트 전부 + SSE 4개 이벤트 + BR-1~BR-9
- 테스트는 이 단계에서 **생성**만 하며, 실행/검증은 Build and Test 단계에서 수행
