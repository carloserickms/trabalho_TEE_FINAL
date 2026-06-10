from __future__ import annotations

from typing import Any

import psycopg2.extras

from etl_lattes import get_connection


def query_rows(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def query_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    rows = query_rows(sql, params)
    return rows[0] if rows else None


def query_scalar(sql: str, params: tuple[Any, ...] = ()) -> Any:
    row = query_one(sql, params)
    if not row:
        return None
    return next(iter(row.values()))

