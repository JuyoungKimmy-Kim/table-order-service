# 컴포넌트 메서드 시그니처 (Component Methods)

> 고수준 시그니처와 목적만 정의한다. 상세 비즈니스 규칙/엣지케이스는 Construction 단계의 Functional Design에서 확정한다.
> 백엔드는 단순형 구조이므로 아래 "메서드"는 라우터 핸들러 또는 재사용 헬퍼에 대응한다. 타입은 개념적 표기이며 실제 Pydantic 스키마는 코드 생성 시 확정한다.

---

## C1. AuthComponent

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `admin_login` | 관리자 로그인, JWT 발급 | (store_id, username, password) → { access_token, expires_in } |
| `table_login` | 테이블 세션 로그인, 테이블 토큰 발급 | (store_id, table_number, table_password) → { table_token } |
| `get_current_admin` | JWT 검증 의존성 | Authorization 헤더 → AdminUser |
| `get_current_table` | 테이블 토큰 검증 의존성 | Authorization 헤더 → Table |
| `check_login_attempts` (헬퍼) | 로그인 시도 제한 확인/기록 | (store_id, username) → allow/deny |

## C2. MenuComponent

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `list_categories` | 카테고리 목록 | (store_id) → Category[] |
| `list_menus` | 메뉴 조회(카테고리별) | (store_id, category_id?) → Menu[] |
| `create_menu` | 메뉴 등록(검증 포함) | (admin, MenuCreate) → Menu |
| `update_menu` | 메뉴 수정 | (admin, menu_id, MenuUpdate) → Menu |
| `delete_menu` | 메뉴 삭제 | (admin, menu_id) → void |
| `reorder_menus` | 노출 순서 조정 | (admin, [menu_id, order]) → Menu[] |
| `validate_menu` (헬퍼) | 필수 필드/가격 범위 검증 | (MenuInput) → ok/errors |

## C3. OrderComponent (주문 + 세션 라이프사이클)

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `create_order` | 주문 생성(현재 세션 귀속, 없으면 세션 시작), 이벤트 발행 | (table, OrderCreate) → Order(주문번호 포함) |
| `list_current_session_orders` | 현재 세션 주문 조회(고객) | (table) → Order[] |
| `list_table_orders` | 테이블 현재 주문 조회(관리자) | (admin, table_id) → Order[] |
| `update_order_status` | 주문 상태 변경, 이벤트 발행 | (admin, order_id, status) → Order |
| `delete_order` | 주문 삭제(직권), 총액 재계산, 이벤트 발행 | (admin, order_id) → { table_total } |
| `close_table_session` | 이용 완료: 현재 주문 이력 이동, 주문/총액 리셋, 이벤트 발행 | (admin, table_id) → void |
| `list_table_history` | 과거 이력 조회(날짜 필터) | (admin, table_id, date_from?, date_to?) → OrderHistory[] |
| `ensure_active_session` (헬퍼) | 현재 활성 세션 확보/시작 | (table_id) → session_id |
| `calc_table_total` (헬퍼) | 테이블 현재 세션 총액 계산 | (table_id) → amount |
| `move_session_to_history` (헬퍼) | 세션 주문을 이력으로 이동 | (session_id) → void |
| `generate_order_number` (헬퍼) | 주문 번호 생성 | (store_id) → order_number |

## C4. TableAdminComponent

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `setup_table` | 테이블 초기 설정(번호/비밀번호) | (admin, TableSetup) → Table |
| `list_tables` | 테이블 목록 | (admin) → Table[] |
| `dashboard_summary` | 테이블별 현재 주문/총액 요약(그리드) | (admin) → TableSummary[] |

## C5. RealtimeComponent (SSE)

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `stream` | SSE 스트림(관리자 대시보드 구독) | (admin) → EventSourceResponse |
| `publish` (내부) | 이벤트 발행 | (event: {type, payload}) → void |
| `subscribe` (내부) | 구독자 큐 등록 | () → asyncio.Queue |
| `unsubscribe` (내부) | 구독 해제 | (queue) → void |

이벤트 타입: `order_created`, `order_status_changed`, `order_deleted`, `table_session_closed`

## C6. PersistenceComponent

| 메서드 | 목적 | 입력 → 출력 |
|--------|------|-------------|
| `get_db` | DB 세션 의존성 | () → Session |
| `init_db` | 스키마 초기화 | () → void |
| `seed_demo_data` | 데모용 샘플 데이터 시딩 | () → void |

---

## 프론트엔드 주요 메서드 (F3. ApiClient 개요)

| 메서드 | 목적 |
|--------|------|
| `adminLogin(store, user, pw)` | 관리자 로그인 → JWT 저장 |
| `tableLogin(store, table, pw)` | 테이블 로그인 → 테이블 토큰 저장 |
| `getMenus(categoryId?)` / `getCategories()` | 메뉴/카테고리 조회 |
| `createOrder(payload)` | 주문 생성 |
| `getCurrentSessionOrders()` | 현재 세션 주문 조회 |
| `adminGetDashboard()` / `openStream(onEvent)` | 대시보드 요약 / SSE 구독 |
| `adminUpdateOrderStatus(id, status)` / `adminDeleteOrder(id)` | 상태 변경 / 삭제 |
| `adminCloseTable(id)` / `adminGetHistory(id, filter)` | 이용 완료 / 과거 내역 |
| `adminMenuCRUD(...)` / `adminSetupTable(...)` | 메뉴 관리 / 테이블 설정 |
