# User Story Generation Plan

**Role**: Product Owner
**목적**: 승인된 요구사항(`requirements.md`)을 사용자 중심 스토리 + 페르소나 + 승인 기준으로 변환.

이 문서는 **Part 1 (Planning)** 산출물입니다. 아래 질문에 답해 주시면(각 `[Answer]:` 태그 뒤에 문자 입력), 그 결정에 따라 **Part 2 (Generation)** 에서 `stories.md`와 `personas.md`를 생성합니다.

---

## 실행 체크리스트 (Part 2에서 수행할 단계)

- [x] `personas.md` 생성 — 사용자 아키타입 및 특성 정의
- [x] `stories.md` 생성 — INVEST 원칙을 따르는 사용자 스토리
- [x] 각 스토리에 acceptance criteria 포함
- [x] 페르소나를 관련 스토리에 매핑
- [x] 스토리가 Independent, Negotiable, Valuable, Estimable, Small, Testable 함을 확인

---

## 스토리 분해 접근법 (Story Breakdown Approaches)

아래 접근법 중 이 프로젝트에 적용할 방식을 Question 2에서 선택해 주세요.

- **Persona-Based**: 고객/관리자 페르소나별로 스토리를 그룹화 — 두 사용자 유형의 요구가 뚜렷이 나뉠 때 유리
- **Feature-Based**: 시스템 기능(메뉴 관리, 주문, 세션 관리 등) 중심으로 그룹화 — 기능 단위 구현/테스트에 유리
- **User Journey-Based**: 사용자 워크플로우(예: 착석→메뉴 탐색→주문→식사 완료) 흐름을 따라 구성 — UX 흐름 검증에 유리
- **Epic-Based**: 상위 에픽 아래 하위 스토리 계층 구성 — 대규모 백로그 관리에 유리
- **Hybrid**: 위 방식 조합 (예: 페르소나로 큰 그룹 → 각 그룹 내 기능/에픽으로 세분)

---

## 명확화 질문 (Clarification Questions)

## Question 1
페르소나(사용자 아키타입)를 어느 수준으로 정의할까요?

A) 2개 핵심 페르소나만 — 매장 고객(테이블 태블릿 사용자) + 매장 관리자/운영자

B) 세분화 — 고객, 홀 직원(주문 관리), 매장 관리자(메뉴/설정) 등 3개 이상으로 분리

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
스토리 분해 접근법은 무엇으로 할까요? (위 "스토리 분해 접근법" 참고)

A) Persona-Based (고객/관리자로 그룹)

B) Feature-Based (기능 단위로 그룹)

C) Hybrid — 페르소나로 크게 나눈 뒤 기능/에픽으로 세분 (권장: 두 페르소나 + 다수 기능에 적합)

D) User Journey-Based (사용자 흐름 중심)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
스토리 세분화(Granularity) 수준은 어느 정도로 할까요?

A) 굵게(Coarse) — 기능당 1개 스토리 수준 (빠른 개요, MVP에 적합)

B) 보통(Medium) — 주요 상호작용 단위로 분해 (예: "메뉴 조회"와 "카테고리 이동"을 별도 스토리)

C) 상세(Fine) — 세부 인터랙션/엣지케이스까지 개별 스토리로 분해

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
Acceptance Criteria(승인 기준)는 어떤 형식으로 작성할까요?

A) Given-When-Then (Gherkin 스타일) — 테스트 케이스로 직결되어 명확

B) 체크리스트/불릿 형태의 조건 목록 — 간결

C) 두 형식 혼합 (핵심 시나리오는 Given-When-Then, 부가 조건은 불릿)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 5
MVP 범위(요구사항 문서 4장)에 명시된 핵심 기능에 스토리를 집중하고, "선택사항"(예: 주문 상태 실시간 업데이트 등 optional 표기 항목)은 별도 표시/후순위로 둘까요?

A) 예 — MVP 핵심 기능에 집중하고 선택사항은 "Optional/후순위"로 명시 표시

B) 아니오 — 선택사항도 동등하게 MVP 스토리에 포함

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
각 스토리에 우선순위(Priority)나 대략적 크기(예: S/M/L) 표기를 포함할까요?

A) 우선순위(Must/Should/Could)만 표기

B) 우선순위 + 대략적 크기(S/M/L) 모두 표기

C) 둘 다 생략 — 스토리 내용과 acceptance criteria에만 집중

X) Other (please describe after [Answer]: tag below)

[Answer]: C
