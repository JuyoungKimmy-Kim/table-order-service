# Integration Contract (통합 규약 — 팀 공용 단일 기준)

> **이 문서는 모든 팀원(backend / frontend)이 개발 시 준수해야 하는 단일 기준 문서입니다.**
> 유닛은 이 계약에만 의존하여 병렬 개발합니다. 계약 변경은 반드시 이 문서를 먼저 갱신하고 양 유닛이 합의합니다.
> 상세 원천 문서: [`domain-entities.md`](./domain-entities.md) · [`api-contract.md`](./api-contract.md) · [`sse-contract.md`](./sse-contract.md) · [`business-rules.md`](./business-rules.md)

**Contract Version**: v1.0 (2026-09-07, 확정/frozen)
**대상 유닛**: `backend`(FastAPI, 계약 구현) · `frontend`(React 단일 앱, 계약 소비)

---

## 1. 유닛 경계 및 통합 개요

```
[frontend]  ──REST(JSON) / SSE──▶  [backend]  ──SQLAlchemy──▶  [SQLite]
  React 단일 앱                       FastAPI 단일 프로세스
  고객 / (관리자 /admin)              인메모리 SSE pub/sub
```

- **통신**: HTTP REST(JSON) + SSE(관리자 실시간). 단방향 의존: frontend → backend.
- **인증**: `Authorization: Bearer <token>` (관리자 JWT / 테이블 토큰).
- **소유권**: DB 모델·서버 구현 = backend / ApiClient·UI = frontend.
- **통합 지점**: 아래 §3(REST) + §4(SSE)가 유일한 유닛 간 인터페이스. 그 외 내부 구현은 각 유닛 자유.

### 전역 규약
| 항목 | 규약 |
|------|------|
| Base path | `/api` |
| Content-Type | `application/json` (SSE 제외: `text/event-stream`) |
| 금액 | 정수(원, KRW). 소수점 없음 |
| 시각 | ISO 8601 UTC 문자열 (예: `2026-09-07T00:00:00Z`) |
| 주문 상태 | `pending` / `preparing` / `completed` (프론트에서 한글 라벨 매핑) |
| 에러 본문 | `{ "detail": "<메시지>" }` |
| 인증 실패/만료 | HTTP `401` → frontend: 관리자=로그인 화면, 테이블=초기 설정 화면 |

---

## 2. 공유 데이터 모델 (Integration View)

> 통합에 필요한 필드만 요약. 전체 스키마/제약은 [`domain-entities.md`](./domain-entities.md).
> frontend는 아래 응답 형태에만 의존(DB 물리 스키마에 의존 금지).

| 엔티티 | 통합 관점 핵심 필드 |
|--------|---------------------|
| **Category** | id, name, display_order |
| **Menu** | id, category_id, name, price(int), description?, image_url?, display_order |
| **Order** | order_id, order_number(`T{table}-{seq:04d}`), status, total_amount(int), created_at, session_id, items[] |
| **OrderItem**(스냅샷) | menu_name, unit_price(int), quantity | 
| **TableSummary**(대시보드) | table_id, table_number, session_id?, table_total(int), order_count, recent_orders[] |
| **OrderHistory** | history_id, session_id, order_number, status, total_amount, ordered_at, session_closed_at, items[] |

**불변 규칙(계약 무결성)**
- OrderItem은 항상 `menu_name`/`unit_price` **스냅샷**을 포함한다(메뉴 변경/삭제와 독립).
- 금액 필드는 예외 없이 정수(원).
- 주문번호 형식은 `T{table_number}-{seq:04d}` (예: `T3-0007`).

---

## 3. REST API 인터페이스 계약

> 표기: `[table]`=테이블 토큰, `[admin]`=관리자 JWT, `[-]`=인증 없음. 전체 스키마는 [`api-contract.md`](./api-contract.md).

### 3.1 인증
| Method & Path | 인증 | Request | Response(성공) | 오류 |
|---------------|------|---------|----------------|------|
| `POST /api/admin/login` | [-] | `{store_code, username, password}` | `200 {access_token, token_type:"bearer", expires_in:57600}` | 401 자격오류/잠금, 429 시도제한 |
| `POST /api/table/login` | [-] | `{store_code, table_number, table_password}` | `200 {table_token, table_id, table_number, store_name}` | 401 |

### 3.2 메뉴 조회 (고객·관리자)
| Method & Path | 인증 | Request | Response |
|---------------|------|---------|----------|
| `GET /api/menus/categories` | [table]/[admin] | – | `200 [{id, name, display_order}]` |
| `GET /api/menus?category_id=` | [table]/[admin] | query `category_id?` | `200 [{id, category_id, name, price, description?, image_url?, display_order}]` |

