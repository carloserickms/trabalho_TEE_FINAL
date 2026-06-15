from __future__ import annotations

import csv
from io import StringIO
from typing import Any

from fastapi import HTTPException

from backend.db import query_one, query_rows
from backend.services import capes


FILTER_MAP = {
    "yearStart": ("pr.ano >= %s", int),
    "yearEnd": ("pr.ano <= %s", int),
    "institution": ("p.instituicao = %s", str),
    "area": (
        "COALESCE(NULLIF(p.area_conhecimento, ''), NULLIF(p.grande_area, ''), 'Não informado') = %s",
        str,
    ),
}


def _where(filters: dict[str, Any] | None) -> tuple[str, list[Any]]:
    if not filters:
        return "", []

    clauses: list[str] = []
    params: list[Any] = []
    for key, value in filters.items():
        if value in (None, "") or key not in FILTER_MAP:
            continue
        clause, converter = FILTER_MAP[key]
        try:
            params.append(converter(value))
        except (TypeError, ValueError):
            continue
        clauses.append(clause)

    return (f"WHERE {' AND '.join(clauses)}" if clauses else ""), params


def dashboard_stats() -> dict[str, object]:
    total_pub = query_one("SELECT COUNT(*) AS count FROM producao")
    total_pesq = query_one("SELECT COUNT(*) AS count FROM pesquisador")
    qualis_a1a2 = query_one(
        "SELECT COUNT(*) AS count FROM producao WHERE qualis IN ('A1','A2')"
    )
    total_qualis = query_one(
        "SELECT COUNT(*) AS count FROM producao WHERE qualis IS NOT NULL AND qualis != ''"
    )
    prod_anos = query_rows(
        "SELECT ano, COUNT(*) AS count FROM producao GROUP BY ano ORDER BY ano"
    )

    total_qualis_num = total_qualis["count"] if total_qualis else 0
    qualis_a1a2_num = qualis_a1a2["count"] if qualis_a1a2 else 0
    qualis_pct = round(qualis_a1a2_num / total_qualis_num * 100) if total_qualis_num else 0

    return {
        "totalProducoes": total_pub["count"] if total_pub else 0,
        "totalPesquisadores": total_pesq["count"] if total_pesq else 0,
        "qualisA1A2Percent": qualis_pct,
        "anos": [{"year": row["ano"], "count": row["count"]} for row in prod_anos],
    }


def researcher_ranking(limit: int = 10) -> list[dict[str, object]]:
    rows = query_rows(
        """
        SELECT p.id_lattes, p.nome_completo, p.instituicao, COUNT(pr.id_producao) AS total
        FROM pesquisador p
        LEFT JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        GROUP BY p.id_pesquisador, p.id_lattes, p.nome_completo, p.instituicao
        ORDER BY total DESC, p.nome_completo ASC
        LIMIT %s
        """,
        (limit,),
    )
    return [
        {
            "id": row["id_lattes"],
            "name": row["nome_completo"],
            "institution": row.get("instituicao") or "",
            "publications": row["total"],
        }
        for row in rows
    ]


def qualis_distribution() -> list[dict[str, object]]:
    rows = query_rows(
        """
        SELECT COALESCE(NULLIF(qualis, ''), 'Outros') AS label, COUNT(*) AS count
        FROM producao
        GROUP BY 1
        ORDER BY 1
        """
    )
    total = sum(row["count"] for row in rows)
    return [
        {
            "label": row["label"],
            "value": round(row["count"] / total * 100) if total else 0,
        }
        for row in rows
    ]


def area_distribution() -> list[dict[str, object]]:
    rows = query_rows(
        """
        SELECT
            COALESCE(
                NULLIF(p.area_conhecimento, ''),
                NULLIF(p.grande_area, ''),
                'Não informado'
            ) AS label,
            COUNT(*) AS count
        FROM pesquisador p
        GROUP BY 1
        ORDER BY count DESC, 1
        """
    )
    return [{"name": row["label"], "count": row["count"]} for row in rows]


def institution_distribution() -> list[dict[str, object]]:
    rows = query_rows(
        """
        SELECT COALESCE(NULLIF(instituicao, ''), 'Não informado') AS label, COUNT(*) AS count
        FROM pesquisador
        GROUP BY 1
        ORDER BY count DESC, 1
        """
    )
    return [{"label": row["label"], "count": row["count"]} for row in rows]


