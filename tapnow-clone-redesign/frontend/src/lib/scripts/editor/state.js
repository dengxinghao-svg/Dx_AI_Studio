// Editor module: state, constants, UI scaffolding, and shared helpers

﻿const canvasFrame = document.getElementById("canvasFrame");
const canvasWorld = document.getElementById("canvasWorld");
const canvasGrid = document.querySelector(".canvas-grid");
const connectionsLayer = document.getElementById("connectionsLayer");
const selectionToolbar = document.getElementById("selectionToolbar");
const zoomIndicator = document.getElementById("zoomIndicator");
const zoomSlider = document.getElementById("zoomSlider");
const nodeCount = document.getElementById("nodeCount");
const connectionCount = document.getElementById("connectionCount");
const sessionList = document.getElementById("sessionList");
const workflowStatusValue = document.getElementById("workflowStatusValue");
const workflowUpstreamCount = document.getElementById("workflowUpstreamCount");
const workflowDownstreamCount = document.getElementById("workflowDownstreamCount");
const workflowUpstreamTitles = document.getElementById("workflowUpstreamTitles");
const workflowDownstreamTitles = document.getElementById("workflowDownstreamTitles");
const createAssetBtn = document.getElementById("createAssetBtn");
const addToChatBtn = document.getElementById("addToChatBtn");
const groupNodesBtn = document.getElementById("groupNodesBtn");
const deleteSelectionBtn = document.getElementById("deleteSelectionBtn");
const toggleMinimapBtn = document.getElementById("toggleMinimapBtn");
const snapGridBtn = document.getElementById("snapGridBtn");
const overviewBtn = document.getElementById("overviewBtn");
const minimapPreview = document.getElementById("minimapPreview");
const minimapScene = document.getElementById("minimapScene");
const minimapViewport = document.getElementById("minimapViewport");
const quickAddBtn = document.getElementById("quickAddBtn");
const runBtn = document.getElementById("runBtn");
const shareBtn = document.getElementById("shareBtn");
const runSelectedNodeBtn = document.getElementById("runSelectedNodeBtn");
const runChainBtn = document.getElementById("runChainBtn");
const resetWorkflowBtn = document.getElementById("resetWorkflowBtn");
const shortcutHelpDock = document.getElementById("shortcutHelpDock");
const shortcutHelpBtn = document.getElementById("shortcutHelpBtn");
const shortcutQueryBtn = document.getElementById("shortcutQueryBtn");
const summaryTitle = document.getElementById("summaryTitle");
const summaryMeta = document.getElementById("summaryMeta");
const workflowExecutionMode = document.getElementById("workflowExecutionMode");
const workflowLastRunValue = document.getElementById("workflowLastRunValue");
const workflowRunCountValue = document.getElementById("workflowRunCountValue");
const workflowInputCountValue = document.getElementById("workflowInputCountValue");
const workflowOutputTypeValue = document.getElementById("workflowOutputTypeValue");
const workflowSummaryValue = document.getElementById("workflowSummaryValue");
const workflowErrorValue = document.getElementById("workflowErrorValue");
const workflowOutputPreview = document.getElementById("workflowOutputPreview");

const SNAPSHOT_VERSION = 2;
const DEFAULT_NODE_STATUS = "idle";

const typeConfig = {
  text: {
    badge: "Text",
    title: "文本",
    model: "gpt-4.1",
    prompt: "补充这个序列的镜头逻辑，保持压迫感与神秘氛围。"
  },
  image: {
    badge: "Image",
    title: "图片生成",
    model: "flux-pro",
    prompt: "描述任何你想生成的内容"
  },
  video: {
    badge: "Video",
    title: "Video",
    model: "Kling 3.0 Omni",
    prompt: "描述任何你想生成的视频内容"
  },
  audio: {
    badge: "Audio",
    title: "音频",
    model: "ElevenLabs V3",
    prompt: "输入文本，将其转换为富有表现力的语音"
  }
};

