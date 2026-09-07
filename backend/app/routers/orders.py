"""주문 라우터 — 고객 (C3, US-C4 / US-C5)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_table
from app.helpers import (
    as_utc,
    build_items_summary,
    calc_table_total,
    ensure_active_session,
    generate_order_number,
    get_active_session,
)
from app.models import Menu, Order, OrderItem, Table
from app.realtime import EVENT_ORDER_CREATED, broker
from app.schemas import OrderCreate, OrderCreatedOut, OrderItemOut, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderCreatedOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: OrderCreate,
    table: Table = Depends(get_current_table),
    db: Session = Depends(get_db),
):
    # BR-7.1: 빈 items → 400
    if not body.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="주문 항목이 비어 있습니다.")

    # 항목 검증 + 스냅샷 구성
    order_items: list[OrderItem] = []
    total = 0
    for line in body.items:
        if line.quantity < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="수량은 1 이상이어야 합니다.")
        menu = db.scalar(
            select(Menu).where(
                Menu.id == line.menu_id,
                Menu.store_id == table.store_id,
                Menu.is_deleted.is_(False),
            )
        )
        if menu is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"존재하지 않는 메뉴입니다: menu_id={line.menu_id}",
            )
        order_items.append(
            OrderItem(
                menu_id=menu.id,
                menu_name=menu.name,
                unit_price=menu.price,
                quantity=line.quantity,
            )
        )
        total += menu.price * line.quantity

    # 세션 확보 (BR-5.1) + 주문번호 (BR-2)
    session = ensure_active_session(db, table)
    order_number = generate_order_number(db, table)

    order = Order(
        store_id=table.store_id,
        table_id=table.id,
        session_id=session.id,
        order_number=order_number,
        status="pending",
        total_amount=total,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # SSE order_created 발행 (BR-7.2)
    table_total = calc_table_total(db, table.id)
    broker.publish(
        EVENT_ORDER_CREATED,
        {
            "table_id": table.id,
            "table_number": table.table_number,
            "session_id": session.id,
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "total_amount": order.total_amount,
            "created_at": as_utc(order.created_at).isoformat(),
            "table_total": table_total,
            "items_summary": build_items_summary(order.items),
        },
    )

    return OrderCreatedOut(
        order_id=order.id,
        order_number=order.order_number,
        status=order.status,
        total_amount=order.total_amount,
        created_at=order.created_at,
        session_id=session.id,
        items=[
            OrderItemOut(menu_name=it.menu_name, unit_price=it.unit_price, quantity=it.quantity)
            for it in order.items
        ],
    )


@router.get("/current", response_model=list[OrderOut])
def list_current_session_orders(
    table: Table = Depends(get_current_table),
    db: Session = Depends(get_db),
):
    # BR-5.2: active 세션 주문만
    session = get_active_session(db, table.id)
    if session is None:
        return []
    orders = db.scalars(
        select(Order).where(Order.session_id == session.id).order_by(Order.created_at.asc())
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
