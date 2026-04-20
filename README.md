# Dx AI Studio

个人工作流版的 AI 无限画布工具。

当前仓库已经替换为 V2 工程，不再是早期的 `tapnow-clone-redesign` 原型目录结构。现在的目标是把旧原型里有效的无限画布交互、文本节点、图片节点能力，逐步收口到一套可持续扩展的前后端工程里。

## 当前状态

当前版本已经完成的主线能力：

- 无限画布基础结构已搭好
- 文本节点已支持正文编辑、富文本工具条、全屏文档模式、流式回写
- 项目草稿支持本地持久化
- 中英文切换已接入
- 单入口 Web 模式已接通
- 图片节点已开始按旧工程能力迁移，已具备：
  - 独立图片节点视图
  - 模型 / 版本 / 比例配置
  - `@` 上游素材引用
  - 顶部图片工具条
  - 全屏 / 裁剪 / 重绘 / 扩图 / 拆分的叠层入口

当前仍在继续收口的部分：

- 图片节点的裁剪 / 重绘等真实编辑逻辑
- 旧工程无限画布快捷键和交互的完全一致性
- 连线规则、右键上传入口、缩略图交互的最后一轮对齐
- 文本节点阅读态 / 编辑态进一步靠近网页 GPT / Gemini 的排版体验

## 技术栈

### 前端

- React 19
- TypeScript
- Vite
- React Flow
- Dexie
- Zustand
- React Query

### 后端

- FastAPI
- Python 3.13
- uv
- SQLite（本地项目数据）

### 模型接入

默认按公司 LiteLLM Proxy 方式接入，后端从本地环境文件读取配置。

## 目录结构

```text
backend/    FastAPI 后端
frontend/   React + TypeScript 前端
docs/       架构和阶段说明
scripts/    Web 模式启动脚本
.env.example
build-web.bat
start-web.bat
README.md
```

## 本地环境

后端默认从以下文件读取运行配置：

- `D:\AI\.env`

如需改路径，可通过环境变量覆盖：

- `DX_AI_ENV_FILE`

建议 `.env` 至少包含：

```env
TAPSVC_LITELLM_BASE_URL=https://llm-proxy.tapsvc.com
TAPSVC_LITELLM_API_KEY=your_key_here

DEFAULT_TEXT_MODEL=gpt-5.4
DEFAULT_TEXT_MODEL_ALT=gemini-3.1-pro-preview
DEFAULT_IMAGE_MODEL=gemini-3-pro-image-preview
DEFAULT_VIDEO_MODEL=doubao-seedance-2-0-260128
```

## 启动方式

### 前端开发模式

```powershell
cd D:\AI\test\frontend
pnpm dev
```

### 后端开发模式

```powershell
cd D:\AI\test\backend
uv run uvicorn app.main:app --reload
```

### 单入口 Web 模式

这个模式会先构建前端，再由 FastAPI 统一托管。

```powershell
cd D:\AI\test
.\build-web.bat
.\start-web.bat
```

浏览器打开：

- `http://127.0.0.1:8000`

## 常用命令

### 前端

```powershell
cd D:\AI\test\frontend
pnpm lint
pnpm build
pnpm test
```

### 后端

```powershell
cd D:\AI\test\backend
uv run python -m unittest
```

## 当前工程原则

当前工程按以下方向维护：

- 旧原型能力要迁移，但不把旧代码整块搬进来
- 新功能优先拆成模块，不继续堆进画布主文件
- 文本节点、图片节点、执行链、快捷键、浮层布局分别收口
- 前端样式按功能拆文件，不把所有 CSS 再堆回全局

## 后续开发重点

近期优先级：

1. 继续完成图片节点与旧工程的能力对齐
2. 把无限画布操作和快捷键完全拉齐旧工程
3. 收口图片编辑叠层的真实交互
4. 再推进文本节点阅读态 / 编辑态分离

## 说明

仓库里可能仍保留一些本地忽略目录作为开发过程副本或缓存，但它们不会进入 Git 版本管理。