### 3.3 주문 (고객)
| Method & Path | 인증 | Request | Response | 오류 |
|---------------|------|---------|----------|------|
| `POST /api/orders` | [table] | `{items:[{menu_id, quantity}]}` | `201 {order_id, order_number, status:"pending", total_amount, created_at, session_id, items:[{menu_name, unit_price, quantity}]}` | 400 빈 items/quantity<1/무효 menu_id, 401 |
| `GET /api/orders/current` | [table] | – | `200 [{order_id, order_number, status, total_amount, created_at, items[]}]` (현재 세션만) | 401 |

### 3.4 관리자 — 대시보드/실시간
| Method & Path | 인증 | Response |
|---------------|------|----------|
| `GET /api/admin/dashboard` | [admin] | `200 [{table_id, table_number, session_id?, table_total, order_count, recent_orders:[{order_number, created_at, status, total_amount, items_summary}]}]` |
| `GET /api/admin/stream` | [admin] | `text/event-stream` (→ §4) |

### 3.5 관리자 — 주문/세션
| Method & Path | 인증 | Request | Response | 오류 |
|---------------|------|---------|----------|------|
| `GET /api/admin/tables/{table_id}/orders` | [admin] | – | `200 [{order_id, order_number, status, total_amount, created_at, items[]}]` | – |
| `PATCH /api/admin/orders/{order_id}/status` | [admin] | `{status}` | `200 {order_id, status}` | 400 무효 전이, 404 |
| `DELETE /api/admin/orders/{order_id}` | [admin] | – | `200 {order_id, table_id, table_total}` | 404 |
| `POST /api/admin/tables/{table_id}/close` | [admin] | – | `200 {table_id, moved_count}` | 400 active 세션 없음 |
| `GET /api/admin/tables/{table_id}/history?date_from=&date_to=` | [admin] | query 날짜? | `200 [{history_id, session_id, order_number, status, total_amount, ordered_at, session_closed_at, items[]}]` | – |

### 3.6 관리자 — 테이블 설정
| Method & Path | 인증 | Request | Response | 오류 |
|---------------|------|---------|----------|------|
| `POST /api/admin/tables` | [admin] | `{table_number, table_password}` | `201 {id, table_number}` | 409 중복 |
| `GET /api/admin/tables` | [admin] | – | `200 [{id, table_number}]` | – |

### 3.7 관리자 — 메뉴 관리
| Method & Path | 인증 | Request | Response | 오류 |
|---------------|------|---------|----------|------|
| `POST /api/admin/menus` | [admin] | `{category_id, name, price, description?, image_url?, display_order?}` | `201 Menu` | 400 검증 |
| `PUT /api/admin/menus/{menu_id}` | [admin] | Menu 필드 | `200 Menu` | 404 |
| `DELETE /api/admin/menus/{menu_id}` | [admin] | – | `204` | 404 |
| `PATCH /api/admin/menus/reorder` | [admin] | `[{menu_id, display_order}]` | `200 [Menu]` | – |

### HTTP 상태코드 규약
`200/201/204` 성공 · `400` 검증실패 · `401` 인증실패·만료 · `404` 없음 · `409` 충돌 · `429` 시도제한.

---

## 4. 이벤트 규약 (SSE)

**엔드포인트**: `GET /api/admin/stream` [admin], `text/event-stream`.
**프레임**: `event: <type>\ndata: <JSON>\n\n`. **지연 목표**: 신규 주문 후 2초 이내.
전체 payload는 [`sse-contract.md`](./sse-contract.md).

| event | payload(핵심 필드) | frontend 동작 |
|-------|--------------------|---------------|
| `order_created` | `{table_id, table_number, session_id, order_id, order_number, status, total_amount, created_at, table_total, items_summary}` | 해당 테이블 카드 갱신 + 신규 강조 |
| `order_status_changed` | `{table_id, order_id, order_number, status}` | 상태 배지 갱신(관리자·고객) |
| `order_deleted` | `{table_id, order_id, table_total}` | 주문 제거 + 총액 갱신 |
| `table_session_closed` | `{table_id}` | 카드를 빈 상태(총액 0)로 리셋 |

**동기화 규약**
- 초기: `GET /api/admin/dashboard`로 스냅샷 로드 → stream 구독(증분).
- keep-alive: 서버가 `: ping` 코멘트를 보낼 수 있음(프론트 무시).
- 재연결: 연결 끊기면 stream 재구독 + dashboard 재조회로 재동기화(이벤트 유실 대비). Last-Event-ID 재전송은 MVP 범위 외.

