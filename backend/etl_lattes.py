"""
etl_lattes.py
=============
ETL – Extração, Transformação e Carga dos Currículos Lattes (XML) para PostgreSQL.
Integra dados do Qualis CAPES (CSV/XLSX) via ISSN.

Dependências:
    pip install psycopg2-binary pandas openpyxl lxml

Uso:
    # Processar um único XML
    python etl_lattes.py --xml curriculos/1234567890.xml

    # Processar uma pasta inteira de XMLs
    python etl_lattes.py --dir curriculos/

    # Carregar Qualis CAPES
    python etl_lattes.py --qualis qualis_capes_2017_2020.csv

    # Tudo junto
    python etl_lattes.py --dir curriculos/ --qualis qualis_capes.csv
"""

import argparse
import glob
import logging
import os
import sys
import uuid
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

import psycopg2
import psycopg2.extras
import pandas as pd
from lxml import etree

from backend.core.config import get_database_config

# ---------------------------------------------------------------------------
# Configuração de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configurações de conexão (ajuste conforme seu ambiente / .env)
# ---------------------------------------------------------------------------
DB_CONFIG = get_database_config()

# ---------------------------------------------------------------------------
# DDL – criação das tabelas (executado na primeira vez)
# ---------------------------------------------------------------------------
DDL = """
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ------------------------------------------------------------------ PESQUISADOR
CREATE TABLE IF NOT EXISTS pesquisador (
    id_pesquisador   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    id_lattes        VARCHAR(16)  UNIQUE NOT NULL,
    nome_completo    VARCHAR(300) NOT NULL,
    nome_citacao     TEXT,
    orcid_id         VARCHAR(50),
    resumo_cv        TEXT,
    data_atualizacao DATE,
    instituicao      VARCHAR(300),
    uf               VARCHAR(2),
    cidade           VARCHAR(100),
    grande_area      VARCHAR(200),
    area_conhecimento VARCHAR(200),
    subarea_conhecimento VARCHAR(200)
);

-- ------------------------------------------------------------------ PRODUCAO
CREATE TABLE IF NOT EXISTS producao (
    id_producao      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    id_pesquisador   UUID         NOT NULL REFERENCES pesquisador(id_pesquisador) ON DELETE CASCADE,
    tipo             VARCHAR(50)  NOT NULL,   -- ARTIGO | EVENTO | LIVRO | CAPITULO
    titulo           TEXT         NOT NULL,
    titulo_ingles    TEXT,
    ano              INTEGER,
    doi              VARCHAR(500),
    idioma           VARCHAR(50),
    periodico        VARCHAR(300),            -- para artigos
    issn             VARCHAR(20),             -- para artigos
    evento           VARCHAR(300),            -- para trabalhos em eventos
    isbn             VARCHAR(30),             -- para livros/capítulos
    pagina_inicial   VARCHAR(30),
    pagina_final     VARCHAR(30),
    volume           VARCHAR(20),
    numero           VARCHAR(20),
    palavras_chave   TEXT,                    -- concatenadas com "; "
    qualis           VARCHAR(10),             -- preenchido após carga do Qualis
    fts_vector       TSVECTOR                 -- atualizado por trigger
);

-- Índice GIN para Full-Text Search
CREATE INDEX IF NOT EXISTS idx_producao_fts
    ON producao USING GIN (fts_vector);

-- Trigger que mantém fts_vector atualizado automaticamente
CREATE OR REPLACE FUNCTION producao_fts_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.fts_vector :=
        setweight(to_tsvector('portuguese', coalesce(NEW.titulo,        '')), 'A') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.titulo_ingles,  '')), 'B') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.palavras_chave, '')), 'C') ||
        setweight(to_tsvector('portuguese', coalesce(NEW.periodico,      '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_producao_fts ON producao;
CREATE TRIGGER trg_producao_fts
    BEFORE INSERT OR UPDATE ON producao
    FOR EACH ROW EXECUTE FUNCTION producao_fts_update();

-- ------------------------------------------------------------------ QUALIS
CREATE TABLE IF NOT EXISTS qualis_capes (
    id_qualis   SERIAL       PRIMARY KEY,
    issn        VARCHAR(20)  NOT NULL,
    titulo      VARCHAR(500),
    estrato     VARCHAR(10)  NOT NULL,        -- A1, A2, B1 ... C
    area        VARCHAR(200),
    quadrienio  VARCHAR(10)                   -- ex: 2017-2020
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualis_issn_area
    ON qualis_capes (issn, area, quadrienio);
"""


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------


