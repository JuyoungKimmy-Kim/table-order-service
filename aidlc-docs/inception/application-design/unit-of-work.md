# Unit of Work (작업 단위 정의)

**분해 축**: 계층 기준(Layer) · **2개 유닛** · **공통 API 계약 우선 → 병렬 진행**
**프로젝트 유형**: Greenfield / 로컬 Docker Compose MVP (단일 프로세스 백엔드 + 단일 프론트 빌드)

> 이 프로젝트는 마이크로서비스가 아니라 로컬 단일 배포 MVP이다. 따라서 "유닛"은 독립 배포 서비스가 아니라 **개발/설계 목적의 논리적 모듈**이다.
> 두 유닛은 **공통 API 계약(0단계)**을 먼저 확정한 뒤, 그 계약을 기준으로 병렬 진행한다.

---

## 0. 공통 API 계약 (Shared Contract — 병렬 진행의 기준점)

두 유닛(backend, frontend)이 병렬로 작업하기 위해 **먼저 확정**해야 하는 인터페이스이다.
(엔드포인트/스키마의 상세 필드·검증 규칙은 Construction 단계 Functional Design에서 최종 확정. 여기서는 계약 표면을 고정한다.)

### 0.1 인증 헤더
- 관리자 요청: `Authorization: Bearer <admin_jwt>`
- 테이블(고객) 요청: `Authorization: Bearer <table_token>`

### 0.2 REST 엔드포인트 계약 (표면)

| 영역 | Method & Path | 인증 | 요청 → 응답(개념) | 관련 컴포넌트 |
|------|---------------|------|-------------------|----------------|
| 관리자 로그인 | `POST /api/admin/login` | 없음 | {store_id, username, password} → {access_token, expires_in} | C1 |
| 테이블 로그인 | `POST /api/table/login` | 없음 | {store_id, table_number, table_password} → {table_token} | C1 |
| 카테고리 조회 | `GET /api/menus/categories` | table/admin | → Category[] | C2 |
| 메뉴 조회 | `GET /api/menus?category_id=` | table/admin | → Menu[] | C2 |
| 주문 생성 | `POST /api/orders` | table | OrderCreate → Order(order_number 포함) | C3 |
| 현재 세션 주문 | `GET /api/orders/current` | table | → Order[] | C3 |
| 대시보드 요약 | `GET /api/admin/dashboard` | admin | → TableSummary[] | C4 |
| 실시간 스트림 | `GET /api/admin/stream` (SSE) | admin | → event stream | C5 |
| 테이블 주문 조회 | `GET /api/admin/tables/{table_id}/orders` | admin | → Order[] | C3 |
| 주문 상태 변경 | `PATCH /api/admin/orders/{order_id}/status` | admin | {status} → Order | C3 |
| 주문 삭제 | `DELETE /api/admin/orders/{order_id}` | admin | → {table_total} | C3 |
| 세션 종료(이용완료) | `POST /api/admin/tables/{table_id}/close` | admin | → 200 | C3 |
| 과거 내역 | `GET /api/admin/tables/{table_id}/history?date_from=&date_to=` | admin | → OrderHistory[] | C3 |
| 테이블 설정 | `POST /api/admin/tables` | admin | TableSetup → Table | C4 |
| 테이블 목록 | `GET /api/admin/tables` | admin | → Table[] | C4 |
| 메뉴 등록 | `POST /api/admin/menus` | admin | MenuCreate → Menu | C2 |
| 메뉴 수정 | `PUT /api/admin/menus/{menu_id}` | admin | MenuUpdate → Menu | C2 |
| 메뉴 삭제 | `DELETE /api/admin/menus/{menu_id}` | admin | → 204 | C2 |
| 메뉴 순서조정 | `PATCH /api/admin/menus/reorder` | admin | [{menu_id, order}] → Menu[] | C2 |

> 위 경로는 계약 표면이며, 최종 경로/버저닝/상세 스키마는 Functional Design에서 확정 가능(단, 병렬 작업 정합을 위해 큰 변경은 양 유닛 합의 필요).

### 0.3 SSE 이벤트 계약
스트림(`GET /api/admin/stream`)으로 전송되는 이벤트 타입:

| 이벤트 | payload(개념) | 트리거 |
|--------|---------------|--------|
| `order_created` | {table_id, order_number, table_total, items 요약} | 주문 생성 |
| `order_status_changed` | {order_id, table_id, status} | 상태 변경 |
| `order_deleted` | {order_id, table_id, table_total} | 주문 삭제 |
| `table_session_closed` | {table_id} | 이용 완료 |

### 0.4 공유 데이터 스키마 (개념 모델 — 양 유닛 공통 이해)
Store, AdminUser, Table, TableSession, Category, Menu, Order, OrderItem, OrderHistory.
- OrderItem은 `menu_name`, `unit_price`를 **스냅샷**으로 저장(메뉴 변경/삭제와 무관하게 이력 보존).
- 상세 스키마/제약/인덱스는 backend 유닛의 Functional Design에서 확정하며, frontend 유닛은 위 REST/SSE 계약의 응답 형태에만 의존한다.

---

## 1. Unit 1 — `backend`

**유형**: 논리적 모듈(백엔드 애플리케이션 전체)
**위치**: `backend/`
**책임 컴포넌트**: C1 Auth, C2 Menu, C3 Order/Session, C4 TableAdmin, C5 Realtime(SSE), C6 Persistence

**책임 범위**
- FastAPI 앱, 라우터(단순형: 라우터 직접 DB 접근 + 재사용 헬퍼)
- 관리자 JWT 인증(16h, bcrypt, 로그인 시도 제한), 테이블 세션 인증
- 메뉴/카테고리 CRUD 및 순서
- 주문 CRUD·상태 변경·삭제, 테이블 세션 라이프사이클(시작/종료/이력 이동), 총액 계산
- 대시보드 요약, SSE 인메모리 pub/sub 브로드캐스트
- SQLAlchemy + SQLite 연결/모델/초기화, 데모 데이터 시딩
- OpenAPI 자동 문서(`/docs`)

