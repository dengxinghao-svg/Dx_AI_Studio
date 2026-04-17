# Dx_AI_Studio Project Structure

## Overview

当前仓库已经从单文件原型演进为分层前端结构：

- `frontend/`: 正式运行的管理页面与无限画布前端
- `backend/`: 预留的后端骨架
- `design/`: 结构审计、分阶段重构记录与交付文档
- `legacy/`: 已退出正式运行链的旧版脚本与样式备份

## Active Runtime

```text
index.html            -> frontend/src/routes/workspace/index.html
editor.html           -> frontend/src/routes/editor/index.html
```

### Workspace

```text
frontend/src/routes/workspace/index.html
  -> ../../lib/styles/dashboard.css
  -> ../../lib/stores/project-store.js
  -> ../../lib/scripts/dashboard.js
```

### Editor

```text
frontend/src/routes/editor/index.html
  -> ../../lib/styles/editor.css
  -> ../../lib/stores/project-store.js
  -> ../../lib/scripts/editor/state.js
  -> ../../lib/scripts/editor/history.js
  -> ../../lib/scripts/editor/editor-panel.js
  -> ../../lib/scripts/editor/connections.js
  -> ../../lib/scripts/editor/groups.js
  -> ../../lib/scripts/editor/minimap.js
  -> ../../lib/scripts/editor/nodes.js
  -> ../../lib/scripts/editor/events.js
  -> ../../lib/scripts/editor/editor-main.js
  -> ../../lib/scripts/editor-bridge.js
```

## Frontend

```text
frontend/
  src/
    routes/
      workspace/
        index.html
      editor/
        index.html
    lib/
      scripts/
        dashboard.js
        editor-bridge.js
        editor/
          state.js
          history.js
          editor-panel.js
          connections.js
          groups.js
          minimap.js
          nodes.js
          events.js
          editor-main.js
      styles/
        dashboard.css
        editor.css              # 聚合入口
        editor/
          base.css
          minimap.css
          nodes.css
          inspector.css
          canvas-ui.css
          text-doc.css
      stores/
        project-store.js
      legacy/
        script.js
        editor.monolith.js
        editor.monolith.css
```

## Backend

```text
backend/
  app/
    api/
    services/
    schemas/
    models/
    core/
```

## Legacy

```text
legacy/
  root-runtime/
    app-v2.js
    script.js
    style.css
    dashboard.js
    dashboard.css
    editor-bridge.js
    project-store.js
```

这些文件已经退出正式运行链，仅作为回溯参考保留。
