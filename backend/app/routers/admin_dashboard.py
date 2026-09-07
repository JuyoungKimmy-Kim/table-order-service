"""관리자 대시보드 + SSE 스트림 라우터 (C4/C5, US-A2)."""
import asyncio
import json

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.config import settings
from app.database import get_db
from app.deps import get_current_admin
from app.helpers import as_utc, build_items_summary, get_active_session
from app.models import AdminUser, Order, Table
from app.realtime import broker
from app.schemas import DashboardRecentOrder, TableSummaryOut

router = APIRouter(prefix="/api/admin", tags=["admin-dashboard"])

# keep-alive ping 간격(초)
_PING_INTERVAL = 15


@router.get("/dashboard", response_model=list[TableSummaryOut])
def dashboard_summary(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tables = db.scalars(
        select(Table).where(Table.store_id == admin.store_id).order_by(Table.id.asc())
    ).all()

    summaries: list[TableSummaryOut] = []
    for table in tables:
        session = get_active_session(db, table.id)
        if session is None:
            summaries.append(
                TableSummaryOut(
                    table_id=table.id,
                    table_number=table.table_number,
                    session_id=None,
                    table_total=0,
                    order_count=0,
                    recent_orders=[],
                )
            )
            continue

        orders = db.scalars(
            select(Order)
            .where(Order.session_id == session.id)
            .order_by(Order.created_at.desc())
        ).all()
        table_total = sum(o.total_amount for o in orders)
        recent = orders[: settings.dashboard_recent_orders]
        summaries.append(
            TableSummaryOut(
                table_id=table.id,
                table_number=table.table_number,
                session_id=session.id,
                table_total=table_total,
                order_count=len(orders),
                recent_orders=[
                    DashboardRecentOrder(
                        order_number=o.order_number,
                        created_at=o.created_at,
                        status=o.status,
                        total_amount=o.total_amount,
                        items_summary=build_items_summary(o.items),
                    )
                    for o in recent
                ],
            )
        )
    return summaries


@router.get("/stream")
async def stream(admin: AdminUser = Depends(get_current_admin)):
    """SSE 스트림. 관리자 연결마다 구독 큐 등록 → 이벤트 브로드캐스트 (sse-contract.md)."""
    queue = broker.subscribe()

    async def event_generator():
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=_PING_INTERVAL)
                    yield {
                        "event": message["event"],
                        "data": json.dumps(message["data"], ensure_ascii=False),
                    }
                except asyncio.TimeoutError:
                    # keep-alive: 클라이언트가 무시하는 ping 코멘트
                    yield {"comment": "ping"}
        finally:
            broker.unsubscribe(queue)

    return EventSourceResponse(event_generator())
