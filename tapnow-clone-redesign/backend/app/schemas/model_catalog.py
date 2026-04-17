"""Model catalog schema placeholders for future provider wiring."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


NodeCatalogType = Literal["image", "video", "audio", "text"]


class ModelVersion(BaseModel):
    id: str
    label: str
    available: bool = True


class ModelOption(BaseModel):
    id: str
    label: str
    available: bool = True
    description: str | None = None
    versions: list[ModelVersion] = Field(default_factory=list)


class ModelCatalogResponse(BaseModel):
    node_type: NodeCatalogType
    models: list[ModelOption] = Field(default_factory=list)

