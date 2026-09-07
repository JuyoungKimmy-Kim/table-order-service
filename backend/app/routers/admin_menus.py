"""관리자 메뉴 관리 라우터 (C2 관리, US-A7)."""
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminUser, Category, Menu
from app.schemas import MenuCreate, MenuOut, MenuReorderItem, MenuUpdate

router = APIRouter(prefix="/api/admin/menus", tags=["admin-menus"])


def _validate_menu_fields(db: Session, admin: AdminUser, category_id: int, name: str, price: int):
    """BR-6.1: name 필수, price 정수 ≥ 0, category_id 유효."""
    if not name or not name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="메뉴명은 필수입니다.")
    if price < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="가격은 0 이상의 정수여야 합니다.")
    category = db.scalar(
        select(Category).where(Category.id == category_id, Category.store_id == admin.store_id)
    )
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 카테고리입니다.")


def _get_menu(db: Session, admin: AdminUser, menu_id: int) -> Menu:
    menu = db.scalar(
        select(Menu).where(
            Menu.id == menu_id, Menu.store_id == admin.store_id, Menu.is_deleted.is_(False)
        )
    )
    if menu is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="메뉴를 찾을 수 없습니다.")
    return menu


@router.post("", response_model=MenuOut, status_code=status.HTTP_201_CREATED)
def create_menu(
    body: MenuCreate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _validate_menu_fields(db, admin, body.category_id, body.name, body.price)

    # display_order 미지정 시 말미 배치 (BR-6.3)
    order = body.display_order
    if order is None:
        max_order = db.scalar(
            select(func.coalesce(func.max(Menu.display_order), 0)).where(
                Menu.store_id == admin.store_id
            )
        )
        order = int(max_order or 0) + 1

    menu = Menu(
        store_id=admin.store_id,
        category_id=body.category_id,
        name=body.name.strip(),
        price=body.price,
        description=body.description,
        image_url=body.image_url,
        display_order=order,
        is_deleted=False,
    )
    db.add(menu)
    db.commit()
    db.refresh(menu)
    return menu


@router.put("/{menu_id}", response_model=MenuOut)
def update_menu(
    menu_id: int,
    body: MenuUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    menu = _get_menu(db, admin, menu_id)
    _validate_menu_fields(db, admin, body.category_id, body.name, body.price)

    menu.category_id = body.category_id
    menu.name = body.name.strip()
    menu.price = body.price
    menu.description = body.description
    menu.image_url = body.image_url
    if body.display_order is not None:
        menu.display_order = body.display_order
    db.commit()
    db.refresh(menu)
    return menu


@router.delete("/{menu_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu(
    menu_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    menu = _get_menu(db, admin, menu_id)
    # BR-6.2: soft-delete (기존 OrderItem/History 스냅샷 보존)
    menu.is_deleted = True
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/reorder", response_model=list[MenuOut])
def reorder_menus(
    body: list[MenuReorderItem],
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    updated_ids: list[int] = []
    for item in body:
        menu = db.scalar(
            select(Menu).where(
                Menu.id == item.menu_id,
                Menu.store_id == admin.store_id,
                Menu.is_deleted.is_(False),
            )
        )
        if menu is not None:
            menu.display_order = item.display_order
            updated_ids.append(menu.id)
    db.commit()

    if not updated_ids:
        return []
    rows = db.scalars(
        select(Menu)
        .where(Menu.id.in_(updated_ids))
        .order_by(Menu.display_order.asc(), Menu.id.asc())
    ).all()
    return rows
