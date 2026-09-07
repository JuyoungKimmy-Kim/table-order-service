# 요구사항 명확화 질문 (Requirement Verification Questions)

요구사항 정의서(`requirements/table-order-requirements.md`)와 제외사항(`requirements/constraints.md`)을 분석했습니다.
기능 요구사항은 잘 정의되어 있으나, **구현에 필요한 기술적 결정**과 **확장(extension) 적용 여부**가 미정입니다.
각 질문의 `[Answer]:` 태그 뒤에 해당하는 선택지 문자(A, B, C ...)를 입력해 주세요.
보기가 맞지 않으면 마지막 "Other" 옵션을 고른 뒤 원하는 내용을 직접 서술해 주세요.

---

## Question 1
백엔드(서버 시스템)는 어떤 언어/프레임워크로 구현할까요?

A) Node.js (Express/NestJS) + TypeScript

B) Python (FastAPI)

C) Java (Spring Boot)

D) Go

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
프론트엔드(고객용 웹UI + 관리자용 웹UI)는 어떤 기술로 구현할까요?

A) React (예: Vite + React)

B) Vue.js

C) 서버사이드 렌더링 프레임워크 (Next.js / Nuxt)

D) 순수 HTML/CSS/JavaScript (프레임워크 없이)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
데이터 저장소(매장, 메뉴, 주문, 주문 이력)는 어떤 데이터베이스를 사용할까요?

A) 관계형 DB - PostgreSQL

B) 관계형 DB - MySQL/MariaDB

C) 경량 관계형 DB - SQLite (로컬/단순 배포에 적합)

D) NoSQL Document - MongoDB

X) Other (please describe after [Answer]: tag below)

[Answer]:C

## Question 4
배포 및 실행 환경은 어디를 대상으로 하나요? (인프라 설계 범위에 영향)

A) 로컬 개발 환경 위주 (Docker Compose로 로컬 실행 — MVP/데모 목적)

B) AWS 클라우드 배포

C) 기타 클라우드 (Azure/GCP)

D) 아직 미정 — 우선 로컬에서 동작하는 MVP만 목표

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
관리자용 실시간 주문 모니터링은 요구사항 문서에 **Server-Sent Events(SSE)** 로 명시되어 있습니다. 이대로 진행할까요?

A) 예 — SSE로 구현 (요구사항 문서 명시대로)

B) 아니오 — WebSocket으로 변경

C) 아니오 — 폴링(polling) 방식으로 단순화

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
이 프로젝트의 초기 목표 범위는 어디까지인가요?

A) 요구사항 문서의 "MVP 개발 범위"(4장)에 명시된 핵심 기능만 우선 구현

B) 요구사항 문서 전체 기능(선택사항 포함)을 모두 구현

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7
초기 데이터(샘플 매장/메뉴/테이블)를 시연용으로 시딩(seed)할 필요가 있나요?

A) 예 — 데모용 샘플 데이터 시딩 포함 (매장 1개, 메뉴 여러 개, 테이블 몇 개)

B) 아니오 — 관리자 화면에서 직접 등록하는 것으로 충분

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## 확장(Extension) 적용 여부

아래는 AI-DLC 워크플로우가 제공하는 선택적 확장 규칙입니다. 프로젝트에 적용할지 결정해 주세요.

## Question 8: Security Extensions
이 프로젝트에 보안(Security) 확장 규칙을 강제 적용할까요?

A) Yes — 모든 SECURITY 규칙을 차단성(blocking) 제약으로 강제 적용 (프로덕션 수준 애플리케이션 권장)

B) No — 모든 SECURITY 규칙 생략 (PoC, 프로토타입, 실험용 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 9: Property-Based Testing Extension
이 프로젝트에 속성 기반 테스트(PBT) 규칙을 강제 적용할까요?

A) Yes — 모든 PBT 규칙을 차단성 제약으로 강제 적용 (비즈니스 로직, 데이터 변환, 직렬화, 상태 저장 컴포넌트가 있는 프로젝트 권장)

B) Partial — 순수 함수와 직렬화 라운드트립에 대해서만 PBT 규칙 적용 (알고리즘 복잡도가 제한적인 프로젝트에 적합)

C) No — 모든 PBT 규칙 생략 (단순 CRUD 애플리케이션, UI 전용, 비즈니스 로직이 적은 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

## Question 10: Resiliency Extensions
이 프로젝트에 복원력(Resiliency) 기준선을 적용할까요?

**설명**: 활성화 시 AWS Well-Architected Framework(신뢰성 기둥) 기반의 **설계 시점 모범 사례**를 요구사항/설계/코드에 반영합니다. 단, 이것이 프로덕션 준비 완료를 보장하지는 않으며 시작점(first draft) 역할을 합니다.

A) Yes — 복원력 기준선을 설계 시점 방향성 지침으로 적용 (비즈니스 크리티컬 워크로드 권장)

B) No — 복원력 기준선 생략 (PoC, 프로토타입, 빠른 반복이 중요한 실험용 프로젝트에 적합)

X) Other (please describe after [Answer]: tag below)

[Answer]: B
