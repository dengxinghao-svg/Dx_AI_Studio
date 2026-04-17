# Stage 7-10 Delivery

## Scope

本阶段完成了以下目标：

7. 将编辑器主逻辑拆分为多个模块，并建立统一入口  
8. 拆分编辑器样式，workspace 只保留 `dashboard.css`，editor 只保留编辑器相关 CSS  
9. 执行 dead code audit，迁移不再进入正式运行链的单文件实现与根目录旧资产  
10. 输出交付清单、模块结构、回归结果与未处理风险

## Final Runtime Chain

### Root Shells

- `D:\AI\test\tapnow-clone-redesign\index.html`
- `D:\AI\test\tapnow-clone-redesign\editor.html`

这两个文件仅保留为跳转壳。

### Workspace

- `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\workspace\index.html`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\dashboard.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\dashboard.js`

### Editor

- `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\editor\index.html`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\state.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\history.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\editor-panel.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\connections.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\groups.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\minimap.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\nodes.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\events.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor\editor-main.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor-bridge.js`

## Module Split Result

编辑器主逻辑已经从单文件 `editor.js` 拆为以下模块：

- `state.js`
  - DOM 引用、常量、共享状态、UI 容器构建、公共 helper
- `history.js`
  - 快照记录、撤销、重做
- `editor-panel.js`
  - inspector、文本节点富文本能力、文本全屏文档、AI 面板更新
- `connections.js`
  - 连线几何、hover、高亮、删除、创建
- `groups.js`
  - 打组、解组、颜色、布局、组工具条
- `minimap.js`
  - 缩略图、视口同步、selection box
- `nodes.js`
  - 节点渲染、节点 CRUD、复制粘贴、导入、本地节点行为
- `events.js`
  - 事件绑定
- `editor-main.js`
  - 统一 bootstrap 入口

## Style Split Result

编辑器样式已从单文件拆为聚合入口 + partials：

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor.css`
  - 仅作为聚合入口，顺序导入 partials
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\base.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\minimap.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\nodes.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\inspector.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\canvas-ui.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor\text-doc.css`

`workspace` 页保持只加载 `dashboard.css`，没有引入 editor 样式。

## Dead Code Audit

### Moved To Legacy

以下文件已确认不在正式运行链中，已转移到 legacy：

#### Frontend library legacy

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\legacy\editor.monolith.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\legacy\editor.monolith.css`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\legacy\script.js`

#### Root runtime legacy

- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\app-v2.js`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\script.js`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\style.css`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\dashboard.js`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\dashboard.css`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\editor-bridge.js`
- `D:\AI\test\tapnow-clone-redesign\legacy\root-runtime\project-store.js`

### Removed From Active Chain

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`
  - 原单文件编辑器实现；已由模块入口替代，并保留 legacy 副本

### Removed As Unused

- `GROUP_COLORS`
  - 原位于旧 `editor.js` / 新 `state.js` 中，拆分后确认没有正式引用

## Regression Checks

以下检查已完成：

1. `workspace` 路由 HTML 中引用的 CSS / JS 均存在  
2. `editor` 路由 HTML 中引用的 CSS / JS 均存在  
3. `editor.css` 中所有 `@import` partial 文件均存在  
4. 未发现对旧单文件 `frontend/src/lib/scripts/editor.js` 的正式引用  
5. 根目录旧 JS/CSS 已移出正式运行路径，根目录壳页面保持不变

## Keep / Move / Delete Summary

### Keep

- `frontend/src/routes/workspace/index.html`
- `frontend/src/routes/editor/index.html`
- `frontend/src/lib/scripts/dashboard.js`
- `frontend/src/lib/scripts/editor-bridge.js`
- `frontend/src/lib/scripts/editor/*`
- `frontend/src/lib/stores/project-store.js`
- `frontend/src/lib/styles/dashboard.css`
- `frontend/src/lib/styles/editor.css`
- `frontend/src/lib/styles/editor/*`
- `index.html`
- `editor.html`

### Move To Legacy

- `frontend/src/lib/scripts/editor.js`
- `frontend/src/lib/styles/editor.css` 的原单文件内容
- root 旧版运行资产（见上方 legacy 列表）

### Delete

- 没有直接硬删 root 旧资产
- 仅移除了已确认无引用的 active monolith 文件与未使用常量

## Remaining Risks

1. 编辑器模块拆分目前仍基于 classic script 顺序加载，而不是 ES module  
   - 优点是改动小  
   - 风险是全局命名空间仍然共享，后续还可以继续模块化

2. CSS partial 拆分目前采用“按运行顺序保持层叠行为”的策略  
   - 先保证界面不回归  
   - 后续仍可继续按 feature 重新整理选择器

3. 仍未做浏览器自动化回归  
   - 本次回归以引用链检查和结构核对为主  
   - 建议下一轮补一套最小 UI smoke test

4. 项目中仍可能存在历史阶段遗留的个别文案乱码  
   - 当前正式运行链中，bridge 与主要入口已经清过一轮  
   - 但未对所有业务文案做完整 unicode 清洗

## Suggested Next Step

如果继续优化，建议优先做两件事：

1. 给 editor 增加最小 smoke test（节点创建、连线、打组、文本节点全屏）  
2. 把 classic script 继续收束为真正的 ES module 或构建入口
