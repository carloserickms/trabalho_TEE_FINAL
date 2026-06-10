from __future__ import annotations

from typing import Any


def _format_unit(city: str | None, uf: str | None) -> str:
    city = (city or "").strip()
    uf = (uf or "").strip()
    if city and uf:
        return f"{city} - {uf}"
    return city or uf or ""


def _humanize_area(value: str | None) -> str:
    if not value:
        return ""
    pretty = value.replace("_", " ").strip()
    return pretty.title()


def serialize_researcher(
    researcher: dict[str, Any],
    publications: int,
    production_years: list[dict[str, Any]],
    recent_publications: list[dict[str, Any]],
    collaborators: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    primary_area = _humanize_area(researcher.get("area_conhecimento")) or _humanize_area(
        researcher.get("grande_area")
    )
    subareas = [
        _humanize_area(researcher.get("subarea_conhecimento")),
    ]
    subareas = [item for item in subareas if item]

    return {
        "id": researcher["id_lattes"],
        "name": researcher["nome_completo"],
        "title": researcher.get("nome_citacao") or "",
        "institution": researcher.get("instituicao") or "",
        "unit": _format_unit(researcher.get("cidade"), researcher.get("uf")),
        "area": primary_area or "Não informada",
        "subareas": subareas,
        "hIndex": 0,
        "publications": publications,
        "citations": 0,
        "orcid": (researcher.get("orcid_id") or "").replace("https://orcid.org/", ""),
        "lattes": f"lattes.cnpq.br/{researcher['id_lattes']}",
        "bio": researcher.get("resumo_cv") or "",
        "recent": recent_publications,
        "production": production_years,
        "collaborators": collaborators or [],
    }


def serialize_search_result(row: dict[str, Any]) -> dict[str, Any]:
    title = row.get("titulo") or ""
    highlights = [
        part.strip()
        for part in (row.get("palavras_chave") or "").split(";")
        if part.strip()
    ][:5]
    return {
        "id": row["id_producao"],
        "title": title,
        "authors": [row.get("autor_nome") or ""],
        "venue": row.get("periodico") or row.get("evento") or "",
        "year": row.get("ano") or 0,
        "qualis": row.get("qualis") or "",
        "doi": row.get("doi") or "",
        "similarity": row.get("similarity") or 0,
        "abstract": row.get("palavras_chave") or "",
        "highlights": highlights,
        "pesquisadorId": row.get("id_lattes") or "",
    }

