"""관리자 테이블 설정 라우터 (C4, US-A7 / 운영 흐름)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_admin
from app.models import AdminUser, Table
from app.schemas import TableSetupOut, TableSetupRequest
from app.security import hash_password

router = APIRouter(prefix="/api/admin/tables", tags=["admin-tables"])


@router.post("", response_model=TableSetupOut, status_code=status.HTTP_201_CREATED)
def setup_table(
    body: TableSetupRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    # (store_id, table_number) unique → 중복 409
    exists = db.scalar(
        select(Table).where(
            Table.store_id == admin.store_id, Table.table_number == body.table_number
        )
    )
    if exists is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 테이블 번호입니다.")

    table = Table(
        store_id=admin.store_id,
        table_number=body.table_number,
        password_hash=hash_password(body.table_password),
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return TableSetupOut(id=table.id, table_number=table.table_number)


@router.get("", response_model=list[TableSetupOut])
def list_tables(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = db.scalars(
        select(Table).where(Table.store_id == admin.store_id).order_by(Table.id.asc())
    ).all()
    return [TableSetupOut(id=t.id, table_number=t.table_number) for t in rows]
