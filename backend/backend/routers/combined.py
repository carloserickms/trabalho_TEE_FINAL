from __future__ import annotations

from fastapi import APIRouter, Query

from backend.services.combined import list_combined_facets, search_combined_productions

router = APIRouter(prefix="/api", tags=["combined"])


@router.get("/producoes/combinada")
def api_combined_productions(
    search: str = Query(""),
    year: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    subtype: str | None = Query(default=None),
    largeArea: str | None = Query(default=None),
    area: str | None = Query(default=None),
    evaluationArea: str | None = Query(default=None),
    program: str | None = Query(default=None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
):
    return search_combined_productions(
        search=search,
        page=page,
        size=size,
        filters={
            "year": year,
            "institution": institution,
            "subtype": subtype,
            "largeArea": largeArea,
            "area": area,
            "evaluationArea": evaluationArea,
            "program": program,
        },
    )


@router.get("/facets/combinadas")
def api_combined_facets(
    search: str = Query(""),
    year: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    subtype: str | None = Query(default=None),
    largeArea: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    return list_combined_facets(
        search=search,
        filters={
            "year": year,
            "institution": institution,
            "subtype": subtype,
            "largeArea": largeArea,
            "area": area,
        },
    )
