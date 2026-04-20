from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("")
async def health_check() -> dict[str, object]:
    return {
        "status": "ok",
        "app_env": settings.app_env,
        "has_litellm_key": bool(settings.litellm_api_key),
        "default_models": {
            "text": settings.default_text_model,
            "text_alt": settings.default_text_model_alt,
            "image": settings.default_image_model,
            "video": settings.default_video_model,
        },
    }
