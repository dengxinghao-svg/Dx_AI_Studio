"""Model catalog API placeholders for later FastAPI wiring."""

from __future__ import annotations

from app.schemas.model_catalog import ModelCatalogResponse
from app.services.model_catalog_service import get_model_catalog


def list_models(node_type: str = "image") -> ModelCatalogResponse:
    """Temporary callable endpoint placeholder for later model provider wiring."""

    return get_model_catalog(node_type)

