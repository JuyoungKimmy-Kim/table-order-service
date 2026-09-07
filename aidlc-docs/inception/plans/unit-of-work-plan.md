# Unit of Work Plan (작업 단위 분해 계획)

**목적**: Application Design(컴포넌트/메서드/서비스)과 User Stories를 바탕으로 시스템을 개발 가능한 **작업 단위(Unit of Work)**로 분해한다.
이 문서는 계획 산출물이다. 아래 질문에 답해 주시면, 그 결정에 따라 아래 체크리스트의 유닛 산출물을 생성한다.

> **작업 단위 정의**: 개발 목적의 논리적 스토리 그룹. 이 프로젝트는 로컬 단일 배포(Docker Compose) MVP이므로 마이크로서비스가 아닌 **단일 애플리케이션 내 논리적 모듈(Module)** 단위로 분해한다.

---

## 실행 체크리스트 (승인 후 생성할 산출물)

- [x] `aidlc-docs/inception/application-design/unit-of-work.md` — 유닛 정의, 책임, 코드 조직 전략(Greenfield)
- [x] `aidlc-docs/inception/application-design/unit-of-work-dependency.md` — 유닛 간 의존성 매트릭스
- [x] `aidlc-docs/inception/application-design/unit-of-work-story-map.md` — 스토리 → 유닛 매핑 (모든 스토리 할당 보장)
- [x] 유닛 경계/의존성 검증
- [x] 모든 스토리가 유닛에 할당되었는지 확인

---

## 사전 제안 유닛 (Application Design 후보 기준, 참고)

| 유닛 | 범위 | 관련 컴포넌트 | 관련 스토리 |
|------|------|--------------|-------------|
| **Unit A — 백엔드 기반/인증/영속화** | DB 모델·연결·시딩, 관리자 JWT, 테이블 세션 인증 | C1 Auth, C6 Persistence | US-C1(세션 시작), US-A1(관리자 인증) |
| **Unit B — 백엔드 도메인/실시간** | 메뉴 CRUD, 주문 CRUD/상태/세션 라이프사이클, 테이블 관리, SSE | C2 Menu, C3 Order, C4 TableAdmin, C5 Realtime | US-C2~C5, US-A2~A7 |
| **Unit C — 프론트엔드 고객 앱** | 자동 로그인, 메뉴, 장바구니, 주문, 내역 (`/`) | F1 CustomerApp, F3 ApiClient(공유) | US-C1~C5 |
| **Unit D — 프론트엔드 관리자 앱** | 로그인, 대시보드/SSE, 테이블·세션·메뉴 관리 (`/admin`) | F2 AdminApp, F3 ApiClient(공유) | US-A1~A7 |

> 실제 유닛 경계·개수는 아래 질문 답변으로 확정한다.

---

## 명확화 질문 (Clarification Questions)

각 질문의 `[Answer]:` 태그 뒤에 A/B/C 중 하나 또는 X(직접 설명)를 적어 주세요.

### Question 1 — 유닛 개수/경계 (Story Grouping)
위 사전 제안(Unit A/B/C/D, 4개)을 그대로 채택할까요?

A) 4개 유닛 그대로 채택 — 백엔드 기반+인증(A) / 백엔드 도메인+SSE(B) / 프론트 고객(C) / 프론트 관리자(D) (권장)

B) 백엔드를 하나로 통합(A+B), 프론트를 하나로 통합(C+D) → 총 2개 유닛 (백엔드 1 / 프론트 1)

C) 전체를 1개 유닛(모놀리식 단일 모듈)으로 — 최소 분해

X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 2 — 백엔드 도메인 유닛 세분화 (Business Domain / Story Grouping)
(Question 1에서 A를 선택한 경우) 백엔드 도메인 유닛(Unit B)을 더 나눌까요?

A) 나누지 않음 — 메뉴·주문/세션·테이블관리·SSE를 하나의 Unit B로 유지 (권장: 로직 상호결합, MVP 규모)

B) 메뉴 유닛과 주문/세션+SSE 유닛으로 분리 → 백엔드 3개 유닛(기반/인증 + 메뉴 + 주문·세션·SSE)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 3 — 유닛 개발 순서/의존성 처리 (Dependencies)
유닛 간 의존성(프론트→백엔드 API, 도메인→기반/인증)을 어떤 순서로 개발할까요?

A) 순차 진행 — 백엔드 기반/인증 → 백엔드 도메인 → 프론트 고객 → 프론트 관리자 (의존성 위→아래, 권장)

B) 백엔드 전체 완료 후 프론트 전체 진행 (백엔드 먼저, 프론트 나중)

C) 유닛별로 세로 슬라이스(기능 단위)로 백엔드+프론트를 함께 진행

X) Other (please describe after [Answer]: tag below)

[Answer]: C 

### Question 4 — 공유 코드(ApiClient, DB 모델 등) 소유권 (Dependencies / Team Alignment)
프론트 ApiClient·공통 타입, 백엔드 DB 모델 등 공유 자산은 어디에 둘까요?

A) 각 계층의 기반 유닛이 소유 — 백엔드 모델은 Unit A, 프론트 ApiClient는 먼저 만드는 프론트 유닛(고객)에서 정의 후 관리자 유닛이 재사용 (권장)

B) 별도 "공유(shared)" 유닛을 신설해 공통 자산을 모아 관리

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 5 — 배포 모델 / 디렉터리 구조 (Code Organization, Greenfield)
로컬 Docker Compose MVP의 소스 디렉터리 구조는 어떻게 잡을까요?

