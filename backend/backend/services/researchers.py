from __future__ import annotations

from collections import Counter
import re
from typing import Any

from backend.db import query_one, query_rows
from backend.serializers import serialize_researcher, serialize_search_result


_TOKEN_RE = re.compile(r"[\wÀ-ÿ]+", re.UNICODE)
STOPWORDS = {
    "a", "as", "o", "os", "e", "de", "da", "do", "das", "dos", "em", "no", "na",
    "nos", "nas", "um", "uma", "para", "por", "com", "sem", "sobre", "ao", "à",
    "aos", "às", "que", "se", "como", "mais", "menos", "entre", "nas", "nos",
}


def _normalize_text(value: str | None) -> str:
    return (value or "").lower()


def _tokens(value: str | None) -> list[str]:
    tokens = []
    for token in _TOKEN_RE.findall(_normalize_text(value)):
        if len(token) < 2 or token in STOPWORDS:
            continue
        tokens.append(token)
    return tokens


def _row_text(row: dict[str, Any]) -> str:
    parts = [
        row.get("titulo"),
        row.get("titulo_ingles"),
        row.get("palavras_chave"),
        row.get("periodico"),
        row.get("evento"),
        row.get("autor_nome"),
    ]
    return " ".join(part for part in parts if part)


def _jaccard_score(query_tokens: list[str], row_tokens: list[str]) -> float:
    if not query_tokens or not row_tokens:
        return 0.0
    q = Counter(query_tokens)
    r = Counter(row_tokens)
    overlap = sum(min(q[t], r[t]) for t in q.keys() & r.keys())
    union = sum(q.values()) + sum(r.values()) - overlap
    return overlap / union if union else 0.0


def _semantic_score(query: str, row: dict[str, Any]) -> float:
    q_tokens = _tokens(query)
    r_tokens = _tokens(_row_text(row))
    base = _jaccard_score(q_tokens, r_tokens)

    query_text = _normalize_text(query)
    text = _normalize_text(_row_text(row))
    if query_text and query_text in text:
        base += 0.25

    if q_tokens and r_tokens:
        qset = set(q_tokens)
        rset = set(r_tokens)
        first_hits = sum(1 for token in qset if token in rset)
        base += min(first_hits / max(len(qset), 1), 1.0) * 0.35

    return min(base, 1.0)


def list_researchers() -> list[dict[str, Any]]:
    researchers = query_rows("SELECT * FROM pesquisador ORDER BY nome_completo")
    if not researchers:
        return []

    publication_counts = {
        row["id_pesquisador"]: row["count"]
        for row in query_rows(
            """
            SELECT id_pesquisador, COUNT(*) AS count
            FROM producao
            GROUP BY id_pesquisador
            """
        )
    }

    production_by_researcher: dict[Any, list[dict[str, Any]]] = {}
    for row in query_rows(
        """
        SELECT id_pesquisador, ano, COUNT(*) AS count
        FROM producao
        GROUP BY id_pesquisador, ano
        ORDER BY id_pesquisador, ano
        """
    ):
        production_by_researcher.setdefault(row["id_pesquisador"], []).append(
            {"year": row["ano"], "count": row["count"]}
        )

    recent_by_researcher: dict[Any, list[dict[str, Any]]] = {}
    for row in query_rows(
        """
        SELECT *
        FROM (
            SELECT
                p.*,
                ROW_NUMBER() OVER (
                    PARTITION BY id_pesquisador
                    ORDER BY ano DESC NULLS LAST, titulo ASC
                ) AS row_number
            FROM producao p
            WHERE tipo = 'ARTIGO'
        ) ranked
        WHERE row_number <= 4
        ORDER BY id_pesquisador, row_number
        """
    ):
        recent_by_researcher.setdefault(row["id_pesquisador"], []).append(
            {
                "year": row["ano"],
                "title": row["titulo"],
                "venue": row.get("periodico") or row.get("evento") or "",
                "qualis": row.get("qualis") or "",
                "doi": row.get("doi") or "",
            }
        )

    return [
        serialize_researcher(
            researcher,
            publication_counts.get(researcher["id_pesquisador"], 0),
            production_by_researcher.get(researcher["id_pesquisador"], []),
            recent_by_researcher.get(researcher["id_pesquisador"], []),
        )
        for researcher in researchers
    ]