---

## 5. 핵심 통합 흐름 (End-to-End)

1. **주문 생성**: 고객 `POST /api/orders` → backend 세션 확보·저장 → 응답(order_number) + `order_created` 이벤트 발행 → 관리자 대시보드 실시간 갱신. 고객 화면: 성공 표시 후 장바구니 비움 → 메뉴로 리다이렉트.
2. **상태 변경**: 관리자 `PATCH .../status` → `order_status_changed` → 관리자/고객 화면 반영.
3. **주문 삭제**: 관리자 `DELETE .../orders/{id}` → 총액 재계산 응답 + `order_deleted`.
4. **이용 완료**: 관리자 `POST .../tables/{id}/close` → 이력 이동+리셋(트랜잭션) + `table_session_closed` → 카드 리셋.

---

## 6. 계약 준수 규칙 (모든 팀원)

- **backend**: 위 §3/§4를 **정확히** 구현. 경로·상태코드·필드명·타입·에러형식을 임의 변경 금지.
- **frontend**: 위 §3/§4 **응답 형태에만** 의존. 없는 필드 가정 금지, 물리 DB 스키마 의존 금지.
- **공통**: 금액=정수(원), 시각=ISO8601 UTC, 상태=영문코드, 에러=`{detail}` 를 전 구간 준수.
- **자동화**: frontend 상호작용 요소에 안정적 `data-testid` 부여(`{component}-{role}`).

---

## 7. 변경 관리 (Contract Change Control)

1. 계약 변경이 필요하면 **이 문서(및 원천 문서)를 먼저 수정**하고 Contract Version을 올린다(v1.0 → v1.1 …).
2. 변경은 backend·frontend **양 유닛 합의** 후 반영. 한쪽만 선반영 금지.
3. Breaking change(경로/필드 삭제·의미 변경)는 §8 체크리스트 재검증 필수.
4. 변경 이력은 아래 표에 기록.

| Version | 날짜 | 변경 내용 | 영향 유닛 |
|---------|------|-----------|-----------|
| v1.0 | 2026-09-07 | 최초 확정(frozen baseline) | backend, frontend |

---

## 8. 통합 검증 체크리스트 (Build & Test 시 사용)

- [ ] 인증: admin/table 로그인 → 토큰 발급 → 보호 엔드포인트 접근 / 만료 시 401 흐름
- [ ] 메뉴: 카테고리·메뉴 조회 형태가 계약과 일치(필드/타입)
- [ ] 주문 생성: 응답 order_number 형식 `T{n}-{seq}` + `order_created` 이벤트 수신(≤2초)
- [ ] 현재 세션 필터: `GET /api/orders/current`가 active 세션 주문만 반환
- [ ] 상태 변경/삭제: 이벤트(`order_status_changed`/`order_deleted`)와 총액 재계산 반영
- [ ] 이용 완료: 이력 이동 + 리셋 + `table_session_closed` → 카드 리셋
- [ ] 대시보드: 그리드 카드가 table_total/recent_orders 계약대로 렌더
- [ ] 메뉴 관리: CRUD/reorder 상태코드(201/200/204/404/409/400) 일치
- [ ] 에러 형식: 전 엔드포인트 `{detail}` + 상태코드 일치
- [ ] 스토리 커버리지: US-C1~C5, US-A1~A7 전부 통합 흐름으로 검증

---

## 9. 스토리 ↔ 인터페이스 추적

| 스토리 | REST | SSE |
|--------|------|-----|
| US-C1 | `POST /api/table/login` | – |
| US-C2 | `GET /api/menus/categories`, `GET /api/menus` | – |
| US-C3 | (클라이언트 전용 장바구니) | – |
| US-C4 | `POST /api/orders` | `order_created`(관리자 측) |
| US-C5 | `GET /api/orders/current` | `order_status_changed`(선택) |
| US-A1 | `POST /api/admin/login` | – |
| US-A2 | `GET /api/admin/dashboard`, `GET /api/admin/stream` | 전체 |
| US-A3 | `PATCH /api/admin/orders/{id}/status` | `order_status_changed` |
| US-A4 | `DELETE /api/admin/orders/{id}` | `order_deleted` |
| US-A5 | `POST /api/admin/tables/{id}/close` | `table_session_closed` |
| US-A6 | `GET /api/admin/tables/{id}/history` | – |
| US-A7 | `POST/PUT/DELETE /api/admin/menus`, `PATCH .../reorder`, `POST/GET /api/admin/tables` | – |