const NODE_CAPABILITY_CONFIG = {
  image: {
    models: ["Banana Pro", "Flux Pro", "Imagen 4"],
    settings: {
      ratio: ["1:1", "16:9", "9:16", "4:3"],
      quality: ["标准", "高清", "4K"],
      style: ["通用", "电影感", "插画", "写实"],
      preset: ["自动", "Sony Veni...", "柔光人像", "产品海报"]
    }
  },
  video: {
    models: ["Kling 3.0 Omni", "Runway Gen-4", "Pika 2.0"],
    settings: {
      mode: ["文生视频", "图生视频", "首尾帧"],
      ratio: ["16:9", "9:16", "1:1"],
      duration: ["3秒", "5秒", "8秒"],
      motion: ["稳定", "平衡", "强运动"]
    }
  },
  audio: {
    models: ["ElevenLabs V3", "Audio Lab", "Voice Prime"],
    settings: {
      mode: ["文本转语音", "旁白", "音效"],
      voice: ["默认", "温和女声", "沉稳男声", "机械感"],
      speed: ["慢速", "标准", "快速"],
      emotion: ["自然", "冷静", "激昂", "神秘"]
    }
  }
};

function getNodeCapabilityConfig(type) {
  return NODE_CAPABILITY_CONFIG[type] || null;
}

function getDefaultNodeSettings(type) {
  const config = getNodeCapabilityConfig(type);
  if (!config) return {};
  return Object.fromEntries(
    Object.entries(config.settings).map(([key, values]) => [key, values[0]])
  );
}

function normalizeNodeSettings(type, settings) {
  const config = getNodeCapabilityConfig(type);
  if (!config) return {};
  const merged = { ...getDefaultNodeSettings(type), ...(settings || {}) };
  Object.entries(config.settings).forEach(([key, values]) => {
    if (!values.includes(merged[key])) {
      merged[key] = values[0];
    }
  });
  return merged;
}

const TEXT_NODE_MIN_WIDTH = 260;
const TEXT_NODE_MIN_HEIGHT = 320;
const TEXT_NODE_DEFAULT_WIDTH = 296;
const TEXT_NODE_DEFAULT_HEIGHT = 378;
const TEXT_NODE_PLACEHOLDER = "开启你的创作...";
const TEXT_AI_PLACEHOLDER = "描述任何你想要生成的内容";
const TEXT_TOOLBAR_ITEMS = [
  { label: "", slot: "color", kind: "swatch", title: "颜色" },
  { label: "H1", slot: "h1", title: "标题 1" },
  { label: "H2", slot: "h2", title: "标题 2" },
  { label: "H3", slot: "h3", title: "标题 3" },
  { label: "¶", slot: "quote", title: "引用" },
  { label: "B", slot: "bold", title: "加粗" },
  { label: "I", slot: "italic", title: "斜体" },
  { label: "≡", slot: "list", title: "列表" },
  { label: "1.", slot: "ordered", title: "编号列表" },
  { label: "—", slot: "divider", title: "分隔线" },
  { label: "⧉", slot: "copy", title: "复制" },
  { label: "⤢", slot: "expand", title: "展开" }
];

const TEXT_BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "LI", "HR"]);
const TEXT_ALLOWED_INLINE_TAGS = new Set(["STRONG", "B", "EM", "I", "BR", "SPAN"]);
const SHORTCUT_GUIDE_GROUPS = [
  {
    title: "基础",
    items: [
      { label: "删除选中节点", keys: ["Del"] },
      { label: "撤销", keys: ["Ctrl", "Z"] },
      { label: "重做", keys: ["Shift", "Ctrl", "Z"] },
      { label: "复制节点", keys: ["Ctrl", "C"] },
      { label: "剪切节点", keys: ["Ctrl", "X"] },
      { label: "粘贴节点", keys: ["Ctrl", "V"] },
      { label: "多选节点", keys: ["Shift", "点击"] }
    ]
  },
  {
    title: "画布",
    items: [
      { label: "按住空格平移画布", keys: ["Space"] },
      { label: "中键拖动画布", keys: ["中键"] },
      { label: "滚轮上下平移画布", keys: ["滚轮"] },
      { label: "按住 Ctrl + 滚轮缩放画布", keys: ["Ctrl", "滚轮"] },
      { label: "按住 Ctrl 放大画布", keys: ["Ctrl", "+"] },
      { label: "按住 Ctrl 缩小画布", keys: ["Ctrl", "-"] }
    ]
  },
  {
    title: "文档",
    items: [
      { label: "文本节点滚轮阅读", keys: ["滚轮"] },
      { label: "退出文档全屏", keys: ["Esc"] }
    ]
  }
];

