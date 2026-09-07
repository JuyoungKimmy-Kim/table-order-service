"""Pydantic 요청/응답 스키마 (api-contract.md / domain-entities.md 정확히 준수).

금액=int(원), 시각=datetime(ISO8601 직렬화), 상태=Literal 코드.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

OrderStatus = Literal["pending", "preparing", "completed"]


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class AdminLoginRequest(BaseModel):
    store_code: str
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TableLoginRequest(BaseModel):
    store_code: str
    table_number: str
    table_password: str


class TableLoginResponse(BaseModel):
    table_token: str
    table_id: int
    table_number: str
    store_name: str


# ---------------------------------------------------------------------------
# Menu / Category
# ---------------------------------------------------------------------------
class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    display_order: int


class MenuOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    name: str
    price: int
    description: str | None = None
    image_url: str | None = None
    display_order: int


class MenuCreate(BaseModel):
    category_id: int
    name: str
    price: int
    description: str | None = None
    image_url: str | None = None
    display_order: int | None = None


class MenuUpdate(BaseModel):
    category_id: int
    name: str
    price: int
    description: str | None = None
    image_url: str | None = None
    display_order: int | None = None


class MenuReorderItem(BaseModel):
    menu_id: int
    display_order: int


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
class OrderItemIn(BaseModel):
    menu_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: list[OrderItemIn] = Field(default_factory=list)


class OrderItemOut(BaseModel):
    menu_name: str
    unit_price: int
    quantity: int


class OrderOut(BaseModel):
    order_id: int
    order_number: str
    status: OrderStatus
    total_amount: int
    created_at: datetime
    items: list[OrderItemOut]


class OrderCreatedOut(OrderOut):
    """POST /api/orders 응답 — session_id 포함."""
    session_id: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderStatusOut(BaseModel):
    order_id: int
    status: OrderStatus


class OrderDeletedOut(BaseModel):
    order_id: int
    table_id: int
    table_total: int


class TableCloseOut(BaseModel):
    table_id: int
    moved_count: int


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class DashboardRecentOrder(BaseModel):
    order_number: str
    created_at: datetime
    status: OrderStatus
    total_amount: int
    items_summary: str


class TableSummaryOut(BaseModel):
    table_id: int
    table_number: str
    session_id: int | None = None
    table_total: int
    order_count: int
    recent_orders: list[DashboardRecentOrder]


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------
class OrderHistoryOut(BaseModel):
    history_id: int
    session_id: int
    order_number: str
    status: str
    total_amount: int
    ordered_at: datetime
    session_closed_at: datetime
    items: list[OrderItemOut]


# ---------------------------------------------------------------------------
# Table admin
# ---------------------------------------------------------------------------
class TableSetupRequest(BaseModel):
    table_number: str
    table_password: str


class TableSetupOut(BaseModel):
    id: int
    table_number: str