A) 워크스페이스 루트에 `backend/`(FastAPI)와 `frontend/`(React) 두 폴더로 분리, 각 폴더에 Dockerfile, 루트에 `docker-compose.yml` (권장)

B) 모노레포 스타일 `packages/backend`, `packages/frontend`

C) 단일 폴더 혼합(백엔드/프론트 한 트리)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 6 — 팀/작업 구성 (Team Alignment)
개발 진행 방식은?

A) 단일 개발자(또는 AI 주도) 순차 진행 — 유닛을 하나씩 완료 (권장, 현재 워크플로우에 적합)

B) 유닛별 병렬 작업 가정(인터페이스 계약 우선 정의 필요)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 7 — 기술적 고려사항 (Technical Considerations)
유닛별로 배포/스케일 요구가 다른 부분이 있나요? (예: SSE 프로세스 분리 등)

A) 없음 — 단일 프로세스 백엔드 + 단일 프론트 빌드로 충분, 유닛은 논리적 모듈일 뿐 (권장, 로컬 MVP)

B) 특정 유닛은 별도 배포/프로세스 필요 (아래에 명시)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 후속 질문 (Follow-up — 답변 간 상충 해소)

**분석 결과**: 아래 답변들이 서로 다른 분해 축을 섞고 있어 유닛 경계를 확정할 수 없습니다. 해소가 필요합니다.

- **Q1=B**: 유닛을 **계층(layer)** 기준으로 나눔 → 백엔드 유닛 1개 + 프론트 유닛 1개 (총 2개)
- **Q3=C**: 유닛을 **기능(feature) 세로 슬라이스** 기준으로 백엔드+프론트를 함께 묶어 진행
- **Q6=B**: 유닛별 **병렬** 작업

Q1(계층 2개 유닛)과 Q3(기능 세로 슬라이스)은 유닛을 나누는 축 자체가 달라 동시에 성립할 수 없습니다. 또한 Q6=B(병렬)는 유닛 간 인터페이스 계약을 먼저 확정해야 가능합니다.

### Follow-up Q-A — 유닛 분해 축을 하나로 확정
최종적으로 어떤 기준으로 유닛을 나눌까요?

A) **계층 기준(Q1=B 유지)** — 유닛 2개: `백엔드`(전체 API+DB+SSE) / `프론트엔드`(고객+관리자 단일 앱). Q3는 "개발 순서"로만 해석하여, 두 유닛 각각의 내부는 기능 단위로 반복 구현. (Q1=B와 정합, 단순)

B) **기능 세로 슬라이스 기준(Q3=C 유지)** — 유닛을 기능 도메인으로 나누고 각 유닛이 백엔드+프론트를 함께 포함. 예: `기반/인증`(세션·관리자 로그인) / `메뉴·주문·세션`(고객 주문+관리자 처리+SSE). 유닛 2~3개, 각 유닛이 풀스택. (Q1=B는 폐기)

C) **계층 기준 4개 유닛(원안 A/B/C/D)** — Q1 답변을 A로 변경. 백엔드 기반+인증 / 백엔드 도메인+SSE / 프론트 고객 / 프론트 관리자.

X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Follow-up Q-B — 병렬(Q6=B) 진행 확정
Q6=B(유닛 병렬)를 유지할까요? 병렬로 하려면 유닛 간 API/이벤트 인터페이스 계약을 Functional Design 초반에 먼저 확정하고 진행합니다. 다만 현재 워크플로우는 유닛을 하나씩 완료하는 순차 게이트 구조라, 실제로는 "계약 우선 정의 후 순차 구현"에 가깝습니다.

A) 순차 진행으로 변경(Q6→A) — 유닛을 하나씩 완료. 현재 워크플로우 게이트 구조와 정합 (권장)

B) 병렬 유지 — 인터페이스 계약을 먼저 확정한 뒤 진행(문서상 병렬 가정, 실제 게이트는 순차)

X) Other (please describe after [Answer]: tag below)

[Answer]: B — 병렬 유지. 단, 두 유닛 병렬 진행 전에 **공통 API 계약(REST 엔드포인트 + SSE 이벤트 + 공유 데이터 스키마)을 먼저 확정**하고, 그 계약을 기준으로 backend / frontend 두 유닛을 병렬로 진행한다.

---

## 최종 확정 결정 (Resolved)

| 항목 | 확정 내용 |
|------|-----------|
| 분해 축 | 계층 기준 |
| 유닛 수 | 2개 (+ 사전 공통 계약 단계) |
| Unit 1 | **backend** — FastAPI 전체(Auth, Menu, Order/Session, TableAdmin, SSE, Persistence, 시딩) → `backend/` |
| Unit 2 | **frontend** — React 단일 앱(고객 `/` + 관리자 `/admin`, ApiClient) → `frontend/` |
| 진행 방식 | **공통 API 계약 우선 확정 → 두 유닛 병렬** |
| 공통 계약 산출물 | `unit-of-work.md` 내에 API/SSE 계약 섹션으로 명시(엔드포인트·이벤트·공유 스키마). 계약 확정 후 병렬 진행 |
| 공유 코드 소유권 | 백엔드 모델 = backend 유닛 / 프론트 ApiClient = frontend 유닛 (Q4=A) |
| 디렉터리 | 루트 `backend/`, `frontend/`, `docker-compose.yml` (Q5=A) |
| 배포/스케일 | 단일 프로세스 백엔드 + 단일 프론트 빌드 (Q7=A) |
