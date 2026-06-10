from __future__ import annotations

from etl_lattes import get_connection, load_qualis, load_xml, setup_database


def initialize_database() -> None:
    conn = get_connection()
    try:
        setup_database(conn)
    finally:
        conn.close()


def import_curriculum(xml_path: str) -> None:
    conn = get_connection()
    try:
        load_xml(xml_path, conn)
    finally:
        conn.close()


def import_qualis(path: str) -> None:
    conn = get_connection()
    try:
        load_qualis(path, conn)
    finally:
        conn.close()

