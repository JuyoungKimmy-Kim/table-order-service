"""인증 의존성 (C1 AuthComponent) — get_current_admin / get_current_table.

BR-1.1/1.4: 토큰 만료·무효 시 401 (프론트는 재로그인/초기설정 화면으로 이동).
"""
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AdminUser, Table
from app.security import decode_token

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="인증이 필요하거나 토큰이 만료되었습니다.",
    headers={"WWW-Authenticate": "Bearer"},
)


def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _UNAUTHORIZED
    return authorization.split(" ", 1)[1].strip()


def get_current_admin(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AdminUser:
    token = _extract_bearer(authorization)
    payload = decode_token(token)
    if not payload or payload.get("type") != "admin":
        raise _UNAUTHORIZED
    admin = db.get(AdminUser, int(payload["sub"]))
    if admin is None:
        raise _UNAUTHORIZED
    return admin


def get_current_table(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> Table:
    token = _extract_bearer(authorization)
    payload = decode_token(token)
    if not payload or payload.get("type") != "table":
        raise _UNAUTHORIZED
    table = db.get(Table, int(payload["sub"]))
    if table is None:
        raise _UNAUTHORIZED
    return table


def get_current_store_id(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> int:
    """메뉴 조회처럼 table/admin 토큰 모두 허용하는 엔드포인트용 → store_id 반환."""
    token = _extract_bearer(authorization)
    payload = decode_token(token)
    if not payload:
        raise _UNAUTHORIZED
    token_type = payload.get("type")
    if token_type == "admin":
        admin = db.get(AdminUser, int(payload["sub"]))
        if admin is None:
            raise _UNAUTHORIZED
        return admin.store_id
    if token_type == "table":
        table = db.get(Table, int(payload["sub"]))
        if table is None:
            raise _UNAUTHORIZED
        return table.store_id
    raise _UNAUTHORIZED
