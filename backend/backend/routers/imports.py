from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.services.imports import initialize_database, import_qualis

router = APIRouter()


@router.post("/init-db")
def init_database() -> dict[str, str]:
    try:
        initialize_database()
        return {"message": "Banco de dados inicializado com sucesso."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/qualis")
def upload_qualis(file: UploadFile = File(...)) -> dict[str, str]:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie um arquivo CSV ou XLSX.",
        )

    tmp_path = ""
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file.file.read())
            tmp_path = tmp.name
        import_qualis(tmp_path)
        return {"message": "Qualis CAPES carregado com sucesso."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
