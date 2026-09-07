# API Contract (REST 상세 계약 — 확정)

**공통 규약**
- Base: `/api`
- 요청/응답: `application/json` (SSE 제외)
- 인증: `Authorization: Bearer <token>` (관리자 JWT / 테이블 토큰)
- 에러 형식: FastAPI 기본 `{ "detail": "<메시지>" }` (Q5=A). HTTP 상태코드로 구분.
- 인증 실패/만료: `401` 반환 (Q6=A) → 프론트는 관리자=로그인 화면, 테이블=초기 설정 화면으로 이동.
- 금액 필드: 정수(원). 상태값: `pending|preparing|completed`. 시각: ISO 8601 UTC 문자열.

> 아래 스키마의 필드는 domain-entities.md를 따른다. `?`는 nullable/optional.

---

## 1. 인증 (Auth)

### POST /api/admin/login  (인증 없음)
- 요청: `{ "store_code": str, "username": str, "password": str }`
- 200: `{ "access_token": str, "token_type": "bearer", "expires_in": 57600 }`  (16h=57600s)
- 401: 자격 증명 오류 / 계정 잠금(`{ "detail": "..." }`)
- 429: 로그인 시도 제한 초과

### POST /api/table/login  (인증 없음)
- 요청: `{ "store_code": str, "table_number": str, "table_password": str }`
- 200: `{ "table_token": str, "table_id": int, "table_number": str, "store_name": str }`
- 401: 자격 증명 오류

---

## 2. 메뉴 조회 (고객/관리자 공용, table 또는 admin 토큰)

### GET /api/menus/categories
- 200: `[ { "id": int, "name": str, "display_order": int } ]` (display_order 오름차순)

### GET /api/menus?category_id={int?}
- 200: `[ { "id": int, "category_id": int, "name": str, "price": int, "description": str?, "image_url": str?, "display_order": int } ]`
- category_id 생략 시 전체 메뉴(카테고리·순서 정렬)

---

## 3. 주문 — 고객 (table 토큰)

### POST /api/orders
- 요청: `{ "items": [ { "menu_id": int, "quantity": int } ] }`
  - (store/table/session은 토큰에서 유도. 세션 없으면 서버가 시작.)
- 201: `{ "order_id": int, "order_number": str, "status": "pending", "total_amount": int, "created_at": datetime, "session_id": int, "items": [ { "menu_name": str, "unit_price": int, "quantity": int } ] }`
- 400: 빈 items / quantity<1 / 존재하지 않는 menu_id
- 401: 토큰 무효

### GET /api/orders/current
- 현재 활성 세션의 주문만 반환(이용 완료분 제외). created_at 순.
- 200: `[ { "order_id": int, "order_number": str, "status": str, "total_amount": int, "created_at": datetime, "items": [ { "menu_name": str, "unit_price": int, "quantity": int } ] } ]`

---

## 4. 관리자 — 대시보드/실시간 (admin 토큰)

### GET /api/admin/dashboard
- 테이블별 현재 세션 요약(그리드).
- 200: `[ { "table_id": int, "table_number": str, "session_id": int?, "table_total": int, "order_count": int, "recent_orders": [ { "order_number": str, "created_at": datetime, "status": str, "total_amount": int, "items_summary": str } ] } ]`
  - `recent_orders`는 최신 n개 미리보기, `items_summary`는 축약 문자열(예: "김치찌개 x2 외 1건")
  - active 세션 없으면 session_id=null, table_total=0, order_count=0

### GET /api/admin/stream   (SSE, admin 토큰)
- `text/event-stream`. 상세 payload는 sse-contract.md 참조.

---

## 5. 관리자 — 주문/세션 관리 (admin 토큰)

### GET /api/admin/tables/{table_id}/orders
- 해당 테이블 현재 세션 주문 상세.
- 200: `[ { "order_id": int, "order_number": str, "status": str, "total_amount": int, "created_at": datetime, "items": [ { "menu_name": str, "unit_price": int, "quantity": int } ] } ]`

### PATCH /api/admin/orders/{order_id}/status
- 요청: `{ "status": "pending" | "preparing" | "completed" }`
- 200: `{ "order_id": int, "status": str }`
- 400: 허용되지 않는 상태 전이(business-rules.md 참조)
- 404: 주문 없음

### DELETE /api/admin/orders/{order_id}
- 200: `{ "order_id": int, "table_id": int, "table_total": int }`  (재계산된 테이블 총액)
- 404: 주문 없음

### POST /api/admin/tables/{table_id}/close   (이용 완료)
- active 세션의 주문을 OrderHistory로 이동 + 세션 종료 + 현재 주문/총액 리셋.
- 200: `{ "table_id": int, "moved_count": int }`
- 400: active 세션 없음(이동할 주문 없음) — 또는 멱등 처리(아래 규칙 참조)

### GET /api/admin/tables/{table_id}/history?date_from={date?}&date_to={date?}
- 과거 이력(시간 역순). 날짜 필터(옵션, YYYY-MM-DD).
- 200: `[ { "history_id": int, "session_id": int, "order_number": str, "status": str, "total_amount": int, "ordered_at": datetime, "session_closed_at": datetime, "items": [ { "menu_name": str, "unit_price": int, "quantity": int } ] } ]`

---

## 6. 관리자 — 테이블 설정 (admin 토큰)

### POST /api/admin/tables
- 요청: `{ "table_number": str, "table_password": str }`
- 201: `{ "id": int, "table_number": str }`
- 409: 동일 table_number 이미 존재

### GET /api/admin/tables
- 200: `[ { "id": int, "table_number": str } ]`

---

## 7. 관리자 — 메뉴 관리 (admin 토큰)

### POST /api/admin/menus
- 요청: `{ "category_id": int, "name": str, "price": int, "description": str?, "image_url": str?, "display_order": int? }`
- 201: Menu 객체
- 400: 검증 실패(필수 필드/가격 범위 — business-rules.md)

### PUT /api/admin/menus/{menu_id}
- 요청: 위와 동일(부분/전체 갱신), 200: Menu 객체
- 404: 메뉴 없음

### DELETE /api/admin/menus/{menu_id}
- 204: 성공(soft-delete 또는 물리삭제 — domain-entities is_deleted 참조)
- 404: 메뉴 없음

### PATCH /api/admin/menus/reorder
- 요청: `[ { "menu_id": int, "display_order": int } ]`
- 200: `[ Menu ]` (갱신된 순서 반영)

---

## 상태코드 요약
| 코드 | 의미 |
|------|------|
| 200 / 201 / 204 | 성공 / 생성 / 본문없음 성공 |
| 400 | 검증 실패 / 잘못된 요청 |
| 401 | 인증 실패·만료 → 프론트 재로그인 흐름 |
| 404 | 대상 없음 |
| 409 | 충돌(중복 등) |
| 429 | 로그인 시도 제한 |

## 스토리 커버리지 검증
- US-C1→table/login, US-C2→menus, US-C4→orders(POST), US-C5→orders/current
- US-A1→admin/login, US-A2→dashboard+stream, US-A3→orders/status, US-A4→orders DELETE, US-A5→tables/close, US-A6→tables/history, US-A7→menus CRUD/reorder + tables 설정
- (US-C3 장바구니는 클라이언트 전용 — 계약 불필요) ✅ 전 스토리 계약 커버
