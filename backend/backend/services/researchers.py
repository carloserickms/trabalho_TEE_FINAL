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
    output: list[dict[str, Any]] = []
    for researcher in researchers:
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
            WHERE id_pesquisador = %s AND tipo = 'ARTIGO'
            ORDER BY ano DESC NULLS LAST, titulo ASC
            LIMIT 4
            """,
            (researcher["id_pesquisador"],),
        )
        output.append(
            serialize_researcher(
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
            )
        )
    return output


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


def search_productions(query: str, limit: int = 20, mode: str = "hybrid") -> list[dict[str, Any]]:
    q = query.strip()
    if not q:
        return []

    results = query_rows(
        """
        SELECT
            p.*,
            pes.nome_completo AS autor_nome,
            pes.id_lattes,
            ts_rank(
                p.fts_vector,
                plainto_tsquery('portuguese', %s)
            ) AS fulltext_score
        FROM producao p
        JOIN pesquisador pes ON p.id_pesquisador = pes.id_pesquisador
        WHERE p.fts_vector @@ plainto_tsquery('portuguese', %s)
           OR p.titulo ILIKE %s
           OR p.titulo_ingles ILIKE %s
           OR p.palavras_chave ILIKE %s
           OR p.periodico ILIKE %s
           OR p.evento ILIKE %s
        LIMIT %s
        """,
        (q, q, f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", max(limit * 4, limit)),
    )

    for row in results:
        fulltext_score = float(row.get("fulltext_score") or 0)
        semantic_score = _semantic_score(q, row)
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
        serialized.append(serialize_search_result(row))
    return serialized


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

