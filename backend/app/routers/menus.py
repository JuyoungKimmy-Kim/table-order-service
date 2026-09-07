"""메뉴/카테고리 조회 라우터 (C2 조회, US-C2). table/admin 공용."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_store_id
from app.models import Category, Menu
from app.schemas import CategoryOut, MenuOut

router = APIRouter(prefix="/api/menus", tags=["menus"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(
    store_id: int = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Category)
        .where(Category.store_id == store_id)
        .order_by(Category.display_order.asc(), Category.id.asc())
    ).all()
    return rows


@router.get("", response_model=list[MenuOut])
def list_menus(
    category_id: int | None = None,
    store_id: int = Depends(get_current_store_id),
    db: Session = Depends(get_db),
):
    stmt = select(Menu).where(Menu.store_id == store_id, Menu.is_deleted.is_(False))
    if category_id is not None:
        stmt = stmt.where(Menu.category_id == category_id)
    stmt = stmt.order_by(Menu.category_id.asc(), Menu.display_order.asc(), Menu.id.asc())
    return db.scalars(stmt).all()