def analytics_overview(filters: dict[str, Any] | None = None) -> dict[str, Any]:
    where_sql, params = _where(filters)

    totals = query_one(
        f"""
        SELECT
            COUNT(pr.id_producao) AS productions,
            COUNT(DISTINCT p.id_pesquisador) AS researchers,
            COUNT(DISTINCT NULLIF(p.instituicao, '')) AS institutions,
            COUNT(DISTINCT COALESCE(NULLIF(p.area_conhecimento, ''), NULLIF(p.grande_area, ''))) AS areas,
            MIN(pr.ano) AS first_year,
            MAX(pr.ano) AS last_year
        FROM pesquisador p
        LEFT JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        """,
        tuple(params),
    )

    yearly = query_rows(
        f"""
        SELECT pr.ano AS year, COUNT(pr.id_producao) AS count
        FROM pesquisador p
        JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        GROUP BY pr.ano
        HAVING pr.ano IS NOT NULL
        ORDER BY pr.ano
        """,
        tuple(params),
    )

    by_area = query_rows(
        f"""
        SELECT
            COALESCE(NULLIF(p.area_conhecimento, ''), NULLIF(p.grande_area, ''), 'Não informado') AS label,
            COUNT(pr.id_producao) AS count
        FROM pesquisador p
        JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 12
        """,
        tuple(params),
    )

    by_institution = query_rows(
        f"""
        SELECT COALESCE(NULLIF(p.instituicao, ''), 'Não informado') AS label, COUNT(pr.id_producao) AS count
        FROM pesquisador p
        JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 12
        """,
        tuple(params),
    )

    by_type = query_rows(
        f"""
        SELECT COALESCE(NULLIF(pr.tipo, ''), 'Não informado') AS label, COUNT(pr.id_producao) AS count
        FROM pesquisador p
        JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        GROUP BY 1
        ORDER BY count DESC, label ASC
        LIMIT 10
        """,
        tuple(params),
    )

    ranking = query_rows(
        f"""
        SELECT
            p.id_lattes AS id,
            p.nome_completo AS name,
            COALESCE(NULLIF(p.instituicao, ''), 'Não informado') AS institution,
            COUNT(pr.id_producao) AS publications
        FROM pesquisador p
        LEFT JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        GROUP BY p.id_pesquisador, p.id_lattes, p.nome_completo, p.instituicao
        ORDER BY publications DESC, name ASC
        LIMIT 10
        """,
        tuple(params),
    )

    filters_available = query_one(
        """
        SELECT MIN(ano) AS min_year, MAX(ano) AS max_year
        FROM producao
        WHERE ano IS NOT NULL
        """
    )

    return {
        "filters": {
            "minYear": filters_available["min_year"] if filters_available else None,
            "maxYear": filters_available["max_year"] if filters_available else None,
        },
        "summary": {
            "productions": int(totals["productions"] if totals else 0),
            "researchers": int(totals["researchers"] if totals else 0),
            "institutions": int(totals["institutions"] if totals else 0),
            "areas": int(totals["areas"] if totals else 0),
            "firstYear": totals["first_year"] if totals else None,
            "lastYear": totals["last_year"] if totals else None,
        },
        "yearly": [{"year": row["year"], "count": row["count"]} for row in yearly],
        "areas": [{"label": row["label"], "count": row["count"]} for row in by_area],
        "institutions": [{"label": row["label"], "count": row["count"]} for row in by_institution],
        "types": [{"label": row["label"], "count": row["count"]} for row in by_type],
        "ranking": [
            {
                "id": row["id"],
                "name": row["name"],
                "institution": row["institution"],
                "publications": row["publications"],
            }
            for row in ranking
        ],
    }


def analytics_powerbi_rows(filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    where_sql, params = _where(filters)
    rows = query_rows(
        f"""
        SELECT
            pr.id_producao AS production_id,
            pr.ano AS year,
            COALESCE(NULLIF(pr.tipo, ''), 'Não informado') AS production_type,
            COALESCE(NULLIF(pr.titulo, ''), 'Sem título') AS title,
            COALESCE(NULLIF(pr.periodico, ''), NULLIF(pr.evento, ''), '') AS venue,
            p.id_lattes AS researcher_lattes,
            p.nome_completo AS researcher_name,
            COALESCE(NULLIF(p.instituicao, ''), 'Não informado') AS institution,
            COALESCE(NULLIF(p.area_conhecimento, ''), NULLIF(p.grande_area, ''), 'Não informado') AS area
        FROM pesquisador p
        JOIN producao pr ON p.id_pesquisador = pr.id_pesquisador
        {where_sql}
        ORDER BY pr.ano DESC NULLS LAST, researcher_name ASC, title ASC
        """
        ,
        tuple(params),
    )
    return rows


def analytics_powerbi_csv(filters: dict[str, Any] | None = None) -> str:
    rows = analytics_powerbi_rows(filters)
    if not rows:
        return ""

    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)
    return buffer.getvalue()


def capes_analytics(
    *,
    search: str = "",
    year: str | None = None,
    institution: str | None = None,
    area: str | None = None,
) -> dict[str, Any]:
    filters = {
        "year": year,
        "institution": institution,
        "largeArea": area,
        "area": area,
    }

    try:
        response = capes.search_productions(
            search=search,
            page=0,
            size=100,
            filters=filters,
        )
        total, limited = capes.count_productions(search=search, filters=filters)
    except HTTPException:
        raise
    except Exception as exc:
        return {
            "source": "capes",
            "warning": str(exc),
            "summary": {"total": 0, "sample": 0, "limited": False},
            "yearly": [],
            "institutions": [],
            "types": [],
            "results": [],
        }

    results = response.get("results", [])
    total = total or int(response.get("total") or len(results))
    yearly: dict[str, int] = {}
    institutions: dict[str, int] = {}
    types: dict[str, int] = {}

    for item in results:
        year_key = str(item.get("year") or "").strip()
        if year_key:
            yearly[year_key] = yearly.get(year_key, 0) + 1

        institution_key = _capes_institution(str(item.get("venue") or ""))
        if institution_key:
            institutions[institution_key] = institutions.get(institution_key, 0) + 1

        highlights = [str(value).strip() for value in item.get("highlights", []) if str(value).strip()]
        if len(highlights) > 1:
            type_key = highlights[1]
            types[type_key] = types.get(type_key, 0) + 1

    return {
        "source": "capes",
        "warning": "",
        "summary": {
            "total": total,
            "sample": len(results),
            "limited": limited,
        },
        "yearly": [
            {"label": key, "count": count}
            for key, count in sorted(yearly.items(), key=lambda item: int(item[0]), reverse=True)
        ],
        "institutions": _top_counter(institutions),
        "types": _top_counter(types),
        "results": results[:12],
    }


def _capes_institution(venue: str) -> str:
    return venue.replace("Â·", "·").split("·", 1)[0].strip()


def _top_counter(values: dict[str, int], limit: int = 10) -> list[dict[str, Any]]:
    return [
        {"label": label, "count": count}
        for label, count in sorted(values.items(), key=lambda item: (-item[1], item[0]))[:limit]
    ]

