const canvasFrame = document.getElementById("canvasFrame");
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
  draggingGroupId: null,
  groupDragSnapshot: null,
  groupDragOriginBounds: null,
  groupMoved: false,
  undoStack: [],
  redoStack: [],
  historyLimit: 20,
  isRestoringHistory: false,
  pendingTextSnapshot: null,
  pendingEditorSnapshot: null
};

const interaction = {
  isSpacePressed: false,
  isDraggingMinimap: false
};

const GROUP_COLORS = [
  { name: "默认", value: "rgba(255,255,255,0.03)" },
  { name: "玫红", value: "rgba(185,84,93,0.18)" },
  { name: "棕橙", value: "rgba(178,110,40,0.18)" },
  { name: "橄榄", value: "rgba(170,155,64,0.18)" },
  { name: "森林", value: "rgba(73,136,89,0.18)" },
  { name: "湖蓝", value: "rgba(67,134,154,0.18)" },
  { name: "钴蓝", value: "rgba(58,106,176,0.18)" },
  { name: "紫罗兰", value: "rgba(129,78,176,0.18)" }
];

const selectionBox = document.createElement("div");
selectionBox.className = "canvas-selection-box hidden";
canvasFrame.appendChild(selectionBox);

function ensureUi() {
  const stage = document.querySelector(".canvas-stage");

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
    stage.appendChild(editorPanel);
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

  let groupToolbar = document.getElementById("groupToolbar");
  if (!groupToolbar) {
    groupToolbar = document.createElement("div");
    groupToolbar.id = "groupToolbar";
    groupToolbar.className = "group-toolbar hidden";
    groupToolbar.innerHTML = `
      <button class="group-toolbar__btn group-toolbar__btn--color" id="groupColorBtn" title="背景颜色">
        <span class="group-toolbar__color-dot"></span>
      </button>
      <button class="group-toolbar__btn" id="groupLayoutBtn" title="整理布局">
        <span class="group-toolbar__icon">排</span>
      </button>
      <button class="group-toolbar__btn" id="groupUngroupBtn" title="解组">
        <span class="group-toolbar__icon">解</span>
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

  return {
    contextMenu,
    addNodeMenu,
    uploadInput,
    editorPanel,
    groupToolbar,
    groupColorMenu,
    editorToolbar: document.getElementById("nodeEditorToolbar"),
    editorCanvas: document.getElementById("nodeEditorCanvas"),
    editorInputs: document.getElementById("nodeEditorInputs"),
    editorPrompt: document.getElementById("nodeEditorPrompt"),
    editorFooter: document.getElementById("nodeEditorFooter"),
    connectionDeleteBtn,
    groupColorBtn: document.getElementById("groupColorBtn"),
    groupLayoutBtn: document.getElementById("groupLayoutBtn"),
    groupUngroupBtn: document.getElementById("groupUngroupBtn"),
    groupColorList: groupColorMenu.querySelector(".group-color-menu__list")
  };
}

const ui = ensureUi();

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

function updateLastPointer(clientX, clientY) {
  state.lastWorldPoint = worldFromClient(clientX, clientY);
}

function serializeCanvasState() {
  return {
    nodeSeq: state.nodeSeq,
    groupSeq: state.groupSeq,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      title: node.title,
      prompt: node.prompt,
      model: node.model,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      sourceKind: node.sourceKind,
      preset: node.preset,
      src: node.src,
      fileName: node.fileName,
      status: node.status,
      inputs: [...node.inputs],
      output: node.output,
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

function pushHistory(snapshot) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > state.historyLimit) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  updateMenuState();
}

function rememberHistory() {
  if (state.isRestoringHistory) return;
  pushHistory(serializeCanvasState());
}

function restoreSnapshot(snapshot) {
  state.isRestoringHistory = true;
  state.nodeSeq = snapshot.nodeSeq;
  state.groupSeq = snapshot.groupSeq || 0;
  state.connections = snapshot.connections.map((connection) => ({ ...connection }));
  state.groups = (snapshot.groups || []).map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
    frame: group.frame ? { ...group.frame } : null
  }));
  state.activeGroupId = null;
  state.hoveredGroupId = null;
  state.selectedNodeIds = new Set(snapshot.selectedIds);
  state.selectedNodeId = snapshot.selectedIds.length === 1 ? snapshot.selectedIds[0] : null;
  canvasWorld.innerHTML = "";
  state.nodes = snapshot.nodes.map((nodeData) => createNode(nodeData, { skipHistory: true }));
  renderGroups();
  renderConnections();
  renderSelectionBox();
  renderMinimap();
  updateSession();
  updateEditorPanel();
  state.isRestoringHistory = false;
}

function undo() {
  if (!state.undoStack.length) return;
  const previous = state.undoStack.pop();
  state.redoStack.push(serializeCanvasState());
  restoreSnapshot(previous);
  updateMenuState();
  setStatus("已撤销上一步操作。");
}

function redo() {
  if (!state.redoStack.length) return;
  const next = state.redoStack.pop();
  state.undoStack.push(serializeCanvasState());
  restoreSnapshot(next);
  updateMenuState();
  setStatus("已重做上一步操作。");
}

function updateSession() {
  nodeCount.textContent = String(state.nodes.length);
  connectionCount.textContent = String(state.connections.length);
  updateWorkflowInspector();
}

function getNodeTitleList(ids = []) {
  return ids
    .map((id) => getNode(id))
    .filter(Boolean)
    .map((node) => node.title);
}

function updateWorkflowInspector() {
  if (!workflowStatusValue) return;

  const node = getNode(state.selectedNodeId);
  if (!node) {
    workflowStatusValue.textContent = "未选择";
    workflowUpstreamCount.textContent = "-";
    workflowDownstreamCount.textContent = "-";
    workflowUpstreamTitles.textContent = "未选择节点";
    workflowDownstreamTitles.textContent = "未选择节点";
    return;
  }

  const upstreamTitles = getNodeTitleList(node.upstream || []);
  const downstreamTitles = getNodeTitleList(node.downstream || []);

  workflowStatusValue.textContent = node.status || "idle";
  workflowUpstreamCount.textContent = String((node.upstream || []).length);
  workflowDownstreamCount.textContent = String((node.downstream || []).length);
  workflowUpstreamTitles.textContent = upstreamTitles.length ? upstreamTitles.join("、") : "无";
  workflowDownstreamTitles.textContent = downstreamTitles.length ? downstreamTitles.join("、") : "无";
}

function getAssetPreviewMarkup(node) {
  if (node.type === "image") {
    return `<img class="node-editor__asset-thumb" src="${node.src || previewSvg(node.type, node.title)}" alt="${node.title}">`;
  }
  if (node.type === "video") {
    return node.src
      ? `<video class="node-editor__asset-thumb" src="${node.src}" muted playsinline></video>`
      : `<img class="node-editor__asset-thumb" src="${previewSvg(node.type, node.title)}" alt="${node.title}">`;
  }
  if (node.type === "audio") {
    return `<div class="node-editor__asset-type">Audio</div>`;
  }
  return `<div class="node-editor__asset-type">Text</div>`;
}

function renderEditorInputs(node) {
  if (!ui.editorInputs) return;
  const upstreamNodes = (node.upstream || []).map((id) => getNode(id)).filter(Boolean);
  if (!upstreamNodes.length) {
    ui.editorInputs.innerHTML = `<div class="node-editor__inputs-empty">暂无接入素材</div>`;
    return;
  }

  ui.editorInputs.innerHTML = `
    <div class="node-editor__inputs-list">
      ${upstreamNodes.map((item) => `
        <article class="node-editor__asset" title="${item.title}">
          <div class="node-editor__asset-preview">
            ${getAssetPreviewMarkup(item)}
          </div>
          <span class="node-editor__asset-name">${item.title}</span>
        </article>
      `).join("")}
    </div>
  `;

  ui.editorInputs.querySelectorAll("video.node-editor__asset-thumb").forEach((media) => {
    media.addEventListener("loadeddata", () => {
      media.currentTime = 0;
    }, { once: true });
  });
}

function updateMenuState() {
  const undoBtn = ui.contextMenu.querySelector('[data-action="undo"]');
  const redoBtn = ui.contextMenu.querySelector('[data-action="redo"]');
  if (undoBtn) undoBtn.classList.toggle("is-disabled", !state.undoStack.length);
  if (redoBtn) redoBtn.classList.toggle("is-disabled", !state.redoStack.length);
}

function syncSelection(ids) {
  state.selectedNodeIds = new Set(ids);
  state.selectedNodeId = ids.length === 1 ? ids[0] : null;
}

function renderNode(node) {
  node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
  node.element.style.width = `${node.width}px`;
  node.element.style.height = `${node.height}px`;
  node.element.classList.toggle("is-selected", state.selectedNodeIds.has(node.id));
  node.element.classList.toggle("is-link-source", state.linkFromNodeId === node.id);
  node.element.classList.toggle("canvas-node--text", node.type === "text");
  node.element.classList.toggle("canvas-node--uploaded", node.sourceKind === "upload");
  const badge = node.element.querySelector(".canvas-node__badge");
  const title = node.element.querySelector(".canvas-node__title");
  const media = node.element.querySelector(".canvas-node__media");
  const body = node.element.querySelector(".canvas-node__body");
  badge.textContent = node.title;
  title.textContent = node.title;
  body.classList.add("hidden");
  media.innerHTML = "";

  if (node.type === "text") {
    const textarea = document.createElement("textarea");
    textarea.className = "canvas-node__text-input";
    textarea.value = node.prompt;
    textarea.placeholder = typeConfig.text.prompt;
    textarea.addEventListener("focus", () => {
      state.pendingTextSnapshot = serializeCanvasState();
    });
    textarea.addEventListener("input", (event) => {
      node.prompt = event.target.value;
    });
    textarea.addEventListener("blur", () => {
      if (state.pendingTextSnapshot && node.prompt !== getSnapshotNodePrompt(state.pendingTextSnapshot, node.id)) {
        pushHistory(state.pendingTextSnapshot);
      }
      state.pendingTextSnapshot = null;
    });
    media.appendChild(textarea);
    return;
  }

  const preview = node.type === "video" && node.src ? document.createElement("video") : document.createElement("img");
  preview.className = "canvas-node__preview";
  preview.draggable = false;
  if (preview.tagName === "VIDEO") {
    preview.src = node.src;
    preview.muted = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.preload = "metadata";
    preview.addEventListener("loadeddata", () => preview.play().catch(() => {}));
  } else {
    preview.alt = node.title;
    preview.src = node.src || previewSvg(node.type, node.title);
  }
  media.appendChild(preview);
}

function renderAllNodes() {
  state.nodes.forEach(renderNode);
}

function getSnapshotNodePrompt(snapshot, nodeId) {
  const item = snapshot.nodes.find((node) => node.id === nodeId);
  return item ? item.prompt : "";
}

function getConnectionKey(fromId, toId) {
  return `${fromId}->${toId}`;
}

function getConnectionGeometry(fromNode, toNode) {
  const startX = fromNode.x * state.scale + state.offsetX + fromNode.width * state.scale - 1;
  const startY = fromNode.y * state.scale + state.offsetY + (fromNode.height * state.scale) / 2;
  const endX = toNode.x * state.scale + state.offsetX + 1;
  const endY = toNode.y * state.scale + state.offsetY + (toNode.height * state.scale) / 2;
  const curve = Math.max(36, Math.abs(endX - startX) * 0.32);
  const cp1x = startX + curve;
  const cp1y = startY;
  const cp2x = endX - curve;
  const cp2y = endY;
  const t = 0.5;
  const mt = 1 - t;
  const midX = mt ** 3 * startX + 3 * mt ** 2 * t * cp1x + 3 * mt * t ** 2 * cp2x + t ** 3 * endX;
  const midY = mt ** 3 * startY + 3 * mt ** 2 * t * cp1y + 3 * mt * t ** 2 * cp2y + t ** 3 * endY;
  return {
    d: `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`,
    midX,
    midY
  };
}

function setHoveredConnection(key, point) {
  state.hoveredConnectionKey = key;
  state.hoveredConnectionPoint = point ? { ...point } : null;
  renderConnections();
  updateConnectionDeleteButton();
}

function clearHoveredConnection() {
  if (!state.hoveredConnectionKey && !state.hoveredConnectionPoint) return;
  state.hoveredConnectionKey = null;
  state.hoveredConnectionPoint = null;
  renderConnections();
  updateConnectionDeleteButton();
}

function updateConnectionDeleteButton() {
  if (!ui.connectionDeleteBtn) return;
  if (!state.hoveredConnectionKey || !state.hoveredConnectionPoint) {
    ui.connectionDeleteBtn.classList.add("hidden");
    return;
  }
  ui.connectionDeleteBtn.classList.remove("hidden");
  ui.connectionDeleteBtn.style.left = `${state.hoveredConnectionPoint.x}px`;
  ui.connectionDeleteBtn.style.top = `${state.hoveredConnectionPoint.y}px`;
}

function renderConnections() {
  connectionsLayer.innerHTML = "";
  const rect = canvasFrame.getBoundingClientRect();
  connectionsLayer.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  state.connections.forEach((connection) => {
    const from = getNode(connection.from);
    const to = getNode(connection.to);
    if (!from || !to) return;
    const geometry = getConnectionGeometry(from, to);
    const key = getConnectionKey(connection.from, connection.to);
    if (state.hoveredConnectionKey === key) {
      state.hoveredConnectionPoint = { x: geometry.midX, y: geometry.midY };
    }
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", `connection-path${state.hoveredConnectionKey === key ? " is-hovered" : ""}`);
    path.setAttribute("d", geometry.d);
    connectionsLayer.appendChild(path);

    const hitPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitPath.setAttribute("class", "connection-hit");
    hitPath.setAttribute("d", geometry.d);
    hitPath.dataset.connectionKey = key;
    hitPath.addEventListener("mouseenter", () => {
      setHoveredConnection(key, { x: geometry.midX, y: geometry.midY });
    });
    hitPath.addEventListener("mouseleave", (event) => {
      if (event.relatedTarget === ui.connectionDeleteBtn) return;
      clearHoveredConnection();
    });
    connectionsLayer.appendChild(hitPath);
  });

  if (state.isLinkDragging && state.linkDragFromNodeId && state.linkPreviewPoint) {
    const fromNode = getNode(state.linkDragFromNodeId);
    if (!fromNode) return;
    const start = getNodePortPoint(fromNode, state.linkDragFromSide || "right");
    const end = state.linkPreviewPoint;
    const curve = Math.max(36, Math.abs(end.x - start.x) * 0.32);
    const previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewPath.setAttribute("class", "connection-path connection-path--preview");
    previewPath.setAttribute("d", `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`);
    connectionsLayer.appendChild(previewPath);
  }

  if (state.hoveredConnectionKey && !state.connections.some((item) => getConnectionKey(item.from, item.to) === state.hoveredConnectionKey)) {
    state.hoveredConnectionKey = null;
    state.hoveredConnectionPoint = null;
  }
  updateConnectionDeleteButton();
}

function getNodePortPoint(node, side = "right") {
  const offset = 15;
  return {
    x: node.x * state.scale + state.offsetX + (side === "left" ? -offset : node.width * state.scale + offset),
    y: node.y * state.scale + state.offsetY + (node.height * state.scale) / 2
  };
}

function getGroup(groupId) {
  return state.groups.find((group) => group.id === groupId);
}

function getNodeGroup(nodeId) {
  return state.groups.find((group) => group.nodeIds.includes(nodeId));
}

function getNodesFrame(nodeIds) {
  const nodes = nodeIds.map((id) => getNode(id)).filter(Boolean);
  if (!nodes.length) {
    return null;
  }
  return {
    left: Math.min(...nodes.map((node) => node.x)) - 18,
    top: Math.min(...nodes.map((node) => node.y)) - 16,
    right: Math.max(...nodes.map((node) => node.x + node.width)) + 18,
    bottom: Math.max(...nodes.map((node) => node.y + node.height)) + 18
  };
}

function getGroupBounds(group) {
  if (group.frame) {
    return group.frame;
  }
  return getNodesFrame(group.nodeIds);
}

function isPointInsideFrame(x, y, frame) {
  return !!frame && x >= frame.left && x <= frame.right && y >= frame.top && y <= frame.bottom;
}

function isNodeInsideFrame(node, frame) {
  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  return isPointInsideFrame(centerX, centerY, frame);
}

function syncGroupMembershipForNodes(nodeIds) {
  let changed = false;

  nodeIds.forEach((nodeId) => {
    const node = getNode(nodeId);
    if (!node) return;

    const currentGroups = state.groups.filter((group) => group.nodeIds.includes(nodeId));
    currentGroups.forEach((group) => {
      if (!isNodeInsideFrame(node, group.frame || getGroupBounds(group))) {
        group.nodeIds = group.nodeIds.filter((id) => id !== nodeId);
        changed = true;
      }
    });

    const alreadyInGroup = state.groups.some((group) => group.nodeIds.includes(nodeId));
    if (!alreadyInGroup) {
      const targetGroup = state.groups.find((group) => isNodeInsideFrame(node, group.frame || getGroupBounds(group)));
      if (targetGroup) {
        targetGroup.nodeIds.push(nodeId);
        state.activeGroupId = targetGroup.id;
        state.hoveredGroupId = targetGroup.id;
        changed = true;
      }
    }
  });

  if (!changed) return;

  state.groups = state.groups
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id, index, arr) => arr.indexOf(id) === index && !!getNode(id))
    }))
    .filter((group) => group.nodeIds.length > 1)
    .map((group) => ({
      ...group,
      frame: group.frame || getNodesFrame(group.nodeIds)
    }));

  if (state.activeGroupId && !getGroup(state.activeGroupId)) {
    state.activeGroupId = null;
  }
  if (state.hoveredGroupId && !getGroup(state.hoveredGroupId)) {
    state.hoveredGroupId = null;
  }
}

function hideGroupToolbar() {
  ui.groupToolbar.classList.add("hidden");
  ui.groupColorMenu.classList.add("hidden");
}

function updateGroupToolbar() {
  const group = getGroup(state.activeGroupId || state.hoveredGroupId);
  if (!group) {
    hideGroupToolbar();
    return;
  }
  const bounds = getGroupBounds(group);
  if (!bounds) {
    hideGroupToolbar();
    return;
  }
  const left = bounds.left * state.scale + state.offsetX;
  const top = bounds.top * state.scale + state.offsetY;
  const width = (bounds.right - bounds.left) * state.scale;
  const toolbarWidth = ui.groupToolbar.offsetWidth || 236;
  const menuWidth = ui.groupColorMenu.offsetWidth || 72;
  const frameWidth = canvasFrame.clientWidth;
  ui.groupToolbar.classList.remove("hidden");
  ui.groupToolbar.style.left = `${Math.max(18, Math.min(frameWidth - toolbarWidth - 18, left + width / 2 - toolbarWidth / 2))}px`;
  ui.groupToolbar.style.top = `${Math.max(18, top - 56)}px`;
  ui.groupColorBtn.querySelector(".group-toolbar__color-dot").style.background = group.color;
  if (ui.groupColorMenu.classList.contains("hidden")) {
    return;
  }
  ui.groupColorMenu.style.left = `${Math.max(18, Math.min(frameWidth - menuWidth - 18, left - 14))}px`;
  ui.groupColorMenu.style.top = `${Math.max(18, top - 6)}px`;
}

function renderGroups() {
  canvasWorld.querySelectorAll(".canvas-group").forEach((element) => element.remove());
  state.groups.forEach((group) => {
    const bounds = getGroupBounds(group);
    if (!bounds) {
      return;
    }
    const element = document.createElement("section");
    element.className = "canvas-group";
    element.dataset.groupId = group.id;
    element.style.left = `${bounds.left}px`;
    element.style.top = `${bounds.top}px`;
    element.style.width = `${bounds.right - bounds.left}px`;
    element.style.height = `${bounds.bottom - bounds.top}px`;
    element.style.setProperty("--group-bg", group.color || GROUP_COLORS[0].value);
    element.innerHTML = `<div class="canvas-group__title">${group.title}</div>`;
    element.addEventListener("mouseenter", () => {
      state.hoveredGroupId = group.id;
      updateGroupToolbar();
    });
    element.addEventListener("mouseleave", () => {
      if (state.hoveredGroupId === group.id) {
        state.hoveredGroupId = null;
      }
      if (state.activeGroupId !== group.id) {
        updateGroupToolbar();
      }
    });
    element.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".canvas-node")) {
        return;
      }
      hideContextMenus();
      state.activeGroupId = group.id;
      state.groupDragSnapshot = serializeCanvasState();
      state.draggingGroupId = group.id;
      state.groupDragOriginBounds = getGroupBounds(group);
      state.groupMoved = false;
      state.dragOriginPositions = new Map(group.nodeIds.map((id) => {
        const node = getNode(id);
        return [id, { x: node.x, y: node.y }];
      }));
      state.dragStartMouseX = event.clientX;
      state.dragStartMouseY = event.clientY;
      syncSelection([]);
      renderAllNodes();
      renderSelectionBox();
      updateEditorPanel();
      updateGroupToolbar();
      event.currentTarget.setPointerCapture(event.pointerId);
    });
    element.addEventListener("click", (event) => {
      if (event.target.closest(".canvas-node")) return;
      state.activeGroupId = group.id;
      syncSelection([]);
      renderSelectionBox();
      updateEditorPanel();
      updateGroupToolbar();
    });
    canvasWorld.prepend(element);
  });
  updateGroupToolbar();
}

function cleanupGroups() {
  state.groups = state.groups
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id) => !!getNode(id)),
      frame: group.frame || getNodesFrame(group.nodeIds)
    }))
    .filter((group) => group.nodeIds.length > 1);
}

function createGroupFromSelection() {
  const selected = getSelectedNodes();
  if (selected.length < 2) {
    setStatus("至少选择两个节点才能打组。");
    return;
  }
  rememberHistory();
  const selectedIds = selected.map((node) => node.id);
  state.groups = state.groups.filter((group) => {
    group.nodeIds = group.nodeIds.filter((id) => !selectedIds.includes(id));
    return group.nodeIds.length > 0;
  });
  const group = {
    id: `group-${++state.groupSeq}`,
    title: "新建组",
    nodeIds: selectedIds,
    color: GROUP_COLORS[0].value
  };
  group.title = "新建组";
  state.groups.push(group);
  state.activeGroupId = group.id;
  renderGroups();
  renderSelectionBox();
  setStatus("已创建新组。");
}

function ungroupActiveGroup() {
  const group = getGroup(state.activeGroupId || state.hoveredGroupId);
  if (!group) return;
  rememberHistory();
  state.groups = state.groups.filter((item) => item.id !== group.id);
  state.activeGroupId = null;
  state.hoveredGroupId = null;
  renderGroups();
  setStatus("已解组。");
}

function setActiveGroupColor(color) {
  const group = getGroup(state.activeGroupId || state.hoveredGroupId);
  if (!group) return;
  rememberHistory();
  group.color = color;
  renderGroups();
}

function layoutActiveGroup() {
  const group = getGroup(state.activeGroupId || state.hoveredGroupId);
  if (!group) return;
  const nodes = group.nodeIds.map((id) => getNode(id)).filter(Boolean);
  if (!nodes.length) return;
  rememberHistory();
  const bounds = getGroupBounds(group);
  const maxWidth = Math.max(...nodes.map((node) => node.width));
  let currentY = bounds.top + 22;
  const startX = bounds.left + 18;
  nodes.forEach((node) => {
    node.x = startX + Math.max(0, (maxWidth - node.width) / 2);
    node.y = currentY;
    currentY += node.height + 22;
    renderNode(node);
  });
  renderGroups();
  renderConnections();
  updateEditorPanel();
  setStatus("已整理组内节点布局。");
}

function getWorldBounds() {
  if (!state.nodes.length) {
    const viewLeft = (-state.offsetX) / state.scale;
    const viewTop = (-state.offsetY) / state.scale;
    return { minX: viewLeft, minY: viewTop, maxX: viewLeft + 1, maxY: viewTop + 1 };
  }
  return {
    minX: Math.min(...state.nodes.map((node) => node.x)) - 96,
    minY: Math.min(...state.nodes.map((node) => node.y)) - 96,
    maxX: Math.max(...state.nodes.map((node) => node.x + node.width)) + 96,
    maxY: Math.max(...state.nodes.map((node) => node.y + node.height)) + 96
  };
}

function renderMinimap() {
  if (!state.minimapVisible) {
    minimapPreview.classList.add("hidden");
    return;
  }
  minimapPreview.classList.remove("hidden");
  const bounds = getWorldBounds();
  const sceneWidth = minimapScene.clientWidth;
  const sceneHeight = minimapScene.clientHeight;
  if (!sceneWidth || !sceneHeight) return;
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(sceneWidth / worldWidth, sceneHeight / worldHeight);
  const padX = (sceneWidth - worldWidth * scale) / 2;
  const padY = (sceneHeight - worldHeight * scale) / 2;
  minimapScene.querySelectorAll(".canvas-minimap__node").forEach((item) => item.remove());
  state.nodes.forEach((node) => {
    const marker = document.createElement("div");
    marker.className = "canvas-minimap__node";
    if (state.selectedNodeIds.has(node.id)) marker.classList.add("is-selected");
    marker.style.left = `${padX + (node.x - bounds.minX) * scale}px`;
    marker.style.top = `${padY + (node.y - bounds.minY) * scale}px`;
    marker.style.width = `${Math.max(4, node.width * scale)}px`;
    marker.style.height = `${Math.max(4, node.height * scale)}px`;
    minimapScene.appendChild(marker);
  });
  const viewLeft = (-state.offsetX) / state.scale;
  const viewTop = (-state.offsetY) / state.scale;
  minimapViewport.style.left = `${padX + (viewLeft - bounds.minX) * scale}px`;
  minimapViewport.style.top = `${padY + (viewTop - bounds.minY) * scale}px`;
  minimapViewport.style.width = `${Math.max(12, (canvasFrame.clientWidth / state.scale) * scale)}px`;
  minimapViewport.style.height = `${Math.max(12, (canvasFrame.clientHeight / state.scale) * scale)}px`;
}

function setTransform() {
  canvasWorld.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
  const smallGrid = 18 * state.scale;
  const largeGrid = 108 * state.scale;
  canvasGrid.style.backgroundSize = `${smallGrid}px ${smallGrid}px, ${largeGrid}px ${largeGrid}px, ${largeGrid}px ${largeGrid}px`;
  canvasGrid.style.backgroundPosition = `${state.offsetX}px ${state.offsetY}px, ${state.offsetX}px ${state.offsetY}px, ${state.offsetX}px ${state.offsetY}px`;
  zoomIndicator.textContent = `${Math.round(state.scale * 100)}%`;
  zoomSlider.value = String(Math.round(state.scale * 100));
  renderConnections();
  renderGroups();
  renderMinimap();
  renderSelectionBox();
  updateEditorPanel();
}

function renderSelectionBox() {
  if (!state.isSelecting && state.selectedNodeIds.size < 2) {
    selectionBox.classList.add("hidden");
    selectionToolbar.classList.add("hidden");
    return;
  }

  if (state.isSelecting) {
    const left = Math.min(state.selectionStartX, state.selectionCurrentX);
    const top = Math.min(state.selectionStartY, state.selectionCurrentY);
    const width = Math.abs(state.selectionCurrentX - state.selectionStartX);
    const height = Math.abs(state.selectionCurrentY - state.selectionStartY);
    selectionBox.classList.remove("hidden");
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionToolbar.classList.add("hidden");
    return;
  }

  const selected = getSelectedNodes();
  if (selected.length < 2) {
    selectionBox.classList.add("hidden");
    selectionToolbar.classList.add("hidden");
    return;
  }

  const rect = canvasFrame.getBoundingClientRect();
  const boxes = selected.map((node) => node.element.getBoundingClientRect());
  const padding = 18;
  const left = Math.min(...boxes.map((box) => box.left)) - rect.left - padding;
  const top = Math.min(...boxes.map((box) => box.top)) - rect.top - padding;
  const right = Math.max(...boxes.map((box) => box.right)) - rect.left + padding;
  const bottom = Math.max(...boxes.map((box) => box.bottom)) - rect.top + padding;
  selectionBox.classList.remove("hidden");
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${right - left}px`;
  selectionBox.style.height = `${bottom - top}px`;
  selectionToolbar.classList.remove("hidden");
  selectionToolbar.style.left = `${left + (right - left) / 2}px`;
  selectionToolbar.style.top = `${Math.max(18, top - 54)}px`;
}

function validateConnection(fromNode, toNode) {
  if (!fromNode || !toNode || fromNode.id === toNode.id) return false;
  if (fromNode.type === "text") {
    return !!toNode.preset && ["image", "video", "audio"].includes(toNode.type);
  }
  if (fromNode.sourceKind === "upload") {
    return !!toNode.preset;
  }
  return true;
}

function setLinkSource(nodeId) {
  state.linkFromNodeId = nodeId;
  renderAllNodes();
}

function clearLinkSource() {
  if (!state.linkFromNodeId) return;
  state.linkFromNodeId = null;
  renderAllNodes();
}

function startLinkDrag(node, side, clientX, clientY) {
  const rect = canvasFrame.getBoundingClientRect();
  state.isLinkDragging = true;
  state.linkDragFromNodeId = node.id;
  state.linkDragFromSide = side;
  state.linkPreviewPoint = {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
  setLinkSource(node.id);
  renderConnections();
  setStatus(`正在从“${node.title}”拖拽连线。`);
}

function clearLinkDrag() {
  state.isLinkDragging = false;
  state.linkDragFromNodeId = null;
  state.linkDragFromSide = null;
  state.linkPreviewPoint = null;
  clearLinkSource();
  renderConnections();
}

function removeConnection(fromId, toId) {
  const key = getConnectionKey(fromId, toId);
  if (!state.connections.some((item) => item.from === fromId && item.to === toId)) return;
  rememberHistory();
  state.connections = state.connections.filter((item) => !(item.from === fromId && item.to === toId));

  const fromNode = getNode(fromId);
  const toNode = getNode(toId);
  if (fromNode) {
    fromNode.downstream = (fromNode.downstream || []).filter((id) => id !== toId);
  }
  if (toNode) {
    toNode.upstream = (toNode.upstream || []).filter((id) => id !== fromId);
  }

  if (state.hoveredConnectionKey === key) {
    state.hoveredConnectionKey = null;
    state.hoveredConnectionPoint = null;
  }

  renderConnections();
  updateConnectionDeleteButton();
  updateSession();
  updateEditorPanel();
  setStatus("已断开当前连接。");
}

function addConnection(fromId, toId) {
  const fromNode = getNode(fromId);
  const toNode = getNode(toId);
  if (state.connections.some((item) => item.from === fromId && item.to === toId)) {
    setStatus("该连接已存在。");
    return false;
  }
  if (!validateConnection(fromNode, toNode)) {
    setStatus("当前节点连接规则不允许这条连线。");
    return false;
  }
  rememberHistory();
  state.connections.push({ from: fromId, to: toId });
  if (!Array.isArray(fromNode.downstream)) {
    fromNode.downstream = [];
  }
  if (!Array.isArray(toNode.upstream)) {
    toNode.upstream = [];
  }
  if (!fromNode.downstream.includes(toId)) {
    fromNode.downstream.push(toId);
  }
  if (!toNode.upstream.includes(fromId)) {
    toNode.upstream.push(fromId);
  }
  renderConnections();
  updateSession();
  updateEditorPanel();
  setStatus(`已连接“${fromNode.title}”到“${toNode.title}”。`);
  return true;
}

function createNode(nodeData, options = {}) {
  const config = typeConfig[nodeData.type];
  const template = document.getElementById("nodeTemplate");
  const element = template.content.firstElementChild.cloneNode(true);
  const node = {
    id: nodeData.id || `node-${++state.nodeSeq}`,
    type: nodeData.type,
    title: nodeData.title || config.title,
    prompt: nodeData.prompt || config.prompt,
    model: nodeData.model || config.model,
    x: nodeData.x ?? 160,
    y: nodeData.y ?? 140,
    width: nodeData.width || (nodeData.type === "text" ? 214 : 236),
    height: nodeData.height || (nodeData.type === "text" ? 214 : 170),
    sourceKind: nodeData.sourceKind || "system",
    preset: Boolean(nodeData.preset),
    src: nodeData.src || "",
    fileName: nodeData.fileName || "",
    status: nodeData.status || "idle",
    inputs: Array.isArray(nodeData.inputs) ? [...nodeData.inputs] : [],
    output: nodeData.output ?? null,
    upstream: Array.isArray(nodeData.upstream) ? [...nodeData.upstream] : [],
    downstream: Array.isArray(nodeData.downstream) ? [...nodeData.downstream] : [],
    element
  };

  if (!options.skipHistory) {
    rememberHistory();
  }

  element.dataset.id = node.id;
  element.querySelector(".canvas-node__delete").addEventListener("click", (event) => {
    event.stopPropagation();
    deleteNodes([node.id]);
  });
  element.querySelector(".canvas-node__link").addEventListener("click", (event) => {
    event.stopPropagation();
    setLinkSource(node.id);
  });
  element.querySelectorAll(".canvas-node__port").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      startLinkDrag(node, button.dataset.side || "right", event.clientX, event.clientY);
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
  element.addEventListener("pointerdown", (event) => beginNodeDrag(event, node));
  element.addEventListener("click", (event) => handleNodeClick(event, node));
  element.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    selectNode(node.id);
  });

  canvasWorld.appendChild(element);
  state.nodes.push(node);
  renderNode(node);
  updateSession();
  return node;
}