def get_researcher(lattes_id: str) -> dict[str, Any] | None:
    researcher = query_one(
        "SELECT * FROM pesquisador WHERE id_lattes = %s",
        (lattes_id,),
    )
    if not researcher:
        return None

    pub_count = query_one(
        "SELECT COUNT(*) AS count FROM producao WHERE id_pesquisador = %s",
        (researcher["id_pesquisador"],),
    )
    production_years = query_rows(
        """
        SELECT ano, COUNT(*) AS count
        FROM producao
        WHERE id_pesquisador = %s
        GROUP BY ano
        ORDER BY ano
        """,
        (researcher["id_pesquisador"],),
    )
    recent_publications = query_rows(
        """
        SELECT *
        FROM producao
        WHERE id_pesquisador = %s
        ORDER BY ano DESC NULLS LAST, titulo ASC
        LIMIT 5
        """,
        (researcher["id_pesquisador"],),
    )
    collaborators = query_rows(
        """
        SELECT p2.nome_completo AS nome, p2.instituicao, COUNT(*) AS shared
        FROM producao pr1
        JOIN producao pr2
          ON pr1.titulo = pr2.titulo
         AND pr1.ano = pr2.ano
         AND pr1.id_pesquisador != pr2.id_pesquisador
        JOIN pesquisador p2 ON pr2.id_pesquisador = p2.id_pesquisador
        WHERE pr1.id_pesquisador = %s
        GROUP BY p2.nome_completo, p2.instituicao
        ORDER BY shared DESC
        LIMIT 10
        """,
        (researcher["id_pesquisador"],),
    )

    return serialize_researcher(
        researcher,
        pub_count["count"] if pub_count else 0,
        [{"year": row["ano"], "count": row["count"]} for row in production_years],
        [
            {
                "year": row["ano"],
                "title": row["titulo"],
                "venue": row.get("periodico") or row.get("evento") or "",
                "qualis": row.get("qualis") or "",
                "doi": row.get("doi") or "",
            }
            for row in recent_publications
        ],
        [
            {
                "name": row["nome"],
                "institution": row.get("instituicao") or "",
                "shared": row["shared"],
            }
            for row in collaborators
        ],
    )


def _filter_clauses(filters: dict[str, Any] | None) -> tuple[list[str], list[Any]]:
    if not filters:
        return [], []

    clauses: list[str] = []
    params: list[Any] = []
    filter_map = {
        "year": ("p.ano = %s", lambda value: int(value)),
        "institution": ("pes.instituicao = %s", str),
        "largeArea": ("pes.grande_area = %s", str),
        "area": ("pes.area_conhecimento = %s", str),
        "subtype": ("p.tipo = %s", lambda value: str(value).upper()),
    }

    for key, value in filters.items():
        if value in (None, "") or key not in filter_map:
            continue
        clause, converter = filter_map[key]
        try:
            params.append(converter(value))
        except (TypeError, ValueError):
            continue
        clauses.append(clause)

    return clauses, params


def _search_clauses(query: str, filters: dict[str, Any] | None) -> tuple[list[str], list[Any]]:
    q = query.strip()
    clauses: list[str] = []
    params: list[Any] = []

    if q:
        clauses.append(
            """
            (
                p.fts_vector @@ plainto_tsquery('portuguese', %s)
                OR p.titulo ILIKE %s
                OR p.titulo_ingles ILIKE %s
                OR p.palavras_chave ILIKE %s
                OR p.periodico ILIKE %s
                OR p.evento ILIKE %s
                OR pes.nome_completo ILIKE %s
            )
            """
        )
        params.extend([q, f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])

    filter_clauses, filter_params = _filter_clauses(filters)
    clauses.extend(filter_clauses)
    params.extend(filter_params)
    return clauses, params


def search_productions(
    query: str,
    limit: int = 20,
    mode: str = "hybrid",
    filters: dict[str, Any] | None = None,
    offset: int = 0,
) -> list[dict[str, Any]]:
    q = query.strip()
    where_clauses, params = _search_clauses(q, filters)
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    fulltext_sql = "ts_rank(p.fts_vector, plainto_tsquery('portuguese', %s))"
    select_score = fulltext_sql if q else "0"
    score_params = [q] if q else []

    results = query_rows(
        f"""
        SELECT
            p.*,
            pes.nome_completo AS autor_nome,
            pes.id_lattes,
            {select_score} AS fulltext_score
        FROM producao p
        JOIN pesquisador pes ON p.id_pesquisador = pes.id_pesquisador
        {where_sql}
        ORDER BY p.ano DESC NULLS LAST, p.titulo ASC
        LIMIT %s OFFSET %s
        """,
        tuple(score_params + params + [max(limit * 4, limit) if q else limit, offset]),
    )

    for row in results:
        fulltext_score = float(row.get("fulltext_score") or 0)
        semantic_score = _semantic_score(q, row) if q else 0
        if mode == "fulltext":
            score = fulltext_score
        elif mode == "semantic":
            score = semantic_score
        else:
            score = (fulltext_score * 0.6) + (semantic_score * 0.4)
        row["similarity"] = round(score, 6)

    results.sort(
        key=lambda row: (
            float(row.get("similarity") or 0),
            row.get("ano") or 0,
            row.get("titulo") or "",
        ),
        reverse=True,
    )

    serialized = []
    for row in results[:limit]:
        item = serialize_search_result(row)
        item["source"] = "lattes"
        serialized.append(item)
    return serialized


