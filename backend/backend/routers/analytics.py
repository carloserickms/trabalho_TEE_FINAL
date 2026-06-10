from __future__ import annotations

from fastapi import APIRouter

from backend.services.analytics import (
    area_distribution,
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


@router.get("/api/instituicoes")
def api_institutions():
    return list_institutions()

