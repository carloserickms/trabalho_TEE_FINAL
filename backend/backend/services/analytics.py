from __future__ import annotations

from backend.db import query_one, query_rows


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

