"""보안 유틸 — 비밀번호 해시(bcrypt) 및 JWT 생성/검증 (C1 AuthComponent 일부).

BR-1.1: 관리자 JWT 16시간. BR-1.2: 비밀번호 bcrypt 해시만 저장.
"""
from datetime import timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings
from app.models import utcnow

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str, token_type: str, expires_seconds: int, **claims) -> str:
    """JWT 생성.

    subject: 토큰 주체(admin=admin_user_id, table=table_id).
    token_type: "admin" | "table" (검증 시 용도 구분).
    """
    expire = utcnow() + timedelta(seconds=expires_seconds)
    payload = {"sub": str(subject), "type": token_type, "exp": expire, **claims}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict | None:
    """토큰 디코드. 만료/무효 시 None 반환 → 라우터/의존성에서 401 처리."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
