# Frontend Unit — Functional Design Plan

**유닛**: Unit 2 `frontend` (React 단일 앱)
**기준선**: shared-contract v1.0 (frozen) — `integration-contract.md` / `api-contract.md` / `sse-contract.md` / `domain-entities.md` / `business-rules.md`
**담당 스토리**: US-C1~C5 (고객 UI), US-A1~A7 (관리자 UI)

## 확정된 기술 결정 (Technical Decisions)
- [x] 언어: **TypeScript** (`.tsx`)
- [x] 빌드: **Vite + React**
- [x] 스타일링: **Tailwind CSS**
- [x] 상태 관리: **React Context + hooks** (전역: 인증/세션 + 장바구니, 그 외 로컬 상태)
- [x] 데이터 페칭: `fetch` 기반 **ApiClient** (F3, REST + SSE + 토큰 부착)
- [x] 개발 API 연결: **Vite proxy** — `/api` → `http://localhost:8000`
- [x] 라우팅: 고객 `/`, 관리자 `/admin` (react-router)
- [x] 자동화: 상호작용 요소에 `data-testid="{component}-{role}"`

## 산출물 체크리스트 (Artifacts)
- [x] `construction/frontend/functional-design/frontend-components.md` — 컴포넌트 계층/props/state/상호작용/API 연결점 (컴포넌트+로직+검증 통합)

> 도메인 엔티티/서버 비즈니스 규칙은 shared-contract에 확정됨. frontend는 **API 응답 형태에만 의존**하며 물리 DB 스키마에 의존하지 않는다.
> 클라이언트 로직(장바구니/세션/SSE 동기화/상태 전이)과 폼 검증/상태 라벨 매핑은 frontend-components.md 및 코드(`src/lib/format.ts`, contexts, `useDashboard.ts`)에 통합 반영.

## 진행 (사용자 지시: "aidlc-state.md 참조해서 frontend 개발" — 게이트 미대기, 코드까지 진행)
- [x] Functional Design 블루프린트 작성
- [x] Code Generation — `frontend/` React+Vite+TS+Tailwind 앱 전체 구현 (아래 참조)
- [x] 검증: `npm run build`(tsc strict + vite) 통과, dev 서버 HTTP 200 기동 확인
