# Frontend Components (Unit 2 — Functional Design)

**Stack**: React + Vite + TypeScript, Tailwind CSS, React Context + hooks, react-router.
**계약 의존**: shared-contract v1.0 (REST/SSE 응답 형태만 의존).
**자동화**: 상호작용 요소에 `data-testid="{component}-{role}"`.

## 라우팅
| Path | 앱 | 설명 |
|------|----|------|
| `/` | CustomerApp (F1) | 테이블 자동 로그인 → 메뉴/장바구니/주문/내역 |
| `/admin/*` | AdminApp (F2) | 관리자 로그인 → 대시보드/주문관리/메뉴관리/테이블설정 |

## 전역 상태 (Context)
- **AuthContext**: `adminToken`(JWT)·`tableSession`(table_token, table_id, table_number, store_name) 저장(localStorage). 로그인/로그아웃, 401 → 재로그인 흐름 트리거.
- **CartContext**: 장바구니 항목(menu_id, name, price, qty) — localStorage 영속. add/remove/incr/decr/clear, 총액 파생.

## F3 ApiClient (`src/api/client.ts`)
- REST 래퍼: base `/api`, `Authorization: Bearer <token>` 자동 부착(호출 종류에 따라 admin/table 토큰 선택).
- 에러: 비2xx → `ApiError{status, detail}` throw. 401 → AuthContext에 통지(재로그인).
- SSE: `streamAdmin(onEvent)` — `EventSource` 대체(헤더 인증 필요하므로 `fetch`+ReadableStream 파서). 4개 이벤트 파싱, 끊기면 재연결 + dashboard 재조회.
- 메서드: adminLogin, tableLogin, getCategories, getMenus, createOrder, getCurrentOrders, getDashboard, streamAdmin, getTableOrders, updateOrderStatus, deleteOrder, closeTable, getHistory, createTable, getTables, createMenu, updateMenu, deleteMenu, reorderMenus.

---

## F1 CustomerApp 컴포넌트 트리
| 컴포넌트 | 스토리 | props/state | 상호작용 | API |
|----------|--------|-------------|----------|-----|
| `CustomerApp` | C1 | 라우팅/부트스트랩 | 저장 세션 유효 → MenuScreen, 아니면 TableSetup | — |
| `TableSetup` | C1 | form(store_code, table_number, table_password) | 제출 → 세션 저장 → 메뉴 이동 | `POST /table/login` |
| `MenuScreen` | C2 | categories, menus, activeCat | 카테고리 탭, 메뉴 카드 담기(+), 장바구니 열기 | `GET /menus/categories`, `GET /menus` |
| `MenuCard` | C2 | menu | "담기" 버튼(≥44px), 이미지/설명/가격 | — |
| `CartDrawer` | C3 | cart(context) | 수량 ±, 삭제, 비우기, 주문하기 | — |
| `OrderConfirm` | C4 | cart | 최종 확인(메뉴/수량/단가/총액) → 확정 | `POST /orders` |
| `OrderSuccess` | C4 | order_number | 주문번호 표시, ~5초 후 메뉴로 리다이렉트, 장바구니 비움 | — |
| `OrderHistory` | C5 | orders | 현재 세션 주문 시각순, 상태 배지, (선택)SSE 상태 갱신 | `GET /orders/current` |

**고객 화면 규칙**: 로그인 절차 비노출(C1), 메뉴가 기본 화면, 터치 타깃 ≥44px, 금액 천단위 콤마.

---

## F2 AdminApp 컴포넌트 트리
| 컴포넌트 | 스토리 | props/state | 상호작용 | API / SSE |
|----------|--------|-------------|----------|-----------|
| `AdminApp` | A1 | 토큰 유효성 | 없음 → AdminLogin, 있음 → Dashboard | — |
| `AdminLogin` | A1 | form(store_code, username, password) | 제출 → JWT 저장 | `POST /admin/login` (429/401 처리) |
| `Dashboard` | A2 | tables[], newHighlight | 초기 스냅샷 로드 → SSE 구독, 카드 클릭 → 상세, 테이블 필터 | `GET /admin/dashboard` + `GET /admin/stream` |
| `TableCard` | A2 | summary | table_total·order_count·recent_orders 미리보기, 신규 강조 | — |
| `TableOrdersPanel` | A3/A4/A5 | table_id, orders[] | 상태 변경(드롭다운), 삭제(확인팝업), 이용완료(확인팝업) | `GET tables/{id}/orders`, `PATCH orders/{id}/status`, `DELETE orders/{id}`, `POST tables/{id}/close` |
| `StatusBadge` | A3/C5 | status | pending/preparing/completed → 한글 라벨+색 | — |
| `ConfirmDialog` | A4/A5 | message | 확인/취소 | — |
| `HistoryModal` | A6 | table_id, date_from?, date_to? | 과거 내역 시간역순, 날짜필터, 닫기 | `GET tables/{id}/history` |
| `MenuManage` | A7 | menus[], categories[] | 등록/수정/삭제/순서조정, 검증 | `POST/PUT/DELETE /admin/menus`, `PATCH /admin/menus/reorder` |
| `MenuForm` | A7 | menu? | name/price/category/description/image_url, 검증(name 필수, price≥0) | — |
| `TableSettings` | A7 | tables[] | 테이블 등록(중복 409)/목록 | `POST/GET /admin/tables` |

**SSE 매핑**: `order_created`→카드 갱신+강조 / `order_status_changed`→배지 갱신 / `order_deleted`→주문 제거+총액 / `table_session_closed`→카드 리셋. 연결 끊김 시 재구독+dashboard 재조회.

## 상태 라벨 매핑 (BR-3)
`pending`→"대기중", `preparing`→"준비중", `completed`→"완료".

## 에러/인증 처리 (BR-9 / 계약 §전역)
- 에러 본문 `{detail}` 표시. 401 → 관리자=로그인 화면, 테이블=초기 설정 화면.
- 429(관리자 로그인)→ "시도 제한, 잠시 후" 안내. 409(테이블 중복)→ 폼 에러.