const state = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  nodes: [],
  connections: [],
  selectedNodeIds: new Set(),
  selectedNodeId: null,
  nodeSeq: 0,
  linkFromNodeId: null,
  isLinkDragging: false,
  linkDragFromNodeId: null,
  linkDragFromSide: null,
  linkDragTargetNodeId: null,
  linkDragTargetSide: null,
  linkPreviewPoint: null,
  hoveredConnectionKey: null,
  hoveredConnectionPoint: null,
  lastWorldPoint: { x: 240, y: 180 },
  contextWorldPoint: { x: 240, y: 180 },
  draggingNodeIds: [],
  dragOriginPositions: new Map(),
  dragStartMouseX: 0,
  dragStartMouseY: 0,
  dragSnapshot: null,
  isDraggingNodes: false,
  nodeMoved: false,
  isSelecting: false,
  selectionStartX: 0,
  selectionStartY: 0,
  selectionCurrentX: 0,
  selectionCurrentY: 0,
  selectionMoved: false,
  suppressCanvasClick: false,
  suppressNodeClick: false,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  snapToGrid: false,
  minimapVisible: true,
  clipboard: null,
  groups: [],
  groupSeq: 0,
  activeGroupId: null,
  hoveredGroupId: null,
  colorMenuMode: null,
  colorMenuTextNodeId: null,
  pendingNodeUploadTargetId: null,
  draggingGroupId: null,
  groupDragSnapshot: null,
  groupDragOriginBounds: null,
  groupMoved: false,
  undoStack: [],
  redoStack: [],
  historyLimit: 20,
  isRestoringHistory: false,
  pendingTextSnapshot: null,
  pendingEditorSnapshot: null,
  isResizingNode: false,
  resizingNodeId: null,
  resizeStartMouseX: 0,
  resizeStartMouseY: 0,
  resizeStartWidth: 0,
  resizeStartHeight: 0,
  resizeSnapshot: null,
  resizeMoved: false,
  fullscreenTextNodeId: null,
  isExecutingWorkflow: false,
  activeExecutionMode: null
};

const interaction = {
  isSpacePressed: false,
  isDraggingMinimap: false
};

const selectionBox = document.createElement("div");
selectionBox.className = "canvas-selection-box hidden";
canvasFrame.appendChild(selectionBox);

