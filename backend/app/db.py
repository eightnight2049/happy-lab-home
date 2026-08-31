from collections.abc import Generator

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://lab:lab@db:5432/labdb"
    jwt_secret: str = "replace-me-in-production"
    admin_email: str = "admin@motionlab.local"
    admin_password: str = "change-me-now"
    media_root: str = "/data/uploads"
    cors_origins: str = "http://localhost:3000,http://localhost:8080"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
