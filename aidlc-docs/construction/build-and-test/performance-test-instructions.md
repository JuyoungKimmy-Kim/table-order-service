# Performance Test Instructions

## Purpose
본 시스템은 **로컬 MVP/데모** 목적(단일 프로세스 FastAPI + SQLite + 인메모리 SSE pub/sub)이며, 계약상 유일한 정량 성능 목표는 **SSE 실시간 지연: 신규 주문 후 2초 이내**이다. 대규모 부하/스트레스 테스트는 배포 범위 밖(향후 Operations)이므로 여기서는 계약 지연 목표만 검증한다.

## Performance Requirements (계약 근거)
- **SSE 지연**: `order_created` 이벤트가 주문 생성 후 **≤ 2초** 관리자에게 도달 (integration-contract §4)
- 그 외 처리량/동시 사용자/응답시간 목표는 MVP 미정의 (N/A)

## 검증 방법
통합 검증 스크립트(`backend/tests/integration_e2e.py`)가 SSE 리스너 스레드로 `order_created` 수신 시각을 측정한다.

```bash
cd backend && source .venv/bin/activate
rm -f table_order.db
SECRET_KEY=test-e2e-secret-key-1234567890 uvicorn app.main:app --port 8000 &
sleep 4
python tests/integration_e2e.py | grep "SSE order_created"
```

## 결과 (최근 실행)
- **SSE order_created 수신 지연**: **~0.02초** (목표 ≤ 2초) ✅ — 목표 대비 큰 여유
- 로컬 단일 클라이언트 기준. 다중 관리자 동시 구독/고부하 시나리오는 미측정(MVP 범위 밖)

## Optimization
현 지연은 목표를 크게 하회하므로 최적화 불필요. 프로덕션 확장 시(다중 프로세스) 인메모리 pub/sub → 외부 브로커(Redis 등) 전환이 향후 과제.