function ensureUi() {
  const stage = document.querySelector(".canvas-stage");
  const shell = document.querySelector(".app-shell");

  let contextMenu = document.getElementById("canvasContextMenu");
  if (!contextMenu) {
    contextMenu = document.createElement("div");
    contextMenu.id = "canvasContextMenu";
    contextMenu.className = "canvas-context-menu hidden";
    contextMenu.innerHTML = `
      <button class="canvas-context-menu__item" data-action="upload">上传</button>
      <button class="canvas-context-menu__item" data-action="asset">添加资产</button>
      <button class="canvas-context-menu__item" data-action="add-node">添加节点</button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut" data-action="undo"><span>撤销</span><span>Ctrl+Z</span></button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut" data-action="redo"><span>重做</span><span>Shift+Ctrl+Z</span></button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut" data-action="paste"><span>粘贴</span><span>Ctrl+V</span></button>
    `;
    stage.appendChild(contextMenu);
  }

  let addNodeMenu = document.getElementById("addNodeMenu");
  if (!addNodeMenu) {
    addNodeMenu = document.createElement("div");
    addNodeMenu.id = "addNodeMenu";
    addNodeMenu.className = "canvas-context-submenu hidden";
    addNodeMenu.innerHTML = `
      <p class="canvas-context-submenu__title">添加节点</p>
      <button class="canvas-context-submenu__item" data-type="text"><span class="canvas-context-submenu__icon">文</span><span><strong>文本</strong><small>单向输出到图片、视频、音频预设节点</small></span></button>
      <button class="canvas-context-submenu__item" data-type="image"><span class="canvas-context-submenu__icon">图</span><span><strong>图片</strong><small>生成图片、海报和参考图</small></span></button>
      <button class="canvas-context-submenu__item" data-type="video"><span class="canvas-context-submenu__icon">视</span><span><strong>视频</strong><small>宣传视频、动画、电影镜头</small></span></button>
      <button class="canvas-context-submenu__item" data-type="audio"><span class="canvas-context-submenu__icon">音</span><span><strong>音频</strong><small>配乐、音效、旁白和语音</small></span></button>
    `;
    stage.appendChild(addNodeMenu);
  }

  let uploadInput = document.getElementById("fileUploadInput");
  if (!uploadInput) {
    uploadInput = document.createElement("input");
    uploadInput.id = "fileUploadInput";
    uploadInput.type = "file";
    uploadInput.accept = "image/*,video/*,audio/*";
    uploadInput.multiple = true;
    uploadInput.hidden = true;
    document.body.appendChild(uploadInput);
  }

  let editorPanel = document.getElementById("nodeEditorPanel");
  if (!editorPanel) {
    editorPanel = document.createElement("section");
    editorPanel.id = "nodeEditorPanel";
    editorPanel.className = "node-editor hidden";
    editorPanel.innerHTML = `
      <div class="node-editor__card">
        <div class="node-editor__toolbar" id="nodeEditorToolbar"></div>
        <div class="node-editor__canvas" id="nodeEditorCanvas"></div>
        <div class="node-editor__inputs" id="nodeEditorInputs"></div>
        <textarea class="node-editor__prompt" id="nodeEditorPrompt" rows="4" placeholder="描述任何你想生成的内容"></textarea>
        <div class="node-editor__footer" id="nodeEditorFooter"></div>
      </div>
    `;
    canvasFrame.appendChild(editorPanel);
  }

  let connectionDeleteBtn = document.getElementById("connectionDeleteBtn");
  if (!connectionDeleteBtn) {
    connectionDeleteBtn = document.createElement("button");
    connectionDeleteBtn.id = "connectionDeleteBtn";
    connectionDeleteBtn.className = "connection-delete-btn hidden";
    connectionDeleteBtn.type = "button";
    connectionDeleteBtn.title = "断开连接";
    connectionDeleteBtn.textContent = "✂";
    stage.appendChild(connectionDeleteBtn);
  }

  let textDocOverlay = document.getElementById("textDocOverlay");
  if (!textDocOverlay) {
    textDocOverlay = document.createElement("section");
    textDocOverlay.id = "textDocOverlay";
    textDocOverlay.className = "text-doc-overlay hidden";
    textDocOverlay.innerHTML = `
      <div class="text-doc-overlay__backdrop" data-action="close"></div>
      <div class="text-doc-overlay__shell" role="dialog" aria-modal="true" aria-label="文档模式">
        <button class="text-doc-overlay__close" id="textDocCloseBtn" type="button" title="关闭文档">×</button>
        <div class="text-doc-overlay__main">
          <div class="text-doc-overlay__toolbar" id="textDocToolbar"></div>
          <article class="text-doc-overlay__card">
            <header class="text-doc-overlay__header">
              <span class="text-doc-overlay__badge">Text</span>
              <h2 class="text-doc-overlay__title" id="textDocTitle">文本</h2>
            </header>
            <div
              class="text-doc-overlay__editor"
              id="textDocEditor"
              contenteditable="true"
              spellcheck="false"
              data-placeholder="${TEXT_NODE_PLACEHOLDER}"
            ></div>
          </article>
        </div>
        <aside class="text-doc-overlay__sidebar">
          <section class="text-doc-overlay__sidebar-card">
            <h3>文档摘要</h3>
            <p id="textDocSummary">当前文档的摘要会在这里显示。</p>
          </section>
          <section class="text-doc-overlay__sidebar-card">
            <h3>节点信息</h3>
            <ul class="text-doc-overlay__meta-list">
              <li><strong>标题</strong><span id="textDocMetaTitle">文本</span></li>
              <li><strong>模型</strong><span id="textDocMetaModel">Gemini 3.1 Pro</span></li>
              <li><strong>状态</strong><span id="textDocMetaStatus">idle</span></li>
            </ul>
          </section>
          <section class="text-doc-overlay__sidebar-card">
            <h3>上游素材概览</h3>
            <div class="text-doc-overlay__assets" id="textDocAssets">暂无接入素材</div>
          </section>
          <section class="text-doc-overlay__sidebar-card">
            <h3>生成建议</h3>
            <ul class="text-doc-overlay__tips">
              <li>把关键设定整理成 H1 / H2，可以让后续生成更稳定。</li>
              <li>引用块适合放世界观、角色口吻或风格说明。</li>
              <li>在下方面板补 Prompt，可以把文档内容转成进一步生成指令。</li>
            </ul>
          </section>
        </aside>
      </div>
    `;
    stage.appendChild(textDocOverlay);
  }

  let groupToolbar = document.getElementById("groupToolbar");
  if (!groupToolbar) {
    groupToolbar = document.createElement("div");
    groupToolbar.id = "groupToolbar";
    groupToolbar.className = "group-toolbar hidden";
    groupToolbar.innerHTML = `
      <button class="group-toolbar__btn group-toolbar__btn--color" id="groupColorBtn" title="背景颜色">
        <span class="group-toolbar__color-dot"></span>
      </button>
      <button class="group-toolbar__btn" id="groupLayoutBtn" title="排列">
        <span class="group-toolbar__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" class="group-toolbar__icon-svg">
            <rect x="2.25" y="3" width="3.5" height="3.5" rx="0.8"></rect>
            <rect x="7.25" y="3" width="6.5" height="1.5" rx="0.75"></rect>
            <rect x="7.25" y="5" width="6.5" height="1.5" rx="0.75"></rect>
            <rect x="2.25" y="9.5" width="3.5" height="3.5" rx="0.8"></rect>
            <rect x="7.25" y="9.5" width="6.5" height="1.5" rx="0.75"></rect>
            <rect x="7.25" y="11.5" width="6.5" height="1.5" rx="0.75"></rect>
          </svg>
        </span>
        <span>排列</span>
      </button>
      <button class="group-toolbar__btn" id="groupUngroupBtn" title="解组">
        <span class="group-toolbar__icon" aria-hidden="true">
          <svg viewBox="0 0 16 16" class="group-toolbar__icon-svg">
            <rect x="2.25" y="3" width="4.25" height="4.25" rx="1"></rect>
            <rect x="9.5" y="8.75" width="4.25" height="4.25" rx="1"></rect>
            <path d="M6.6 5.2h1.2c1.6 0 2.8 1.2 2.8 2.8v.7"></path>
            <path d="M8.8 10.6l1.8-1.9 1.8 1.9"></path>
          </svg>
        </span>
        <span>解组</span>
      </button>
    `;
    stage.appendChild(groupToolbar);
  }

  let groupColorMenu = document.getElementById("groupColorMenu");
  if (!groupColorMenu) {
    groupColorMenu = document.createElement("div");
    groupColorMenu.id = "groupColorMenu";
    groupColorMenu.className = "group-color-menu hidden";
    groupColorMenu.innerHTML = `
      <p class="group-color-menu__title">背景颜色</p>
      <div class="group-color-menu__list"></div>
    `;
    stage.appendChild(groupColorMenu);
  }

  let textColorMenu = document.getElementById("textColorMenu");
  if (!textColorMenu) {
    textColorMenu = document.createElement("div");
    textColorMenu.id = "textColorMenu";
    textColorMenu.className = "group-color-menu hidden";
    textColorMenu.innerHTML = `
      <p class="group-color-menu__title">文本背景</p>
      <div class="group-color-menu__list"></div>
    `;
    stage.appendChild(textColorMenu);
  }

  let shortcutHelpModal = document.getElementById("shortcutHelpModal");
  if (!shortcutHelpModal) {
    shortcutHelpModal = document.createElement("section");
    shortcutHelpModal.id = "shortcutHelpModal";
    shortcutHelpModal.className = "shortcut-help-modal hidden";
    shortcutHelpModal.innerHTML = `
      <div class="shortcut-help-modal__backdrop" data-action="close"></div>
      <div class="shortcut-help-modal__panel" role="dialog" aria-modal="true" aria-label="快捷键说明">
        <button class="shortcut-help-modal__close" id="shortcutHelpCloseBtn" type="button" title="关闭">×</button>
        <div class="shortcut-help-modal__grid">
          ${SHORTCUT_GUIDE_GROUPS.map((group) => `
            <section class="shortcut-help-modal__section">
              <h3>${group.title}</h3>
              <div class="shortcut-help-modal__list">
                ${group.items.map((item) => `
                  <div class="shortcut-help-modal__row">
                    <span class="shortcut-help-modal__label">${item.label}</span>
                    <span class="shortcut-help-modal__keys">
                      ${item.keys.map((key) => `<kbd class="shortcut-help-modal__key">${key}</kbd>`).join("")}
                    </span>
                  </div>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      </div>
    `;
    shell.appendChild(shortcutHelpModal);
  }

  return {
    contextMenu,
    addNodeMenu,
    uploadInput,
    editorPanel,
    groupToolbar,
    groupColorMenu,
    textColorMenu,
    editorToolbar: document.getElementById("nodeEditorToolbar"),
    editorCanvas: document.getElementById("nodeEditorCanvas"),
    editorInputs: document.getElementById("nodeEditorInputs"),
    editorPrompt: document.getElementById("nodeEditorPrompt"),
    editorFooter: document.getElementById("nodeEditorFooter"),
    connectionDeleteBtn,
    textDocOverlay,
    textDocToolbar: document.getElementById("textDocToolbar"),
    textDocEditor: document.getElementById("textDocEditor"),
    textDocTitle: document.getElementById("textDocTitle"),
    textDocSummary: document.getElementById("textDocSummary"),
    textDocMetaTitle: document.getElementById("textDocMetaTitle"),
    textDocMetaModel: document.getElementById("textDocMetaModel"),
    textDocMetaStatus: document.getElementById("textDocMetaStatus"),
    textDocAssets: document.getElementById("textDocAssets"),
    textDocCloseBtn: document.getElementById("textDocCloseBtn"),
    shortcutHelpModal,
    shortcutHelpCloseBtn: document.getElementById("shortcutHelpCloseBtn"),
    groupColorBtn: document.getElementById("groupColorBtn"),
    groupLayoutBtn: document.getElementById("groupLayoutBtn"),
    groupUngroupBtn: document.getElementById("groupUngroupBtn"),
    groupColorList: groupColorMenu.querySelector(".group-color-menu__list"),
    textColorList: textColorMenu.querySelector(".group-color-menu__list")
  };
}

const ui = ensureUi();

function openShortcutHelpModal() {
  ui.shortcutHelpModal?.classList.remove("hidden");
}

function closeShortcutHelpModal() {
  ui.shortcutHelpModal?.classList.add("hidden");
}

shortcutQueryBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  openShortcutHelpModal();
});

