"""Workflow API contract placeholders."""

from __future__ import annotations

from app.schemas.workflow import WorkflowExecutionRequest, WorkflowExecutionResponse
from app.services.workflow_service import execute_workflow


def run_workflow(payload: WorkflowExecutionRequest) -> WorkflowExecutionResponse:
    """Temporary callable endpoint placeholder for later FastAPI wiring."""

    return execute_workflow(payload)
