from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Body, Query
from pydantic import BaseModel, Field

from backend.services.researchers import search_productions

router = APIRouter()


SearchMode = Literal["hybrid", "fulltext", "semantic"]


class SearchRequest(BaseModel):
    query: str = Field(default="")
    mode: SearchMode = Field(default="hybrid")
    limit: int = Field(default=20, ge=1, le=100)
    filters: dict[str, Any] | None = None


@router.get("/api/producoes/busca")
def api_search_get(
    q: str = Query(""),
    mode: SearchMode = Query("hybrid"),
    limit: int = Query(20, ge=1, le=100),
    year: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    subtype: str | None = Query(default=None),
    largeArea: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    return search_productions(
        q,
        limit=limit,
        mode=mode,
        filters={
            "year": year,
            "institution": institution,
            "subtype": subtype,
            "largeArea": largeArea,
            "area": area,
        },
    )


@router.post("/v1/search")
def api_search_post(payload: SearchRequest = Body(...)):
    results = search_productions(
        payload.query,
        limit=payload.limit,
        mode=payload.mode,
        filters=payload.filters,
    )
    return {
        "took_ms": 0,
        "total": len(results),
        "results": results,
        "mode": payload.mode,
        "filters": payload.filters or {},
    }

