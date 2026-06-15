from __future__ import annotations

from fastapi import Header, HTTPException, status

from backend.core.config import get_admin_token


def require_admin_token(x_admin_token: str | None = Header(default=None)) -> None:
    expected_token = get_admin_token()

    if expected_token is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_API_TOKEN não configurado.",
        )

    if x_admin_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token administrativo inválido.",
        )
