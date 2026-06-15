from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from backend.core.config import MAX_UPLOAD_BYTES
from backend.core.security import require_admin_token
from backend.services.imports import initialize_database, import_qualis

router = APIRouter()


@router.post("/init-db", dependencies=[Depends(require_admin_token)])
def init_database() -> dict[str, str]:
    try:
        initialize_database()
        return {"message": "Banco de dados inicializado com sucesso."}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/qualis", dependencies=[Depends(require_admin_token)])
def upload_qualis(file: UploadFile = File(...)) -> dict[str, str]:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in {".csv", ".xlsx", ".xls"}:
        raise HTTPException(
            status_code=400,
            detail="Formato inválido. Envie um arquivo CSV ou XLSX.",
        )

    tmp_path = ""
    total_bytes = 0
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            while chunk := file.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail="Arquivo excede o limite de 25 MB.",
                    )
                tmp.write(chunk)
            tmp_path = tmp.name
        import_qualis(tmp_path)
        return {"message": "Qualis CAPES carregado com sucesso."}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)
