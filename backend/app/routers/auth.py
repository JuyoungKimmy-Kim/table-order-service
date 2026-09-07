"""인증 라우터 (C1 AuthComponent, US-A1 / US-C1)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AdminUser, Store, Table, utcnow
from app.schemas import (
    AdminLoginRequest,
    AdminLoginResponse,
    TableLoginRequest,
    TableLoginResponse,
)
from app.security import create_access_token, verify_password

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLoginRequest, db: Session = Depends(get_db)):
    store = db.scalar(select(Store).where(Store.store_code == body.store_code))
    admin = None
    if store is not None:
        admin = db.scalar(
            select(AdminUser).where(
                AdminUser.store_id == store.id, AdminUser.username == body.username
            )
        )

    if admin is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="자격 증명이 올바르지 않습니다.")

    # BR-1.3: 잠금 상태 확인
    now = utcnow()
    locked_until = admin.locked_until
    if locked_until is not None and locked_until.tzinfo is None:
        from datetime import timezone

        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if locked_until is not None and locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="로그인 시도가 제한되었습니다. 잠시 후 다시 시도하세요.",
        )

    # 비밀번호 검증
    if not verify_password(body.password, admin.password_hash):
        admin.failed_attempts += 1
        if admin.failed_attempts >= settings.max_login_attempts:
            admin.locked_until = now + timedelta(minutes=settings.lock_minutes)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="자격 증명이 올바르지 않습니다.")

    # 성공 → 실패 카운트/잠금 리셋 (BR-1.3)
    admin.failed_attempts = 0
    admin.locked_until = None
    db.commit()

    token = create_access_token(
        subject=admin.id,
        token_type="admin",
        expires_seconds=settings.admin_token_expire_seconds,
        store_id=admin.store_id,
    )
    return AdminLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.admin_token_expire_seconds,
    )


@router.post("/table/login", response_model=TableLoginResponse)
def table_login(body: TableLoginRequest, db: Session = Depends(get_db)):
    store = db.scalar(select(Store).where(Store.store_code == body.store_code))
    table = None
    if store is not None:
        table = db.scalar(
            select(Table).where(
                Table.store_id == store.id, Table.table_number == body.table_number
            )
        )

    if table is None or not verify_password(body.table_password, table.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="테이블 자격 증명이 올바르지 않습니다.")

    token = create_access_token(
        subject=table.id,
        token_type="table",
        expires_seconds=settings.table_token_expire_seconds,
        store_id=table.store_id,
    )
    return TableLoginResponse(
        table_token=token,
        table_id=table.id,
        table_number=table.table_number,
        store_name=store.name,
    )
