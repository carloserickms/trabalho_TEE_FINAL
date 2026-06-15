from __future__ import annotations

from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json
import os
import time

from fastapi import HTTPException, status

CAPES_API_BASE_URL = os.getenv(
    "CAPES_API_BASE_URL", "https://apigw-proxy.capes.gov.br/observatorio"
).rstrip("/")
REQUEST_TIMEOUT_SECONDS = float(os.getenv("CAPES_API_TIMEOUT", "15"))
MAX_RETRIES = int(os.getenv("CAPES_API_RETRIES", "2"))
COUNT_PAGE_SIZE = int(os.getenv("CAPES_COUNT_PAGE_SIZE", "100"))
COUNT_MAX_PAGES = int(os.getenv("CAPES_COUNT_MAX_PAGES", "3"))

FILTER_FACETS = {
    "year": "ano-base",
    "institution": "sigla-ies",
    "subtype": "nome-sub-tipo-producao",
    "largeArea": "nome-grande-area-conhecimento",
    "area": "nome-area-conhecimento",
    "evaluationArea": "nome-area-avaliacao",
    "program": "codigo-programa",
}

FACET_LABELS = {
    "year": "Ano",
    "institution": "Instituição",
    "subtype": "Subtipo",
    "largeArea": "Grande área",
    "area": "Área de conhecimento",
    "evaluationArea": "Área de avaliação",
    "program": "Programa",
}


def _request_json(path: str, params: dict[str, Any] | None = None) -> Any:
    query = f"?{urlencode(params, doseq=True)}" if params else ""
    url = f"{CAPES_API_BASE_URL}{path}{query}"
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            request = Request(url, headers={"accept": "application/json"})
            with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                body = response.read().decode("utf-8")
            return json.loads(body) if body else None
        except HTTPError as exc:
            detail = _problem_detail(exc)
            raise HTTPException(status_code=exc.code, detail=detail) from exc
        except (URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(0.25 * (attempt + 1))
                continue

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"Falha ao consultar a API CAPES: {last_error}",
    )


def _problem_detail(exc: HTTPError) -> str:
    try:
        payload = json.loads(exc.read().decode("utf-8"))
    except Exception:
        return exc.reason or "Erro na API CAPES."

    if isinstance(payload, dict):
        return str(payload.get("detail") or payload.get("title") or payload)
    return str(payload)


