"""데모 데이터 시딩 (C6 seed_demo_data, Q8=A).

store1 / admin1 / 카테고리 4개 / 메뉴 12개 / 테이블 5개. 멱등(이미 있으면 skip).
데모 로그인:
  - 관리자: store_code="store1", username="admin1", password="admin1234"
  - 테이블: store_code="store1", table_number="1"~"5", table_password="table1234"
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import database
from app.models import AdminUser, Category, Menu, Store, Table
from app.security import hash_password

DEMO_STORE_CODE = "store1"
DEMO_ADMIN_USERNAME = "admin1"
DEMO_ADMIN_PASSWORD = "admin1234"
DEMO_TABLE_PASSWORD = "table1234"

_CATEGORIES = [
    ("식사", 1),
    ("사이드", 2),
    ("음료", 3),
    ("주류", 4),
]

# (category_index, name, price, description)
_MENUS = [
    (0, "김치찌개", 8000, "돼지고기와 묵은지로 끓인 얼큰한 찌개"),
    (0, "된장찌개", 8000, "구수한 재래식 된장찌개"),
    (0, "제육덮밥", 9000, "매콤한 제육볶음 덮밥"),
    (0, "비빔밥", 9500, "제철 나물 비빔밥"),
    (1, "계란말이", 6000, "폭신한 계란말이"),
    (1, "감자튀김", 5000, "바삭한 감자튀김"),
    (1, "김치전", 7000, "바삭한 김치전"),
    (2, "콜라", 2000, "시원한 콜라"),
    (2, "사이다", 2000, "청량한 사이다"),
    (2, "아메리카노", 3000, "따뜻한 아메리카노"),
    (3, "생맥주 500", 4500, "시원한 생맥주 500cc"),
    (3, "소주", 4000, "국민 소주"),
]

_TABLE_NUMBERS = ["1", "2", "3", "4", "5"]


def seed_demo_data() -> None:
    """멱등 시딩. store1이 이미 있으면 아무 것도 하지 않는다."""
    db: Session = database.SessionLocal()
    try:
        existing = db.scalar(select(Store).where(Store.store_code == DEMO_STORE_CODE))
        if existing is not None:
            return

        store = Store(store_code=DEMO_STORE_CODE, name="데모 식당")
        db.add(store)
        db.flush()

        db.add(
            AdminUser(
                store_id=store.id,
                username=DEMO_ADMIN_USERNAME,
                password_hash=hash_password(DEMO_ADMIN_PASSWORD),
            )
        )

        categories: list[Category] = []
        for name, order in _CATEGORIES:
            cat = Category(store_id=store.id, name=name, display_order=order)
            db.add(cat)
            categories.append(cat)
        db.flush()

        for i, (cat_idx, name, price, desc) in enumerate(_MENUS, start=1):
            db.add(
                Menu(
                    store_id=store.id,
                    category_id=categories[cat_idx].id,
                    name=name,
                    price=price,
                    description=desc,
                    image_url=None,
                    display_order=i,
                    is_deleted=False,
                )
            )

        for number in _TABLE_NUMBERS:
            db.add(
                Table(
                    store_id=store.id,
                    table_number=number,
                    password_hash=hash_password(DEMO_TABLE_PASSWORD),
                )
            )

        db.commit()
    finally:
        db.close()