function removeNodeElements() {
  state.nodes.forEach((node) => node.element.remove());
  state.nodes = [];
}

function deleteNodes(ids) {
  if (!ids.length) return;
  rememberHistory();
  const removeSet = new Set(ids);
  state.connections = state.connections.filter((item) => !removeSet.has(item.from) && !removeSet.has(item.to));
  state.nodes.forEach((node) => {
    if (removeSet.has(node.id)) return;
    node.upstream = (node.upstream || []).filter((id) => !removeSet.has(id));
    node.downstream = (node.downstream || []).filter((id) => !removeSet.has(id));
  });
  state.nodes.filter((node) => removeSet.has(node.id)).forEach((node) => node.element.remove());
  state.nodes = state.nodes.filter((node) => !removeSet.has(node.id));
  cleanupGroups();
  if (state.activeGroupId && !getGroup(state.activeGroupId)) {
    state.activeGroupId = null;
  }
  syncSelection([]);
  renderConnections();
  renderGroups();
  renderSelectionBox();
  updateSession();
  updateEditorPanel();
  setStatus(`已删除 ${ids.length} 个节点。`);
}

function selectNode(id) {
  state.activeGroupId = null;
  syncSelection(id ? [id] : []);
  renderAllNodes();
  renderSelectionBox();
  renderMinimap();
  updateEditorPanel();
}

