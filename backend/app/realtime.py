"""인메모리 SSE pub/sub broker (C5 RealtimeComponent, sse-contract.md).

단일 프로세스 가정. 관리자 연결마다 asyncio.Queue를 구독하고, 이벤트 발생 시
전 구독자에게 브로드캐스트한다. 4개 이벤트 타입만 사용.
"""
import asyncio

# 이벤트 타입 상수 (sse-contract.md)
EVENT_ORDER_CREATED = "order_created"
EVENT_ORDER_STATUS_CHANGED = "order_status_changed"
EVENT_ORDER_DELETED = "order_deleted"
EVENT_TABLE_SESSION_CLOSED = "table_session_closed"


class Broker:
    """다중 구독자 브로드캐스트 브로커."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        self._subscribers.discard(q)

    def publish(self, event_type: str, payload: dict) -> None:
        """이벤트 발행. 라우터(동기 컨텍스트)에서 호출 가능하도록 put_nowait 사용."""
        message = {"event": event_type, "data": payload}
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:  # pragma: no cover - 무제한 큐라 사실상 발생 안 함
                pass

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)


# 애플리케이션 전역 단일 브로커
broker = Broker()
