"""테스트 공통 fixture — 격리된 임시 SQLite DB, TestClient, 토큰.

의존성 오버라이드(get_db) + engine/SessionLocal 재바인딩으로 테스트 간 완전 격리.
"""
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture()
def client():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    from app import database, seed
    from app.config import settings

    db_url = f"sqlite:///{path}"
    settings.database_url = db_url
    test_engine = create_engine(db_url, connect_args={"check_same_thread": False})
    TestSession = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    # 모듈 전역 재바인딩 (init_db / seed / helpers 등이 참조)
    database.engine = test_engine
    database.SessionLocal = TestSession

    from app.database import Base
    from app import models  # noqa: F401  (메타데이터 등록)

    Base.metadata.create_all(bind=test_engine)
    seed.seed_demo_data()

    from app.database import get_db
    from app.main import app

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # lifespan(init_db+seed)은 이미 위에서 처리했으므로 raw TestClient 사용(startup 재실행해도 멱등)
    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
    test_engine.dispose()
    os.remove(path)


@pytest.fixture()
def admin_token(client):
    resp = client.post(
        "/api/admin/login",
        json={"store_code": "store1", "username": "admin1", "password": "admin1234"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def table_login(client):
    resp = client.post(
        "/api/table/login",
        json={"store_code": "store1", "table_number": "1", "table_password": "table1234"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture()
def table_headers(table_login):
    return {"Authorization": f"Bearer {table_login['table_token']}"}
