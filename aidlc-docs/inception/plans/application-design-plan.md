# Application Design Plan

**목적**: 요구사항(`requirements.md`)과 사용자 스토리(`stories.md`)를 바탕으로 고수준 컴포넌트 식별과 서비스 계층 설계.
(상세 비즈니스 로직은 이후 Construction 단계의 Functional Design에서 정의)

이 문서는 계획 산출물입니다. 아래 질문에 답해 주시면, 그 결정에 따라 아래 체크리스트의 설계 산출물을 생성합니다.

---

## 실행 체크리스트 (승인 후 생성할 산출물)

- [x] `components.md` — 컴포넌트 정의 및 고수준 책임
- [x] `component-methods.md` — 컴포넌트별 메서드 시그니처(입출력 타입, 고수준 목적)
- [x] `services.md` — 서비스 정의 및 오케스트레이션 패턴
- [x] `component-dependency.md` — 의존 관계 매트릭스, 통신 패턴, 데이터 흐름
- [x] `application-design.md` — 위 문서 통합본
- [x] 설계 완전성/일관성 검증

---

## 사전 식별한 후보 컴포넌트 (참고)

**백엔드 (FastAPI)**
- AuthComponent — 관리자 인증(JWT, bcrypt, 시도 제한), 테이블 세션 로그인
- MenuComponent — 카테고리/메뉴 CRUD, 노출 순서
- OrderComponent — 주문 생성/조회/삭제, 상태 변경, 총액 계산
- TableSessionComponent — 테이블 세션 라이프사이클(시작/종료), 현재세션 필터링, 이력 이동
- RealtimeComponent (SSE) — 신규 주문/상태 변경 이벤트 브로드캐스트
- (공통) DB 접근 계층 / 모델

**프론트엔드 (React)**
- CustomerApp — 고객용 UI (자동 로그인, 메뉴, 장바구니, 주문, 내역)
- AdminApp — 관리자용 UI (로그인, 대시보드/SSE, 테이블·세션 관리, 메뉴 관리)

---

## 명확화 질문 (Clarification Questions)

## Question 1
백엔드(FastAPI) 내부 계층 구조는 어떤 스타일로 설계할까요?

A) 계층형(Layered): Router(API) → Service → Repository(DB 접근) → Model — 관심사 분리 명확 (권장)

B) 단순형: Router에서 직접 DB 접근 (서비스/레포지토리 계층 없이) — 최소 구조, 빠른 MVP

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
프론트엔드는 고객용과 관리자용을 어떻게 구성할까요?

A) 단일 React 앱 내에서 라우팅으로 분리 (예: `/` 고객, `/admin` 관리자) — 빌드/배포 단순

B) 두 개의 독립 React 앱으로 분리 (customer-app, admin-app) — 관심사/배포 완전 분리

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
인증 컴포넌트 설계 — 관리자 인증과 테이블(고객) 세션 인증을 어떻게 다룰까요?

A) 하나의 AuthComponent에서 두 가지(관리자 JWT / 테이블 세션)를 모두 처리

B) 분리 — AdminAuthComponent(관리자 JWT)와 TableAuthComponent(테이블 세션)를 별도 컴포넌트로

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
테이블 세션 관리(라이프사이클)와 주문 관리는 컴포넌트를 어떻게 나눌까요?

A) 별도 컴포넌트 — OrderComponent(주문 CRUD/상태)와 TableSessionComponent(세션 시작·종료·이력 이동)를 분리 (권장: 책임 분리)

B) 통합 — 하나의 OrderComponent가 주문 + 세션 라이프사이클을 함께 담당

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
SSE 실시간 브로드캐스트는 어떻게 구현할까요? (로컬 단일 프로세스 MVP 기준)

A) 인메모리 pub/sub — FastAPI 프로세스 내 인메모리 이벤트 큐/브로드캐스트로 구현 (로컬 MVP에 적합, 권장)

B) 외부 메시지 브로커(Redis 등) 기반 pub/sub — 확장성 우선

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
API 문서화/계약은 어떻게 다룰까요?

A) FastAPI 자동 OpenAPI(/docs)로 충분 — 별도 계약 문서 없이 진행 (권장)

B) OpenAPI 외에 별도 API 명세 문서도 유지

X) Other (please describe after [Answer]: tag below)

[Answer]: A
