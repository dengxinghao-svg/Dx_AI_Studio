from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.modules.executions.service import ExecutionService
from app.schemas.execution import NodeExecutionRequest, NodeExecutionResponse

router = APIRouter()
service = ExecutionService()


@router.post("/run-node", response_model=NodeExecutionResponse)
async def run_node(payload: NodeExecutionRequest) -> NodeExecutionResponse:
    return await service.run_node(payload)


@router.post("/run-node/stream")
async def stream_node(payload: NodeExecutionRequest) -> StreamingResponse:
    return StreamingResponse(
        service.stream_node(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