def _attr(element, name: str, default: str = "") -> str:
    """Retorna o valor de um atributo XML tratando None."""
    return (element.get(name) or default).strip()


def _first(root, xpath: str):
    """Retorna o primeiro elemento encontrado ou None."""
    results = root.xpath(xpath)
    return results[0] if results else None


def _parse_date(ddmmaaaa: str):
    """Converte 'DDMMAAAA' para objeto date ou None."""
    if not ddmmaaaa or len(ddmmaaaa) != 8:
        return None
    try:
        from datetime import date

        return date(int(ddmmaaaa[4:]), int(ddmmaaaa[2:4]), int(ddmmaaaa[:2]))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Extração do XML do Currículo Lattes
# ---------------------------------------------------------------------------


def parse_lattes_xml(xml_path: str) -> dict:
    """
    Lê um arquivo XML do Currículo Lattes e retorna um dicionário com:
      - pesquisador: dict com dados do pesquisador
      - producoes: list[dict] com todas as produções bibliográficas
    """
    try:
        tree = etree.parse(xml_path)
    except etree.XMLSyntaxError as exc:
        log.error("XML inválido em %s: %s", xml_path, exc)
        return {}

    root = tree.getroot()

    # ---- Dados do pesquisador ------------------------------------------------
    id_lattes = _attr(root, "NUMERO-IDENTIFICADOR")
    data_atu = _parse_date(_attr(root, "DATA-ATUALIZACAO"))

    dg = root.find("DADOS-GERAIS")
    if dg is None:
        log.warning("DADOS-GERAIS ausente em %s", xml_path)
        return {}

    resumo_el = dg.find("RESUMO-CV")
    resumo = _attr(resumo_el, "TEXTO-RESUMO-CV-RH") if resumo_el is not None else ""

    # Endereço profissional (primeira entrada)
    end_prof = _first(dg, ".//ENDERECO-PROFISSIONAL")
    instituicao = (
        _attr(end_prof, "NOME-INSTITUICAO-EMPRESA") if end_prof is not None else ""
    )
    uf = _attr(end_prof, "UF") if end_prof is not None else ""
    cidade = _attr(end_prof, "CIDADE") if end_prof is not None else ""

    pesquisador = {
        "id_lattes": id_lattes,
        "nome_completo": _attr(dg, "NOME-COMPLETO"),
        "nome_citacao": _attr(dg, "NOME-EM-CITACOES-BIBLIOGRAFICAS"),
        "orcid_id": _attr(dg, "ORCID-ID"),
        "resumo_cv": resumo,
        "data_atualizacao": data_atu,
        "instituicao": instituicao,
        "uf": uf,
        "cidade": cidade,
        "grande_area": "",
        "area_conhecimento": "",
        "subarea_conhecimento": "",
    }

    area_el = _first(dg, ".//AREAS-DE-ATUACAO/AREA-DE-ATUACAO")
    if area_el is not None:
        pesquisador["grande_area"] = _attr(area_el, "NOME-GRANDE-AREA-DO-CONHECIMENTO")
        pesquisador["area_conhecimento"] = _attr(area_el, "NOME-DA-AREA-DO-CONHECIMENTO")
        pesquisador["subarea_conhecimento"] = _attr(
            area_el, "NOME-DA-SUB-AREA-DO-CONHECIMENTO"
        )

    # ---- Produções bibliográficas --------------------------------------------
    producoes = []
    pb = root.find("PRODUCAO-BIBLIOGRAFICA")
    if pb is None:
        return {"pesquisador": pesquisador, "producoes": producoes}

    # -- Artigos publicados
    for artigo in pb.findall(".//ARTIGO-PUBLICADO"):
        db = artigo.find("DADOS-BASICOS-DO-ARTIGO")
        det = artigo.find("DETALHAMENTO-DO-ARTIGO")
        pk = artigo.find("PALAVRAS-CHAVE")

        if db is None:
            continue

        palavras = (
            "; ".join(
                filter(None, [_attr(pk, f"PALAVRA-CHAVE-{i}") for i in range(1, 7)])
            )
            if pk is not None
            else ""
        )

        producoes.append(
            {
                "tipo": "ARTIGO",
                "titulo": _attr(db, "TITULO-DO-ARTIGO"),
                "titulo_ingles": _attr(db, "TITULO-DO-ARTIGO-INGLES"),
                "ano": int(_attr(db, "ANO-DO-ARTIGO") or 0) or None,
                "doi": _attr(db, "DOI"),
                "idioma": _attr(db, "IDIOMA"),
                "periodico": _attr(det, "TITULO-DO-PERIODICO-OU-REVISTA")
                if det is not None
                else "",
                "issn": _attr(det, "ISSN") if det is not None else "",
                "evento": "",
                "isbn": "",
                "volume": _attr(det, "VOLUME") if det is not None else "",
                "numero": _attr(det, "FASCICULO") if det is not None else "",
                "pagina_inicial": _attr(det, "PAGINA-INICIAL")
                if det is not None
                else "",
                "pagina_final": _attr(det, "PAGINA-FINAL") if det is not None else "",
                "palavras_chave": palavras,
            }
        )

    # -- Trabalhos em eventos
    for trabalho in pb.findall(".//TRABALHO-EM-EVENTOS"):
        db = trabalho.find("DADOS-BASICOS-DO-TRABALHO")
        det = trabalho.find("DETALHAMENTO-DO-TRABALHO")
        pk = trabalho.find("PALAVRAS-CHAVE")

        if db is None:
            continue

        palavras = (
            "; ".join(
                filter(None, [_attr(pk, f"PALAVRA-CHAVE-{i}") for i in range(1, 7)])
            )
            if pk is not None
            else ""
        )

        producoes.append(
            {
                "tipo": "EVENTO",
                "titulo": _attr(db, "TITULO-DO-TRABALHO"),
                "titulo_ingles": _attr(db, "TITULO-DO-TRABALHO-INGLES"),
                "ano": int(_attr(db, "ANO-DO-TRABALHO") or 0) or None,
                "doi": _attr(db, "DOI"),
                "idioma": _attr(db, "IDIOMA"),
                "evento": _attr(det, "NOME-DO-EVENTO") if det is not None else "",
                "isbn": _attr(det, "ISBN") if det is not None else "",
                "volume": _attr(det, "VOLUME") if det is not None else "",
                "pagina_inicial": _attr(det, "PAGINA-INICIAL")
                if det is not None
                else "",
                "pagina_final": _attr(det, "PAGINA-FINAL") if det is not None else "",
                "palavras_chave": palavras,
                "issn": "",
                "periodico": "",
                "numero": _attr(det, "FASCICULO") if det is not None else "",
            }
        )

    # -- Livros e capítulos
    for livro in pb.findall(".//LIVRO-PUBLICADO-OU-ORGANIZADO"):
        db = livro.find("DADOS-BASICOS-DO-LIVRO")
        det = livro.find("DETALHAMENTO-DO-LIVRO")
        pk = livro.find("PALAVRAS-CHAVE")

        if db is None:
            continue

        palavras = (
            "; ".join(
                filter(None, [_attr(pk, f"PALAVRA-CHAVE-{i}") for i in range(1, 7)])
            )
            if pk is not None
            else ""
        )

        producoes.append(
            {
                "tipo": "LIVRO",
                "titulo": _attr(db, "TITULO-DO-LIVRO"),
                "titulo_ingles": _attr(db, "TITULO-DO-LIVRO-INGLES"),
                "ano": int(_attr(db, "ANO") or 0) or None,
                "doi": "",
                "idioma": _attr(db, "IDIOMA"),
                "isbn": _attr(det, "ISBN") if det is not None else "",
                "volume": _attr(det, "NUMERO-DE-VOLUMES") if det is not None else "",
                "palavras_chave": palavras,
                "issn": "",
                "periodico": "",
                "evento": "",
                "numero": "",
                "pagina_inicial": "",
                "pagina_final": "",
            }
        )

    for cap in pb.findall(".//CAPITULO-DE-LIVRO-PUBLICADO"):
        db = cap.find("DADOS-BASICOS-DO-CAPITULO")
        det = cap.find("DETALHAMENTO-DO-CAPITULO")
        pk = cap.find("PALAVRAS-CHAVE")

        if db is None:
            continue

        palavras = (
            "; ".join(
                filter(None, [_attr(pk, f"PALAVRA-CHAVE-{i}") for i in range(1, 7)])
            )
            if pk is not None
            else ""
        )

        producoes.append(
            {
                "tipo": "CAPITULO",
                "titulo": _attr(db, "TITULO-DO-CAPITULO-DO-LIVRO"),
                "titulo_ingles": _attr(db, "TITULO-DO-CAPITULO-DO-LIVRO-INGLES"),
                "ano": int(_attr(db, "ANO") or 0) or None,
                "doi": _attr(db, "DOI"),
                "idioma": _attr(db, "IDIOMA"),
                "isbn": _attr(det, "ISBN") if det is not None else "",
                "pagina_inicial": _attr(det, "PAGINA-INICIAL")
                if det is not None
                else "",
                "pagina_final": _attr(det, "PAGINA-FINAL") if det is not None else "",
                "palavras_chave": palavras,
                "issn": "",
                "periodico": "",
                "evento": "",
                "volume": "",
                "numero": "",
            }
        )

    return {"pesquisador": pesquisador, "producoes": producoes}


