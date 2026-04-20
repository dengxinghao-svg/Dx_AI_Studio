import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import httpx

from app.core.config import settings
from app.schemas.execution import NodeExecutionRequest, NodeExecutionResponse


class ExecutionService:
    def __init__(self) -> None:
        self.base_url = settings.litellm_base_url.rstrip("/")
        self.api_key = settings.litellm_api_key

    async def run_node(self, payload: NodeExecutionRequest) -> NodeExecutionResponse:
        model = payload.model or self._get_default_model(payload.node_type)
        started_at = datetime.now(UTC).isoformat()

        if payload.node_type != "text":
            return NodeExecutionResponse.failed(
                node_id=payload.node_id,
                node_type=payload.node_type,
                model_used=model,
                error_message="This node type is not wired yet. Text execution is available first.",
            )

        if not self.api_key:
            return NodeExecutionResponse.failed(
                node_id=payload.node_id,
                node_type=payload.node_type,
                model_used=model,
                error_message="LiteLLM API key is missing in the backend environment.",
            )

        prompt = self._build_text_prompt(payload)

        try:
            output_text = await self._run_text_completion(model=model, prompt=prompt)
        except httpx.HTTPError as exc:
            return NodeExecutionResponse.failed(
                node_id=payload.node_id,
                node_type=payload.node_type,
                model_used=model,
                error_message=f"LiteLLM request failed: {exc}",
            )
        except ValueError as exc:
            return NodeExecutionResponse.failed(
                node_id=payload.node_id,
                node_type=payload.node_type,
                model_used=model,
                error_message=str(exc),
            )

        return NodeExecutionResponse(
            nodeId=payload.node_id,
            nodeType=payload.node_type,
            status="done",
            modelUsed=model,
            outputText=output_text,
            errorMessage=None,
            startedAt=started_at,
            completedAt=datetime.now(UTC).isoformat(),
        )

    async def stream_node(self, payload: NodeExecutionRequest) -> AsyncIterator[str]:
        model = payload.model or self._get_default_model(payload.node_type)
        started_at = datetime.now(UTC).isoformat()

        if payload.node_type != "text":
            yield self._format_sse(
                {
                    "type": "error",
                    **NodeExecutionResponse.failed(
                        node_id=payload.node_id,
                        node_type=payload.node_type,
                        model_used=model,
                        error_message="This node type is not wired yet. Text execution is available first.",
                    ).model_dump(by_alias=True),
                }
            )
            return

        if not self.api_key:
            yield self._format_sse(
                {
                    "type": "error",
                    **NodeExecutionResponse.failed(
                        node_id=payload.node_id,
                        node_type=payload.node_type,
                        model_used=model,
                        error_message="LiteLLM API key is missing in the backend environment.",
                    ).model_dump(by_alias=True),
                }
            )
            return

        prompt = self._build_text_prompt(payload)
        accumulated_text = ""

        try:
            async for chunk in self._run_text_completion_stream(model=model, prompt=prompt):
                if not chunk:
                    continue
                accumulated_text += chunk
                yield self._format_sse(
                    {
                        "type": "chunk",
                        "chunk": chunk,
                        "accumulatedText": accumulated_text,
                        "modelUsed": model,
                    }
                )
        except httpx.HTTPError as exc:
            yield self._format_sse(
                {
                    "type": "error",
                    **NodeExecutionResponse.failed(
                        node_id=payload.node_id,
                        node_type=payload.node_type,
                        model_used=model,
                        error_message=f"LiteLLM request failed: {exc}",
                    ).model_dump(by_alias=True),
                }
            )
            return
        except ValueError as exc:
            yield self._format_sse(
                {
                    "type": "error",
                    **NodeExecutionResponse.failed(
                        node_id=payload.node_id,
                        node_type=payload.node_type,
                        model_used=model,
                        error_message=str(exc),
                    ).model_dump(by_alias=True),
                }
            )
            return

        response = NodeExecutionResponse(
            nodeId=payload.node_id,
            nodeType=payload.node_type,
            status="done",
            modelUsed=model,
            outputText=accumulated_text.strip() or None,
            errorMessage=None,
            startedAt=started_at,
            completedAt=datetime.now(UTC).isoformat(),
        )
        yield self._format_sse({"type": "done", **response.model_dump(by_alias=True)})

    async def _run_text_completion(self, *, model: str, prompt: str) -> str:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=90) as client:
            response = await client.post(
                "/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are helping inside a personal workflow canvas. "
                                "Produce practical, well-structured output in the same language "
                                "as the user's prompt unless explicitly asked otherwise."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            response.raise_for_status()

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise ValueError("LiteLLM returned no choices.")

        message = choices[0].get("message") or {}
        content = message.get("content")
        normalized = self._normalize_content(content)
        if not normalized:
            raise ValueError("LiteLLM returned an empty message.")
        return normalized

    async def _run_text_completion_stream(self, *, model: str, prompt: str) -> AsyncIterator[str]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=180) as client:
            async with client.stream(
                "POST",
                "/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "stream": True,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are helping inside a personal workflow canvas. "
                                "Produce practical, well-structured output in the same language "
                                "as the user's prompt unless explicitly asked otherwise."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                },
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue

                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break

                    data = json.loads(payload)
                    choices = data.get("choices") or []
                    if not choices:
                        continue

                    delta = choices[0].get("delta") or {}
                    content = self._normalize_stream_content(delta.get("content"))
                    if content:
                        yield content

    def _build_text_prompt(self, payload: NodeExecutionRequest) -> str:
        sections = [
            f"Node title: {payload.title}",
            f"Node description: {payload.description or ''}",
            f"Node prompt: {payload.prompt or ''}",
        ]

        if payload.content and payload.content.strip():
            sections.append(f"Node document:\n{payload.content.strip()}")

        if payload.upstream_context:
            context = "\n".join(f"- {item}" for item in payload.upstream_context if item.strip())
            if context:
                sections.append(f"Upstream context:\n{context}")

        sections.append(
            "Please generate the best next output for this node. Prefer a concise, actionable result."
        )
        return "\n\n".join(section for section in sections if section.strip())

    def _get_default_model(self, node_type: str) -> str:
        if node_type == "text":
            return settings.default_text_model
        if node_type == "image":
            return settings.default_image_model
        if node_type == "video":
            return settings.default_video_model
        return settings.default_text_model

    @staticmethod
    def _normalize_content(content: object) -> str:
        if isinstance(content, str):
            return content.strip()

        if isinstance(content, dict):
            text = content.get("text")
            if isinstance(text, str):
                return text.strip()

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                    continue
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "\n".join(part.strip() for part in parts if part and part.strip()).strip()

        return ""

    @staticmethod
    def _normalize_stream_content(content: object) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, dict):
            text = content.get("text")
            if isinstance(text, str):
                return text

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                    continue
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "".join(parts)

        return ""

    @staticmethod
    def _format_sse(payload: dict[str, object]) -> str:
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
