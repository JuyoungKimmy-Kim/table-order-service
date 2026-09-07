# 컴포넌트 정의 (Components)

**아키텍처 결정 요약**
- 백엔드: FastAPI, 단순형 계층(Router에서 직접 DB 접근, 재사용 로직은 헬퍼로 분리)
- 프론트엔드: 단일 React 앱, 라우팅으로 고객/관리자 분리
- SSE: 인메모리 pub/sub
- DB: SQLite

컴포넌트는 백엔드(FastAPI) 논리 컴포넌트와 프론트엔드(React) 컴포넌트로 구분한다.
백엔드 컴포넌트는 "라우터 모듈 + 관련 헬퍼"의 논리적 묶음을 의미한다(별도 서비스 계층 없음).

---

## 백엔드 컴포넌트 (FastAPI)

### C1. AuthComponent
- **목적**: 관리자 인증(JWT)과 테이블(고객) 세션 인증을 통합 처리
- **책임**:
  - 관리자 로그인: 매장 식별자 + 사용자명 + 비밀번호 검증(bcrypt), JWT 발급(16시간)
  - 로그인 시도 횟수 제한
  - JWT 검증 의존성(관리자 보호 엔드포인트용)
  - 테이블 세션 로그인: 매장 식별자 + 테이블 번호 + 테이블 비밀번호 검증, 테이블 세션 토큰 발급
  - 테이블 토큰 검증 의존성(고객 엔드포인트용)
- **인터페이스**: `/api/admin/login`, `/api/table/login`, 인증 의존성(`get_current_admin`, `get_current_table`)

### C2. MenuComponent
- **목적**: 카테고리 및 메뉴 관리/조회
- **책임**:
  - 카테고리 목록 조회
  - 메뉴 조회(카테고리별), 상세
  - 메뉴 등록/수정/삭제, 노출 순서 조정
  - 필수 필드/가격 범위 검증
- **인터페이스**: `/api/menus`, `/api/categories`, `/api/admin/menus`(관리자 CRUD)

### C3. OrderComponent (주문 + 테이블 세션 라이프사이클 통합)
- **목적**: 주문 CRUD/상태 관리 및 테이블 세션 라이프사이클을 통합 담당
- **책임**:
  - 주문 생성(현재 테이블 세션에 귀속; 세션 없으면 새 세션 시작 = 첫 주문)
  - 현재 세션 주문 조회(고객), 테이블별 주문 조회(관리자)
  - 주문 상태 변경(대기중/준비중/완료)
  - 주문 삭제(관리자 직권), 테이블 총액 재계산
  - 테이블 세션 종료(이용 완료): 현재 주문을 OrderHistory로 이동, 현재 주문/총액 리셋
  - 과거 주문 이력 조회(테이블별, 날짜 필터)
  - 주문 생성/상태 변경/삭제 시 RealtimeComponent로 이벤트 발행
- **인터페이스**: `/api/orders`, `/api/admin/orders`, `/api/admin/tables/{id}/close`, `/api/admin/tables/{id}/history`
- **참고(헬퍼 분리)**: 세션 확보/시작(`ensure_active_session`), 총액 계산(`calc_table_total`), 이력 이동(`move_session_to_history`) 등은 라우터 내 재사용 헬퍼로 분리

### C4. TableAdminComponent
- **목적**: 관리자용 테이블 초기 설정 및 대시보드 데이터 제공
- **책임**:
  - 테이블 태블릿 초기 설정(테이블 번호/비밀번호 설정, 테이블 세션 인증 준비)
  - 테이블 목록 및 테이블별 현재 주문/총액 요약(대시보드용 그리드 데이터)
- **인터페이스**: `/api/admin/tables`, `/api/admin/tables/{id}`

### C5. RealtimeComponent (SSE)
- **목적**: 관리자 대시보드로 실시간 이벤트 브로드캐스트
- **책임**:
  - 인메모리 pub/sub 이벤트 버스 관리(구독자별 asyncio 큐)
  - SSE 스트림 엔드포인트 제공(관리자 대시보드 구독)
  - 주문 생성/상태 변경/삭제/세션 종료 이벤트를 구독자에게 전파(2초 이내)
- **인터페이스**: `/api/admin/stream`(SSE), 내부 `publish(event)` / `subscribe()`

### C6. PersistenceComponent (DB 접근 계층 — 경량)
- **목적**: SQLite 연결·세션·모델 정의 및 초기화/시딩
- **책임**:
  - SQLite 연결 및 ORM(SQLAlchemy) 세션 제공
  - 데이터 모델 정의(아래 데이터 모델 참조)
  - 스키마 초기화 및 데모용 샘플 데이터 시딩
- **인터페이스**: DB 세션 의존성(`get_db`), 모델 클래스, `init_db()`, `seed_demo_data()`

---

## 프론트엔드 컴포넌트 (React 단일 앱, 라우팅 분리)

### F1. CustomerApp (경로 `/`)
- **목적**: 고객용 테이블 태블릿 UI
- **책임**: 테이블 자동 로그인/초기설정, 메뉴 조회(카테고리 탐색), 장바구니(로컬 저장), 주문 생성, 현재 세션 주문 내역
- **하위 뷰**: TableSetup, MenuView, CartView, OrderConfirmView, OrderHistoryView(현재 세션)

### F2. AdminApp (경로 `/admin`)
- **목적**: 관리자용 관리 UI
- **책임**: 매장 로그인, 실시간 주문 대시보드(SSE 구독), 주문 상태 변경/삭제, 테이블 세션 종료, 과거 내역 조회, 메뉴 관리, 테이블 초기 설정
- **하위 뷰**: AdminLogin, Dashboard(그리드), OrderDetailModal, TableHistoryModal, MenuManageView, TableSetupView

### F3. ApiClient (공통)
- **목적**: 백엔드 REST/SSE 호출 및 토큰 관리
- **책임**: 관리자 JWT / 테이블 세션 토큰 저장(localStorage), 인증 헤더 부착, SSE 연결 관리

---

## 데이터 모델 (개요 — 상세는 Functional Design에서 확정)

- **Store**: 매장 식별자, 이름
- **AdminUser**: 매장 소속, username, password_hash(bcrypt)
- **Table**: 매장 소속, table_number, table_password_hash, current_session_id(nullable)
- **TableSession**: id, table_id, started_at, closed_at(nullable), status(active/closed)
- **Category**: 매장 소속, name, display_order
- **Menu**: 매장 소속, category_id, name, price, description, image_url, display_order
- **Order**: id, order_number, table_id, session_id, status(대기중/준비중/완료), total_amount, created_at
- **OrderItem**: order_id, menu_id, menu_name(스냅샷), unit_price(스냅샷), quantity
- **OrderHistory**: 세션 종료 시 이동되는 과거 주문(세션 ID 그룹화, completed_at 기록) — 구현상 Order를 archived 표기 또는 별도 테이블로 이동(Functional Design에서 확정)
