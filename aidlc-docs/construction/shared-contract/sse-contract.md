# SSE Contract (실시간 이벤트 계약 — 확정)

**엔드포인트**: `GET /api/admin/stream` (admin 토큰 필요)
**형식**: `text/event-stream`. 각 이벤트는 SSE 프레임으로 전송:
```
event: <event_type>
data: <JSON payload>

```
**전송 지연 목표**: 신규 주문 발생 후 2초 이내 대시보드 반영(NFR-1).
**구현**: 백엔드 인메모리 pub/sub. 관리자 연결마다 asyncio.Queue 구독. 이벤트 발생 시 전 구독자에게 브로드캐스트.

> payload의 필드/타입은 domain-entities.md·api-contract.md와 정합. 금액=정수(원), 시각=ISO8601, 상태=`pending|preparing|completed`.

---

## 이벤트 타입 및 payload

### event: `order_created`
신규 주문 생성 시.
```json
{
  "table_id": 3,
  "table_number": "3",
  "session_id": 12,
  "order_id": 45,
  "order_number": "T3-0007",
  "status": "pending",
  "total_amount": 23000,
  "created_at": "2026-09-07T00:00:00Z",
  "table_total": 51000,
  "items_summary": "김치찌개 x2 외 1건"
}
```
- `table_total`: 이벤트 후 재계산된 테이블 현재 세션 총액(대시보드 카드 갱신용)
- 프론트: 해당 table 카드 갱신 + 신규 강조(색상/애니메이션)

### event: `order_status_changed`
주문 상태 변경 시.
```json
{
  "table_id": 3,
  "order_id": 45,
  "order_number": "T3-0007",
  "status": "preparing"
}
```
- 프론트: 해당 주문 상태 배지 갱신(관리자·고객 화면)

### event: `order_deleted`
관리자 주문 삭제 시.
```json
{
  "table_id": 3,
  "order_id": 45,
  "table_total": 28000
}
```
- 프론트: 해당 주문 제거 + 카드 총액 갱신

### event: `table_session_closed`
이용 완료(세션 종료) 시.
```json
{
  "table_id": 3
}
```
- 프론트: 해당 table 카드를 빈 상태(총액 0, 주문 없음)로 리셋

---

## 연결/재연결 규약
- 초기 상태는 `GET /api/admin/dashboard`로 로드한 뒤 stream 구독(초기 스냅샷 + 이후 증분).
- 연결 유지: 서버는 주기적 keep-alive 코멘트(`: ping`)를 보낼 수 있음(프론트는 무시).
- 재연결: 연결 끊기면 프론트가 stream 재구독 + dashboard 재조회로 상태 재동기화(이벤트 유실 대비). 이벤트 재전송(Last-Event-ID) 보장은 MVP 범위 외.

## 검증
- 4개 이벤트가 US-A2(모니터링)/A3(상태)/A4(삭제)/A5(세션종료)를 각각 커버. ✅
- 각 payload에 table_id 포함 → 프론트가 카드 단위로 정확히 갱신 가능. ✅
