"""관리자 주문/세션 관리 라우터 (C3, US-A3 / US-A4 / US-A5 / US-A6)."""
from datetime import date, datetime, time, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.helpers import (
    calc_table_total,
    get_active_session,
    move_session_to_history,
    parse_history_items,
)
from app.models import AdminUser, Order, OrderHistory
from app.realtime import (
    EVENT_ORDER_DELETED,
    EVENT_ORDER_STATUS_CHANGED,
    EVENT_TABLE_SESSION_CLOSED,
    broker,
)
from app.schemas import (
    OrderDeletedOut,
    OrderHistoryOut,
    OrderItemOut,
    OrderOut,
    OrderStatusOut,
    OrderStatusUpdate,
    TableCloseOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin-orders"])

# BR-3.2: 허용 전이 (인접 단계 양방향 + 동일 상태는 멱등)
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"preparing"},
    "preparing": {"pending", "completed"},
    "completed": {"preparing"},
}


def _get_admin_order(db: Session, admin: AdminUser, order_id: int) -> Order:
    order = db.scalar(
        select(Order).where(Order.id == order_id, Order.store_id == admin.store_id)
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")
    return order


@router.get("/tables/{table_id}/orders", response_model=list[OrderOut])
def list_table_orders(
    table_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    session = get_active_session(db, table_id)
    if session is None:
        return []
    orders = db.scalars(
        select(Order)
        .where(Order.session_id == session.id, Order.store_id == admin.store_id)
        .order_by(Order.created_at.asc())
    ).all()
    return [
        OrderOut(
            order_id=o.id,
            order_number=o.order_number,
            status=o.status,
            total_amount=o.total_amount,
            created_at=o.created_at,
            items=[
                OrderItemOut(menu_name=it.menu_name, unit_price=it.unit_price, quantity=it.quantity)
                for it in o.items
            ],
        )
        for o in orders
    ]


@router.patch("/orders/{order_id}/status", response_model=OrderStatusOut)
def update_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = _get_admin_order(db, admin, order_id)
    new_status = body.status

    # 동일 상태 → 멱등 (변경 없이 성공)
    if new_status != order.status:
        if new_status not in _ALLOWED_TRANSITIONS.get(order.status, set()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"허용되지 않는 상태 전이입니다: {order.status} → {new_status}",
            )
        order.status = new_status
        db.commit()

    broker.publish(
        EVENT_ORDER_STATUS_CHANGED,
        {
            "table_id": order.table_id,
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
        },
    )
    return OrderStatusOut(order_id=order.id, status=order.status)


@router.delete("/orders/{order_id}", response_model=OrderDeletedOut)
def delete_order(
    order_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = _get_admin_order(db, admin, order_id)
    table_id = order.table_id
    db.delete(order)
    db.commit()

    # BR-4.2: 총액 재계산
    table_total = calc_table_total(db, table_id)
    broker.publish(
        EVENT_ORDER_DELETED,
        {"table_id": table_id, "order_id": order_id, "table_total": table_total},
    )
    return OrderDeletedOut(order_id=order_id, table_id=table_id, table_total=table_total)


@router.post("/tables/{table_id}/close", response_model=TableCloseOut)
def close_table_session(
    table_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # BR-5.4: active 세션 없으면 400
    session = get_active_session(db, table_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="종료할 활성 세션이 없습니다."
        )

    # BR-5.3: 트랜잭션으로 이력 이동 + 세션 종료
    moved = move_session_to_history(db, session)
    db.commit()

    broker.publish(EVENT_TABLE_SESSION_CLOSED, {"table_id": table_id})
    return TableCloseOut(table_id=table_id, moved_count=moved)


@router.get("/tables/{table_id}/history", response_model=list[OrderHistoryOut])
def list_table_history(
    table_id: int,
    date_from: str | None = None,
    date_to: str | None = None,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    stmt = select(OrderHistory).where(
        OrderHistory.table_id == table_id, OrderHistory.store_id == admin.store_id
    )

    # 날짜 필터(YYYY-MM-DD, session_closed_at 기준)
    if date_from:
        start = datetime.combine(date.fromisoformat(date_from), time.min, tzinfo=timezone.utc)
        stmt = stmt.where(OrderHistory.session_closed_at >= start)
    if date_to:
        end = datetime.combine(date.fromisoformat(date_to), time.max, tzinfo=timezone.utc)
        stmt = stmt.where(OrderHistory.session_closed_at <= end)

    stmt = stmt.order_by(OrderHistory.session_closed_at.desc(), OrderHistory.id.desc())
    rows = db.scalars(stmt).all()
    return [
        OrderHistoryOut(
            history_id=h.id,
            session_id=h.session_id,
            order_number=h.order_number,
            status=h.status,
            total_amount=h.total_amount,
            ordered_at=h.ordered_at,
            session_closed_at=h.session_closed_at,
            items=[OrderItemOut(**it) for it in parse_history_items(h.items_json)],
        )
        for h in rows
    ]