function seedPresetNodes() {
  removeNodeElements();
  state.connections = [];
  syncSelection([]);
  state.nodeSeq = 0;
  createNode({ type: "text", title: "文本", x: 120, y: 460, preset: true, width: 180, height: 160 });
  createNode({ type: "image", title: "图片生成", x: 360, y: 390, preset: true });
  createNode({ type: "video", title: "Video", x: 620, y: 455, preset: true });
  createNode({ type: "audio", title: "音频", x: 120, y: 650, preset: true });
  state.undoStack = [];
  state.redoStack = [];
  updateMenuState();
  fitView();
}

function fitView() {
  if (!state.nodes.length) {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    setTransform();
    return;
  }
  const bounds = getWorldBounds();
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const scaleX = canvasFrame.clientWidth / width;
  const scaleY = canvasFrame.clientHeight / height;
  state.scale = Math.min(1.05, Math.max(0.55, Math.min(scaleX, scaleY)));
  state.offsetX = canvasFrame.clientWidth / 2 - ((bounds.minX + width / 2) * state.scale);
  state.offsetY = canvasFrame.clientHeight / 2 - ((bounds.minY + height / 2) * state.scale);
  setTransform();
}

function beginNodeDrag(event, node) {
  if (event.button !== 0) return;
  if (event.target.closest(".canvas-node__delete") || event.target.closest(".canvas-node__link") || event.target.closest(".canvas-node__port") || event.target.closest(".canvas-node__text-input")) return;
  updateLastPointer(event.clientX, event.clientY);
  if (!state.selectedNodeIds.has(node.id)) {
    syncSelection([node.id]);
    renderAllNodes();
  }
  ui.editorPanel.classList.add("hidden");
  canvasFrame.classList.add("is-dragging-node");
  state.dragSnapshot = serializeCanvasState();
  state.draggingNodeIds = [...state.selectedNodeIds];
  state.dragOriginPositions = new Map(state.draggingNodeIds.map((id) => {
    const item = getNode(id);
    return [id, { x: item.x, y: item.y }];
  }));
  state.dragStartMouseX = event.clientX;
  state.dragStartMouseY = event.clientY;
  state.isDraggingNodes = true;
  state.nodeMoved = false;
  event.currentTarget.setPointerCapture(event.pointerId);
}

