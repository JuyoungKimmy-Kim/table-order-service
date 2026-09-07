# Table Order — Frontend (Unit 2)

React + Vite + TypeScript 단일 앱. shared-contract v1.0 을 소비합니다.
- 고객 UI: `/` (테이블 자동 로그인 → 메뉴/장바구니/주문/내역)
- 관리자 UI: `/admin` (로그인 → 대시보드(SSE)/메뉴 관리/테이블 설정)

## 기술 스택
- React 18 + Vite 5 + TypeScript
- Tailwind CSS
- 상태 관리: React Context (`AuthContext`, `CartContext`)
- 데이터: `fetch` 기반 `ApiClient` (`src/api/client.ts`) — REST + SSE(관리자 스트림)

## 개발 실행
```bash
npm install
npm run dev        # http://localhost:5173  (/api → http://localhost:8000 프록시)
```
백엔드 주소를 바꾸려면 `.env` 에 `VITE_API_TARGET` 설정 (`.env.example` 참고).

## 타입 체크 / 빌드
```bash
npm run typecheck
npm run build      # dist/ 생성
npm run preview
```

## Docker
```bash
docker build -t table-order-frontend .
# nginx 가 /api 를 docker-compose 서비스 `backend:8000` 으로 프록시 (nginx.conf)
```

## 계약 준수
- REST/SSE 응답 형태(`src/types.ts`)에만 의존, 물리 DB 스키마 비의존.
- 금액=정수(원, 천단위 콤마), 시각=ISO8601, 상태=영문코드→한글 라벨 매핑.
- 401 → 관리자=로그인 화면 / 테이블=초기 설정 화면.
- 상호작용 요소에 `data-testid="{component}-{role}"` 부여(자동화 친화).

## 화면 ↔ 스토리
| 화면 | 스토리 |
|------|--------|
| TableSetup / 자동 로그인 | US-C1 |
| MenuScreen | US-C2 |
| CartDrawer | US-C3 |
| OrderConfirm / OrderSuccess | US-C4 |
| OrderHistory | US-C5 |
| AdminLogin | US-A1 |
| Dashboard (SSE) | US-A2 |
| TableOrdersPanel (상태변경/삭제/이용완료) | US-A3 / A4 / A5 |
| HistoryModal | US-A6 |
| MenuManage / TableSettings | US-A7 |
