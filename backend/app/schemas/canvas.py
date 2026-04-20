from typing import Literal

from pydantic import BaseModel, Field

NodeStatus = Literal["idle", "queued", "running", "done", "failed"]
CanvasNodeType = Literal[
    "note",
    "task",
    "text-gen",
    "image-gen",
    "video-gen",
    "asset",
    "review",
    "decision",
    "template-ref",
]


class CanvasPosition(BaseModel):
    x: float
    y: float


class CanvasNode(BaseModel):
    id: str
    type: CanvasNodeType
    title: str
    description: str | None = None
    position: CanvasPosition
    status: NodeStatus = "idle"
    model: str | None = None


class CanvasEdge(BaseModel):
    id: str
    source: str
    target: str


class CanvasGroup(BaseModel):
    id: str
    title: str
    node_ids: list[str] = Field(default_factory=list, alias="nodeIds")


class CanvasViewport(BaseModel):
    x: float = 0
    y: float = 0
    zoom: float = 1


class CanvasSnapshot(BaseModel):
    version: int = 1
    saved_at: str = Field(alias="savedAt")
    viewport: CanvasViewport
    nodes: list[CanvasNode] = Field(default_factory=list)
    edges: list[CanvasEdge] = Field(default_factory=list)
    groups: list[CanvasGroup] = Field(default_factory=list)
