# Integration Test Instructions

## Purpose
`frontend`(계약 소비) ↔ `backend`(계약 구현) 두 유닛이 shared-contract v1.0(REST 18 엔드포인트 + SSE 4 이벤트)대로 상호작용하는지 검증한다. 아래는 실제 실행 가능한 자동 검증 절차이며, 최근 실행에서 **30/30 통과**했다.

## Setup Integration Test Environment

### 1. Start Backend Service
```bash
cd backend
source .venv/bin/activate
rm -f table_order.db                                   # 깨끗한 상태 보장(멱등 시딩)
SECRET_KEY=test-e2e-secret-key-1234567890 \
  uvicorn app.main:app --port 8000
# 다른 터미널에서: curl -s http://localhost:8000/health  → {"status":"ok"}
```

### 2. Configure Endpoints
- Backend Base: `http://localhost:8000`, API prefix `/api`
- 데모 자격(시드): 관리자 `store1/admin1/admin1234`, 테이블 `store1/table_number/table1234`

## Test Scenarios (계약 §8 체크리스트 대응)

### Scenario 1: 인증 (frontend → backend `/api/*/login`)
- 관리자/테이블 로그인 → 토큰 발급, 잘못된 자격 → 401, 토큰 없이 보호 엔드포인트 접근 → 401

### Scenario 2: 메뉴 조회 형태 일치
- `GET /api/menus/categories`, `GET /api/menus` 응답 필드/타입이 계약과 일치(`price`는 int)

### Scenario 3: 주문 생성 + SSE 실시간 (핵심 E2E)
- 고객 `POST /api/orders` → `201 pending` + `order_number` 형식 `T{n}-{seq:04d}` + item 스냅샷(`menu_name`/`unit_price`)
- 관리자 SSE `GET /api/admin/stream`에서 `order_created` **2초 이내** 수신(측정치 ~0.02s)
- 빈 items → 400

### Scenario 4: 현재 세션 필터
- `GET /api/orders/current`가 active 세션 주문만 반환

### Scenario 5: 상태 변경/삭제 + 이벤트
- `PATCH .../status`(pending→preparing) → 200 + `order_status_changed`
- 비인접 전이(pending→completed) → 400
- `DELETE .../orders/{id}` → 200 + `table_total` 재계산 + `order_deleted`, 없는 주문 → 404

### Scenario 6: 이용 완료(세션 종료)
- `POST .../tables/{id}/close` → 200 + `moved_count` + `table_session_closed` 이벤트 + 이력 이동(`GET .../history`), active 세션 없을 때 재호출 → 400

### Scenario 7: 대시보드 형태
- `GET /api/admin/dashboard` → `table_total`, `recent_orders` 포함 카드 배열

### Scenario 8: 메뉴/테이블 관리 상태코드
- 메뉴 POST/PUT/DELETE → 201/200/204, 없는 메뉴 → 404
- 테이블 POST → 201, 중복 → 409

### Scenario 9: 에러 형식
- 전 엔드포인트 오류 본문이 `{ "detail": ... }` 형태

## Run Integration Tests

자동 검증 스크립트(계약 §8 전 항목)를 실행한다. 스크립트는 `backend/tests/integration_e2e.py`에 보존돼 있으며 라이브 서버 대상 재사용 가능하다(파일명이 `test_`로 시작하지 않아 pytest 기본 수집에는 포함되지 않음):
```bash
cd backend
source .venv/bin/activate
python tests/integration_e2e.py       # 표준 라이브러리만 사용(urllib + SSE 리스너 스레드)
# 기대 출력: === E2E SUMMARY: 30/30 passed ===
```

> 참고: 스크립트는 SSE 이벤트를 백그라운드 스레드로 수신하며 각 이벤트의 수신 지연을 측정한다. 재현성을 위해 실행 전 `table_order.db`를 삭제하고 서버를 재기동할 것.

### 3. Cleanup
```bash
pkill -f "uvicorn app.main:app"       # 서버 종료
rm -f backend/table_order.db          # 테스트 DB 제거
```

## 검증 결과 (최근 실행)
전 시나리오 통과 — **30/30**. 스토리 커버리지 US-C1~C5, US-A1~A7 전부 통합 흐름으로 확인.

### 계약 명세 보강 발견사항 (비차단)
- `table_number`는 backend에서 **문자열(str)** 로 처리된다(`TableLoginRequest`, `TableCreate`). 계약서 §3.1/§3.6에는 타입이 명시돼 있지 않다. frontend는 문자열로 전송하므로 통합상 문제 없음. → 계약 문서에 타입 명시 권장(차기 계약 마이너 버전).
- 주문 상태 전이 그래프는 backend 구현이 소유: `pending→preparing`, `preparing→{pending,completed}`, `completed→preparing`. 되돌리기(preparing→pending, completed→preparing)가 허용됨. 계약서에 전이 규칙 미명세 → 문서화 권장.
