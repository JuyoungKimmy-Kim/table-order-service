# table-order-service

테이블오더 서비스 (MVP/데모). 고객이 테이블에서 QR/태블릿으로 주문하고, 관리자가 실시간으로 주문을 관리하는 서비스.

- **backend/** — FastAPI + SQLAlchemy(SQLite), REST + SSE. (`backend/README.md`)
- **frontend/** — React + Vite + TypeScript + Tailwind. 고객 `/`, 관리자 `/admin`. (`frontend/README.md`)
- **아키텍처/계약** — `aidlc-docs/construction/shared-contract/`

## 빠른 실행 (Docker Compose 권장)

```bash
docker compose up --build
```

- 고객: http://localhost:8080/
- 관리자: http://localhost:8080/admin
- 종료: `docker compose down` (데이터 유지) / `docker compose down -v` (데이터 삭제)
- 운영 시 `SECRET_KEY` 환경변수를 긴 랜덤 값으로 교체(예: `SECRET_KEY=... docker compose up`)

## 데모 로그인 (시드 데이터: 아리랑 주막)

- **관리자**: `store_code=store1`, `username=admin1`, `password=admin1234`
- **테이블**: `store_code=store1`, `table_number=1`~`10`, `table_password=table1234`
- 메뉴 12종(한식) · 사진 포함, 최초 기동 시 자동 시딩(멱등)

## 로컬 개발 (Docker 없이)

```bash
# backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (다른 터미널) — Vite proxy /api → :8000
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## 테스트

```bash
cd backend && pytest -q                      # 단위/통합 34개
python tests/integration_e2e.py              # 라이브 서버 대상 E2E(계약 §8) 30개
```

빌드/테스트 상세: `aidlc-docs/construction/build-and-test/`