**소유 자산**: DB 모델(공유 데이터 스키마의 구현), REST/SSE 계약의 서버 측 구현
**노출 인터페이스**: 위 0.2/0.3 계약 전부

**담당 스토리**: US-C1(세션/테이블 로그인 서버), US-C2·C3·C4·C5(메뉴/주문 서버), US-A1~A7(관리자 서버 전부)

---

## 2. Unit 2 — `frontend`

**유형**: 논리적 모듈(React 단일 앱)
**위치**: `frontend/`
**책임 컴포넌트**: F1 CustomerApp, F2 AdminApp, F3 ApiClient(소유)

**책임 범위**
- React(Vite) 단일 앱, 라우팅으로 고객(`/`)·관리자(`/admin`) 분리
- 고객 UI: 자동 로그인/세션, 메뉴 탐색, 장바구니(로컬 저장), 주문 생성/성공/리다이렉트, 현재 세션 내역
- 관리자 UI: 로그인/세션 유지, 대시보드(SSE 실시간, 그리드/카드), 상태 변경, 주문 삭제, 세션 종료, 과거 내역, 메뉴 관리, 테이블 설정
- ApiClient: REST 호출 + SSE 구독 + 토큰(관리자 JWT/테이블 토큰) 저장·부착
- 자동화 친화 요소(`data-testid`) 부착

**소유 자산**: ApiClient(공통), 프론트 공통 타입
**의존 인터페이스**: 위 0.2/0.3 계약(backend가 구현)

**담당 스토리**: US-C1~C5(고객 UI), US-A1~A7(관리자 UI)

---

## 3. 코드 조직 전략 (Greenfield)

**구조 패턴**: Greenfield multi-unit, 배포는 단일이지만 유닛(계층)별 디렉터리로 분리.

```
table-order-service/                (워크스페이스 루트)
├── backend/                        # Unit 1
│   ├── app/                        # FastAPI 애플리케이션 코드
│   │   ├── main.py                 # 앱 진입점, 라우터 등록, 시작 시 init/seed
│   │   ├── db.py                   # SQLAlchemy 엔진/세션, get_db, init_db, seed
│   │   ├── models.py               # ORM 모델 (공유 데이터 스키마 구현)
│   │   ├── schemas.py              # Pydantic 요청/응답 스키마
│   │   ├── auth.py                 # C1 인증(헬퍼 + 의존성)
│   │   ├── realtime.py             # C5 SSE 인메모리 pub/sub
│   │   └── routers/                # 라우터(단순형: 직접 DB 접근 + 헬퍼)
│   │       ├── auth.py
│   │       ├── menus.py
│   │       ├── orders.py
│   │       └── admin.py
│   ├── tests/                      # 백엔드 단위 테스트
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                       # Unit 2
│   ├── src/
│   │   ├── main.jsx / App.jsx      # 라우팅 (고객 / 관리자)
│   │   ├── api/client.js           # F3 ApiClient (REST + SSE + 토큰)
│   │   ├── customer/               # F1 고객 화면(메뉴/장바구니/주문/내역)
│   │   └── admin/                  # F2 관리자 화면(로그인/대시보드/관리)
│   ├── tests/                      # 프론트 단위 테스트
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
│
├── docker-compose.yml              # backend + frontend 오케스트레이션
└── aidlc-docs/                     # 문서 (코드 아님)
```

> **텍스트 대안(위 트리 설명)**: 루트 아래 `backend/`(FastAPI 앱 `app/` + `tests/` + Dockerfile)와 `frontend/`(React `src/` + `tests/` + Dockerfile)를 두고, 루트의 `docker-compose.yml`이 두 컨테이너를 함께 기동한다. 백엔드 `app/`는 진입점(main), DB, 모델, 스키마, 인증, 실시간(SSE)과 라우터(auth/menus/orders/admin)로 구성된다. 프론트 `src/`는 라우팅(App), api/client, customer/, admin/으로 구성된다.

**소유권 규칙 (Q4=A)**
- 백엔드 DB 모델·서버 계약 구현 → `backend` 유닛 소유
- 프론트 ApiClient·공통 타입 → `frontend` 유닛 소유
- 두 유닛 모두 0장의 공통 API 계약을 준수한다.

---

## 4. 진행 모델 (Q6=B + 후속 확정)

1. **공통 API 계약 확정(0단계)** — 위 계약을 기준선으로 고정.
2. 이후 `backend`, `frontend` 두 유닛을 **병렬**로 설계·구현.
   - 실제 워크플로우 게이트는 유닛별로 순차 승인되지만, 계약이 먼저 고정되어 있어 두 유닛은 서로를 기다리지 않고 독립적으로 진행 가능(프론트는 계약 기반으로 모킹/구현, 백엔드는 계약 구현).
3. 통합/Docker Compose 구성 및 종단 검증은 Build and Test 단계에서 수행.

---

## 5. 검증 요약

- **유닛 경계 검증**: 계층 기준으로 상호 배타적(백엔드=서버/DB/SSE, 프론트=UI/클라이언트). 공유 자산 소유권 명확(Q4=A). 겹침 없음. ✅
- **의존성 검증**: `unit-of-work-dependency.md` 참조. frontend → (공통 계약) → backend 단방향. 순환 없음. ✅
- **스토리 할당 검증**: 12개 스토리 전부 두 유닛에 매핑(대부분 서버+UI 양쪽에 걸침). `unit-of-work-story-map.md` 참조. 누락 없음. ✅