function handleNodeClick(event, node) {
  if (state.suppressNodeClick) {
    state.suppressNodeClick = false;
    return;
  }
  if (event.target.closest(".canvas-node__text-input")) return;
  state.hoveredGroupId = null;
  selectNode(node.id);
}

function serializeSelection() {
  const selected = getSelectedNodes();
  if (!selected.length) return null;
  const minX = Math.min(...selected.map((node) => node.x));
  const minY = Math.min(...selected.map((node) => node.y));
  const selectedIds = new Set(selected.map((node) => node.id));
  return {
    nodes: selected.map((node) => ({
      type: node.type,
      title: node.title,
      prompt: node.prompt,
      model: node.model,
      x: node.x - minX,
      y: node.y - minY,
      width: node.width,
      height: node.height,
      sourceKind: node.sourceKind,
      preset: false,
      src: node.src,
      fileName: node.fileName
    })),
    connections: state.connections.filter((item) => selectedIds.has(item.from) && selectedIds.has(item.to)).map((item) => ({
      fromIndex: selected.findIndex((node) => node.id === item.from),
      toIndex: selected.findIndex((node) => node.id === item.to)
    }))
  };
}

function copySelection(cut = false) {
  const snapshot = serializeSelection();
  if (!snapshot) {
    setStatus("请先选中节点。");
    return;
  }
  state.clipboard = snapshot;
  setStatus(cut ? `已剪切 ${snapshot.nodes.length} 个节点。` : `已复制 ${snapshot.nodes.length} 个节点。`);
  if (cut) deleteNodes([...state.selectedNodeIds]);
}

function pasteSelection(point = state.lastWorldPoint) {
  if (!state.clipboard?.nodes?.length) {
    setStatus("当前没有可粘贴的节点。");
    return;
  }
  rememberHistory();
  const created = state.clipboard.nodes.map((node, index) => createNode({
    ...node,
    x: point.x + node.x + 24 + index * 8,
    y: point.y + node.y + 24 + index * 8
  }, { skipHistory: true }));
  state.clipboard.connections.forEach((connection) => {
    const from = created[connection.fromIndex];
    const to = created[connection.toIndex];
    if (from && to) state.connections.push({ from: from.id, to: to.id });
  });
  syncSelection(created.map((node) => node.id));
  renderAllNodes();
  renderConnections();
  renderSelectionBox();
  updateSession();
  updateEditorPanel();
  setStatus(`已粘贴 ${created.length} 个节点。`);
}

function importFiles(files, point = state.lastWorldPoint) {
  const valid = files.map((file) => {
    if (file.type.startsWith("image/")) return { file, type: "image" };
    if (file.type.startsWith("video/")) return { file, type: "video" };
    if (file.type.startsWith("audio/")) return { file, type: "audio" };
    return null;
  }).filter(Boolean);
  if (!valid.length) {
    setStatus("仅支持图片、视频和音频文件。");
    return;
  }
  rememberHistory();
  const created = valid.map((item, index) => createNode({
    type: item.type,
    title: cleanFileName(item.file.name),
    prompt: item.file.name,
    sourceKind: "upload",
    preset: false,
    src: URL.createObjectURL(item.file),
    fileName: item.file.name,
    x: point.x + (index % 3) * 30,
    y: point.y + Math.floor(index / 3) * 30
  }, { skipHistory: true }));
  syncSelection(created.map((node) => node.id));
  renderAllNodes();
  renderSelectionBox();
  updateEditorPanel();
  setStatus(`已导入 ${created.length} 个文件节点。`);
}