shortcutHelpBtn?.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

ui.connectionDeleteBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!state.hoveredConnectionKey) return;
  const [fromId, toId] = state.hoveredConnectionKey.split("->");
  removeConnection(fromId, toId);
});

ui.connectionDeleteBtn.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

ui.connectionDeleteBtn.addEventListener("mouseleave", (event) => {
  if (event.relatedTarget?.closest?.(".connection-hit")) return;
  clearHoveredConnection();
});

ui.textDocCloseBtn?.addEventListener("click", () => {
  closeTextFullscreen(true);
});

ui.shortcutHelpCloseBtn?.addEventListener("click", () => {
  closeShortcutHelpModal();
});

ui.textDocOverlay?.addEventListener("click", (event) => {
  if (event.target.dataset.action === "close") {
    closeTextFullscreen(true);
  }
});

ui.shortcutHelpModal?.addEventListener("click", (event) => {
  if (event.target.dataset.action === "close") {
    closeShortcutHelpModal();
  }
});

ui.textDocEditor?.addEventListener("focus", () => {
  const node = getNode(state.fullscreenTextNodeId);
  if (!node) return;
  state.pendingTextSnapshot = serializeCanvasState();
});

ui.textDocEditor?.addEventListener("input", () => {
  const node = getNode(state.fullscreenTextNodeId);
  if (!node) return;
  syncTextNodeContent(node, ui.textDocEditor, "overlay");
  const plainText = ui.textDocEditor.innerText.trim();
  ui.textDocSummary.textContent = plainText
    ? `${plainText.slice(0, 88)}${plainText.length > 88 ? "..." : ""}`
    : "文档内容会在这里自动生成摘要预览。";
});

