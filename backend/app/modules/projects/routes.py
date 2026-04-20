from fastapi import APIRouter, HTTPException, status

from app.modules.projects.service import ProjectService
from app.schemas.project import CreateProjectRequest, ProjectResponse, UpdateProjectRequest

router = APIRouter()
service = ProjectService()


@router.get("", response_model=list[ProjectResponse])
async def list_projects() -> list[ProjectResponse]:
    return [ProjectResponse.model_validate(project) for project in service.list_projects()]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: CreateProjectRequest) -> ProjectResponse:
    project = service.create_project(name=payload.name)
    return ProjectResponse.model_validate(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str) -> ProjectResponse:
    project = service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, payload: UpdateProjectRequest) -> ProjectResponse:
    project = service.update_project(
        project_id,
        name=payload.name,
        archived=payload.archived,
        last_opened_at=payload.last_opened_at,
        draft_updated_at=payload.draft_updated_at,
    )
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.post("/{project_id}/duplicate", response_model=ProjectResponse)
async def duplicate_project(project_id: str) -> ProjectResponse:
    project = service.duplicate_project(project_id)
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectResponse.model_validate(project)
