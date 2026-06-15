from __future__ import annotations

from fastapi import APIRouter

from etl_lattes import get_connection

router = APIRouter()


@router.get("/")
def root() -> dict[str, str]:
    return {"message": "Scientia Discovery backend is running."}


@router.get("/health")
def health() -> dict[str, str]:
    try:
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
        database = "connected"
    except Exception as exc:  # pragma: no cover - health is best-effort
        database = f"error: {exc}"

    return {
        "status": "healthy" if database == "connected" else "degraded",
        "database": database,
    }

