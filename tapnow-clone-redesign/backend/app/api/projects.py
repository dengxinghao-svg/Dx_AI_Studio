"""Project API contract placeholders for future persistence wiring."""

from __future__ import annotations

from typing import Any


def save_project_snapshot(project_id: str, snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "snapshot_version": snapshot.get("version"),
        "saved": True,
    }


def load_project_snapshot(project_id: str) -> dict[str, Any]:
    return {
        "project_id": project_id,
        "snapshot": None,
    }