ui.textDocEditor?.addEventListener("paste", (event) => {
  const node = getNode(state.fullscreenTextNodeId);
  if (!node) return;
  handleTextEditorPaste(event, ui.textDocEditor, node, "overlay");
  const plainText = ui.textDocEditor.innerText.trim();
  ui.textDocSummary.textContent = plainText
    ? `${plainText.slice(0, 88)}${plainText.length > 88 ? "..." : ""}`
    : "文档内容会在这里自动生成摘要预览。";
});

ui.textDocEditor?.addEventListener("blur", () => {
  const node = getNode(state.fullscreenTextNodeId);
  if (!node) return;
  syncTextNodeContent(node, ui.textDocEditor, "overlay");
  const snapshotContent = state.pendingTextSnapshot?.nodes?.find((item) => item.id === node.id)?.content ?? "";
  if (state.pendingTextSnapshot && node.content !== snapshotContent) {
    pushHistory(state.pendingTextSnapshot);
  }
  state.pendingTextSnapshot = null;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.textDocOverlay?.classList.contains("hidden")) {
    event.preventDefault();
    closeTextFullscreen(true);
    return;
  }
  if (event.key === "Escape" && !ui.shortcutHelpModal?.classList.contains("hidden")) {
    event.preventDefault();
    closeShortcutHelpModal();
  }
});

