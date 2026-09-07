# Unit of Work Story Map (스토리 → 유닛 매핑)

**분해 축**: 계층 기준(backend / frontend). 대부분의 스토리는 서버 로직과 UI 양쪽에 걸치므로 **두 유닛에 걸쳐** 구현된다.
아래 매핑은 각 스토리가 어느 유닛에서 어떤 책임으로 구현되는지 명시한다.

## 매핑 표

| 스토리 | backend (Unit 1) 책임 | frontend (Unit 2) 책임 | 관련 컴포넌트 | API 계약 |
|--------|----------------------|------------------------|----------------|----------|
| **US-C1** 테이블 자동 로그인/세션 | 테이블 로그인, 토큰 발급/검증 | 최초 설정 UI, 토큰 로컬 저장, 자동 로그인 | C1, F1 | `POST /api/table/login` |
| **US-C2** 메뉴 조회/탐색 | 카테고리/메뉴 조회 API | 카테고리 탭·메뉴 카드 UI | C2, F1 | `GET /api/menus/categories`, `GET /api/menus` |
| **US-C3** 장바구니 | (없음 — 클라이언트 로컬 저장) | 장바구니 상태/수량/총액/영속(localStorage) | F1 | (없음, 클라이언트 전용) |
| **US-C4** 주문 생성 | 주문 생성, 세션 확보, 주문번호, 이벤트 발행 | 주문 확인/전송/성공화면/리다이렉트/장바구니 비움 | C3, F1 | `POST /api/orders` |
| **US-C5** 현재 세션 내역 | 현재 세션 주문 조회 | 내역 목록 UI(정렬/상태/페이지네이션) | C3, F1 | `GET /api/orders/current` |
| **US-A1** 매장 인증/세션 | 관리자 로그인, JWT(16h), bcrypt, 시도제한 | 로그인 UI, JWT 저장/유지/자동 로그아웃 | C1, F2 | `POST /api/admin/login` |
| **US-A2** 실시간 모니터링(SSE) | 대시보드 요약, SSE 스트림/브로드캐스트 | 대시보드 그리드/카드, SSE 구독, 강조/필터 | C4, C5, F2 | `GET /api/admin/dashboard`, `GET /api/admin/stream` |
| **US-A3** 주문 상태 변경 | 상태 변경, 이벤트 발행 | 상태 변경 UI, 반영 | C3, F2 | `PATCH /api/admin/orders/{id}/status` |
| **US-A4** 주문 삭제 | 주문 삭제, 총액 재계산, 이벤트 발행 | 삭제 버튼/확인팝업/피드백 | C3, F2 | `DELETE /api/admin/orders/{id}` |
| **US-A5** 세션 라이프사이클 | 세션 시작(첫 주문)/종료(이력이동+리셋), 이벤트 | 이용완료 버튼/확인팝업/피드백 | C3, F2 | `POST /api/admin/tables/{id}/close` |
| **US-A6** 과거 내역 조회 | 과거 이력 조회(날짜 필터) | 과거 내역 화면(역순/필터/닫기) | C3, F2 | `GET /api/admin/tables/{id}/history` |
| **US-A7** 메뉴 관리 | 메뉴 CRUD/순서/검증 | 메뉴 관리 UI(등록/수정/삭제/순서) | C2, F2 | `POST/PUT/DELETE /api/admin/menus`, `PATCH .../reorder` |

## 유닛별 스토리 커버리지

### Unit 1 — `backend`
서버 측 구현이 필요한 모든 스토리: US-C1, US-C2, US-C4, US-C5, US-A1, US-A2, US-A3, US-A4, US-A5, US-A6, US-A7
(US-C3 장바구니는 클라이언트 전용이라 서버 책임 없음.)

### Unit 2 — `frontend`
UI가 필요한 모든 스토리: US-C1, US-C2, US-C3, US-C4, US-C5, US-A1, US-A2, US-A3, US-A4, US-A5, US-A6, US-A7 (12개 전부)

## 할당 완전성 검증

- 전체 스토리 12개(US-C1~C5, US-A1~A7) **모두** 최소 하나의 유닛에 할당됨. ✅
- 미할당 스토리: 없음. ✅
- US-C3만 단일 유닛(frontend) 전담(클라이언트 로컬 장바구니), 나머지 11개는 backend+frontend 협업. ✅
- 부수 관심사(테이블 초기 설정 `POST /api/admin/tables`, 목록 `GET /api/admin/tables`)는 US-A2/US-A5 운영 흐름의 일부로 backend(C4)+frontend(F2)에서 처리. ✅
