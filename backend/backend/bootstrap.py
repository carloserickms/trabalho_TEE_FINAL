from __future__ import annotations

import glob
import logging
import os
import sys
import time

import psycopg2

from backend.services.imports import initialize_database
from etl_lattes import get_connection, load_xml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bootstrap")

CURRICULOS_DIR = "/app/curriculos"
RETRY_DELAY = 2
MAX_RETRIES = 30


def wait_for_db() -> None:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            conn = get_connection()
            conn.close()
            log.info("Banco de dados disponível.")
            return
        except psycopg2.OperationalError as exc:
            log.warning(
                "Aguardando banco de dados (tentativa %d/%d): %s",
                attempt,
                MAX_RETRIES,
                exc,
            )
            time.sleep(RETRY_DELAY)
    log.error("Banco de dados não ficou disponível após %d tentativas.", MAX_RETRIES)
    sys.exit(1)


def has_data() -> bool:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM pesquisador")
            count = cur.fetchone()[0]
            return count > 0
    finally:
        conn.close()


def load_curriculos() -> None:
    xmls = sorted(glob.glob(os.path.join(CURRICULOS_DIR, "*.xml")))
    if not xmls:
        log.warning("Nenhum arquivo .xml encontrado em: %s", CURRICULOS_DIR)
        return

    log.info("Encontrados %d currículo(s) para importar.", len(xmls))
    for xml_path in xmls:
        conn = get_connection()
        try:
            load_xml(xml_path, conn)
        except Exception as exc:
            log.error("Erro ao processar %s: %s", xml_path, exc)
        finally:
            conn.close()
    log.info("Importação dos currículos concluída.")


def main() -> None:
    log.info("--- Bootstrap iniciado ---")
    wait_for_db()

    log.info("Criando/esquematizando tabelas...")
    initialize_database()

    if has_data():
        log.info("Banco já contém dados. Pulando importação dos currículos.")
    else:
        log.info("Banco vazio. Iniciando importação dos currículos...")
        load_curriculos()

    log.info("--- Bootstrap concluído ---")


if __name__ == "__main__":
    main()
