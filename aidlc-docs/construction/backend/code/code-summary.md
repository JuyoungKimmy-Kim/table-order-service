# Backend Code Generation 요약 (Unit 1 — `backend`)

**생성일**: 2026-09-07 · **상태**: 생성 완료, 34개 테스트 전부 통과, E2E 스모크 확인
**애플리케이션 코드 위치**: `backend/` (workspace root) — 이 문서는 요약(markdown)만 포함.

## 생성 파일 목록 (Greenfield — 전부 신규 생성)

### 애플리케이션 (`backend/app/`)
| 파일 | 책임 | 컴포넌트 |
|------|------|----------|
| `main.py` | FastAPI 앱, 라우터 등록, CORS, lifespan(init_db+seed), /health | C6 |
| `config.py` | 설정(SECRET_KEY, 토큰 만료 57600s, 시도제한 5회/15분) | – |
| `database.py` | engine/SessionLocal/Base/get_db/init_db (SQLite) | C6 |
| `models.py` | 9개 SQLAlchemy 모델 (domain-entities.md 준수) | C6 |
| `schemas.py` | Pydantic 요청/응답 스키마 (api-contract.md 준수) | 전역 |
| `security.py` | bcrypt 해시 + JWT 생성/검증 | C1 |
| `deps.py` | get_current_admin / get_current_table / get_current_store_id | C1 |
| `seed.py` | 데모 시딩(store1/admin1/카테고리4/메뉴12/테이블5, 멱등) | C6 |
| `realtime.py` | 인메모리 SSE pub/sub broker(subscribe/unsubscribe/publish) | C5 |
| `helpers.py` | order_number/ensure_active_session/calc_table_total/move_session_to_history/items_summary | C3 |

### 라우터 (`backend/app/routers/`)
| 파일 | 엔드포인트 |
|------|-----------|
| `auth.py` | `POST /api/admin/login`, `POST /api/table/login` |
| `menus.py` | `GET /api/menus/categories`, `GET /api/menus` |
| `orders.py` | `POST /api/orders`, `GET /api/orders/current` |
| `admin_orders.py` | `GET /api/admin/tables/{id}/orders`, `PATCH .../status`, `DELETE .../orders/{id}`, `POST .../close`, `GET .../history` |
| `admin_dashboard.py` | `GET /api/admin/dashboard`, `GET /api/admin/stream`(SSE) |
| `admin_tables.py` | `POST /api/admin/tables`, `GET /api/admin/tables` |
| `admin_menus.py` | `POST/PUT/DELETE /api/admin/menus`, `PATCH .../reorder` |

### 테스트 (`backend/tests/`)
`conftest.py`(격리 DB+토큰 fixture), `test_auth.py`, `test_menus.py`, `test_orders.py`, `test_admin_orders.py`, `test_admin_tables_menus.py`, `test_sse.py` — **총 34 테스트 통과**.

### 배포/문서
`requirements.txt`, `Dockerfile`, `.dockerignore`, `.env.example`, `README.md`.

## 계약 준수 확인
- **REST 18개 엔드포인트 + SSE 4개 이벤트** 전부 구현 (integration-contract v1.0).
- 금액=정수(원), 시각=ISO8601 UTC, 상태=`pending|preparing|completed`, 에러=`{detail}`.
- 주문번호 `T{table}-{seq:04d}`, OrderItem 스냅샷, 세션 라이프사이클(첫 주문 시작→close 시 이력 이동+리셋) 준수.
- 상태 전이 BR-3.2(인접 양방향 + 동일 멱등, 그 외 400), 로그인 시도제한 BR-1.3(429), 메뉴 검증 BR-6.1.

## 검증 결과
- `pytest`: 34 passed.
- E2E 스모크: health / admin·table login / menus(12) / 주문생성(T3-0001, total 16000, 스냅샷) / 대시보드 실시간 반영(table_total 16000) 확인.

## 스토리 커버리지
US-C1, US-C2, US-C4, US-C5, US-A1, US-A2, US-A3, US-A4, US-A5, US-A6, US-A7 (backend 책임 전부). US-C3는 클라이언트 전용으로 backend 책임 없음.

## 미포함/후속(Build & Test 단계)
- 통합/성능 테스트 및 루트 `docker-compose.yml`(backend+frontend) 통합은 Build and Test 단계에서 수행.
- Extensions(Security/Property-Based/Resiliency)는 Disabled로 미적용.