# ---------------------------------------------------------------------------
# Carga no banco de dados
# ---------------------------------------------------------------------------


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def setup_database(conn):
    """Cria extensões e tabelas caso ainda não existam."""
    with conn.cursor() as cur:
        cur.execute(DDL)
        cur.execute(
            "ALTER TABLE pesquisador ADD COLUMN IF NOT EXISTS grande_area VARCHAR(200)"
        )
        cur.execute(
            "ALTER TABLE pesquisador ADD COLUMN IF NOT EXISTS area_conhecimento VARCHAR(200)"
        )
        cur.execute(
            "ALTER TABLE pesquisador ADD COLUMN IF NOT EXISTS subarea_conhecimento VARCHAR(200)"
        )
    conn.commit()
    log.info("Banco de dados inicializado com sucesso.")


def upsert_pesquisador(cur, p: dict) -> str:
    """
    Insere ou atualiza o pesquisador pelo id_lattes.
    Retorna o UUID interno do pesquisador.
    """
    cur.execute(
        """
        INSERT INTO pesquisador
            (id_lattes, nome_completo, nome_citacao, orcid_id,
             resumo_cv, data_atualizacao, instituicao, uf, cidade,
             grande_area, area_conhecimento, subarea_conhecimento)
        VALUES
            (%(id_lattes)s, %(nome_completo)s, %(nome_citacao)s, %(orcid_id)s,
             %(resumo_cv)s, %(data_atualizacao)s, %(instituicao)s, %(uf)s, %(cidade)s,
             %(grande_area)s, %(area_conhecimento)s, %(subarea_conhecimento)s)
        ON CONFLICT (id_lattes) DO UPDATE SET
            nome_completo    = EXCLUDED.nome_completo,
            nome_citacao     = EXCLUDED.nome_citacao,
            orcid_id         = EXCLUDED.orcid_id,
            resumo_cv        = EXCLUDED.resumo_cv,
            data_atualizacao = EXCLUDED.data_atualizacao,
            instituicao      = EXCLUDED.instituicao,
            uf               = EXCLUDED.uf,
            cidade           = EXCLUDED.cidade,
            grande_area      = EXCLUDED.grande_area,
            area_conhecimento = EXCLUDED.area_conhecimento,
            subarea_conhecimento = EXCLUDED.subarea_conhecimento
        RETURNING id_pesquisador
    """,
        p,
    )
    return cur.fetchone()[0]