function updateEditorPanel() {
  if (state.isDraggingNodes) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const node = getNode(state.selectedNodeId);
  if (!node || node.type === "text") {
    ui.editorPanel.classList.add("hidden");
    return;
  }
  ui.editorPanel.classList.remove("hidden");
  const panelWidth = Math.min(680, Math.max(420, canvasFrame.clientWidth - 120));
  const left = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const top = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${left}px`;
  ui.editorPanel.style.top = `${top}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  ui.editorToolbar.innerHTML = node.type === "image"
    ? `<button class="node-editor__tool">输</button><button class="node-editor__tool">+</button>`
    : node.type === "video"
      ? `<button class="node-editor__tool">输</button><button class="node-editor__tool">+</button><button class="node-editor__tool">时</button><button class="node-editor__tool">角</button>`
      : `<button class="node-editor__tool">输</button><button class="node-editor__tool">+</button>`;
  ui.editorCanvas.innerHTML = `<button class="node-editor__upload">上传</button><div class="node-editor__preview-shell">${node.type === "audio" ? `<div class="node-editor__audio-mark">Audio</div>` : `<div class="node-editor__preview-mark">${typeConfig[node.type].badge}</div>`}</div>`;
  ui.editorPrompt.placeholder = typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;
  ui.editorFooter.innerHTML = node.type === "image"
    ? `<span data-slot="model">Banana Pro</span><span data-slot="ratio">16:9 · 4K</span><span data-slot="style">风格</span><span data-slot="preset">Sony Veni...</span><span data-slot="quota">30</span><button class="node-editor__send" data-slot="submit">↑</button>`
    : node.type === "video"
      ? `<span data-slot="model">Kling 3.0 Omni</span><span data-slot="video-options">首尾帧 · 16:9 · 自适应 · 3s</span><span data-slot="quota">15秒</span><button class="node-editor__send" data-slot="submit">↑</button>`
      : `<span data-slot="model">ElevenLabs V3</span><span data-slot="tts-mode">文字转语音</span><span data-slot="quota">5 / 百字</span><button class="node-editor__send" data-slot="submit">↑</button>`;
}

ui.editorPrompt.addEventListener("focus", () => {
  state.pendingEditorSnapshot = serializeCanvasState();
});

function updateEditorPanel() {
  if (state.isDraggingNodes) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const node = getNode(state.selectedNodeId);
  if (!node || node.type === "text") {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = Math.min(720, Math.max(440, canvasFrame.clientWidth - 120));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const left = Math.max(panelWidth / 2 + 16, Math.min(canvasFrame.clientWidth - panelWidth / 2 - 16, idealLeft));
  const top = Math.max(18, Math.min(canvasFrame.clientHeight - 240, node.y * state.scale + state.offsetY + node.height * state.scale + 18));
  const previewContent = node.type === "audio"
    ? `<div class="node-editor__audio-mark">Audio</div>`
    : node.type === "video" && node.src
      ? `<video class="node-editor__preview-media" src="${node.src}" muted loop playsinline></video>`
      : `<img class="node-editor__preview-media" src="${node.src || previewSvg(node.type, node.title)}" alt="${node.title}">`;

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${left}px`;
  ui.editorPanel.style.top = `${top}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";

  if (node.type === "image") {
    ui.editorToolbar.innerHTML = `
      <button class="node-editor__tool" data-slot="input-mode" title="输入模式">输</button>
      <button class="node-editor__tool" data-slot="add-reference" title="添加引用">+</button>
    `;
  } else if (node.type === "video") {
    ui.editorToolbar.innerHTML = `
      <button class="node-editor__tool" data-slot="input-mode" title="输入模式">输</button>
      <button class="node-editor__tool" data-slot="add-shot" title="添加镜头">+</button>
      <button class="node-editor__tool" data-slot="timeline" title="时间线">⌁</button>
      <button class="node-editor__tool" data-slot="character" title="角色参考">◎</button>
    `;
  } else {
    ui.editorToolbar.innerHTML = `
      <button class="node-editor__tool" data-slot="voice-mode" title="语音模式">声</button>
      <button class="node-editor__tool" data-slot="add-voice" title="添加音色">+</button>
    `;
  }

  ui.editorCanvas.innerHTML = `
    <button class="node-editor__upload">上传</button>
    <div class="node-editor__preview-shell">
      ${previewContent}
      ${node.type !== "audio" ? `<div class="node-editor__preview-label">${node.title}</div>` : ""}
      <button class="node-editor__port node-editor__port--left" type="button" title="上游连接">+</button>
      <button class="node-editor__port node-editor__port--right" type="button" title="下游连接">+</button>
    </div>
  `;

  ui.editorPrompt.placeholder = typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">Banana Pro</button>
        <button class="node-editor__meta-chip" data-slot="ratio">16:9 · 4K</button>
        <button class="node-editor__meta-chip" data-slot="style">风格</button>
        <button class="node-editor__meta-chip" data-slot="preset">Sony Veni...</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">30</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">Kling 3.0 Omni</button>
        <button class="node-editor__meta-chip" data-slot="video-options">首尾帧 · 16:9 · 自适应 · 3s</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="mute">静</button>
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">15秒</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">ElevenLabs V3</button>
        <button class="node-editor__meta-chip" data-slot="tts-mode">文字转语音</button>
        <button class="node-editor__meta-chip" data-slot="loading">加载中</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__quota" data-slot="quota">5 / 百字</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  }

  ui.editorCanvas.querySelectorAll("video.node-editor__preview-media").forEach((media) => {
    media.addEventListener("loadeddata", () => media.play().catch(() => {}), { once: true });
  });
}

ui.editorPrompt.addEventListener("input", (event) => {
  const node = getNode(state.selectedNodeId);
  if (!node || node.type === "text") return;
  node.prompt = event.target.value;
});

ui.editorPrompt.addEventListener("blur", () => {
  const node = getNode(state.selectedNodeId);
  if (!node || !state.pendingEditorSnapshot) return;
  if (node.prompt !== getSnapshotNodePrompt(state.pendingEditorSnapshot, node.id)) {
    pushHistory(state.pendingEditorSnapshot);
  }
  state.pendingEditorSnapshot = null;
});

function updateEditorPanel() {
  updateWorkflowInspector();

  if (state.isDraggingNodes || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const node = getNode(state.selectedNodeId);
  if (!node || node.type === "text") {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const left = Math.max(panelWidth / 2 + 16, Math.min(canvasFrame.clientWidth - panelWidth / 2 - 16, idealLeft));
  const top = Math.max(18, Math.min(canvasFrame.clientHeight - 228, node.y * state.scale + state.offsetY + node.height * state.scale + 18));

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${left}px`;
  ui.editorPanel.style.top = `${top}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  renderEditorInputs(node);

  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.innerHTML = "";
  ui.editorPrompt.placeholder = typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">Banana Pro</button>
        <button class="node-editor__meta-chip" data-slot="ratio">16:9 · 4K</button>
        <button class="node-editor__meta-chip" data-slot="style">风格</button>
        <button class="node-editor__meta-chip" data-slot="preset">Sony Veni...</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">30</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">Kling 3.0 Omni</button>
        <button class="node-editor__meta-chip" data-slot="video-options">首尾帧 · 16:9 · 自适应 · 3s</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="mute">静</button>
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">15秒</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        <button class="node-editor__meta-chip" data-slot="model">ElevenLabs V3</button>
        <button class="node-editor__meta-chip" data-slot="tts-mode">文字转语音</button>
        <button class="node-editor__meta-chip" data-slot="loading">加载中</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">麦</button>
        <button class="node-editor__quota" data-slot="quota">5 / 百字</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  }
}

function collectNodesInSelection() {
  const rect = canvasFrame.getBoundingClientRect();
  const left = rect.left + Math.min(state.selectionStartX, state.selectionCurrentX);
  const top = rect.top + Math.min(state.selectionStartY, state.selectionCurrentY);
  const right = rect.left + Math.max(state.selectionStartX, state.selectionCurrentX);
  const bottom = rect.top + Math.max(state.selectionStartY, state.selectionCurrentY);
  const ids = state.nodes.filter((node) => {
    const box = node.element.getBoundingClientRect();
    return box.right >= left && box.left <= right && box.bottom >= top && box.top <= bottom;
  }).map((node) => node.id);
  syncSelection(ids);
  renderAllNodes();
  updateEditorPanel();
}

function showContextMenu(clientX, clientY) {
  const rect = canvasFrame.getBoundingClientRect();
  const left = Math.min(clientX - rect.left, rect.width - 184);
  const top = Math.min(clientY - rect.top, rect.height - 260);
  ui.contextMenu.style.left = `${Math.max(12, left)}px`;
  ui.contextMenu.style.top = `${Math.max(12, top)}px`;
  ui.addNodeMenu.style.left = `${Math.min(Math.max(206, left + 184), rect.width - 296)}px`;
  ui.addNodeMenu.style.top = `${Math.max(12, top)}px`;
  ui.contextMenu.classList.remove("hidden");
  ui.addNodeMenu.classList.add("hidden");
  state.contextWorldPoint = worldFromClient(clientX, clientY);
  updateMenuState();
}

function hideContextMenus() {
  ui.contextMenu.classList.add("hidden");
  ui.addNodeMenu.classList.add("hidden");
}

function showQuickAddMenu() {
  hideContextMenus();
  const buttonRect = quickAddBtn.getBoundingClientRect();
  const stageRect = document.querySelector(".canvas-stage").getBoundingClientRect();
  const menuWidth = 276;
  const menuLeft = buttonRect.right - stageRect.left + 10;
  const menuTop = buttonRect.top - stageRect.top - 6;

  ui.addNodeMenu.style.left = `${Math.max(14, Math.min(stageRect.width - menuWidth - 14, menuLeft))}px`;
  ui.addNodeMenu.style.top = `${Math.max(14, menuTop)}px`;
  ui.addNodeMenu.classList.remove("hidden");
}

function focusCanvasFromMinimap(clientX, clientY) {
  const bounds = getWorldBounds();
  const sceneWidth = minimapScene.clientWidth;
  const sceneHeight = minimapScene.clientHeight;
  if (!sceneWidth || !sceneHeight) return;
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(sceneWidth / worldWidth, sceneHeight / worldHeight);
  const padX = (sceneWidth - worldWidth * scale) / 2;
  const padY = (sceneHeight - worldHeight * scale) / 2;
  const rect = minimapScene.getBoundingClientRect();
  const localX = Math.max(padX, Math.min(sceneWidth - padX, clientX - rect.left));
  const localY = Math.max(padY, Math.min(sceneHeight - padY, clientY - rect.top));
  const worldX = bounds.minX + (localX - padX) / scale;
  const worldY = bounds.minY + (localY - padY) / scale;
  state.offsetX = canvasFrame.clientWidth / 2 - worldX * state.scale;
  state.offsetY = canvasFrame.clientHeight / 2 - worldY * state.scale;
  setTransform();
}

const GROUP_SWATCHES = [
  { name: "default", value: "rgba(255,255,255,0.03)" },
  { name: "rose", value: "rgba(185,84,93,0.18)" },
  { name: "amber", value: "rgba(178,110,40,0.18)" },
  { name: "olive", value: "rgba(170,155,64,0.18)" },
  { name: "forest", value: "rgba(73,136,89,0.18)" },
  { name: "lake", value: "rgba(67,134,154,0.18)" },
  { name: "cobalt", value: "rgba(58,106,176,0.18)" },
  { name: "violet", value: "rgba(129,78,176,0.18)" }
];

function getActiveCanvasGroup() {
  return getGroup(state.activeGroupId || state.hoveredGroupId);
}

function updateGroupToolbar() {
  const group = getActiveCanvasGroup();
  if (!group) {
    hideGroupToolbar();
    return;
  }

  const bounds = getGroupBounds(group);
  if (!bounds) {
    hideGroupToolbar();
    return;
  }

  const width = (bounds.right - bounds.left) * state.scale;
  const left = bounds.left * state.scale + state.offsetX;
  const top = bounds.top * state.scale + state.offsetY;
  const toolbarWidth = ui.groupToolbar.offsetWidth || 236;
  const menuWidth = ui.groupColorMenu.offsetWidth || 72;
  const targetLeft = Math.max(18, Math.min(canvasFrame.clientWidth - toolbarWidth - 18, left + width / 2 - toolbarWidth / 2));

  ui.groupToolbar.classList.remove("hidden");
  ui.groupToolbar.style.left = `${targetLeft}px`;
  ui.groupToolbar.style.top = `${Math.max(18, top - 56)}px`;

  const dot = ui.groupColorBtn.querySelector(".group-toolbar__color-dot");
  if (dot) {
    dot.style.background = group.color || GROUP_SWATCHES[0].value;
  }

  if (!ui.groupColorMenu.classList.contains("hidden")) {
    ui.groupColorMenu.style.left = `${Math.max(18, Math.min(canvasFrame.clientWidth - menuWidth - 18, targetLeft - 6))}px`;
    ui.groupColorMenu.style.top = `${Math.max(18, top - 6)}px`;
  }
}

function renderGroups() {
  canvasWorld.querySelectorAll(".canvas-group").forEach((element) => element.remove());
  cleanupGroups();

  state.groups.forEach((group) => {
    const bounds = getGroupBounds(group);
    if (!bounds) return;

    const element = document.createElement("section");
    element.className = "canvas-group";
    if (state.activeGroupId === group.id || state.hoveredGroupId === group.id) {
      element.classList.add("is-active");
    }
    element.dataset.groupId = group.id;
    element.style.left = `${bounds.left}px`;
    element.style.top = `${bounds.top}px`;
    element.style.width = `${bounds.right - bounds.left}px`;
    element.style.height = `${bounds.bottom - bounds.top}px`;
    element.style.setProperty("--group-bg", group.color || GROUP_SWATCHES[0].value);
    element.innerHTML = `<div class="canvas-group__title">${group.title || "新建组"}</div>`;

    element.addEventListener("mouseenter", () => {
      state.hoveredGroupId = group.id;
      updateGroupToolbar();
    });

    element.addEventListener("mouseleave", () => {
      if (state.activeGroupId !== group.id) {
        state.hoveredGroupId = null;
        updateGroupToolbar();
      }
    });

    element.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".canvas-node")) return;
      hideContextMenus();
      state.activeGroupId = group.id;
      state.hoveredGroupId = group.id;
      state.groupDragSnapshot = serializeCanvasState();
      state.draggingGroupId = group.id;
      state.groupDragOriginBounds = { ...(group.frame || getGroupBounds(group)) };
      state.groupMoved = false;
      state.dragOriginPositions = new Map(group.nodeIds.map((id) => {
        const node = getNode(id);
        return [id, { x: node.x, y: node.y }];
      }));
      state.dragStartMouseX = event.clientX;
      state.dragStartMouseY = event.clientY;
      syncSelection([]);
      renderAllNodes();
      renderSelectionBox();
      updateEditorPanel();
      updateGroupToolbar();
      event.currentTarget.setPointerCapture(event.pointerId);
      event.stopPropagation();
    });

    element.addEventListener("click", (event) => {
      if (event.target.closest(".canvas-node")) return;
      state.activeGroupId = group.id;
      state.hoveredGroupId = group.id;
      syncSelection([]);
      renderSelectionBox();
      updateEditorPanel();
      updateGroupToolbar();
      event.stopPropagation();
    });

    canvasWorld.prepend(element);
  });

  updateGroupToolbar();
}

