from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.services.researchers import get_researcher, list_researchers

router = APIRouter()


@router.get("/api/pesquisadores")
@router.get("/v1/researchers")
def api_list_researchers():
    return list_researchers()


@router.get("/api/pesquisadores/{lattes_id}")
@router.get("/v1/researchers/{lattes_id}")
def api_get_researcher(lattes_id: str):
    researcher = get_researcher(lattes_id)
    if not researcher:
        raise HTTPException(status_code=404, detail="Pesquisador não encontrado")
    return researcher