def insert_producoes(cur, id_pesquisador: str, producoes: list[dict]):
    """
    Insere todas as produções de um pesquisador.
    Remove as produções antigas antes para garantir idempotência.
    """
    cur.execute("DELETE FROM producao WHERE id_pesquisador = %s", (id_pesquisador,))

    for prod in producoes:
        prod["id_pesquisador"] = id_pesquisador
        cur.execute(
            """
            INSERT INTO producao
                (id_pesquisador, tipo, titulo, titulo_ingles, ano, doi, idioma,
                 periodico, issn, evento, isbn,
                 pagina_inicial, pagina_final, volume, numero, palavras_chave)
            VALUES
                (%(id_pesquisador)s, %(tipo)s, %(titulo)s, %(titulo_ingles)s,
                 %(ano)s, %(doi)s, %(idioma)s,
                 %(periodico)s, %(issn)s, %(evento)s, %(isbn)s,
                 %(pagina_inicial)s, %(pagina_final)s, %(volume)s,
                 %(numero)s, %(palavras_chave)s)
        """,
            prod,
        )


def load_xml(xml_path: str, conn):
    """Processa um único arquivo XML e persiste no banco."""
    log.info("Processando: %s", xml_path)
    data = parse_lattes_xml(xml_path)

    if not data:
        log.warning("Nenhum dado extraído de %s. Pulando.", xml_path)
        return

    pesquisador = data["pesquisador"]
    producoes = data["producoes"]

    try:
        with conn.cursor() as cur:
            id_pesq = upsert_pesquisador(cur, pesquisador)
            insert_producoes(cur, id_pesq, producoes)
        conn.commit()
        log.info(
            "  → %s | %d produções carregadas.",
            pesquisador["nome_completo"],
            len(producoes),
        )
    except Exception:
        conn.rollback()
        raise