def _as_list(value: str | list[str] | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        values = value
    else:
        values = value.split(",")
    return [item.strip() for item in values if item and item.strip()]


def _facet_expr(key: str, values: list[str]) -> str | None:
    clean = [value.replace(";", " ").replace("(", " ").replace(")", " ").strip() for value in values]
    clean = [value for value in clean if value]
    if not clean:
        return None
    return f"{key}:({'*'.join(clean)})"


def build_query(filters: dict[str, str | list[str] | None]) -> str | None:
    parts: list[str] = []
    for filter_name, facet_key in FILTER_FACETS.items():
        expr = _facet_expr(facet_key, _as_list(filters.get(filter_name)))
        if expr:
            parts.append(expr)
    return ";".join(parts) if parts else None


def search_productions(
    *,
    search: str = "",
    page: int = 0,
    size: int = 20,
    filters: dict[str, str | list[str] | None] | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {"page": page, "size": size}
    if search.strip():
        params["search"] = search.strip()

    query = build_query(filters or {})
    if query:
        params["query"] = query

    payload = _request_json("/data/catalogo/producao", params)
    content = payload.get("content", []) if isinstance(payload, dict) else []
    results = [_serialize_production(item, search) for item in content if isinstance(item, dict)]

    return {
        "results": results,
        "page": page,
        "size": size,
        "hasMore": len(results) >= size,
        "source": "capes",
        "total": _payload_total(payload, len(results)),
    }


def count_productions(
    *,
    search: str = "",
    filters: dict[str, str | list[str] | None] | None = None,
) -> tuple[int, bool]:
    if not search.strip() and not any(value for value in (filters or {}).values()):
        return 0, False

    total = 0
    reached_limit = False
    query = build_query(filters or {})
    for page in range(COUNT_MAX_PAGES):
        params: dict[str, Any] = {"page": page, "size": COUNT_PAGE_SIZE}
        if search.strip():
            params["search"] = search.strip()
        if query:
            params["query"] = query

        payload = _request_json("/data/catalogo/producao", params)
        content = payload.get("content", []) if isinstance(payload, dict) else []
        page_count = len(content) if isinstance(content, list) else 0
        total += page_count
        reached_limit = page == COUNT_MAX_PAGES - 1 and page_count == COUNT_PAGE_SIZE
        if page_count < COUNT_PAGE_SIZE:
            break

    return total, reached_limit


def list_facets() -> list[dict[str, Any]]:
    payload = _request_json("/facetas/data/catalogo/producao")
    if not isinstance(payload, list):
        return []

    by_key = {item.get("key"): item for item in payload if isinstance(item, dict)}
    output = []
    for filter_name, facet_key in FILTER_FACETS.items():
        facet = by_key.get(facet_key)
        if not facet:
            continue
        values = facet.get("values") if isinstance(facet.get("values"), list) else []
        if not values and filter_name in {"institution", "program"}:
            facet_values = list_facet_values(filter_name, limit=500)
        else:
            facet_values = _unique_values(
                [_serialize_facet_value(value) for value in values[:500] if isinstance(value, dict)]
            )
        output.append(
            {
                "id": filter_name,
                "key": facet_key,
                "label": FACET_LABELS.get(filter_name, facet.get("nome") or filter_name),
                "values": facet_values,
            }
        )
    return output


def list_facet_values(filter_name: str, limit: int = 100) -> list[dict[str, Any]]:
    facet_key = FILTER_FACETS.get(filter_name, filter_name)
    payload = _request_json(f"/facetas/data/catalogo/producao/{facet_key}")
    if not isinstance(payload, list):
        return []
    return _unique_values(
        [_serialize_facet_value(item) for item in payload[:limit] if isinstance(item, dict)]
    )


def _unique_values(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    output: list[dict[str, Any]] = []
    for value in values:
        key = str(value.get("key") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        output.append(value)
    return output


def _serialize_facet_value(item: dict[str, Any]) -> dict[str, Any]:
    key = item.get("key")
    value = item.get("value")
    label = str(value if value is not None else key if key is not None else "").strip()
    count = (
        item.get("count")
        or item.get("total")
        or item.get("doc_count")
        or item.get("quantidade")
        or item.get("valueCount")
    )
    output = {"key": str(key).strip() if key is not None else label, "label": label}
    if isinstance(count, int):
        output["count"] = count
    return output


def _payload_total(payload: Any, fallback: int) -> int:
    if not isinstance(payload, dict):
        return fallback
    for key in ("totalElements", "total", "totalItems", "total_items", "count"):
        value = payload.get(key)
        if isinstance(value, int):
            return value
    page = payload.get("page")
    if isinstance(page, dict):
        for key in ("totalElements", "total", "totalItems"):
            value = page.get(key)
            if isinstance(value, int):
                return value
    return fallback


def _serialize_production(item: dict[str, Any], search: str) -> dict[str, Any]:
    authors = [author.get("nomePessoa") for author in item.get("autores", []) if isinstance(author, dict)]
    authors = [str(author).strip() for author in authors if author]

    title = str(item.get("nomeProducao") or "Produção sem título").strip()
    venue = " · ".join(
        part
        for part in [
            str(item.get("siglaIes") or "").strip(),
            str(item.get("nomePrograma") or "").strip(),
        ]
        if part
    )
    highlights = [
        str(value).strip()
        for value in [
            item.get("nomeTipoProducao"),
            item.get("nomeSubTipoProducao"),
            item.get("siglaIes"),
            item.get("nomePrograma"),
        ]
        if value and str(value).strip()
    ][:5]

    return {
        "id": f"capes-{item.get('id')}",
        "title": title,
        "authors": authors or ["Autoria não informada"],
        "venue": venue or str(item.get("origem") or "CAPES").upper(),
        "year": int(item.get("anoBase") or 0),
        "qualis": "",
        "doi": "",
        "similarity": 1 if search.strip() else 0,
        "abstract": _summary(item),
        "highlights": highlights,
        "pesquisadorId": "",
        "source": "capes",
    }


def _summary(item: dict[str, Any]) -> str:
    parts = [
        item.get("nomeTipoProducao"),
        item.get("nomeSubTipoProducao"),
        item.get("nomePrograma"),
        item.get("siglaIes"),
    ]
    return ". ".join(str(part).strip() for part in parts if part and str(part).strip())
