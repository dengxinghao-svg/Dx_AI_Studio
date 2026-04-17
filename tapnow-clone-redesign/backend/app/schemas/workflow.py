"""Workflow schema skeletons for the Dx_AI_Studio backend."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


NodeStatus = Literal["idle", "queued", "running", "done", "error"]


class WorkflowNodeInput(BaseModel):
    id: str
    title: str
    type: str
    status: NodeStatus = "idle"
    output: Any | None = None


class WorkflowNodePayload(BaseModel):
    id: str
    type: str
    title: str
    prompt: str | None = None
    content: str | None = None
    model: str | None = None
    upstream: list[str] = Field(default_factory=list)
    downstream: list[str] = Field(default_factory=list)
    inputs: list[WorkflowNodeInput] = Field(default_factory=list)


class WorkflowExecutionRequest(BaseModel):
    mode: Literal["node", "chain", "canvas"] = "node"
    root_node_id: str | None = None
    project_id: str | None = None
    nodes: list[WorkflowNodePayload] = Field(default_factory=list)


class WorkflowExecutionResult(BaseModel):
    node_id: str
    status: NodeStatus = "done"
    output: dict[str, Any] | None = None
    completed_at: int


class WorkflowExecutionResponse(BaseModel):
    mode: Literal["node", "chain", "canvas"]
    completed_at: int
    results: list[WorkflowExecutionResult] = Field(default_factory=list)
