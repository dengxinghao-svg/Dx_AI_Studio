"""Mock workflow execution service for the current prototype phase."""

from __future__ import annotations

import time

from app.schemas.workflow import (
    WorkflowExecutionRequest,
    WorkflowExecutionResponse,
    WorkflowExecutionResult,
)


def execute_workflow(request: WorkflowExecutionRequest) -> WorkflowExecutionResponse:
    now = int(time.time() * 1000)
    results = []
    for node in request.nodes:
        results.append(
            WorkflowExecutionResult(
                node_id=node.id,
                status="done",
                completed_at=now,
                output={
                    "type": node.type,
                    "summary": f"Mock execution completed for {node.title}.",
                },
            )
        )

    return WorkflowExecutionResponse(
        mode=request.mode,
        completed_at=now,
        results=results,
    )
