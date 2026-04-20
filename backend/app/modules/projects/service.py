from datetime import UTC, datetime
from uuid import uuid4

from app.modules.projects.repository import ProjectRepository


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ProjectService:
    def __init__(self, repository: ProjectRepository | None = None) -> None:
        self.repository = repository or ProjectRepository()

    def list_projects(self) -> list[dict]:
        return self.repository.list_projects()

    def get_project(self, project_id: str) -> dict | None:
        return self.repository.get_project(project_id)

    def create_project(self, name: str | None = None) -> dict:
        now = utc_now_iso()
        project = {
            "id": f"project-{uuid4().hex[:12]}",
            "name": name or "Untitled Project",
            "archived": False,
            "created_at": now,
            "updated_at": now,
            "last_opened_at": None,
            "draft_updated_at": None,
        }
        return self.repository.create_project(project)

    def update_project(
        self,
        project_id: str,
        *,
        name: str | None = None,
        archived: bool | None = None,
        last_opened_at: str | None = None,
        draft_updated_at: str | None = None,
    ) -> dict | None:
        payload: dict[str, object] = {"updated_at": utc_now_iso()}
        if name is not None:
            payload["name"] = name
        if archived is not None:
            payload["archived"] = archived
        if last_opened_at is not None:
            payload["last_opened_at"] = last_opened_at
        if draft_updated_at is not None:
            payload["draft_updated_at"] = draft_updated_at
        return self.repository.update_project(project_id, payload)

    def duplicate_project(self, project_id: str) -> dict | None:
        source = self.repository.get_project(project_id)
        if not source:
            return None
        now = utc_now_iso()
        duplicated = {
            "id": f"project-{uuid4().hex[:12]}",
            "name": f'{source["name"]} Copy',
            "archived": False,
            "created_at": now,
            "updated_at": now,
            "last_opened_at": None,
            "draft_updated_at": source.get("draft_updated_at"),
        }
        return self.repository.create_project(duplicated)