def load_qualis(qualis_path: str, conn, quadrienio: str = "2017-2020"):
    """
    Carrega a tabela Qualis CAPES a partir de CSV ou XLSX.

    Colunas esperadas (case-insensitive):
        ISSN | Título | Estrato | Área de Avaliação
    (O formato oficial da planilha Qualis CAPES usa essas colunas.)
    """
    log.info("Carregando Qualis CAPES de: %s", qualis_path)

    ext = Path(qualis_path).suffix.lower()
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(qualis_path, dtype=str)
    else:
        # Tenta separadores comuns
        try:
            df = pd.read_csv(qualis_path, sep=";", dtype=str, encoding="utf-8")
        except Exception:
            df = pd.read_csv(qualis_path, sep=",", dtype=str, encoding="latin-1")

    # Normaliza nomes de colunas
    df.columns = [c.strip().upper() for c in df.columns]

    # Mapeamento flexível de colunas
    col_map = {}
    for col in df.columns:
        if "ISSN" in col:
            col_map["issn"] = col
        elif (
            "TÍTULO" in col or "TITULO" in col or "PERIODICO" in col or "JOURNAL" in col
        ):
            col_map["titulo"] = col
        elif "ESTRATO" in col or "CLASSIFICAÇÃO" in col or "QUALIS" in col:
            col_map["estrato"] = col
        elif "ÁREA" in col or "AREA" in col:
            col_map["area"] = col

    required = {"issn", "estrato"}
    missing = required - set(col_map.keys())
    if missing:
        raise ValueError(
            f"Colunas obrigatórias não encontradas no arquivo Qualis: {missing}. "
            f"Colunas disponíveis: {list(df.columns)}"
        )

    df = df.rename(columns={v: k for k, v in col_map.items()})
    df = df[list(col_map.keys())].dropna(subset=["issn", "estrato"])
    df["issn"] = df["issn"].str.strip().str.replace("-", "")
    df["estrato"] = df["estrato"].str.strip().str.upper()
    df["quadrienio"] = quadrienio
    df["titulo"] = df.get("titulo", pd.Series([""] * len(df))).fillna("")
    df["area"] = df.get("area", pd.Series([""] * len(df))).fillna("")

    records = df.to_dict("records")

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """
            INSERT INTO qualis_capes (issn, titulo, estrato, area, quadrienio)
            VALUES (%(issn)s, %(titulo)s, %(estrato)s, %(area)s, %(quadrienio)s)
            ON CONFLICT (issn, area, quadrienio) DO UPDATE SET
                estrato = EXCLUDED.estrato,
                titulo  = EXCLUDED.titulo
        """,
            records,
            page_size=500,
        )

    conn.commit()
    log.info("  → %d registros Qualis carregados.", len(records))

    # Atualiza classificação Qualis nas produções já carregadas
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE producao p
            SET    qualis = q.estrato
            FROM   qualis_capes q
            WHERE  p.issn   != ''
              AND  replace(p.issn, '-', '') = q.issn
        """)
    conn.commit()
    log.info("  → Produções atualizadas com classificação Qualis.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_arg_parser():
    parser = argparse.ArgumentParser(
        description="ETL – Lattes XML → PostgreSQL + Qualis CAPES"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--xml",
        metavar="FILE",
        help="Caminho para um único arquivo XML do Currículo Lattes.",
    )
    group.add_argument(
        "--dir",
        metavar="DIR",
        help="Pasta contendo múltiplos arquivos XML do Currículo Lattes.",
    )
    parser.add_argument(
        "--qualis",
        metavar="FILE",
        help="Arquivo CSV ou XLSX com a tabela Qualis CAPES.",
    )
    parser.add_argument(
        "--quadrienio",
        metavar="QUAD",
        default="2017-2020",
        help="Quadriênio de referência do Qualis (padrão: 2017-2020).",
    )
    parser.add_argument(
        "--init-only",
        action="store_true",
        help="Apenas inicializa o banco de dados (cria tabelas) sem processar XMLs.",
    )
    return parser


def main():
    parser = build_arg_parser()
    args = parser.parse_args()

    try:
        conn = get_connection()
        log.info("Conexão com o banco estabelecida.")
    except psycopg2.OperationalError as exc:
        log.error("Não foi possível conectar ao banco: %s", exc)
        sys.exit(1)

    # Inicializa estrutura do banco
    setup_database(conn)

    if args.init_only:
        conn.close()
        return

    # Processa XMLs
    if args.xml:
        load_xml(args.xml, conn)
    elif args.dir:
        xmls = sorted(glob.glob(os.path.join(args.dir, "*.xml")))
        if not xmls:
            log.warning("Nenhum arquivo .xml encontrado em: %s", args.dir)
        else:
            log.info("Encontrados %d arquivo(s) XML.", len(xmls))
            for xml_path in xmls:
                try:
                    load_xml(xml_path, conn)
                except Exception as exc:
                    log.error("Erro ao processar %s: %s", xml_path, exc)

    # Processa Qualis CAPES
    if args.qualis:
        try:
            load_qualis(args.qualis, conn, quadrienio=args.quadrienio)
        except Exception as exc:
            log.error("Erro ao carregar Qualis: %s", exc)

    conn.close()
    log.info("ETL finalizado.")


if __name__ == "__main__":
    main()
