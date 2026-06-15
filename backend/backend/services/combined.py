from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from backend.services import capes
from backend.services.researchers import (
    count_productions as count_lattes,
    list_local_facets,
    list_local_facets_for_search,
    search_productions as search_lattes,
)


FACET_LABELS = {
    "year": "Ano",
    "institution": "Instituição",
    "largeArea": "Grande área",
    "area": "Área de conhecimento",
    "subtype": "Tipo de produção",
}
SEARCH_FACETS = ["year", "institution", "largeArea", "area", "subtype"]
MAX_VALUES_PER_FACET = 80


def _result_key(item: dict[str, Any]) -> tuple[str, int]:
    title = " ".join(str(item.get("title") or "").lower().split())
    return title, int(item.get("year") or 0)


def search_combined_productions(
    *,
    search: str = "",
    page: int = 0,
    size: int = 20,
    filters: dict[str, str | list[str] | None] | None = None,
) -> dict[str, Any]:
    local_results = search_lattes(
        search,
        limit=size,
        filters=filters,
        offset=page * size,
    )

    active_capes_scope = bool(search.strip() or any(value for value in (filters or {}).values()))
    capes_results: list[dict[str, Any]] = []
    capes_total = 0
    capes_total_limited = False
    capes_error = ""
    try:
        capes_response = capes.search_productions(
            search=search,
            page=page,
            size=size,
            filters=filters,
        )
        capes_results = capes_response.get("results", [])
        if active_capes_scope:
            capes_total, capes_total_limited = capes.count_productions(
                search=search,
                filters=filters,
            )
        else:
            capes_total = int(capes_response.get("total") or len(capes_results))
    except HTTPException as exc:
        capes_error = str(exc.detail)
    except Exception as exc:  # pragma: no cover - external API is best-effort
        capes_error = str(exc)

    seen: set[tuple[str, int]] = set()
    merged: list[dict[str, Any]] = []
    for item in [*local_results, *capes_results]:
        key = _result_key(item)
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)

    merged.sort(
        key=lambda item: (
            0 if item.get("source") == "lattes" else 1,
            -float(item.get("similarity") or 0),
            -int(item.get("year") or 0),
        ),
    )

    lattes_total = count_lattes(search, filters)
    combined_total = lattes_total + capes_total

    return {
        "results": merged,
        "page": page,
        "size": size,
        "hasMore": ((page + 1) * size) < max(lattes_total, capes_total),
        "source": "combined",
        "sources": {
            "lattes": lattes_total,
            "capes": capes_total,
            "total": combined_total,
            "capesLimited": capes_total_limited,
            "totalLimited": capes_total_limited,
        },
        "warning": capes_error,
    }


def list_combined_facets(
    search: str = "",
    filters: dict[str, str | list[str] | None] | None = None,
) -> list[dict[str, Any]]:
    local_facets = list_local_facets_for_search(search, filters) if search or filters else list_local_facets()
    try:
        capes_facets = _capes_facets_for_search(search, filters)
    except Exception:
        capes_facets = []

    by_id: dict[str, dict[str, Any]] = {
        facet["id"]: {
            "id": facet["id"],
            "key": facet.get("key") or facet["id"],
            "label": FACET_LABELS.get(facet["id"], facet.get("label") or facet["id"]),
            "values": [],
        }
        for facet in local_facets
    }

    for facet in capes_facets:
        facet_id = facet.get("id")
        if not facet_id:
            continue
        by_id.setdefault(
            facet_id,
            {
                "id": facet_id,
                "key": facet.get("key") or facet_id,
                "label": FACET_LABELS.get(facet_id, facet.get("label") or facet_id),
                "values": [],
            },
        )

    for source, facets in (("lattes", local_facets), ("capes", capes_facets)):
        for facet in facets:
            target = by_id.get(facet.get("id"))
            if not target:
                continue
            for value in facet.get("values", []):
                _merge_facet_value(target["values"], value, source)

    for facet in by_id.values():
        if facet["id"] == "year":
            facet["values"] = sorted(
                facet["values"],
                key=lambda value: _year_sort_value(value.get("key") or value.get("label")),
                reverse=True,
            )[:MAX_VALUES_PER_FACET]
        else:
            facet["values"] = sorted(
                facet["values"],
                key=lambda value: (int(value.get("count") or 0), str(value.get("label") or "")),
                reverse=True,
            )[:MAX_VALUES_PER_FACET]

    return [by_id[key] for key in SEARCH_FACETS if key in by_id]


def _capes_facets_for_search(
    search: str = "",
    filters: dict[str, str | list[str] | None] | None = None,
) -> list[dict[str, Any]]:
    if not search and not any(value for value in (filters or {}).values()):
        return capes.list_facets()

    response = capes.search_productions(search=search, page=0, size=100, filters=filters)
    results = response.get("results", [])
    counters = {facet_id: {} for facet_id in SEARCH_FACETS}

    for item in results:
        _increment(counters["year"], str(item.get("year") or ""), str(item.get("year") or ""))
        venue = str(item.get("venue") or "")
        institution = venue.split("·", 1)[0].strip()
        _increment(counters["institution"], institution, institution)
        highlights = [str(value).strip() for value in item.get("highlights", []) if str(value).strip()]
        if len(highlights) > 1:
            _increment(counters["subtype"], highlights[1], highlights[1])

    return [
        {
            "id": facet_id,
            "key": facet_id,
            "label": FACET_LABELS.get(facet_id, facet_id),
            "values": [
                {"key": key, "label": label, "count": count, "source": "capes"}
                for key, (label, count) in values.items()
                if key
            ],
        }
        for facet_id, values in counters.items()
    ]


def _increment(target: dict[str, tuple[str, int]], key: str, label: str) -> None:
    clean_key = key.strip()
    clean_label = label.strip()
    if not clean_key:
        return
    _, count = target.get(clean_key, (clean_label, 0))
    target[clean_key] = (clean_label, count + 1)


def _year_sort_value(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _merge_facet_value(
    target_values: list[dict[str, Any]],
    value: dict[str, Any],
    source: str,
) -> None:
    key = str(value.get("key") or "").strip()
    label = str(value.get("label") or key).strip()
    if not key:
        return

    for existing in target_values:
        if str(existing.get("key") or "").strip().lower() == key.lower():
            existing["count"] = int(existing.get("count") or 0) + int(value.get("count") or 0)
            existing["source"] = "combined"
            return

    target_values.append(
        {
            "key": key,
            "label": label,
            "count": int(value.get("count") or 0),
            "source": value.get("source") or source,
        }
    )
