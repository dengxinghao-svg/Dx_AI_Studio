from app.core.db import get_connection


class ProjectRepository:
    def list_projects(self) -> list[dict]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT id, name, archived, created_at, updated_at, last_opened_at, draft_updated_at
                FROM projects
                ORDER BY archived ASC, updated_at DESC, created_at DESC
                """
            ).fetchall()
        return [dict(row) for row in rows]

    def get_project(self, project_id: str) -> dict | None:
        with get_connection() as connection:
            row = connection.execute(
                """
                SELECT id, name, archived, created_at, updated_at, last_opened_at, draft_updated_at
                FROM projects
                WHERE id = ?
                """,
                (project_id,),
            ).fetchone()
        return dict(row) if row else None

    def create_project(self, project: dict) -> dict:
        with get_connection() as connection:
            connection.execute(
                """
                INSERT INTO projects (id, name, archived, created_at, updated_at, last_opened_at, draft_updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project["id"],
                    project["name"],
                    int(project["archived"]),
                    project["created_at"],
                    project["updated_at"],
                    project["last_opened_at"],
                    project["draft_updated_at"],
                ),
            )
            connection.commit()
        return project

    def update_project(self, project_id: str, payload: dict) -> dict | None:
        current = self.get_project(project_id)
        if not current:
            return None

        merged = {**current, **payload}
        with get_connection() as connection:
            connection.execute(
                """
                UPDATE projects
                SET name = ?, archived = ?, updated_at = ?, last_opened_at = ?, draft_updated_at = ?
                WHERE id = ?
                """,
                (
                    merged["name"],
                    int(bool(merged["archived"])),
                    merged["updated_at"],
                    merged["last_opened_at"],
                    merged["draft_updated_at"],
                    project_id,
                ),
            )
            connection.commit()
        return self.get_project(project_id)
