from pydantic import BaseModel, ConfigDict


class CreateProjectRequest(BaseModel):
    name: str | None = None


class UpdateProjectRequest(BaseModel):
    name: str | None = None
    archived: bool | None = None
    last_opened_at: str | None = None
    draft_updated_at: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    archived: bool
    created_at: str
    updated_at: str
    last_opened_at: str | None = None
    draft_updated_at: str | None = None