function localizeUi() {
  document.title = "创意画布重设计版";
  const titleMeta = document.querySelector(".floating-title__meta");
  const titleMain = document.querySelector(".floating-title h1");
  if (titleMeta) titleMeta.textContent = "Next Big Thing (0324)";
  if (titleMain) titleMain.textContent = "未命名对话";
  const hint = document.querySelector(".canvas-hint");
  if (hint) hint.textContent = "左键框选节点，中键拖动画布，按住空格再左键也可平移。支持右键菜单、拖拽文件、复制粘贴、撤销和重做。";
  createAssetBtn.textContent = "创建资产";
  groupNodesBtn.textContent = "打组";
  addToChatBtn.classList.add("hidden");
  deleteSelectionBtn.classList.add("hidden");
  runBtn.textContent = "立即探索";
  shareBtn.textContent = "分享";

  const dockButtons = [...document.querySelectorAll(".left-dock__tool[data-type]")];
  const dockMap = [
    { type: "text", text: "文", title: "添加文本节点" },
    { type: "image", text: "图", title: "添加图片节点" },
    { type: "video", text: "视", title: "添加视频节点" },
    { type: "audio", text: "音", title: "添加音频节点" }
  ];
  dockButtons.forEach((button, index) => {
    const item = dockMap[index];
    if (!item) return;
    button.dataset.type = item.type;
    button.textContent = item.text;
    button.title = item.title;
  });
}

function setStatus(text) {
  if (sessionList?.children?.[0]?.lastElementChild) {
    sessionList.children[0].lastElementChild.textContent = text;
  }
}

function isEditableTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function snapValue(value) {
  return Math.round(value / 36) * 36;
}

