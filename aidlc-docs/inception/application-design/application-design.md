# Application Design (통합본)

이 문서는 다음 세부 문서를 통합한 개요이다:
- `components.md` — 컴포넌트 정의/책임
- `component-methods.md` — 메서드 시그니처
- `services.md` — 오케스트레이션 흐름
- `component-dependency.md` — 의존성/통신/데이터 흐름

## 1. 아키텍처 개요

로컬 Docker Compose로 기동되는 MVP 테이블오더 서비스.

- **Frontend**: React 단일 앱(Vite). 라우팅으로 고객(`/`)·관리자(`/admin`) 분리. ApiClient가 REST/SSE 및 토큰 관리.
- **Backend**: FastAPI, 단순형 구조(라우터 직접 DB 접근 + 재사용 헬퍼). SQLAlchemy로 SQLite 접근.
- **Realtime**: 인메모리 pub/sub 기반 SSE로 관리자 대시보드에 이벤트 전파(2초 이내).
- **DB**: SQLite. 최초 기동 시 데모용 샘플 데이터 시딩.

## 2. 컴포넌트 요약

| ID | 컴포넌트 | 계층 | 핵심 책임 |
|----|----------|------|-----------|
| C1 | AuthComponent | Backend | 관리자 JWT(16h, bcrypt, 시도제한) + 테이블 세션 인증 |
| C2 | MenuComponent | Backend | 카테고리/메뉴 조회 및 관리(CRUD, 순서, 검증) |
| C3 | OrderComponent | Backend | 주문 CRUD/상태 + 테이블 세션 라이프사이클(시작/종료/이력) |
| C4 | TableAdminComponent | Backend | 테이블 초기 설정 + 대시보드 요약 |
| C5 | RealtimeComponent | Backend | SSE 인메모리 pub/sub 브로드캐스트 |
| C6 | PersistenceComponent | Backend | SQLite 연결/모델/초기화/시딩 |
| F1 | CustomerApp | Frontend | 고객 UI (로그인/메뉴/장바구니/주문/내역) |
| F2 | AdminApp | Frontend | 관리자 UI (로그인/대시보드/관리) |
| F3 | ApiClient | Frontend | REST/SSE 호출 및 토큰 관리 |

## 3. 주요 오케스트레이션 (요약)

- **주문 생성**: 테이블 인증 → 세션 확보 → 저장 → order_created 이벤트 → 대시보드 갱신 → 클라이언트 성공 처리(장바구니 비움→리다이렉트)
- **실시간 모니터링**: 초기 요약 조회 + SSE 구독 → 이벤트 수신 시 카드 갱신/강조
- **세션 종료**: 트랜잭션으로 이력 이동 + 현재 주문/총액 리셋 → table_session_closed 이벤트
- 상세 흐름은 `services.md` 참조.

## 4. 데이터 모델 (개요)

Store, AdminUser, Table, TableSession, Category, Menu, Order, OrderItem, OrderHistory.
- 주문 항목은 메뉴명/단가를 **스냅샷**으로 저장(추후 메뉴 변경/삭제와 무관하게 이력 보존).
- 세션 종료 시 현재 세션 주문을 이력으로 이동(별도 테이블 이동 또는 상태 아카이빙 — Functional Design에서 확정).
- 상세 스키마/제약/인덱스는 Construction 단계 Functional Design에서 확정.

## 5. 설계 결정 근거 (사용자 확정)

| 결정 | 선택 | 근거 |
|------|------|------|
| 백엔드 계층 | 단순형(Router 직접 DB) | 빠른 로컬 MVP, 최소 구조 (헬퍼로 중복 제거) |
| 프론트 구성 | 단일 앱 라우팅 | 빌드/배포 단순 |
| 인증 | 통합 AuthComponent | 관리자/테이블 인증을 한 컴포넌트에서 관리 |
| 주문/세션 | 통합 OrderComponent | 세션-주문 강결합 로직을 한 곳에서 일관 처리 |
| SSE | 인메모리 pub/sub | 단일 프로세스 로컬 MVP에 적합 |
| API 문서 | FastAPI OpenAPI | 별도 명세 유지 부담 제거 |

## 6. 다음 단계 (Units Generation 대상 후보)

컴포넌트 묶음을 작업 단위(Unit)로 분해할 후보:
- Unit A: 백엔드 기반 + 인증 + 영속화(Auth, Persistence, 모델/시딩)
- Unit B: 백엔드 메뉴 + 주문/세션 + SSE(Menu, Order, TableAdmin, Realtime)
- Unit C: 프론트엔드 고객 앱(CustomerApp)
- Unit D: 프론트엔드 관리자 앱(AdminApp)
- (Docker Compose/통합은 Infrastructure Design + Build and Test에서)

> 실제 유닛 경계와 개수는 Units Generation 단계에서 확정한다.
