# Backend Scaffold

当前后端仍然是骨架阶段，但已经为前端无限画布工作流预留了清晰的接口边界。

## 当前文件

- `app/api/projects.py`
  - 项目快照保存 / 读取的占位接口
- `app/api/workflows.py`
  - 工作流执行入口占位
- `app/schemas/workflow.py`
  - 节点执行请求 / 响应 schema
- `app/services/workflow_service.py`
  - 当前 mock 执行逻辑

## 设计目标

后续接入 FastAPI 时，建议优先落这三条接口：

- `POST /api/projects/{project_id}/snapshot`
- `GET /api/projects/{project_id}/snapshot`
- `POST /api/workflows/run`

## 当前前后端关系

现阶段前端已经有一套 mock 工作流执行链：

- 前端入口：`frontend/src/lib/scripts/workflow-api.js`
- 编辑器执行层：`frontend/src/lib/scripts/editor/workflow.js`

后续只需要把 `workflow-api.js` 中的 mock 调用替换成真实 HTTP 请求，并让响应结构对齐 `app/schemas/workflow.py`，就可以平滑切到真实后端。
