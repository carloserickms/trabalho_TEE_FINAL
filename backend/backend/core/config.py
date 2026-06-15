from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
)
DEFAULT_DB_CONNECT_TIMEOUT = 5
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_database_config() -> dict[str, object]:
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", 5432)),
        "dbname": os.getenv("DB_NAME", "buscalattes"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", "postgres"),
        "connect_timeout": int(
            os.getenv("DB_CONNECT_TIMEOUT", DEFAULT_DB_CONNECT_TIMEOUT)
        ),
        "application_name": os.getenv("DB_APPLICATION_NAME", "scientia-discovery-api"),
    }


@lru_cache(maxsize=1)
def get_cors_origins() -> list[str]:
    env_value = os.getenv("CORS_ORIGINS")
    return _split_csv(env_value) or list(DEFAULT_CORS_ORIGINS)


@lru_cache(maxsize=1)
def get_admin_token() -> str | None:
    token = os.getenv("ADMIN_API_TOKEN") or os.getenv("API_ADMIN_TOKEN")
    return token.strip() if token and token.strip() else None

