"""Mock model catalog service for future provider/API replacement."""

from __future__ import annotations

from app.schemas.model_catalog import ModelCatalogResponse, ModelOption, ModelVersion


IMAGE_MODELS = [
    ModelOption(
        id="nano-banana",
        label="Nano-banana",
        available=True,
        versions=[
            ModelVersion(id="nano-banana-pro", label="Pro"),
            ModelVersion(id="nano-banana-1-0", label="1.0"),
            ModelVersion(id="nano-banana-flash", label="Flash"),
        ],
    ),
    ModelOption(
        id="midjourney",
        label="Midjourney",
        available=False,
        description="未开放",
        versions=[
            ModelVersion(id="mj-v7-0", label="MJ V7.0", available=False),
            ModelVersion(id="mj-v6-1", label="MJ V6.1", available=False),
            ModelVersion(id="niji-v6", label="NIJI V6", available=False),
            ModelVersion(id="niji-v7", label="NIJI V7", available=False),
        ],
    ),
    ModelOption(
        id="flux",
        label="FLUX",
        available=False,
        description="未开放",
        versions=[
            ModelVersion(id="flux-2-pro", label="Flux.2-Pro", available=False),
            ModelVersion(id="flux-1-kontext-pro", label="Flux.1 Kontext-Pro", available=False),
        ],
    ),
    ModelOption(
        id="gpt-image",
        label="GPT",
        available=False,
        description="未开放",
        versions=[
            ModelVersion(id="gpt-image-1-5", label="image 1.5", available=False),
            ModelVersion(id="gpt-image-1-0", label="image 1.0", available=False),
        ],
    ),
    ModelOption(
        id="jimeng",
        label="即梦",
        available=False,
        description="未开放",
        versions=[
            ModelVersion(id="jimeng-5-0-lite", label="5.0 Lite", available=False),
            ModelVersion(id="jimeng-4-5", label="4.5", available=False),
            ModelVersion(id="jimeng-4-0-extreme", label="4.0 极速版", available=False),
        ],
    ),
]


def get_model_catalog(node_type: str) -> ModelCatalogResponse:
    if node_type == "image":
        return ModelCatalogResponse(node_type="image", models=IMAGE_MODELS)

    return ModelCatalogResponse(node_type=node_type, models=[])
