"""데모 데이터 시딩 (C6 seed_demo_data, Q8=A).

store1 / admin1 / 카테고리 3개 / 메뉴 12개(Wikimedia Commons 실제 음식 사진) / 테이블 10개.
멱등(이미 있으면 skip).

이미지는 임의 검색이 아니라 각 메뉴에 맞는 Wikimedia Commons 파일을 직접 지정한다
(파일명이 곧 내용이라 사진-설명 불일치가 없다). 모두 200/JPEG 응답 확인됨.

데모 로그인:
  - 관리자: store_code="store1", username="admin1", password="admin1234"
  - 테이블: store_code="store1", table_number="1"~"10", table_password="table1234"
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
    ("찌개·탕", 2),
    ("사이드·안주", 3),
]


def _img(commons_file: str) -> str:
    """Wikimedia Commons 파일명 → 가로 400px 이미지 URL.

    Special:FilePath가 실제 이미지로 리다이렉트한다. 파일명이 곧 사진 내용이라
    설명과 어긋나지 않는다. 아래 _MENUS의 모든 파일은 200/JPEG 응답을 확인함.
    로드 실패 시 프론트가 자동으로 숨김 처리(MenuCard onError).
    """
    from urllib.parse import quote

    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(commons_file)}?width=400"


# (category_index, name, price, description, commons_image_file)
_MENUS = [
    # 0: 식사
    (0, "비빔밥", 9500, "제철 나물 가득 비빔밥", "Korean.food-Bibimbap-02.jpg"),
    (0, "제육덮밥", 9000, "매콤한 제육볶음 덮밥", "Jeyuk-bokkeum 1.jpg"),
    (0, "불고기정식", 12000, "달큰한 소불고기 한상", "Bulgogi 3.jpg"),
    (0, "물냉면", 9000, "시원한 육수의 물냉면", "Mul-naengmyeon 3.jpg"),
    # 1: 찌개·탕
    (1, "김치찌개", 8000, "돼지고기와 묵은지로 끓인 얼큰한 찌개", "Korean.cuisine-Kimchi jjigae-01.jpg"),
    (1, "순두부찌개", 8500, "얼큰한 해물 순두부찌개", "Korean stew-Sundubu jjigae-05.jpg"),
    (1, "부대찌개", 11000, "푸짐한 소시지 부대찌개", "Korean stew-Budae jjigae-01.jpg"),
    (1, "갈비탕", 12000, "진한 사골 갈비탕", "Korean soup-Galbitang-01.jpg"),
    # 2: 사이드·안주
    (2, "계란말이", 6000, "폭신한 계란말이", "Gyeran-mari 1.jpg"),
    (2, "김치전", 7000, "바삭한 김치전", "Korean pancake-kimchijeon-01.jpg"),
    (2, "후라이드치킨", 18000, "바삭한 후라이드 치킨", "Korean fried chicken 240206.jpg"),
    (2, "막걸리", 5000, "부드러운 생막걸리", "Korean rice wine Makgeori01.jpg"),
]

_TABLE_NUMBERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]


def seed_demo_data() -> None:
    """멱등 시딩. store1이 이미 있으면 아무 것도 하지 않는다."""
    db: Session = database.SessionLocal()
    try:
        existing = db.scalar(select(Store).where(Store.store_code == DEMO_STORE_CODE))
        if existing is not None:
            return

        store = Store(store_code=DEMO_STORE_CODE, name="아리랑 주막")
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

        for i, (cat_idx, name, price, desc, commons_file) in enumerate(_MENUS, start=1):
            db.add(
                Menu(
                    store_id=store.id,
                    category_id=categories[cat_idx].id,
                    name=name,
                    price=price,
                    description=desc,
                    image_url=_img(commons_file),
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