function createGroupFromSelection() {
  const selected = getSelectedNodes();
  if (selected.length < 2) {
    setStatus("至少选择两个节点才能打组。");
    return;
  }

  rememberHistory();
  const selectedIds = selected.map((node) => node.id);
  state.groups = state.groups
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id) => !selectedIds.includes(id))
    }))
    .filter((group) => group.nodeIds.length > 0);

  const group = {
    id: `group-${++state.groupSeq}`,
    title: "新建组",
    nodeIds: selectedIds,
    color: GROUP_SWATCHES[0].value,
    frame: getNodesFrame(selectedIds)
  };

  state.groups.push(group);
  state.activeGroupId = group.id;
  state.hoveredGroupId = group.id;
  syncSelection([]);
  renderAllNodes();
  renderGroups();
  renderSelectionBox();
  updateEditorPanel();
  setStatus("已创建新组。");
}

function layoutActiveGroup() {
  const group = getActiveCanvasGroup();
  if (!group) return;

  const nodes = group.nodeIds.map((id) => getNode(id)).filter(Boolean).sort((a, b) => (a.y - b.y) || (a.x - b.x));
  if (!nodes.length) return;

  rememberHistory();
  const bounds = getGroupBounds(group);
  const maxWidth = Math.max(...nodes.map((node) => node.width));
  const anchorX = bounds.left + 18;
  let currentY = bounds.top + 18;

  nodes.forEach((node) => {
    node.x = anchorX + Math.max(0, (maxWidth - node.width) / 2);
    node.y = currentY;
    currentY += node.height + 22;
    renderNode(node);
  });

  group.frame = getNodesFrame(group.nodeIds);

  renderGroups();
  renderConnections();
  renderSelectionBox();
  updateEditorPanel();
  setStatus("已整理组内节点布局。");
}

function setActiveGroupColor(color) {
  const group = getActiveCanvasGroup();
  if (!group) return;
  rememberHistory();
  group.color = color;
  renderGroups();
}

function ungroupActiveGroup() {
  const group = getActiveCanvasGroup();
  if (!group) return;
  rememberHistory();
  state.groups = state.groups.filter((item) => item.id !== group.id);
  state.activeGroupId = null;
  state.hoveredGroupId = null;
  renderGroups();
  renderSelectionBox();
  updateEditorPanel();
  setStatus("已解组。");
}

