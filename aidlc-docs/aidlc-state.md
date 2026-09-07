# AI-DLC State Tracking

## Project Information
- **Project Type**: Greenfield
- **Start Date**: 2026-09-07T00:00:00Z
- **Current Stage**: CONSTRUCTION - Shared API Contract APPROVED (frozen baseline). backend/frontend developed externally in parallel against shared-contract.

## Application Design Decisions
- **Backend layering**: 단순형 (Router에서 직접 DB 접근; 재사용 로직은 헬퍼로 분리)
- **Frontend**: 단일 React 앱, 라우팅으로 고객(`/`)·관리자(`/admin`) 분리
- **Auth**: 통합 AuthComponent (관리자 JWT + 테이블 세션)
- **Order/Session**: 통합 OrderComponent (주문 CRUD/상태 + 테이블 세션 라이프사이클)
- **SSE**: 인메모리 pub/sub (단일 프로세스)
- **API docs**: FastAPI 자동 OpenAPI

## Units Generation Decisions
- **분해 축**: 계층 기준(Layer), 2개 유닛 + 선행 공통 API 계약
- **Unit 1 — backend**: FastAPI 전체(Auth, Menu, Order/Session, TableAdmin, SSE, Persistence, 시딩) → `backend/`
- **Unit 2 — frontend**: React 단일 앱(고객 `/` + 관리자 `/admin`, ApiClient) → `frontend/`
- **진행 방식**: 공통 API/SSE 계약 우선 확정 → 두 유닛 병렬
- **디렉터리**: 루트 `backend/`, `frontend/`, `docker-compose.yml`
- **공유 소유권**: DB 모델=backend, ApiClient=frontend

## Workspace State
- **Existing Code**: No
- **Programming Languages**: None detected
- **Build System**: None detected
- **Project Structure**: Empty (requirements docs only)
- **Reverse Engineering Needed**: No
- **Workspace Root**: /Users/juyoungkim/dev/table-order-service

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Input Requirements Documents
- requirements/table-order-requirements.md (테이블오더 서비스 요구사항 정의서)
- requirements/constraints.md (구현 예외사항 / 제외 기능)

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No | Requirements Analysis |
| Property-Based Testing | No | Requirements Analysis |
| Resiliency Baseline | No | Requirements Analysis |

## Technical Decisions (from Requirements Analysis)
- **Backend**: Python (FastAPI)
- **Frontend**: React (Vite + React), 고객용 UI + 관리자용 UI
- **Database**: SQLite (경량 관계형)
- **Deployment Target**: 로컬 (Docker Compose, MVP/데모 목적)
- **Real-time Transport**: Server-Sent Events (SSE)
- **Scope**: MVP 핵심 기능 (요구사항 문서 4장)
- **Seed Data**: 데모용 샘플 데이터 시딩 포함

## Execution Plan Summary
- **Stages to Execute**: Application Design, Units Generation, Functional Design, NFR Requirements, NFR Design, Infrastructure Design (경량), Code Generation, Build and Test
- **Stages to Skip**: Reverse Engineering (Greenfield)
- **Risk Level**: Medium

## Stage Progress

### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (SKIPPED — Greenfield)
- [x] Requirements Analysis
- [x] User Stories
- [x] Workflow Planning (approved)
- [x] Application Design - EXECUTE (approved)
- [x] Units Generation - EXECUTE (approved)

### 🟢 CONSTRUCTION PHASE
- **Execution mode**: 공통 API 계약 우선 확정 → backend/frontend **병렬** 진행 → Build and Test 통합
- [x] Shared API Contract (contract-first Functional Design) - APPROVED (frozen baseline)
- [x] Code Generation — Unit 1 `backend` — Part 1 (Planning) APPROVED
- [x] Code Generation — Unit 1 `backend` — Part 2 (Generation) COMPLETE (34 pytest passed, E2E smoke OK)
- [x] Code Generation — Unit 2 `frontend` — COMPLETE (`frontend/` React+Vite+TS+Tailwind, US-C1~C5·US-A1~A7 전부, build/typecheck 통과, dev 서버 HTTP 200)
- [ ] Build and Test - EXECUTE (backend·frontend 통합 후)
- **Note**: Functional Design/NFR/Infra는 frozen shared-contract에 통합 반영되어 각 유닛 생성 시 별도 stage 없이 계약을 정확히 구현. frontend는 경량 Functional Design 블루프린트(frontend-components.md)만 별도 작성.

### Backend Unit 구현 요약 (backend/)
- FastAPI 단일 프로세스, 34 pytest 통과, E2E 스모크 확인. app 17파일 + 라우터 7 + 테스트 7.

### Frontend Unit 구현 요약 (frontend/)
- Stack: React 18 + Vite 5 + TypeScript(strict) + Tailwind CSS, React Context(Auth/Cart), fetch 기반 ApiClient(REST + SSE)
- 라우팅: 고객 `/`, 관리자 `/admin/*` (대시보드/메뉴/테이블)
- SSE: EventSource 대신 fetch+ReadableStream 파서(헤더 인증), 4개 이벤트 증분 갱신 + 재연결 시 dashboard 재동기화
- 개발 연결: Vite proxy `/api` → `:8000` / 배포: nginx `/api` → `backend:8000` (SSE 버퍼링 off)
- 자동화: 상호작용 요소 `data-testid` 부여
- 검증: `npm run build` 통과(62 모듈), dev 서버 HTTP 200

### 🟡 OPERATIONS PHASE
- [ ] Operations - PLACEHOLDER

## Current Status
- **Lifecycle Phase**: CONSTRUCTION
- **Current Stage**: Code Generation — Unit 1 `backend` — Part 2 (Generation) COMPLETE — awaiting code review/approval
- **Next Stage**: Unit 2 `frontend` Code Generation → Build and Test
- **Status**: backend/ 전체 생성(app 17파일 + 라우터 7 + 테스트 7), 34 pytest 통과, E2E 스모크 확인. 사용자 리뷰 대기.
