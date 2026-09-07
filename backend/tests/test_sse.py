"""SSE 이벤트 발행 테스트 (US-A2). 브로커 직접 구독으로 발행 여부 검증."""
import asyncio

import pytest

from app.realtime import EVENT_ORDER_CREATED, broker


def _menu_ids(client, headers):
    return [m["id"] for m in client.get("/api/menus", headers=headers).json()]


def test_order_created_event_published(client, table_headers):
    # 브로커에 직접 구독 큐 등록 후 주문 생성 → 이벤트 수신 확인
    queue = broker.subscribe()
    try:
        ids = _menu_ids(client, table_headers)
        resp = client.post(
            "/api/orders",
            headers=table_headers,
            json={"items": [{"menu_id": ids[0], "quantity": 2}]},
        )
        assert resp.status_code == 201

        message = asyncio.run(asyncio.wait_for(queue.get(), timeout=2.0))
        assert message["event"] == EVENT_ORDER_CREATED
        data = message["data"]
        assert data["order_number"].startswith("T1-")
        assert data["table_total"] >= data["total_amount"]
        assert "items_summary" in data
    finally:
        broker.unsubscribe(queue)


def test_broker_subscribe_unsubscribe():
    q = broker.subscribe()
    assert broker.subscriber_count >= 1
    broker.unsubscribe(q)