function bindEvents() {
  document.querySelectorAll(".left-dock__tool[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = createNode({ type: button.dataset.type, x: state.lastWorldPoint.x, y: state.lastWorldPoint.y });
      selectNode(node.id);
      setStatus(`已添加 ${typeConfig[node.type].title} 节点。`);
    });
  });

  quickAddBtn.addEventListener("click", () => {
    showQuickAddMenu();
  });

  createAssetBtn.addEventListener("click", () => setStatus("创建资产入口已预留。"));
  addToChatBtn.addEventListener("click", () => setStatus("加入对话入口已预留。"));
  groupNodesBtn.addEventListener("click", () => createGroupFromSelection());
  deleteSelectionBtn.addEventListener("click", () => deleteNodes([...state.selectedNodeIds]));
  overviewBtn.addEventListener("click", fitView);

  toggleMinimapBtn.addEventListener("click", () => {
    state.minimapVisible = !state.minimapVisible;
    toggleMinimapBtn.classList.toggle("is-active", !state.minimapVisible);
    renderMinimap();
  });

  snapGridBtn.addEventListener("click", () => {
    state.snapToGrid = !state.snapToGrid;
    snapGridBtn.classList.toggle("is-active", state.snapToGrid);
  });

  zoomSlider.addEventListener("input", () => {
    state.scale = Number(zoomSlider.value) / 100;
    setTransform();
  });

  ui.contextMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "upload") {
      hideContextMenus();
      ui.uploadInput.value = "";
      ui.uploadInput.click();
    }
    if (action === "asset") {
      hideContextMenus();
      setStatus("添加资产入口已预留。");
    }
    if (action === "add-node") {
      ui.addNodeMenu.classList.toggle("hidden");
    }
    if (action === "undo") undo();
    if (action === "redo") redo();
    if (action === "paste") {
      hideContextMenus();
      pasteSelection(state.contextWorldPoint);
    }
  });

  ui.groupColorList.innerHTML = [
    { name: "默认", value: "rgba(255,255,255,0.03)" },
    { name: "玫红", value: "rgba(185,84,93,0.18)" },
    { name: "棕橙", value: "rgba(178,110,40,0.18)" },
    { name: "橄榄", value: "rgba(170,155,64,0.18)" },
    { name: "森林", value: "rgba(73,136,89,0.18)" },
    { name: "湖蓝", value: "rgba(67,134,154,0.18)" },
    { name: "钴蓝", value: "rgba(58,106,176,0.18)" },
    { name: "紫罗兰", value: "rgba(129,78,176,0.18)" }
  ].map((item) => `
    <button class="group-color-menu__swatch" data-color="${item.value}" title="${item.name}" style="--swatch:${item.value}"></button>
  `).join("");

  ui.groupColorBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    ui.groupColorMenu.classList.toggle("hidden");
    updateGroupToolbar();
  });

  ui.groupLayoutBtn.addEventListener("click", () => {
    ui.groupColorMenu.classList.add("hidden");
    layoutActiveGroup();
  });

  ui.groupUngroupBtn.addEventListener("click", () => {
    ui.groupColorMenu.classList.add("hidden");
    ungroupActiveGroup();
  });

  ui.groupColorList.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveGroupColor(button.dataset.color);
      ui.groupColorMenu.classList.add("hidden");
    });
  });

  ui.addNodeMenu.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = createNode({ type: button.dataset.type, x: state.contextWorldPoint.x, y: state.contextWorldPoint.y });
      selectNode(node.id);
      hideContextMenus();
    });
  });

  ui.uploadInput.addEventListener("change", () => {
    if (ui.uploadInput.files?.length) {
      importFiles([...ui.uploadInput.files], state.contextWorldPoint);
    }
  });

  canvasFrame.addEventListener("pointerdown", (event) => {
    updateLastPointer(event.clientX, event.clientY);
    if (!event.target.closest(".canvas-node") && !event.target.closest(".canvas-group") && !event.target.closest(".connection-hit") && !event.target.closest("#connectionDeleteBtn") && !event.target.closest("#selectionToolbar") && !event.target.closest("#canvasContextMenu") && !event.target.closest("#addNodeMenu") && !event.target.closest("#groupToolbar") && !event.target.closest("#groupColorMenu")) {
      hideContextMenus();
      state.activeGroupId = null;
      state.hoveredGroupId = null;
      hideGroupToolbar();
      if (!state.isLinkDragging) {
        clearLinkSource();
      }
    }
    if (event.target.closest(".connection-hit") || event.target.closest("#connectionDeleteBtn") || event.target.closest("#selectionToolbar") || event.target.closest("#canvasContextMenu") || event.target.closest("#addNodeMenu") || event.target.closest("#groupToolbar") || event.target.closest("#groupColorMenu")) return;
    if (event.target.closest(".canvas-node")) return;
    if (event.target.closest(".canvas-group")) return;
    if (event.button === 1 || (interaction.isSpacePressed && event.button === 0)) {
      event.preventDefault();
      state.isPanning = true;
      state.panStartX = event.clientX - state.offsetX;
      state.panStartY = event.clientY - state.offsetY;
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = canvasFrame.getBoundingClientRect();
    state.isSelecting = true;
    state.selectionStartX = event.clientX - rect.left;
    state.selectionStartY = event.clientY - rect.top;
    state.selectionCurrentX = state.selectionStartX;
    state.selectionCurrentY = state.selectionStartY;
    state.selectionMoved = false;
    syncSelection([]);
    renderAllNodes();
    renderSelectionBox();
    updateEditorPanel();
  });

  canvasFrame.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".canvas-node")) return;
    event.preventDefault();
    showContextMenu(event.clientX, event.clientY);
  });

  canvasFrame.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.scale = Math.min(1.85, Math.max(0.55, Number((state.scale + (event.deltaY > 0 ? -0.05 : 0.05)).toFixed(2))));
    setTransform();
  }, { passive: false });

  minimapPreview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    interaction.isDraggingMinimap = true;
    focusCanvasFromMinimap(event.clientX, event.clientY);
    minimapPreview.setPointerCapture(event.pointerId);
  });

  canvasFrame.addEventListener("dragenter", (event) => {
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
      canvasFrame.classList.add("is-drop-target");
    }
  });
  canvasFrame.addEventListener("dragover", (event) => {
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
      canvasFrame.classList.add("is-drop-target");
      updateLastPointer(event.clientX, event.clientY);
    }
  });
  canvasFrame.addEventListener("drop", (event) => {
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    canvasFrame.classList.remove("is-drop-target");
    importFiles(files, worldFromClient(event.clientX, event.clientY));
  });

  window.addEventListener("pointermove", (event) => {
    updateLastPointer(event.clientX, event.clientY);
    if (interaction.isDraggingMinimap) {
      focusCanvasFromMinimap(event.clientX, event.clientY);
      return;
    }
    if (state.isLinkDragging) {
      const rect = canvasFrame.getBoundingClientRect();
      state.linkPreviewPoint = {
        x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
      };
      renderConnections();
      return;
    }
    if (state.isPanning) {
      state.offsetX = event.clientX - state.panStartX;
      state.offsetY = event.clientY - state.panStartY;
      setTransform();
      return;
    }
    if (state.isDraggingNodes) {
      const deltaX = (event.clientX - state.dragStartMouseX) / state.scale;
      const deltaY = (event.clientY - state.dragStartMouseY) / state.scale;
      state.nodeMoved = state.nodeMoved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
      state.draggingNodeIds.forEach((id) => {
        const node = getNode(id);
        const origin = state.dragOriginPositions.get(id);
        if (!node || !origin) return;
        const nextX = origin.x + deltaX;
        const nextY = origin.y + deltaY;
        node.x = state.snapToGrid ? snapValue(nextX) : nextX;
        node.y = state.snapToGrid ? snapValue(nextY) : nextY;
        renderNode(node);
      });
      syncGroupMembershipForNodes(state.draggingNodeIds);
      renderGroups();
      renderConnections();
      renderSelectionBox();
      updateEditorPanel();
      return;
    }
    if (state.draggingGroupId) {
      const group = getGroup(state.draggingGroupId);
      const deltaX = (event.clientX - state.dragStartMouseX) / state.scale;
      const deltaY = (event.clientY - state.dragStartMouseY) / state.scale;
      state.groupMoved = state.groupMoved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
      if (group) {
        const frame = state.groupDragOriginBounds || group.frame || getGroupBounds(group);
        group.nodeIds.forEach((id) => {
          const node = getNode(id);
          const origin = state.dragOriginPositions.get(id);
          if (!node || !origin) return;
          node.x = state.snapToGrid ? snapValue(origin.x + deltaX) : origin.x + deltaX;
          node.y = state.snapToGrid ? snapValue(origin.y + deltaY) : origin.y + deltaY;
          renderNode(node);
        });
        if (frame) {
          const nextLeft = state.snapToGrid ? snapValue(frame.left + deltaX) : frame.left + deltaX;
          const nextTop = state.snapToGrid ? snapValue(frame.top + deltaY) : frame.top + deltaY;
          const width = frame.right - frame.left;
          const height = frame.bottom - frame.top;
          group.frame = {
            left: nextLeft,
            top: nextTop,
            right: nextLeft + width,
            bottom: nextTop + height
          };
        }
        renderGroups();
        renderConnections();
        updateEditorPanel();
      }
      return;
    }
    if (state.isSelecting) {
      const rect = canvasFrame.getBoundingClientRect();
      state.selectionCurrentX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      state.selectionCurrentY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      state.selectionMoved = Math.abs(state.selectionCurrentX - state.selectionStartX) > 4 || Math.abs(state.selectionCurrentY - state.selectionStartY) > 4;
      renderSelectionBox();
      collectNodesInSelection();
    }
  });

  window.addEventListener("pointerup", (event) => {
    interaction.isDraggingMinimap = false;
    state.isPanning = false;
    canvasFrame.classList.remove("is-drop-target");
    if (state.isLinkDragging) {
      const targetPort = event.target?.closest?.(".canvas-node__port");
      const targetNode = targetPort?.closest(".canvas-node");
      const targetNodeId = targetNode?.dataset?.id;
      const fromNodeId = state.linkDragFromNodeId;
      if (fromNodeId && targetNodeId && fromNodeId !== targetNodeId) {
        addConnection(fromNodeId, targetNodeId);
      }
      clearLinkDrag();
      return;
    }
    if (state.isDraggingNodes) {
      canvasFrame.classList.remove("is-dragging-node");
      state.isDraggingNodes = false;
      if (state.dragSnapshot && state.nodeMoved) pushHistory(state.dragSnapshot);
      state.dragSnapshot = null;
      state.suppressNodeClick = state.nodeMoved;
      state.nodeMoved = false;
      updateEditorPanel();
    }
    if (state.draggingGroupId) {
      if (state.groupDragSnapshot && state.groupMoved) {
        pushHistory(state.groupDragSnapshot);
      }
      state.draggingGroupId = null;
      state.groupDragSnapshot = null;
      state.groupMoved = false;
    }
    if (state.isSelecting) {
      state.suppressCanvasClick = state.selectionMoved;
      state.isSelecting = false;
      renderSelectionBox();
    }
  });

  canvasFrame.addEventListener("click", (event) => {
    if (state.suppressCanvasClick) {
      state.suppressCanvasClick = false;
      return;
    }
    if (event.target.closest(".connection-hit") || event.target.closest("#connectionDeleteBtn") || event.target.closest("#selectionToolbar") || event.target.closest("#canvasContextMenu") || event.target.closest("#addNodeMenu") || event.target.closest("#groupToolbar") || event.target.closest("#groupColorMenu")) {
      return;
    }
    if (!event.target.closest(".canvas-node") && !event.target.closest(".canvas-group")) {
      selectNode(null);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && !isEditableTarget(event.target)) {
      event.preventDefault();
      interaction.isSpacePressed = true;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && !isEditableTarget(event.target) && state.selectedNodeIds.size) {
      event.preventDefault();
      deleteNodes([...state.selectedNodeIds]);
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier || isEditableTarget(event.target)) return;
    if (event.key.toLowerCase() === "c") {
      event.preventDefault();
      copySelection(false);
    } else if (event.key.toLowerCase() === "x") {
      event.preventDefault();
      copySelection(true);
    } else if (event.key.toLowerCase() === "v") {
      if (state.clipboard?.nodes?.length) {
        event.preventDefault();
        pasteSelection(state.lastWorldPoint);
      }
    } else if (event.key.toLowerCase() === "z" && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      undo();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") interaction.isSpacePressed = false;
  });

  window.addEventListener("paste", (event) => {
    const files = [...(event.clipboardData?.items || [])]
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (files.length) {
      event.preventDefault();
      importFiles(files, state.lastWorldPoint);
      return;
    }
    if (!isEditableTarget(event.target) && state.clipboard?.nodes?.length) {
      event.preventDefault();
      pasteSelection(state.lastWorldPoint);
    }
  });

  window.addEventListener("resize", () => {
    updateGroupToolbar();
    renderConnections();
    renderMinimap();
    updateEditorPanel();
  });
}

localizeUi();
bindEvents();
setStatus("空闲");
seedPresetNodes();
renderConnections();
renderMinimap();
updateEditorPanel();
ui.groupColorList.innerHTML = GROUP_SWATCHES.map((item) => `
  <button class="group-color-menu__swatch" data-color="${item.value}" title="${item.name}" style="--swatch:${item.value}"></button>
`).join("");
ui.groupColorList.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveGroupColor(button.dataset.color);
    ui.groupColorMenu.classList.add("hidden");
    updateGroupToolbar();
  });
});
ui.groupToolbar.addEventListener("mouseleave", () => {
  if (!state.activeGroupId) {
    state.hoveredGroupId = null;
    hideGroupToolbar();
  }
});
ui.groupColorMenu.addEventListener("mouseleave", () => {
  if (!state.activeGroupId) {
    state.hoveredGroupId = null;
    hideGroupToolbar();
  }
});

