import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.modules.executions.routes import service
from app.modules.executions.service import ExecutionService
from app.schemas.execution import NodeExecutionRequest


class ExecutionServiceSmokeTests(unittest.IsolatedAsyncioTestCase):
    async def test_build_prompt_includes_document_and_upstream_context(self) -> None:
        execution_service = ExecutionService()
        prompt = execution_service._build_text_prompt(
            NodeExecutionRequest(
                nodeId="node-1",
                nodeType="text",
                title="脚本整理",
                prompt="整理成三段摘要",
                content="<p>正文内容</p>",
                upstreamContext=["上游一", "上游二"],
            )
        )

        self.assertIn("Node title: 脚本整理", prompt)
        self.assertIn("Node document:\n<p>正文内容</p>", prompt)
        self.assertIn("- 上游一", prompt)
        self.assertIn("- 上游二", prompt)

    async def test_stream_content_keeps_newlines(self) -> None:
        execution_service = ExecutionService()
        normalized = execution_service._normalize_stream_content(["第一段\n", {"text": "第二段"}])
        self.assertEqual(normalized, "第一段\n第二段")


class ExecutionRouteSmokeTests(unittest.TestCase):
    def test_run_node_returns_failed_when_api_key_missing(self) -> None:
        payload = {
            "nodeId": "node-1",
            "nodeType": "text",
            "title": "测试节点",
            "prompt": "输出一段文字",
            "content": "正文",
            "upstreamContext": [],
        }

        with patch.object(service, "api_key", ""):
            client = TestClient(app)
            response = client.post("/api/v1/executions/run-node", json=payload)

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "failed")
        self.assertIn("API key", data["errorMessage"])
