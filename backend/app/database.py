"""데이터베이스 연결/세션 (C6 PersistenceComponent).

SQLAlchemy 2.x + SQLite. 단일 프로세스 인메모리 SSE와 함께 동작.
"""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# SQLite는 기본적으로 스레드 간 커넥션 공유를 막으므로 check_same_thread=False 지정.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """요청 스코프 DB 세션 의존성."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """스키마 초기화(테이블 생성). models 임포트로 메타데이터 등록 후 create_all."""
    from app import models  # noqa: F401  (메타데이터 등록용)

    Base.metadata.create_all(bind=engine)
