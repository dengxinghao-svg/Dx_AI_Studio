from pathlib import Path

from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.responses import Response


class SpaStaticFiles(StaticFiles):
    def __init__(self, directory: str | Path, html: bool = True) -> None:
        super().__init__(directory=str(directory), html=html)
        self.index_path = Path(directory) / "index.html"

    async def get_response(self, path: str, scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code != 404 or not self.index_path.exists():
                raise exc
            return await super().get_response("index.html", scope)
