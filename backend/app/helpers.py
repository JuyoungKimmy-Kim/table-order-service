"""재사용 헬퍼 (C3 헬퍼 메서드, business-rules.md).

단순형 구조: 라우터에서 직접 호출하는 공통 로직.
"""
import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order, OrderHistory, OrderItem, Table, TableSession, utcnow


def get_active_session(db: Session, table_id: int) -> TableSession | None:
    """테이블의 현재 active 세션(없으면 None)."""
    return db.scalars(
        select(TableSession)
        .where(TableSession.table_id == table_id, TableSession.status == "active")
        .order_by(TableSession.id.desc())
    ).first()


def ensure_active_session(db: Session, table: Table) -> TableSession:
    """active 세션 확보. 없으면 새로 시작 (BR-5.1: 테이블당 active 최대 1)."""
    session = get_active_session(db, table.id)
    if session is None:
        session = TableSession(
            table_id=table.id,
            store_id=table.store_id,
            status="active",
            started_at=utcnow(),
        )
        db.add(session)
        db.flush()  # session.id 확보
    return session


def generate_order_number(db: Session, table: Table) -> str:
    """주문번호 생성 `T{table_number}-{seq:04d}` (BR-2).

    seq는 테이블 기준 단조 증가(세션 경계 무관). 기존 Order + OrderHistory 개수 합 + 1.
    """
    active_count = db.scalar(
        select(func.count()).select_from(Order).where(Order.table_id == table.id)
    ) or 0
    history_count = db.scalar(
        select(func.count()).select_from(OrderHistory).where(OrderHistory.table_id == table.id)
    ) or 0
    seq = active_count + history_count + 1
    return f"T{table.table_number}-{seq:04d}"


def calc_table_total(db: Session, table_id: int) -> int:
    """테이블 현재 active 세션 총액 (BR-4.2). active 세션 없으면 0."""
    session = get_active_session(db, table_id)
    if session is None:
        return 0
    total = db.scalar(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(
            Order.session_id == session.id
        )
    )
    return int(total or 0)


def build_items_summary(items: list[OrderItem], max_shown: int = 1) -> str:
    """주문 항목 축약 문자열 (예: "김치찌개 x2 외 1건"). 대시보드/SSE용."""
    if not items:
        return ""
    first = items[0]
    head = f"{first.menu_name} x{first.quantity}"
    remaining = len(items) - 1
    if remaining > 0:
        return f"{head} 외 {remaining}건"
    return head


def move_session_to_history(db: Session, session: TableSession) -> int:
    """세션의 Order/OrderItem을 OrderHistory로 이동 (BR-5.3, 트랜잭션은 호출자 책임).

    반환: 이동한 주문 수(moved_count).
    """
    closed_at = utcnow()
    orders = db.scalars(select(Order).where(Order.session_id == session.id)).all()
    moved = 0
    for order in orders:
        items_snapshot = [
            {"menu_name": it.menu_name, "unit_price": it.unit_price, "quantity": it.quantity}
            for it in order.items
        ]
        ordered_at = order.created_at
        if ordered_at is not None and ordered_at.tzinfo is None:
            ordered_at = ordered_at.replace(tzinfo=timezone.utc)
        history = OrderHistory(
            store_id=order.store_id,
            table_id=order.table_id,
            session_id=session.id,
            order_number=order.order_number,
            status=order.status,
            total_amount=order.total_amount,
            ordered_at=ordered_at or closed_at,
            items_json=json.dumps(items_snapshot, ensure_ascii=False),
            session_closed_at=closed_at,
        )
        db.add(history)
        db.delete(order)  # OrderItem은 cascade 삭제
        moved += 1

    session.status = "closed"
    session.closed_at = closed_at
    return moved


def parse_history_items(items_json: str) -> list[dict]:
    """OrderHistory.items_json 역직렬화 → [{menu_name, unit_price, quantity}]."""
    try:
        return json.loads(items_json)
    except (json.JSONDecodeError, TypeError):
        return []


def as_utc(dt: datetime | None) -> datetime | None:
    """naive datetime을 UTC로 보정(SQLite는 tz 정보를 잃을 수 있음)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt
