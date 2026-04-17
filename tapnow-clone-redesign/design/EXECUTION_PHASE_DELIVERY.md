# 执行层交付说明

## 本轮目标

这次交付的重点，是把当前项目从“可交互原型”继续推进到“具备基础工作流执行语义的无限画布编辑器”。

## 本轮完成内容

### 1. 工作流执行层

新增前端 mock 执行 API：

- `frontend/src/lib/scripts/workflow-api.js`

新增编辑器工作流模块：

- `frontend/src/lib/scripts/editor/workflow.js`

当前已支持：

- 执行当前节点
- 执行整条链
- 重置工作流状态
- 节点状态流转：
  - `idle`
  - `queued`
  - `running`
  - `done`
  - `error`
- 自动收集上游输入
- 自动写入节点输出
- 在右侧工作台展示运行信息

### 2. 编辑器 UI 接入

编辑器页新增了工作流执行相关 UI：

- 执行当前节点按钮
- 执行整条链按钮
- 重置状态按钮
- 右侧“工作流执行”信息卡片

入口文件：

- `frontend/src/routes/editor/index.html`

### 3. 数据持久化增强

节点快照现在会保存这些工作流字段：

- `status`
- `inputs`
- `output`
- `error`
- `lastRunAt`
- `runCount`
- `upstream`
- `downstream`

相关文件：

- `frontend/src/lib/scripts/editor/state.js`
- `frontend/src/lib/scripts/editor/history.js`
- `frontend/src/lib/stores/project-store.js`

### 4. 编辑页桥接修复

已重写：

- `frontend/src/lib/scripts/editor-bridge.js`

修复点：

- 不再依赖隐式 `project` 闭包
- 改为显式使用模块级 `currentProject`
- 编辑页标题、返回、快照持久化、语言切换更稳定
- 新增工作流相关按钮和文案的桥接

### 5. 后端骨架预留

后端已补齐第一版接口骨架：

- `backend/app/schemas/workflow.py`
- `backend/app/services/workflow_service.py`
- `backend/app/api/workflows.py`
- `backend/app/api/projects.py`

## 当前正式运行链路

### 根目录壳页

- `index.html`
- `editor.html`

这两个文件只负责跳转。

### 管理页面

- `frontend/src/routes/workspace/index.html`
- `frontend/src/lib/styles/dashboard.css`
- `frontend/src/lib/stores/project-store.js`
- `frontend/src/lib/scripts/dashboard.js`

### 无限画布

- `frontend/src/routes/editor/index.html`
- `frontend/src/lib/styles/editor.css`
- `frontend/src/lib/stores/project-store.js`
- `frontend/src/lib/scripts/workflow-api.js`
- `frontend/src/lib/scripts/editor/*.js`
- `frontend/src/lib/scripts/editor-bridge.js`

## 本轮结构检查结果

已确认以下文件存在且在正式运行链中：

- `frontend/src/routes/editor/index.html`
- `frontend/src/lib/scripts/workflow-api.js`
- `frontend/src/lib/scripts/editor/workflow.js`
- `frontend/src/lib/scripts/editor/editor-main.js`
- `frontend/src/lib/scripts/editor-bridge.js`
- `frontend/src/lib/stores/project-store.js`
- `backend/app/schemas/workflow.py`
- `backend/app/services/workflow_service.py`
- `backend/app/api/workflows.py`
- `backend/app/api/projects.py`

## 当前仍然保留的风险

1. 这次完成的是结构级与代码级交付，不是浏览器自动化回归。
2. 工作流执行目前仍是 mock 执行，不会真正调用模型。
3. 编辑器部分历史脚本文件里仍可能残留少量旧文案，后续建议继续做一轮统一清洗。
4. 当前脚本仍以 classic script 顺序加载为主，尚未升级到 ES module / 构建产物。
