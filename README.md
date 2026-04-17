# Dx_AI_Studio

一个面向 AI 内容生产场景的无限画布工作流原型。当前版本以前端可交互原型为主，包含工作空间页、无限画布编辑器、节点连接/分组、工作流执行面板，以及为后端接入预留的接口骨架。

## 项目概览

- 工作空间页：用于创建、打开、搜索和管理项目
- 无限画布编辑器：支持节点添加、连线、分组、缩略图、右侧属性与执行面板
- 工作流执行：当前为前端 mock 执行，可模拟节点和整条链的运行结果
- 后端骨架：已预留 workflow / project snapshot 相关结构，便于后续接入 FastAPI 和真实模型调用

## 仓库结构

当前仓库的主要代码位于 `tapnow-clone-redesign/` 目录下：

```text
tapnow-clone-redesign/
  frontend/   前端页面、编辑器脚本、样式、项目存储
  backend/    后端接口与服务骨架
  design/     设计说明、阶段交付文档、结构记录
  legacy/     旧版运行文件备份，仅作参考
  tools/      工具目录（当前为空）
  index.html  跳转到工作空间页面
  editor.html 跳转到编辑器页面
```

## 主要入口

- 工作空间入口：`tapnow-clone-redesign/index.html`
- 编辑器入口：`tapnow-clone-redesign/editor.html`
- 工作空间实际页面：`tapnow-clone-redesign/frontend/src/routes/workspace/index.html`
- 编辑器实际页面：`tapnow-clone-redesign/frontend/src/routes/editor/index.html`

## 当前技术形态

- 前端：原生 HTML / CSS / JavaScript
- 状态存储：浏览器 `localStorage`
- 工作流执行：前端 mock API
- 后端：Python 骨架代码，尚未完成真实服务接入

## 如何运行

当前项目不依赖前端构建工具，适合先以静态页面方式查看原型。

### 方式一：直接打开

直接在浏览器中打开：

- `tapnow-clone-redesign/index.html`

### 方式二：使用本地静态服务器

如果你希望更稳定地预览本地资源，建议在仓库根目录启动一个静态服务器，然后访问：

- `/tapnow-clone-redesign/index.html`

例如使用 Python：

```bash
python -m http.server 8000
```

然后在浏览器中打开：

```text
http://localhost:8000/tapnow-clone-redesign/index.html
```

## 当前完成度

目前项目更接近“可交互原型 + 后端预留契约”，已经具备这些基础能力：

- 项目列表与项目切换
- 画布节点创建、移动、选择、连线、分组
- 缩略图、快捷操作、右侧检查面板
- 节点执行状态、运行次数、输出摘要等工作流字段持久化
- 前端 mock 的节点执行与整链执行
- 后端 workflow/schema/service 占位实现

## 当前限制

- 工作流执行仍为 mock，不会真正调用模型或任务系统
- 项目数据当前保存在浏览器本地，不是服务端持久化
- 前端采用 classic script + 全局变量方式组织，后续继续扩展时建议逐步模块化
- 仓库中部分中文文案/文档存在编码清理空间，后续建议统一修正为 UTF-8

## 后续建议

- 接入真实后端接口与项目快照持久化
- 将 mock workflow 替换为真实执行引擎
- 增加 README 中的演示截图与使用流程
- 清理旧版 `legacy/` 目录中不再使用的内容
- 逐步升级前端模块组织方式，降低脚本顺序依赖

## 说明

这个仓库当前更适合作为原型展示、结构演进记录和后续产品化开发基础。如果你要把它发给其他人查看，建议直接发送本仓库链接，并配合截图或演示视频一起说明使用路径。
