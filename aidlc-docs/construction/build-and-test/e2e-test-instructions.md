# End-to-End Test Instructions

## Purpose
계약 §5의 핵심 통합 흐름 4가지(주문 생성 → 상태 변경 → 주문 삭제 → 이용 완료)를 실제 사용자 워크플로우 관점에서 검증한다. API 레벨 E2E는 `backend/tests/integration_e2e.py`로 자동화되어 **30/30 통과**. 아래는 UI를 포함한 수동 E2E 절차(선택).

## 자동 E2E (API 레벨) — 완료
`integration-test-instructions.md`의 자동 스크립트가 아래 흐름을 커버:
1. **주문 생성 흐름**: 테이블 로그인 → 메뉴 조회 → 주문 → `order_created` SSE(≤2s) → 관리자 대시보드 반영
2. **상태 변경 흐름**: 관리자 상태 변경 → `order_status_changed`
3. **주문 삭제 흐름**: 관리자 삭제 → 총액 재계산 → `order_deleted`
4. **이용 완료 흐름**: 세션 종료 → 이력 이동 → `table_session_closed` → 카드 리셋

## 수동 E2E (UI 포함) — 선택

### Setup
```bash
# 터미널 1: backend
cd backend && source .venv/bin/activate
rm -f table_order.db
SECRET_KEY=dev-secret-key-please-change uvicorn app.main:app --reload --port 8000

# 터미널 2: frontend (Vite proxy /api → :8000)
cd frontend && npm run dev
# 브라우저: 고객 http://localhost:5173/  ·  관리자 http://localhost:5173/admin
```

### 시나리오 (스토리 커버리지)
| 화면 | 절차 | 기대 | 스토리 |
|------|------|------|--------|
| 고객 | 테이블 로그인(store1 / 테이블번호 / table1234) | 메뉴 화면 진입 | US-C1 |
| 고객 | 카테고리·메뉴 탐색 | 메뉴 목록/가격(원) 표시 | US-C2 |
| 고객 | 장바구니 담기/수량 조절 | 합계 실시간 반영 | US-C3 |
| 고객 | 주문하기 | 성공 표시 → 장바구니 비움 → 메뉴로 이동 | US-C4 |
| 고객 | 내 주문 확인 | 현재 세션 주문/상태 배지 표시 | US-C5 |
| 관리자 | 로그인(store1/admin1/admin1234) | 대시보드 진입 | US-A1 |
| 관리자 | 대시보드 | 테이블 카드 그리드, 신규 주문 실시간 강조 | US-A2 |
| 관리자 | 주문 상태 변경 | 배지 갱신(고객/관리자 동기) | US-A3 |
| 관리자 | 주문 삭제 | 카드 총액 재계산 | US-A4 |
| 관리자 | 이용 완료 | 카드 리셋(총액 0), 이력 이동 | US-A5 |
| 관리자 | 이력 조회 | 세션 이력 목록 | US-A6 |
| 관리자 | 메뉴/테이블 관리 | CRUD/reorder 반영 | US-A7 |

### 실시간 동기화 확인
고객 창과 관리자 창을 동시에 열고, 고객이 주문하면 관리자 대시보드가 **새로고침 없이 2초 이내** 갱신되는지 확인.

## 결과
- **API 레벨 E2E**: 자동 검증 30/30 통과 ✅
- **UI E2E**: 수동 절차 제공(자동화된 브라우저 E2E는 MVP 범위 밖 — `data-testid` 부여로 향후 도입 용이)
