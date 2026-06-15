from __future__ import annotations

from fastapi import APIRouter, Query

from backend.services.capes import list_facet_values, list_facets, search_productions

router = APIRouter(prefix="/api/capes", tags=["capes"])


@router.get("/producoes")
def api_capes_productions(
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
    return search_productions(
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


@router.get("/facets")
def api_capes_facets():
    return list_facets()


@router.get("/facets/{filter_name}")
def api_capes_facet_values(filter_name: str, limit: int = Query(100, ge=1, le=500)):
    return list_facet_values(filter_name, limit=limit)
