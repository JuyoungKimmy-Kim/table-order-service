"""애플리케이션 설정.

환경변수(.env)로 오버라이드 가능. 계약 상수(토큰 만료 등)는 shared-contract 기준.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # DB
    database_url: str = "sqlite:///./table_order.db"

    # JWT / 보안
    secret_key: str = "change-me-in-production-please-use-a-long-random-secret"
    algorithm: str = "HS256"
    # 관리자 JWT 유효기간 16시간 = 57600초 (BR-1.1)
    admin_token_expire_seconds: int = 57600
    # 테이블 토큰: 자동 로그인 UX를 위해 장기(30일). 무효 시 401 → 초기 설정 화면 (BR-1.4)
    table_token_expire_seconds: int = 60 * 60 * 24 * 30

    # 로그인 시도 제한 (BR-1.3)
    max_login_attempts: int = 5
    lock_minutes: int = 15

    # 대시보드 카드 미리보기 주문 수
    dashboard_recent_orders: int = 5

    # CORS 허용 오리진 (frontend). 데모 목적으로 전체 허용도 가능.
    cors_origins: list[str] = ["*"]


settings = Settings()