const workspaceDashboard = document.getElementById("workspaceDashboard");
const floatingTitleTrigger = document.getElementById("floatingTitleTrigger");
const projectGallery = document.getElementById("projectGallery");
const projectSearchInput = document.getElementById("projectSearchInput");
const projectFilterBtn = document.getElementById("projectFilterBtn");
const projectGridBtn = document.getElementById("projectGridBtn");
const projectListBtn = document.getElementById("projectListBtn");
const dashboardNewProjectBtn = document.getElementById("dashboardNewProjectBtn");
const projectImportBtn = document.getElementById("projectImportBtn");
const projectCardMenu = document.getElementById("projectCardMenu");

const projectStore = {
  activeProjectId: "project-1",
  nextProjectIndex: 2,
  menuProjectId: null,
  projects: []
};

function cloneSnapshot(snapshot) {
  return JSON.parse(JSON.stringify(snapshot));
}

function createEmptyCanvasSnapshot() {
  return {
    nodeSeq: 0,
    groupSeq: 0,
    nodes: [],
    connections: [],
    groups: [],
    selectedIds: []
  };
}

function getProjectById(projectId) {
  return projectStore.projects.find((project) => project.id === projectId);
}

function buildProjectPreview(project) {
  const snapshot = project.snapshot;
  const imageNode = snapshot?.nodes?.find((node) => node.type === "image" && node.src);
  if (imageNode?.src) {
    return `<img src="${imageNode.src}" alt="${project.name}">`;
  }

  const hasVisualNode = snapshot?.nodes?.some((node) => ["image", "video", "audio"].includes(node.type));
  if (hasVisualNode) {
    return `<img src="${previewSvg("image", project.name)}" alt="${project.name}">`;
  }

  return `<div class="project-card__cover--gradient"></div>`;
}

function saveActiveProjectSnapshot() {
  const project = getProjectById(projectStore.activeProjectId);
  if (!project) return;
  project.snapshot = cloneSnapshot(serializeCanvasState());
  project.updatedAt = "刚刚编辑";
}

function renderProjectGallery() {
  if (!projectGallery) return;
  projectGallery.querySelectorAll(".project-card:not(.project-card--create)").forEach((card) => card.remove());

  projectStore.projects.forEach((project) => {
    const card = document.createElement("article");
    card.className = "project-card";
    if (project.id === projectStore.activeProjectId) {
      card.classList.add("is-active");
    }
    card.dataset.projectId = project.id;
    card.dataset.projectName = project.name;
    card.innerHTML = `
      <button class="project-card__menu-trigger" type="button" data-project-menu="${project.id}" title="项目菜单">
        <span>⋮</span>
      </button>
      <div class="project-card__cover">${buildProjectPreview(project)}</div>
      <div class="project-card__content">
        <h3 class="project-card__title">${project.name}</h3>
        <p class="project-card__meta ${project.updatedAt === "独立空白面板" ? "project-card__meta--muted" : ""}">${project.updatedAt}</p>
      </div>
    `;
    projectGallery.appendChild(card);
  });

  filterWorkspaceProjects();
}

function setWorkspaceDashboardView(mode) {
  if (!projectGallery) return;
  const isList = mode === "list";
  projectGallery.classList.toggle("is-list", isList);
  if (projectGridBtn) projectGridBtn.classList.toggle("is-active", !isList);
  if (projectListBtn) projectListBtn.classList.toggle("is-active", isList);
}

function filterWorkspaceProjects() {
  if (!projectGallery) return;
  const keyword = (projectSearchInput?.value || "").trim().toLowerCase();
  [...projectGallery.querySelectorAll(".project-card")].forEach((card) => {
    if (card.dataset.projectAction === "new") {
      card.classList.remove("is-hidden");
      return;
    }
    const name = (card.dataset.projectName || "").toLowerCase();
    card.classList.toggle("is-hidden", !!keyword && !name.includes(keyword));
  });
}

function openWorkspaceDashboard() {
  if (!workspaceDashboard) return;
  saveActiveProjectSnapshot();
  renderProjectGallery();
  workspaceDashboard.classList.remove("hidden");
  hideContextMenus();
  selectionToolbar.classList.add("hidden");
  ui.editorPanel.classList.add("hidden");
  state.activeGroupId = null;
  state.hoveredGroupId = null;
  hideGroupToolbar();
  document.body.style.overflow = "hidden";
}

function closeWorkspaceDashboard(projectName = "") {
  if (!workspaceDashboard) return;
  workspaceDashboard.classList.add("hidden");
  document.body.style.overflow = "";
  hideProjectCardMenu();
  if (projectName) {
    const titleMeta = document.querySelector(".floating-title__meta");
    if (titleMeta) titleMeta.textContent = projectName;
  }
  updateEditorPanel();
}

function activateProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;

  if (projectStore.activeProjectId !== projectId) {
    saveActiveProjectSnapshot();
  }

  projectStore.activeProjectId = projectId;
  restoreSnapshot(cloneSnapshot(project.snapshot || createEmptyCanvasSnapshot()));
  renderProjectGallery();
  closeWorkspaceDashboard(project.name);
  setStatus(`已打开项目 ${project.name}`);
}

function createDashboardProjectCard() {
  const projectId = `project-${Date.now()}`;
  const projectName = `未命名项目 (${projectStore.nextProjectIndex++})`;
  const project = {
    id: projectId,
    name: projectName,
    updatedAt: "独立空白面板",
    snapshot: createEmptyCanvasSnapshot()
  };
  projectStore.projects.unshift(project);
  renderProjectGallery();
  activateProject(projectId);
}

function hideProjectCardMenu() {
  if (!projectCardMenu) return;
  projectCardMenu.classList.add("hidden");
  projectStore.menuProjectId = null;
}

function showProjectCardMenu(projectId, button) {
  if (!projectCardMenu || !button) return;
  const rect = button.getBoundingClientRect();
  projectCardMenu.style.left = `${Math.min(window.innerWidth - 172, rect.right - 154)}px`;
  projectCardMenu.style.top = `${Math.min(window.innerHeight - 220, rect.bottom + 8)}px`;
  projectCardMenu.classList.remove("hidden");
  projectStore.menuProjectId = projectId;
}

function renameProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  const nextName = window.prompt("输入新的项目名称", project.name);
  if (!nextName) return;
  project.name = nextName.trim() || project.name;
  if (projectStore.activeProjectId === projectId) {
    const titleMeta = document.querySelector(".floating-title__meta");
    if (titleMeta) titleMeta.textContent = project.name;
  }
  renderProjectGallery();
}

function moveProject(projectId) {
  const project = getProjectById(projectId);
  if (!project) return;
  setStatus(`“${project.name}”的移动入口已预留。`);
}

function deleteProject(projectId) {
  if (projectStore.projects.length <= 1) {
    setStatus("至少保留一个项目。");
    return;
  }
  const project = getProjectById(projectId);
  if (!project) return;
  projectStore.projects = projectStore.projects.filter((item) => item.id !== projectId);

  if (projectStore.activeProjectId === projectId) {
    const fallback = projectStore.projects[0];
    projectStore.activeProjectId = fallback.id;
    restoreSnapshot(cloneSnapshot(fallback.snapshot || createEmptyCanvasSnapshot()));
    closeWorkspaceDashboard(fallback.name);
  }

  renderProjectGallery();
  setStatus(`已删除项目 ${project.name}`);
}

function initWorkspaceProjects() {
  projectStore.projects = [
    {
      id: "project-1",
      name: "未命名项目",
      updatedAt: "刚刚编辑",
      snapshot: cloneSnapshot(serializeCanvasState())
    }
  ];
  const titleMeta = document.querySelector(".floating-title__meta");
  if (titleMeta) {
    titleMeta.textContent = projectStore.projects[0].name;
  }
  renderProjectGallery();
}

function bindWorkspaceDashboardEvents() {
  if (floatingTitleTrigger) {
    floatingTitleTrigger.addEventListener("click", () => {
      openWorkspaceDashboard();
    });
    floatingTitleTrigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWorkspaceDashboard();
      }
    });
  }

  if (projectSearchInput) {
    projectSearchInput.addEventListener("input", filterWorkspaceProjects);
  }

  if (projectFilterBtn) {
    projectFilterBtn.addEventListener("click", () => {
      if (projectSearchInput) {
        projectSearchInput.value = "";
      }
      filterWorkspaceProjects();
    });
  }

  if (projectGridBtn) {
    projectGridBtn.addEventListener("click", () => setWorkspaceDashboardView("grid"));
  }

  if (projectListBtn) {
    projectListBtn.addEventListener("click", () => setWorkspaceDashboardView("list"));
  }

  if (dashboardNewProjectBtn) {
    dashboardNewProjectBtn.addEventListener("click", () => {
      createDashboardProjectCard();
    });
  }

  if (projectImportBtn) {
    projectImportBtn.addEventListener("click", () => {
      setStatus("导入项目入口已预留");
    });
  }

  if (projectGallery) {
    projectGallery.addEventListener("click", (event) => {
      const menuTrigger = event.target.closest("[data-project-menu]");
      if (menuTrigger) {
        event.stopPropagation();
        const projectId = menuTrigger.dataset.projectMenu;
        if (projectStore.menuProjectId === projectId && projectCardMenu && !projectCardMenu.classList.contains("hidden")) {
          hideProjectCardMenu();
        } else {
          showProjectCardMenu(projectId, menuTrigger);
        }
        return;
      }

      const card = event.target.closest(".project-card");
      if (!card) return;
      if (card.dataset.projectAction === "new") {
        createDashboardProjectCard();
        return;
      }
      activateProject(card.dataset.projectId);
    });
  }

  if (projectCardMenu) {
    projectCardMenu.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      const projectId = projectStore.menuProjectId;
      if (!action || !projectId) return;

      if (action === "open") activateProject(projectId);
      if (action === "rename") renameProject(projectId);
      if (action === "move") moveProject(projectId);
      if (action === "delete") deleteProject(projectId);
      hideProjectCardMenu();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && workspaceDashboard && !workspaceDashboard.classList.contains("hidden")) {
      closeWorkspaceDashboard();
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".project-card__menu-trigger") && !event.target.closest("#projectCardMenu")) {
      hideProjectCardMenu();
    }
  });
}

setWorkspaceDashboardView("grid");
initWorkspaceProjects();
bindWorkspaceDashboardEvents();

