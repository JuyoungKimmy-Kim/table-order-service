# Unit Test Execution

## Backend Unit/통합 테스트 (pytest)

### 1. Execute All Unit Tests
```bash
cd backend
source .venv/bin/activate
pytest -q
```

테스트 파일(7개, `backend/tests/`):
- `test_auth.py` — 관리자/테이블 로그인, 401/시도제한
- `test_menus.py` — 카테고리·메뉴 조회
- `test_orders.py` — 주문 생성/현재세션/검증(빈 items 등)
- `test_admin_orders.py` — 상태 전이(허용/무효 400)/삭제/404
- `test_admin_tables_menus.py` — 테이블·메뉴 CRUD/409/reorder
- `test_sse.py` — SSE 이벤트 발행/수신

### 2. Review Test Results
- **Expected**: **34 passed, 0 failed**
- **최근 실행 결과**: `34 passed, 66 warnings in 44.10s` ✅
- 각 테스트는 격리된 임시 SQLite DB + 멱등 시딩 사용(상호 독립)
- Warnings 66건은 passlib(`crypt`)·python-jose(`datetime.utcnow()`) DeprecationWarning으로 동작 무관

### 3. Fix Failing Tests
테스트 실패 시:
1. `pytest -q -x` 로 첫 실패에서 멈춰 확인
2. `pytest tests/<파일>::<테스트> -vv` 로 상세 확인
3. 코드/계약 대조 후 수정 → 전체 재실행

## Frontend 타입 검증

프론트엔드는 별도 unit test 스위트가 없음(MVP 범위). 정적 타입 검증으로 대체:
```bash
cd frontend
npm run typecheck        # tsc --noEmit
```
- **Expected**: 오류 0건
- **최근 실행 결과**: 통과(오류 없음) ✅
- 상호작용 요소에는 `data-testid`가 부여되어 있어 향후 E2E/컴포넌트 테스트 도입이 용이
