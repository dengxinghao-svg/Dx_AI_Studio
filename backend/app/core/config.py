import os
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_ENV_FILE = Path(os.getenv("DX_AI_ENV_FILE", r"D:\AI\.env"))


class Settings(BaseSettings):
    app_name: str = "Dx AI Studio V2 Backend"
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    litellm_base_url: str = Field(
        default="https://llm-proxy.tapsvc.com",
        alias="TAPSVC_LITELLM_BASE_URL",
    )
    litellm_api_key: str = Field(default="", alias="TAPSVC_LITELLM_API_KEY")

    default_text_model: str = Field(default="gpt-5.4", alias="DEFAULT_TEXT_MODEL")
    default_text_model_alt: str = Field(
        default="gemini-3.1-pro-preview",
        alias="DEFAULT_TEXT_MODEL_ALT",
    )
    default_image_model: str = Field(
        default="gemini-3-pro-image-preview",
        alias="DEFAULT_IMAGE_MODEL",
    )
    default_video_model: str = Field(
        default="doubao-seedance-2-0-260128",
        alias="DEFAULT_VIDEO_MODEL",
    )

    data_dir: str = Field(default=r"D:\AI\Dx_AI_Studio\data", alias="DATA_DIR")
    asset_dir: str = Field(default=r"D:\AI\Dx_AI_Studio\data\assets", alias="ASSET_DIR")
    output_dir: str = Field(default=r"D:\AI\Dx_AI_Studio\data\outputs", alias="OUTPUT_DIR")
    backup_dir: str = Field(default=r"D:\AI\Dx_AI_Studio\data\backups", alias="BACKUP_DIR")

    model_config = SettingsConfigDict(
        env_file=str(DEFAULT_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