def count_productions(query: str = "", filters: dict[str, Any] | None = None) -> int:
    where_clauses, params = _search_clauses(query, filters)
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    row = query_one(
        f"""
        SELECT COUNT(*) AS count
        FROM producao p
        JOIN pesquisador pes ON p.id_pesquisador = pes.id_pesquisador
        {where_sql}
        """,
        tuple(params),
    )
    return int(row["count"] if row else 0)


def list_institutions() -> list[str]:
    rows = query_rows(
        """
        SELECT DISTINCT instituicao
        FROM pesquisador
        WHERE instituicao IS NOT NULL AND instituicao != ''
        ORDER BY instituicao
        """
    )
    return [row["instituicao"] for row in rows]


def list_local_facets() -> list[dict[str, Any]]:
    def display_label(value: Any) -> str:
        text = str(value or "").replace("_", " ").strip()
        return text.title() if text.isupper() or "_" in text else text

    facet_queries = {
        "year": """
            SELECT ano::text AS key, ano::text AS label, COUNT(*) AS count
            FROM producao
            WHERE ano IS NOT NULL
            GROUP BY ano
            ORDER BY ano DESC
        """,
        "institution": """
            SELECT instituicao AS key, instituicao AS label, COUNT(*) AS count
            FROM pesquisador
            WHERE instituicao IS NOT NULL AND instituicao != ''
            GROUP BY instituicao
            ORDER BY instituicao
        """,
        "largeArea": """
            SELECT grande_area AS key, grande_area AS label, COUNT(*) AS count
            FROM pesquisador
            WHERE grande_area IS NOT NULL AND grande_area != ''
            GROUP BY grande_area
            ORDER BY grande_area
        """,
        "area": """
            SELECT area_conhecimento AS key, area_conhecimento AS label, COUNT(*) AS count
            FROM pesquisador
            WHERE area_conhecimento IS NOT NULL AND area_conhecimento != ''
            GROUP BY area_conhecimento
            ORDER BY area_conhecimento
        """,
        "subtype": """
            SELECT tipo AS key, tipo AS label, COUNT(*) AS count
            FROM producao
            WHERE tipo IS NOT NULL AND tipo != ''
            GROUP BY tipo
            ORDER BY tipo
        """,
    }
    labels = {
        "year": "Ano",
        "institution": "Instituição",
        "largeArea": "Grande área",
        "area": "Área de conhecimento",
        "subtype": "Tipo de produção",
    }
    output = []
    for facet_id, sql in facet_queries.items():
        values = [
            {
                "key": str(row["key"]),
                "label": display_label(row["label"]),
                "count": int(row["count"]),
                "source": "lattes",
            }
            for row in query_rows(sql)
            if row.get("key")
        ]
        output.append(
            {
                "id": facet_id,
                "key": facet_id,
                "label": labels[facet_id],
                "values": values,
            }
        )
    return output


def list_local_facets_for_search(
    query: str = "",
    filters: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    def display_label(value: Any) -> str:
        text = str(value or "").replace("_", " ").strip()
        return text.title() if text.isupper() or "_" in text else text

    facet_fields = {
        "year": ("p.ano::text", "p.ano::text", "Ano"),
        "institution": ("pes.instituicao", "pes.instituicao", "Instituição"),
        "largeArea": ("pes.grande_area", "pes.grande_area", "Grande área"),
        "area": ("pes.area_conhecimento", "pes.area_conhecimento", "Área de conhecimento"),
        "subtype": ("p.tipo", "p.tipo", "Tipo de produção"),
    }

    output = []
    for facet_id, (key_sql, label_sql, label) in facet_fields.items():
        scoped_filters = {k: v for k, v in (filters or {}).items() if k != facet_id}
        where_clauses, params = _search_clauses(query, scoped_filters)
        where_clauses.append(f"{key_sql} IS NOT NULL")
        where_clauses.append(f"{key_sql} != ''")
        where_sql = f"WHERE {' AND '.join(where_clauses)}"
        rows = query_rows(
            f"""
            SELECT {key_sql} AS key, {label_sql} AS label, COUNT(*) AS count
            FROM producao p
            JOIN pesquisador pes ON p.id_pesquisador = pes.id_pesquisador
            {where_sql}
            GROUP BY 1, 2
            ORDER BY count DESC, label ASC
            LIMIT 80
            """,
            tuple(params),
        )
        output.append(
            {
                "id": facet_id,
                "key": facet_id,
                "label": label,
                "values": [
                    {
                        "key": str(row["key"]),
                        "label": display_label(row["label"]),
                        "count": int(row["count"]),
                        "source": "lattes",
                    }
                    for row in rows
                    if row.get("key")
                ],
            }
        )
    return output

