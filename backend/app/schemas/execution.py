from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field


NodeType = Literal["text", "image", "video", "audio", "asset"]
NodeStatus = Literal["idle", "queued", "running", "done", "failed"]


class NodeExecutionRequest(BaseModel):
    project_id: str | None = Field(default=None, alias="projectId")
    node_id: str = Field(alias="nodeId")
    node_type: NodeType = Field(alias="nodeType")
    title: str
    prompt: str | None = None
    content: str | None = None
    description: str | None = None
    model: str | None = None
    upstream_context: list[str] = Field(default_factory=list, alias="upstreamContext")


class NodeExecutionResponse(BaseModel):
    node_id: str = Field(alias="nodeId")
    node_type: NodeType = Field(alias="nodeType")
    status: NodeStatus
    model_used: str | None = Field(default=None, alias="modelUsed")
    output_text: str | None = Field(default=None, alias="outputText")
    error_message: str | None = Field(default=None, alias="errorMessage")
    started_at: str = Field(alias="startedAt")
    completed_at: str = Field(alias="completedAt")

    @classmethod
    def failed(
        cls,
        *,
        node_id: str,
        node_type: NodeType,
        model_used: str | None,
        error_message: str,
    ) -> "NodeExecutionResponse":
        now = datetime.now(UTC).isoformat()
        return cls(
            nodeId=node_id,
            nodeType=node_type,
            status="failed",
            modelUsed=model_used,
            outputText=None,
            errorMessage=error_message,
            startedAt=now,
            completedAt=now,
        )
