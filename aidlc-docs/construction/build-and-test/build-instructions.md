# Build Instructions

두 유닛(`backend`, `frontend`)의 빌드 절차. 모든 명령은 저장소 루트(`table-order-service/`) 기준.

## Prerequisites
- **Backend 빌드 도구**: Python 3.11+ (검증 환경: 3.12.12), `pip`, `venv`
- **Frontend 빌드 도구**: Node.js 18+ (검증 환경: v22.22.0), npm 10+
- **Backend 의존성**: `backend/requirements.txt` (FastAPI 0.115.6, SQLAlchemy 2.0.36, Pydantic 2.10.4, python-jose, passlib[bcrypt], sse-starlette, pytest, httpx)
- **Frontend 의존성**: `frontend/package.json` (React 18, react-router-dom 6, Vite 5, TypeScript 5.6, Tailwind 3.4)
- **환경 변수(Backend)**: `backend/.env.example` 참조. 최소 `SECRET_KEY` 필요(운영 시 반드시 교체). `DATABASE_URL` 기본값 `sqlite:///./table_order.db`
- **환경 변수(Frontend)**: `frontend/.env.example` 참조. dev는 Vite proxy로 `/api` → `:8000` 프록시(별도 설정 불필요)
- **시스템 요구사항**: macOS/Linux, 디스크 ~500MB(node_modules 포함)

## Build Steps

### 1. Install Dependencies

Backend:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Frontend:
```bash
cd frontend
npm install
```

### 2. Configure Environment

Backend:
```bash
cd backend
cp .env.example .env
# .env 편집: SECRET_KEY를 임의의 긴 랜덤 문자열로 교체
```

Frontend: dev 모드는 추가 설정 불필요(Vite proxy가 `/api`를 백엔드로 전달).

### 3. Build All Units

Backend는 인터프리터 언어라 별도 컴파일 산출물이 없다. 임포트/기동 검증으로 대체:
```bash
cd backend
python -c "import app.main"          # 임포트 성공 = 빌드 성공 간주
```

Frontend (타입체크 + 프로덕션 번들):
```bash
cd frontend
npm run build                        # tsc && vite build
```

### 4. Verify Build Success
- **Backend**: `import app.main` 오류 없음. 서버 기동 시 로그 `Application startup complete.` + `GET /health` → `{"status":"ok"}`
- **Frontend**: `npm run build` 성공. 산출물:
  - `frontend/dist/index.html`
  - `frontend/dist/assets/index-*.js` (~208KB, gzip ~65KB)
  - `frontend/dist/assets/index-*.css` (~20KB, gzip ~4.3KB)
  - 최근 검증: **62 modules transformed, built in ~0.5s**
- **Common Warnings (허용)**:
  - Backend: `passlib`/`python-jose`의 `crypt`·`datetime.utcnow()` DeprecationWarning — 동작 무관, MVP 범위에서 수용
  - Frontend: `npm audit` 4건(esbuild/vite dev-only, react-router) — 하단 security 문서 참조. 로컬 데모 범위에서 수용

## Docker 빌드 (선택)
각 유닛에 Dockerfile 존재. 루트 `docker-compose.yml`은 아직 없음(향후 Operations에서 추가).
```bash
docker build -t table-order-backend ./backend
docker build -t table-order-frontend ./frontend   # nginx로 /api → backend:8000 프록시(SSE 버퍼링 off)
```

## Troubleshooting

### Frontend: `npm install`/`npm run build` 이 `backend/package.json` 을 찾음
- **원인**: 쉘 작업 디렉터리가 `backend/`에 남아 있음
- **해결**: `cd frontend` 후 실행하거나 `npm --prefix frontend ...` 사용

### Backend: 기동은 되나 로그인/토큰 오류
- **원인**: `SECRET_KEY` 미설정 또는 매 기동 변경
- **해결**: `.env`에 고정 `SECRET_KEY` 설정

### Backend: DB 상태가 꼬임(중복 시드/이전 주문 잔존)
- **원인**: 이전 실행의 `table_order.db` 재사용
- **해결**: `rm backend/table_order.db` 후 재기동(최초 기동 시 스키마 생성 + 멱등 시딩)
