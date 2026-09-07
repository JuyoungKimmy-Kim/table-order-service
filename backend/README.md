# Table Order Service — Backend (Unit 1)

FastAPI + SQLAlchemy(SQLite) 기반 테이블오더 서비스 백엔드. Frozen shared-contract v1.0 구현.

## 기술 스택
- Python 3.11+, FastAPI, Uvicorn
- SQLAlchemy 2.x, SQLite
- Pydantic v2, python-jose(JWT), passlib[bcrypt]
- sse-starlette(SSE), pytest + httpx

## 로컬 실행

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API 문서(자동 OpenAPI): http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health
- 최초 기동 시 스키마 생성 + 데모 데이터 시딩(멱등)

## 데모 로그인 정보 (시드)
- **관리자**: `store_code=store1`, `username=admin1`, `password=admin1234`
- **테이블**: `store_code=store1`, `table_number=1..5`, `table_password=table1234`

## 테스트

```bash
cd backend
pytest -q
```

각 테스트는 격리된 임시 SQLite DB를 사용하며 자동 시딩됩니다.

## Docker

```bash
docker build -t table-order-backend ./backend
docker run -p 8000:8000 table-order-backend
```

## 구조
```
app/
  main.py          앱/라우터 등록/CORS/lifespan(init_db+seed)
  config.py        설정(토큰 만료, 시도제한 등)
  database.py      engine/session/get_db/init_db
  models.py        9개 도메인 엔티티(SQLAlchemy)
  schemas.py       Pydantic 요청/응답 스키마
  security.py      bcrypt 해시 + JWT
  deps.py          인증 의존성(admin/table/공용)
  seed.py          데모 데이터 시딩
  realtime.py      인메모리 SSE pub/sub broker
  helpers.py       주문번호/세션/총액/이력이동 헬퍼
  routers/         auth, menus, orders, admin_orders, admin_dashboard, admin_tables, admin_menus
tests/             pytest 통합/단위 테스트
```

## 계약 준수
- REST 18개 엔드포인트 + SSE 4개 이벤트 (`integration-contract.md` v1.0)
- 금액=정수(원), 시각=ISO8601 UTC, 상태=`pending|preparing|completed`, 에러=`{detail}`
- 상세: `aidlc-docs/construction/shared-contract/`
