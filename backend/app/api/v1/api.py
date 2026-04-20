from fastapi import APIRouter

from app.modules.executions.routes import router as executions_router
from app.modules.health.routes import router as health_router
from app.modules.projects.routes import router as projects_router

api_router = APIRouter()
api_router.include_router(executions_router, prefix="/executions", tags=["executions"])
api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(projects_router, prefix="/projects", tags=["projects"])
