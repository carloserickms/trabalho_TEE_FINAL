from __future__ import annotations

from fastapi import APIRouter, Query, Response

from backend.services.analytics import (
    analytics_overview,
    analytics_powerbi_csv,
    analytics_powerbi_rows,
    area_distribution,
    capes_analytics,
    dashboard_stats,
    institution_distribution,
    qualis_distribution,
    researcher_ranking,
)
from backend.services.researchers import list_institutions

router = APIRouter()


@router.get("/api/dashboard/stats")
@router.get("/v1/metrics/stats")
def api_dashboard_stats():
    return dashboard_stats()


@router.get("/api/dashboard/ranking")
@router.get("/v1/metrics/ranking")
def api_dashboard_ranking():
    return researcher_ranking()


@router.get("/api/qualis-distribuicao")
@router.get("/v1/metrics/qualis")
def api_qualis_distribution():
    return qualis_distribution()


@router.get("/api/metrics/area")
@router.get("/v1/metrics/area")
def api_area_distribution():
    return area_distribution()


@router.get("/api/metrics/institution")
@router.get("/v1/metrics/institution")
def api_institution_distribution():
    return institution_distribution()


@router.get("/api/analytics/overview")
def api_analytics_overview(
    yearStart: str | None = Query(default=None),
    yearEnd: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    return analytics_overview(
        {
            "yearStart": yearStart,
            "yearEnd": yearEnd,
            "institution": institution,
            "area": area,
        }
    )


@router.get("/api/analytics/capes")
def api_analytics_capes(
    search: str = Query(""),
    year: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    return capes_analytics(
        search=search,
        year=year,
        institution=institution,
        area=area,
    )


@router.get("/api/analytics/powerbi")
def api_analytics_powerbi_json(
    yearStart: str | None = Query(default=None),
    yearEnd: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    return analytics_powerbi_rows(
        {
            "yearStart": yearStart,
            "yearEnd": yearEnd,
            "institution": institution,
            "area": area,
        }
    )


@router.get("/api/analytics/powerbi.csv")
def api_analytics_powerbi_csv(
    yearStart: str | None = Query(default=None),
    yearEnd: str | None = Query(default=None),
    institution: str | None = Query(default=None),
    area: str | None = Query(default=None),
):
    content = analytics_powerbi_csv(
        {
            "yearStart": yearStart,
            "yearEnd": yearEnd,
            "institution": institution,
            "area": area,
        }
    )
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="scientia-powerbi.csv"'},
    )


@router.get("/api/instituicoes")
def api_institutions():
    return list_institutions()

