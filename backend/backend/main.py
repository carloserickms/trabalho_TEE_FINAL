from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import get_cors_origins
from backend.routers.analytics import router as analytics_router
from backend.routers.capes import router as capes_router
from backend.routers.combined import router as combined_router
from backend.routers.embeddings import router as embeddings_router
from backend.routers.health import router as health_router
from backend.routers.imports import router as imports_router
from backend.routers.researchers import router as researchers_router
from backend.routers.search import router as search_router

app = FastAPI(title="Scientia Discovery API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(imports_router)
app.include_router(researchers_router)
app.include_router(search_router)
app.include_router(analytics_router)
app.include_router(capes_router)
app.include_router(combined_router)
app.include_router(embeddings_router)

