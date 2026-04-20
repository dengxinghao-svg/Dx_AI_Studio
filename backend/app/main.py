from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.db import init_db
from app.web import SpaStaticFiles


BACKEND_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIST_DIR = BACKEND_DIR.parent / "frontend" / "dist"


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        summary="M0 scaffold for the personal workflow edition of Dx AI Studio V2.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/system", tags=["system"])
    async def root() -> dict[str, str]:
        return {
            "name": settings.app_name,
            "env": settings.app_env,
            "status": "ok",
        }

    @app.on_event("startup")
    async def on_startup() -> None:
        init_db()

    app.include_router(api_router, prefix="/api/v1")

    if FRONTEND_DIST_DIR.exists():
        app.mount("/", SpaStaticFiles(directory=FRONTEND_DIST_DIR), name="frontend")
    return app


app = create_app()
