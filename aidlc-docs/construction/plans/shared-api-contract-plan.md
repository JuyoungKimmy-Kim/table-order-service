# Shared API Contract Plan (공통 API 계약 확정 — 선행 Functional Design)

**목적**: backend / frontend 두 유닛을 **병렬로** 진행하기 위한 전제. 두 유닛이 의존하는 **공통 API 계약**(REST 스키마 + SSE payload + 공유 도메인/데이터 모델)을 상세 수준으로 확정한다.
**성격**: 두 유닛 공통의 Functional Design(계약 부분). 유닛별 상세 비즈니스 로직은 이후 각 유닛의 Functional Design에서 다룬다.

> 이 계약이 승인되면 backend(계약 구현)와 frontend(계약 소비)를 **병렬 트랙**으로 동시에 진행한다.

---

## 실행 체크리스트 (승인 후 생성할 산출물)

- [x] `aidlc-docs/construction/shared-contract/domain-entities.md` — 확정 도메인/데이터 모델(필드, 타입, 관계, 제약)
- [x] `aidlc-docs/construction/shared-contract/api-contract.md` — REST 엔드포인트별 요청/응답 스키마(상세), 상태코드, 에러 형식
- [x] `aidlc-docs/construction/shared-contract/sse-contract.md` — SSE 이벤트별 payload 스키마
- [x] `aidlc-docs/construction/shared-contract/business-rules.md` — 계약에 직접 걸리는 공통 비즈니스 규칙(주문상태 전이, 세션 라이프사이클, 총액 계산, 검증)
- [x] 계약 완전성/일관성 검증(모든 스토리의 계약 커버 확인)

---

## 확정 대상 요약 (이미 unit-of-work.md 0장에서 표면 고정됨)

- REST 엔드포인트 18종(인증/메뉴/주문/관리자/SSE)
- SSE 이벤트 4종: `order_created`, `order_status_changed`, `order_deleted`, `table_session_closed`
- 엔티티: Store, AdminUser, Table, TableSession, Category, Menu, Order, OrderItem, OrderHistory

아래 질문은 계약을 상세 수준으로 굳히기 위한 최소 결정 사항이다.

---

## 명확화 질문 (Clarification Questions)

각 질문의 `[Answer]: A` 뒤에 A/B/C 또는 X(직접 설명)를 적어 주세요.

### Q1 — 식별자(ID) 방식 (Domain Model)
엔티티 기본키/식별자를 어떻게 할까요?

A) 정수 auto-increment PK + 주문번호는 별도 사람이 읽는 문자열(예: `A12-0007`) (권장, 단순/디버깅 쉬움)

B) UUID 기반 PK

X) Other

[Answer]: A

### Q2 — 주문 번호(order_number) 형식 (Business Rules)
고객/관리자에게 표시되는 주문 번호 형식은?

A) 테이블+일련번호 조합(예: `T03-0007`) — 테이블별 순번 (권장)

B) 매장 전체 일련번호(예: `0007`) — 매장 단위 순번

C) 날짜 포함(예: `20260907-0007`)

X) Other

[Answer]: A

### Q3 — 주문 상태 값 (Business Rules)
주문 상태 enum 값(요구사항: 대기중/준비중/완료)을 API에서 어떤 값으로 주고받을까요?

A) 영문 코드 `pending` / `preparing` / `completed` (프론트에서 한글 라벨 매핑) (권장)

B) 한글 문자열 그대로 `대기중` / `준비중` / `완료`

X) Other

[Answer]: A

### Q4 — 세션 종료 시 이력 처리 방식 (Data Flow / Domain Model)
"이용 완료" 시 현재 세션 주문을 과거 이력으로 옮기는 저장 방식은?

A) 별도 `OrderHistory` 테이블로 **레코드 이동/복제** 후 현재 주문에서 제거 (요구사항 문서가 OrderHistory 테이블 명시 → 권장)

B) 단일 `Order` 테이블에 세션/상태 플래그로 **아카이빙**(물리 이동 없음)

X) Other

[Answer]: A

### Q5 — 에러 응답 형식 (Error Handling)
API 에러 응답 본문 형식은?

A) FastAPI 기본 `{ "detail": "..." }` 사용, HTTP 상태코드로 구분 (권장, 최소 구조)

B) 커스텀 `{ "error_code", "message", "field_errors" }` 구조

X) Other

[Answer]: A

### Q6 — 인증 만료/실패 시 프론트 처리 계약 (Integration / Error Handling)
토큰 만료·무효 시 서버 응답과 프론트 동작 계약은?

A) 서버 `401` 반환 → 프론트: 관리자면 로그인 화면, 테이블이면 초기 설정 화면으로 이동 (권장, 요구사항 정합)

B) 서버가 만료 임박 시 갱신 토큰 제공(리프레시 토큰 흐름)

X) Other

[Answer]: A

### Q7 — 금액/통화 표현 (Domain Model)
가격/총액 필드 타입은?

A) 정수(원 단위, KRW 최소 단위) — 소수점 없음 (권장, 한국 원화)

B) 소수(decimal, 소수 2자리)

X) Other

[Answer]: A

### Q8 — 데모 시딩 범위 (Data Flow)
최초 기동 시 시딩할 데모 데이터 범위는?

A) 매장 1개 + 관리자 계정 1개 + 카테고리 3~4개 + 메뉴 10~15개 + 테이블 4~6개 (권장, 데모 충분)

B) 최소만(매장1/관리자1/메뉴 2~3개/테이블 1개)

X) Other

[Answer]: A