function previewSvg(kind, title = "") {
  const label = kind === "audio" ? "Audio" : kind === "video" ? "Video" : kind === "image" ? "Image" : "Text";
  const center = kind === "audio"
    ? `<rect x="180" y="96" width="280" height="170" rx="34" fill="rgba(255,255,255,0.05)"/><g fill="rgba(255,255,255,0.24)"><rect x="234" y="135" width="12" height="90" rx="6"/><rect x="262" y="116" width="12" height="122" rx="6"/><rect x="290" y="96" width="12" height="162" rx="6"/><rect x="318" y="126" width="12" height="100" rx="6"/><rect x="346" y="88" width="12" height="178" rx="6"/><rect x="374" y="118" width="12" height="112" rx="6"/></g>`
    : `<circle cx="420" cy="90" r="70" fill="rgba(255,255,255,0.15)"/><path d="M0 290 Q120 180 210 250 T420 210 T640 280 V360 H0 Z" fill="#202432"/><path d="M150 285 L235 110 L305 285 Z" fill="#343a4d"/><path d="M250 285 L330 90 L410 285 Z" fill="#454d61"/><path d="M315 290 Q320 190 365 160 Q400 188 394 292 Z" fill="#1a1d28"/>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6f86d6"/><stop offset="55%" stop-color="#1f2740"/><stop offset="100%" stop-color="#0f1016"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>${center}<rect x="14" y="14" width="92" height="26" rx="13" fill="rgba(0,0,0,0.36)"/><text x="60" y="31" font-size="15" text-anchor="middle" fill="white" font-family="Arial">${label}</text><text x="24" y="336" font-size="24" fill="rgba(255,255,255,0.72)" font-family="Arial">${title}</text></svg>`)}`;
}

function cleanFileName(name) {
  return name.replace(/\.[^.]+$/, "");
}

function getNode(id) {
  return state.nodes.find((node) => node.id === id);
}

function getSelectedNodes() {
  return [...state.selectedNodeIds].map((id) => getNode(id)).filter(Boolean);
}

function worldFromClient(clientX, clientY) {
  const rect = canvasFrame.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.offsetX) / state.scale,
    y: (clientY - rect.top - state.offsetY) / state.scale
  };
}

function framePointFromClient(clientX, clientY) {
  const rect = canvasFrame.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, clientY - rect.top))
  };
}

function updateLastPointer(clientX, clientY) {
  state.lastWorldPoint = worldFromClient(clientX, clientY);
}

function serializeCanvasState() {
  return {
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    nodeSeq: state.nodeSeq,
    groupSeq: state.groupSeq,
    scale: state.scale,
    offsetX: state.offsetX,
    offsetY: state.offsetY,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      prompt: node.prompt,
      content: node.content ?? "",
      model: node.model,
      settings: { ...(node.settings || {}) },
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      panelColor: node.panelColor || "",
      sourceKind: node.sourceKind,
      preset: node.preset,
      src: node.src,
      fileName: node.fileName,
      referenceAsset: node.referenceAsset ? { ...node.referenceAsset } : null,
      status: node.status,
      inputs: [...node.inputs],
      output: node.output,
      error: node.error || null,
      lastRunAt: node.lastRunAt || null,
      runCount: node.runCount || 0,
      upstream: [...node.upstream],
      downstream: [...node.downstream]
    })),
    connections: state.connections.map((connection) => ({ ...connection })),
    groups: state.groups.map((group) => ({
      id: group.id,
      title: group.title,
      nodeIds: [...group.nodeIds],
      color: group.color,
      frame: group.frame ? { ...group.frame } : null
    })),
    selectedIds: [...state.selectedNodeIds]
  };
}

function normalizeSnapshotPayload(snapshot) {
  const source = snapshot && typeof snapshot === "object" ? snapshot : {};
  return {
    version: source.version || 1,
    savedAt: source.savedAt || Date.now(),
    nodeSeq: source.nodeSeq || 0,
    groupSeq: source.groupSeq || 0,
    scale: typeof source.scale === "number" ? source.scale : 1,
    offsetX: typeof source.offsetX === "number" ? source.offsetX : 0,
    offsetY: typeof source.offsetY === "number" ? source.offsetY : 0,
    nodes: Array.isArray(source.nodes) ? source.nodes.map((node) => ({
      ...node,
      status: node.status || DEFAULT_NODE_STATUS,
      settings: normalizeNodeSettings(node.type, node.settings),
      inputs: Array.isArray(node.inputs) ? node.inputs : [],
      output: node.output ?? null,
      error: node.error || null,
      lastRunAt: node.lastRunAt || null,
      runCount: node.runCount || 0,
      referenceAsset: node.referenceAsset ? { ...node.referenceAsset } : null,
      upstream: Array.isArray(node.upstream) ? node.upstream : [],
      downstream: Array.isArray(node.downstream) ? node.downstream : []
    })) : [],
    connections: Array.isArray(source.connections) ? source.connections.map((connection) => ({ ...connection })) : [],
    groups: Array.isArray(source.groups) ? source.groups.map((group) => ({
      ...group,
      nodeIds: Array.isArray(group.nodeIds) ? [...group.nodeIds] : [],
      frame: group.frame ? { ...group.frame } : null
    })) : [],
    selectedIds: Array.isArray(source.selectedIds) ? [...source.selectedIds] : []
  };
}
