"""FastAPI 애플리케이션 진입점 (C6, app wiring).

startup 시 스키마 초기화 + 데모 데이터 시딩. 전 라우터 등록. 자동 OpenAPI(/docs).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import (
    admin_dashboard,
    admin_menus,
    admin_orders,
    admin_tables,
    auth,
    menus,
    orders,
)
from app.seed import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_demo_data()
    yield


app = FastAPI(title="Table Order Service API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 (각 라우터가 /api prefix 보유)
app.include_router(auth.router)
app.include_router(menus.router)
app.include_router(orders.router)
app.include_router(admin_orders.router)
app.include_router(admin_dashboard.router)
app.include_router(admin_tables.router)
app.include_router(admin_menus.router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
