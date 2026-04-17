const canvasFrame = document.getElementById("canvasFrame");
const canvasWorld = document.getElementById("canvasWorld");
const canvasGrid = document.querySelector(".canvas-grid");
const connectionsLayer = document.getElementById("connectionsLayer");
const selectionToolbar = document.getElementById("selectionToolbar");
const zoomIndicator = document.getElementById("zoomIndicator");
const zoomSlider = document.getElementById("zoomSlider");
const searchInput = document.getElementById("searchInput");
const summaryTitle = document.getElementById("summaryTitle");
const summaryMeta = document.getElementById("summaryMeta");
const analysisList = document.getElementById("analysisList");
const inspectorEmpty = document.getElementById("inspectorEmpty");
const inspectorForm = document.getElementById("inspectorForm");
const nodeTitleInput = document.getElementById("nodeTitleInput");
const nodePromptInput = document.getElementById("nodePromptInput");
const nodeModelInput = document.getElementById("nodeModelInput");
const nodeSizeInput = document.getElementById("nodeSizeInput");
const nodeRunsInput = document.getElementById("nodeRunsInput");
const nodeCount = document.getElementById("nodeCount");
const connectionCount = document.getElementById("connectionCount");
const sessionList = document.getElementById("sessionList");
const chatPrompt = document.getElementById("chatPrompt");
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

const typeConfig = {
  text: { badge: "文本", meta: "脚本 / 提示词", model: "gpt-4.1", title: "文本节点", prompt: "补充这个序列的镜头逻辑，保持压迫感与神秘氛围。", preview: "text" },
  image: { badge: "Image", meta: "参考图 / 风格图", model: "flux-pro", title: "关键参考图", prompt: "巨石之间站立的怪物，阴天、冷色、雾气、电影级质感。", preview: "image" },
  video: { badge: "Video", meta: "镜头 / 动作 / 输出", model: "kling-2", title: "视频节点", prompt: "镜头从低角度慢推近，保留风暴云层与角色压迫感。", preview: "video" },
  asset: { badge: "资产", meta: "角色 / 场景 / 物件", model: "tap-mix", title: "资产节点", prompt: "主角设定、材质分层、比例关系与场景结构。", preview: "asset" }
};

const workflowPresets = {
  storyboard: [
    { type: "image", title: "主参考图", x: 40, y: 180 },
    { type: "video", title: "镜头 A", x: 320, y: 280 },
    { type: "image", title: "中段参考", x: 600, y: 710 },
    { type: "video", title: "镜头 B", x: 1180, y: 460 },
    { type: "video", title: "镜头 C", x: 1460, y: 810 },
    { type: "video", title: "镜头 D", x: 850, y: 1180 }
  ],
  product: [
    { type: "asset", title: "产品资产", prompt: "黑曜石瓶身，金属光泽盖，奢华科技护肤感。", x: 80, y: 220 },
    { type: "text", title: "广告文案", prompt: "用一句话定义高级感与功效感，适配电商首页。", x: 340, y: 100 },
    { type: "image", title: "KV 海报", prompt: "硬光切面、液体反光、极黑背景与高亮金属边缘。", x: 670, y: 320 },
    { type: "video", title: "成片镜头", prompt: "慢推、光线扫过瓶身、液体粒子悬浮。", x: 1110, y: 580 }
  ],
  shortvideo: [
    { type: "text", title: "开场钩子", prompt: "前三秒直接建立冲突感，让用户停留。", x: 60, y: 280 },
    { type: "image", title: "封面图", prompt: "极具戏剧性的封面帧，强明暗对比。", x: 440, y: 180 },
    { type: "video", title: "转场镜头", prompt: "快速切换，保留主体结构与视线方向。", x: 890, y: 430 },
    { type: "video", title: "结尾成片", prompt: "收束到强记忆点画面，方便做循环播放。", x: 1330, y: 760 }
  ]
};

const analysisByType = {
  text: [
    "文本节点更适合作为上游逻辑控制，不建议直接连接过多输出节点。",
    "如果后面要生成视频，先把镜头语气和运动方向写清楚，会更稳定。",
    "可以继续补充节奏词，例如缓推、俯冲、停顿、切黑。"
  ],
  image: [
    "这类图像节点很适合作为主参考，建议连接到多个视频节点分叉尝试。",
    "如果画面氛围已经够强，就不要再添加第二张同级参考图，容易冲突。",
    "可以把这张图继续接成特写版和远景版两个变体。"
  ],
  video: [
    "视频节点当前更像结果层，建议往上补一个静帧参考节点提升一致性。",
    "如果这是最终输出，可以再加一个成片节点汇总多个视频分支。",
    "注意同组视频节点之间保留统一镜头语言，避免过早跳切。"
  ],
  asset: [
    "资产节点适合放在流程最前面，统一角色、场景和材质信息。",
    "如果产品或角色变化不大，可以把资产节点作为整组共享输入。",
    "继续往下接文本节点，会比直接接视频更容易控制。"
  ]
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
  draggingNodeId: null,
  dragStartX: 0,
  dragStartY: 0,
  dragOriginPositions: new Map(),
  dragMoved: false,
  suppressNodeClick: false,
  isPanning: false,
  panStartX: 0,
  panStartY: 0,
  isSelecting: false,
  selectionStartX: 0,
  selectionStartY: 0,
  selectionCurrentX: 0,
  selectionCurrentY: 0,
  selectionMoved: false,
  suppressCanvasClick: false,
  linkFromNodeId: null,
  snapToGrid: false,
  minimapVisible: true
};

const interaction = { isSpacePressed: false, isDraggingMinimap: false };
const selectionBox = document.createElement("div");
selectionBox.className = "canvas-selection-box hidden";
canvasFrame.appendChild(selectionBox);

function previewSvg(kind) {
  const label = kind === "video" ? "Video" : kind === "image" ? "Image" : kind === "asset" ? "Asset" : "Text";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#6f86d6"/>
          <stop offset="55%" stop-color="#1f2740"/>
          <stop offset="100%" stop-color="#0f1016"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <circle cx="420" cy="90" r="70" fill="rgba(255,255,255,0.15)"/>
      <path d="M0 290 Q120 180 210 250 T420 210 T640 280 V360 H0 Z" fill="#202432"/>
      <path d="M150 285 L235 110 L305 285 Z" fill="#343a4d"/>
      <path d="M250 285 L330 90 L410 285 Z" fill="#454d61"/>
      <path d="M315 290 Q320 190 365 160 Q400 188 394 292 Z" fill="#1a1d28"/>
      <rect x="14" y="14" width="74" height="24" rx="12" fill="rgba(0,0,0,0.36)"/>
      <text x="51" y="30" font-size="15" text-anchor="middle" fill="white" font-family="Arial">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getNode(nodeId) {
  return state.nodes.find((node) => node.id === nodeId);
}

function snapPosition(value) {
  const grid = 36;
  return Math.round(value / grid) * grid;
}

function getVisibleNodes() {
  return state.nodes.filter((node) => node.element.style.display !== "none");
}

function getWorldBounds() {
  const visibleNodes = getVisibleNodes();
  if (!visibleNodes.length) {
    const viewLeft = (-state.offsetX) / state.scale;
    const viewTop = (-state.offsetY) / state.scale;
    const viewWidth = canvasFrame.clientWidth / state.scale || 1;
    const viewHeight = canvasFrame.clientHeight / state.scale || 1;
    return {
      minX: viewLeft,
      minY: viewTop,
      maxX: viewLeft + viewWidth,
      maxY: viewTop + viewHeight
    };
  }

  const nodesWithSize = visibleNodes.map((node) => ({
    x: node.x,
    y: node.y,
    width: node.element.offsetWidth || 252,
    height: node.element.offsetHeight || 250
  }));

  return {
    minX: Math.min(...nodesWithSize.map((node) => node.x)) - 120,
    minY: Math.min(...nodesWithSize.map((node) => node.y)) - 120,
    maxX: Math.max(...nodesWithSize.map((node) => node.x + node.width)) + 120,
    maxY: Math.max(...nodesWithSize.map((node) => node.y + node.height)) + 120
  };
}

function getMinimapMetrics() {
  const sceneWidth = minimapScene.clientWidth;
  const sceneHeight = minimapScene.clientHeight;
  if (!sceneWidth || !sceneHeight) {
    return null;
  }

  const bounds = getWorldBounds();
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(sceneWidth / worldWidth, sceneHeight / worldHeight);
  const padX = (sceneWidth - worldWidth * scale) / 2;
  const padY = (sceneHeight - worldHeight * scale) / 2;

  return {
    bounds,
    scale,
    padX,
    padY,
    sceneWidth,
    sceneHeight
  };
}

function renderMinimap() {
  if (!state.minimapVisible) {
    minimapPreview.classList.add("hidden");
    return;
  }

  minimapPreview.classList.remove("hidden");

  const metrics = getMinimapMetrics();
  if (!metrics) {
    return;
  }
  const { bounds, scale, padX, padY } = metrics;
  const visibleNodes = getVisibleNodes();

  minimapScene.querySelectorAll(".canvas-minimap__node").forEach((node) => node.remove());

  visibleNodes.forEach((node) => {
    const marker = document.createElement("div");
    marker.className = "canvas-minimap__node";
    if (state.selectedNodeIds.has(node.id)) {
      marker.classList.add("is-selected");
    }

    marker.style.left = `${padX + (node.x - bounds.minX) * scale}px`;
    marker.style.top = `${padY + (node.y - bounds.minY) * scale}px`;
    marker.style.width = `${Math.max(4, (node.element.offsetWidth || 252) * scale)}px`;
    marker.style.height = `${Math.max(4, (node.element.offsetHeight || 250) * scale)}px`;
    minimapScene.appendChild(marker);
  });

  const viewLeft = (-state.offsetX) / state.scale;
  const viewTop = (-state.offsetY) / state.scale;
  const viewWidth = canvasFrame.clientWidth / state.scale;
  const viewHeight = canvasFrame.clientHeight / state.scale;

  minimapViewport.style.left = `${padX + (viewLeft - bounds.minX) * scale}px`;
  minimapViewport.style.top = `${padY + (viewTop - bounds.minY) * scale}px`;
  minimapViewport.style.width = `${Math.max(12, viewWidth * scale)}px`;
  minimapViewport.style.height = `${Math.max(12, viewHeight * scale)}px`;
}

function focusCanvasFromMinimap(clientX, clientY) {
  const metrics = getMinimapMetrics();
  if (!metrics) {
    return;
  }

  const { bounds, scale, padX, padY, sceneWidth, sceneHeight } = metrics;
  const sceneRect = minimapScene.getBoundingClientRect();
  const localX = clientX - sceneRect.left;
  const localY = clientY - sceneRect.top;
  const clampedX = Math.max(padX, Math.min(sceneWidth - padX, localX));
  const clampedY = Math.max(padY, Math.min(sceneHeight - padY, localY));
  const worldX = bounds.minX + (clampedX - padX) / scale;
  const worldY = bounds.minY + (clampedY - padY) / scale;

  state.offsetX = canvasFrame.clientWidth / 2 - worldX * state.scale;
  state.offsetY = canvasFrame.clientHeight / 2 - worldY * state.scale;
  setTransform();
}

function getSelectedNodes() {
  return [...state.selectedNodeIds]
    .map((nodeId) => getNode(nodeId))
    .filter(Boolean)
    .filter((node) => node.element.style.display !== "none");
}

function getSelectionOverlayBounds() {
  const selectedNodes = getSelectedNodes();
  if (!selectedNodes.length) {
    return null;
  }

  const frameRect = canvasFrame.getBoundingClientRect();
  const rects = selectedNodes.map((node) => node.element.getBoundingClientRect());
  const padding = 18;
  return {
    left: Math.min(...rects.map((rect) => rect.left)) - frameRect.left - padding,
    top: Math.min(...rects.map((rect) => rect.top)) - frameRect.top - padding,
    right: Math.max(...rects.map((rect) => rect.right)) - frameRect.left + padding,
    bottom: Math.max(...rects.map((rect) => rect.bottom)) - frameRect.top + padding
  };
}

function syncSelectionState(ids) {
  state.selectedNodeIds = new Set(ids);
  state.selectedNodeId = state.selectedNodeIds.size === 1 ? [...state.selectedNodeIds][0] : null;
}

function updateSession() {
  nodeCount.textContent = String(state.nodes.length);
  connectionCount.textContent = String(state.connections.length);
  renderMinimap();
}

function setStatus(text) {
  sessionList.children[0].lastElementChild.textContent = text;
}

function updateInspectorState() {
  if (state.selectedNodeIds.size !== 1) {
    inspectorForm.classList.add("hidden");
    inspectorEmpty.classList.remove("hidden");
    inspectorEmpty.textContent = state.selectedNodeIds.size > 1
      ? `已选中 ${state.selectedNodeIds.size} 个节点，可一起拖动或重新连线。`
      : "先在画布中选择一个节点，右侧会显示当前节点说明与建议。";
    summaryTitle.textContent = `序列（${state.nodes.length} 节点）`;
    summaryMeta.textContent = "当前画布聚焦在主参考图到视频节点的串联，右侧建议会根据你选中的节点变化。";
    analysisList.innerHTML = `
      <li>把静帧节点连接到多个视频节点，可以快速对比不同镜头风格。</li>
      <li>同一组里的主参考图建议只保留一张，避免分支太早发散。</li>
      <li>已经完成的视频节点可向下串到成片节点，形成完整序列。</li>
    `;
    return;
  }

  const node = getNode(state.selectedNodeId);
  if (!node) {
    return;
  }

  inspectorEmpty.classList.add("hidden");
  inspectorForm.classList.remove("hidden");
  nodeTitleInput.value = node.title;
  nodePromptInput.value = node.prompt;
  nodeModelInput.value = node.model;
  nodeSizeInput.value = node.size;
  nodeRunsInput.value = node.runs;
  summaryTitle.textContent = `${node.title}（${typeConfig[node.type].badge}）`;
  summaryMeta.textContent = `当前节点使用 ${node.model}，适合作为${typeConfig[node.type].meta}层。`;
  analysisList.innerHTML = analysisByType[node.type].map((item) => `<li>${item}</li>`).join("");
}

function renderSelectionBox() {
  const liveSelecting = state.isSelecting;
  const selectedBounds = !liveSelecting ? getSelectionOverlayBounds() : null;

  if (!liveSelecting && !selectedBounds) {
    selectionBox.classList.add("hidden");
    selectionToolbar.classList.add("hidden");
    return;
  }

  const left = liveSelecting ? Math.min(state.selectionStartX, state.selectionCurrentX) : selectedBounds.left;
  const top = liveSelecting ? Math.min(state.selectionStartY, state.selectionCurrentY) : selectedBounds.top;
  const width = liveSelecting ? Math.abs(state.selectionCurrentX - state.selectionStartX) : selectedBounds.right - selectedBounds.left;
  const height = liveSelecting ? Math.abs(state.selectionCurrentY - state.selectionStartY) : selectedBounds.bottom - selectedBounds.top;

  selectionBox.classList.remove("hidden");
  selectionBox.style.left = `${left}px`;
  selectionBox.style.top = `${top}px`;
  selectionBox.style.width = `${width}px`;
  selectionBox.style.height = `${height}px`;

  if (liveSelecting || !state.selectedNodeIds.size) {
    selectionToolbar.classList.add("hidden");
    return;
  }

  selectionToolbar.classList.remove("hidden");
  selectionToolbar.style.left = `${left + width / 2}px`;
  selectionToolbar.style.top = `${Math.max(18, top - 54)}px`;
}

function collectNodesInSelection() {
  const frameRect = canvasFrame.getBoundingClientRect();
  const left = frameRect.left + Math.min(state.selectionStartX, state.selectionCurrentX);
  const top = frameRect.top + Math.min(state.selectionStartY, state.selectionCurrentY);
  const right = frameRect.left + Math.max(state.selectionStartX, state.selectionCurrentX);
  const bottom = frameRect.top + Math.max(state.selectionStartY, state.selectionCurrentY);

  const ids = state.nodes
    .filter((node) => node.element.style.display !== "none")
    .filter((node) => {
      const rect = node.element.getBoundingClientRect();
      return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
    })
    .map((node) => node.id);

  syncSelectionState(ids);
  state.nodes.forEach(renderNode);
  updateInspectorState();
}

function renderNode(node) {
  node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
  node.element.querySelector(".canvas-node__title").textContent = node.title;
  node.element.querySelector(".canvas-node__meta").textContent = `${typeConfig[node.type].meta} · ${node.model}`;
  node.element.querySelector(".canvas-node__prompt").value = node.prompt;
  node.element.querySelector(".canvas-node__badge").textContent = typeConfig[node.type].badge;
  node.element.classList.toggle("is-selected", state.selectedNodeIds.has(node.id));
  renderMinimap();
}

function renderConnections() {
  connectionsLayer.innerHTML = "";
  const frameRect = canvasFrame.getBoundingClientRect();
  connectionsLayer.setAttribute("viewBox", `0 0 ${frameRect.width} ${frameRect.height}`);

  state.connections.forEach((connection) => {
    const from = getNode(connection.from);
    const to = getNode(connection.to);
    if (!from || !to || from.element.style.display === "none" || to.element.style.display === "none") {
      return;
    }

    const fromWidth = from.element.offsetWidth * state.scale;
    const fromHeight = from.element.offsetHeight * state.scale;
    const toHeight = to.element.offsetHeight * state.scale;

    // Make the path visually "stick" to the node edges instead of floating with a gap.
    const startX = from.x * state.scale + state.offsetX + fromWidth - 1;
    const startY = from.y * state.scale + state.offsetY + fromHeight / 2;
    const endX = to.x * state.scale + state.offsetX + 1;
    const endY = to.y * state.scale + state.offsetY + toHeight / 2;
    const deltaX = Math.abs(endX - startX);
    const curve = Math.max(42, deltaX * 0.34);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connection-path");
    path.setAttribute("d", `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`);
    connectionsLayer.appendChild(path);
  });
}

function setTransform() {
  canvasWorld.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;
  const smallGrid = 18 * state.scale;
  const largeGrid = 108 * state.scale;
  canvasGrid.style.transform = "none";
  canvasGrid.style.backgroundSize = `${smallGrid}px ${smallGrid}px, ${largeGrid}px ${largeGrid}px, ${largeGrid}px ${largeGrid}px`;
  canvasGrid.style.backgroundPosition = `${state.offsetX}px ${state.offsetY}px, ${state.offsetX}px ${state.offsetY}px, ${state.offsetX}px ${state.offsetY}px`;
  zoomIndicator.textContent = `${Math.round(state.scale * 100)}%`;
  zoomSlider.value = String(Math.round(state.scale * 100));
  renderConnections();
  renderSelectionBox();
  renderMinimap();
}

function zoomBy(delta) {
  state.scale = Math.min(1.85, Math.max(0.55, Number((state.scale + delta).toFixed(2))));
  setTransform();
}

function fitView() {
  if (!state.nodes.length) {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    setTransform();
    return;
  }
  const xs = state.nodes.map((node) => node.x);
  const ys = state.nodes.map((node) => node.y);
  const minX = Math.min(...xs) - 100;
  const minY = Math.min(...ys) - 100;
  const maxX = Math.max(...xs) + 320;
  const maxY = Math.max(...ys) + 240;
  const width = maxX - minX;
  const height = maxY - minY;
  const scaleX = canvasFrame.clientWidth / width;
  const scaleY = canvasFrame.clientHeight / height;
  state.scale = Math.min(1.05, Math.max(0.55, Math.min(scaleX, scaleY)));
  state.offsetX = canvasFrame.clientWidth / 2 - (minX + width / 2) * state.scale;
  state.offsetY = canvasFrame.clientHeight / 2 - (minY + height / 2) * state.scale;
  setTransform();
}

function resetView() {
  state.scale = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  setTransform();
}

function selectNode(nodeId) {
  syncSelectionState(nodeId ? [nodeId] : []);
  state.nodes.forEach(renderNode);
  updateInspectorState();
  renderSelectionBox();
  renderMinimap();
}

function deleteNodes(nodeIds) {
  if (!nodeIds.length) {
    return;
  }

  const deleteSet = new Set(nodeIds);
  state.nodes
    .filter((node) => deleteSet.has(node.id))
    .forEach((node) => node.element.remove());
  state.nodes = state.nodes.filter((node) => !deleteSet.has(node.id));
  state.connections = state.connections.filter(
    (connection) => !deleteSet.has(connection.from) && !deleteSet.has(connection.to)
  );
  syncSelectionState([]);
  renderConnections();
  renderSelectionBox();
  updateSession();
  updateInspectorState();
  setStatus(`已删除 ${nodeIds.length} 个节点`);
}

function createNode(data) {
  const config = typeConfig[data.type];
  const template = document.getElementById("nodeTemplate");
  const element = template.content.firstElementChild.cloneNode(true);
  const node = {
    id: `node-${++state.nodeSeq}`,
    type: data.type,
    title: data.title || config.title,
    prompt: data.prompt || config.prompt,
    model: data.model || config.model,
    size: data.size || "1024x1024",
    runs: data.runs || 1,
    x: data.x ?? 180 + state.nodes.length * 60,
    y: data.y ?? 140 + state.nodes.length * 50,
    element
  };

  element.dataset.id = node.id;
  element.querySelector(".canvas-node__preview").src = previewSvg(config.preview);
  element.querySelector(".canvas-node__preview").alt = node.title;
  element.querySelector(".canvas-node__prompt").value = node.prompt;
  element.addEventListener("dragstart", (event) => event.preventDefault());

  element.querySelector(".canvas-node__prompt").addEventListener("input", (event) => {
    node.prompt = event.target.value;
    if (state.selectedNodeId === node.id) {
      nodePromptInput.value = node.prompt;
    }
  });

  element.querySelector(".canvas-node__delete").addEventListener("click", (event) => {
    event.stopPropagation();
    deleteNodes([node.id]);
  });

  element.querySelector(".canvas-node__link").addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.linkFromNodeId) {
      state.linkFromNodeId = node.id;
      setStatus(`已从“${node.title}”开始连线`);
      return;
    }
    if (state.linkFromNodeId !== node.id) {
      state.connections.push({ from: state.linkFromNodeId, to: node.id });
      renderConnections();
      updateSession();
      setStatus(`已连接“${getNode(state.linkFromNodeId).title}”到“${node.title}”`);
    }
    state.linkFromNodeId = null;
  });

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (event.target.closest(".canvas-node__prompt") || event.target.closest(".canvas-node__link")) {
      return;
    }
    if (!state.selectedNodeIds.has(node.id)) {
      selectNode(node.id);
    }
    state.draggingNodeId = node.id;
    state.dragStartX = event.clientX - node.x * state.scale - state.offsetX;
    state.dragStartY = event.clientY - node.y * state.scale - state.offsetY;
    state.dragMoved = false;
    state.dragOriginPositions = new Map(
      [...state.selectedNodeIds].map((selectedId) => {
        const selectedNode = getNode(selectedId);
        return [selectedId, { x: selectedNode.x, y: selectedNode.y }];
      })
    );
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (state.draggingNodeId !== node.id) {
      return;
    }
    const nextX = (event.clientX - state.offsetX - state.dragStartX) / state.scale;
    const nextY = (event.clientY - state.offsetY - state.dragStartY) / state.scale;
    const origin = state.dragOriginPositions.get(node.id) || { x: node.x, y: node.y };
    const deltaX = nextX - origin.x;
    const deltaY = nextY - origin.y;
    state.dragMoved = state.dragMoved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
    [...state.selectedNodeIds].forEach((selectedId) => {
      const selectedNode = getNode(selectedId);
      const selectedOrigin = state.dragOriginPositions.get(selectedId);
      if (!selectedNode || !selectedOrigin) {
        return;
      }
      const nextNodeX = selectedOrigin.x + deltaX;
      const nextNodeY = selectedOrigin.y + deltaY;
      selectedNode.x = state.snapToGrid ? snapPosition(nextNodeX) : nextNodeX;
      selectedNode.y = state.snapToGrid ? snapPosition(nextNodeY) : nextNodeY;
      renderNode(selectedNode);
    });
    renderConnections();
    renderSelectionBox();
  });

  element.addEventListener("pointerup", () => {
    state.suppressNodeClick = state.dragMoved;
    state.draggingNodeId = null;
    state.dragOriginPositions = new Map();
    state.dragMoved = false;
  });

  element.addEventListener("click", () => {
    if (state.isSelecting) {
      return;
    }
    if (state.suppressNodeClick) {
      state.suppressNodeClick = false;
      return;
    }
    selectNode(node.id);
  });

  canvasWorld.appendChild(element);
  state.nodes.push(node);
  renderNode(node);
  updateSession();
  return node;
}

function addWorkflow(name) {
  state.nodes.forEach((node) => node.element.remove());
  state.nodes = [];
  state.connections = [];
  syncSelectionState([]);
  state.linkFromNodeId = null;
  workflowPresets[name].forEach((nodeData) => createNode(nodeData));
  for (let index = 0; index < state.nodes.length - 1; index += 1) {
    state.connections.push({ from: state.nodes[index].id, to: state.nodes[index + 1].id });
  }
  renderConnections();
  updateSession();
  updateInspectorState();
  fitView();
  setStatus(`已载入${name === "storyboard" ? "分镜流程" : name === "product" ? "商品广告流程" : "短视频流程"}`);
}

function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  state.nodes.forEach((node) => {
    const visible = !query || `${node.title} ${node.prompt} ${node.type}`.toLowerCase().includes(query);
    node.element.style.display = visible ? "block" : "none";
  });
  renderConnections();
  renderSelectionBox();
  renderMinimap();
}

document.querySelectorAll(".left-dock__tool[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const node = createNode({ type: button.dataset.type });
    selectNode(node.id);
    setStatus(`已添加${typeConfig[node.type].badge}节点`);
  });
});

document.getElementById("quickAddBtn").addEventListener("click", () => {
  const node = createNode({ type: "image" });
  selectNode(node.id);
  setStatus("已添加快捷节点");
});

document.querySelectorAll(".chat-chip").forEach((button) => {
  button.addEventListener("click", () => addWorkflow(button.dataset.workflow));
});

document.getElementById("fitViewBtn").addEventListener("click", fitView);
document.getElementById("resetViewBtn").addEventListener("click", resetView);
toggleMinimapBtn.addEventListener("click", () => {
  state.minimapVisible = !state.minimapVisible;
  toggleMinimapBtn.classList.toggle("is-active", !state.minimapVisible);
  renderMinimap();
  setStatus(state.minimapVisible ? "已展开缩略图" : "已关闭缩略图");
});
snapGridBtn.addEventListener("click", () => {
  state.snapToGrid = !state.snapToGrid;
  snapGridBtn.classList.toggle("is-active", state.snapToGrid);
  if (state.snapToGrid) {
    state.nodes.forEach((node) => {
      node.x = snapPosition(node.x);
      node.y = snapPosition(node.y);
      renderNode(node);
    });
    renderConnections();
    renderSelectionBox();
  }
  setStatus(state.snapToGrid ? "已开启网格吸附" : "已关闭网格吸附");
});
overviewBtn.addEventListener("click", fitView);
zoomSlider.addEventListener("input", () => {
  state.scale = Number(zoomSlider.value) / 100;
  setTransform();
});
minimapPreview.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !state.minimapVisible) {
    return;
  }
  event.preventDefault();
  interaction.isDraggingMinimap = true;
  focusCanvasFromMinimap(event.clientX, event.clientY);
  minimapPreview.setPointerCapture(event.pointerId);
});
document.getElementById("runBtn").addEventListener("click", () => setStatus("正在模拟运行整个序列..."));

document.getElementById("shareBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href).then(() => setStatus("已复制分享链接")).catch(() => setStatus("当前模式下无法复制链接"));
});

document.getElementById("simulateBtn").addEventListener("click", () => {
  const node = getNode(state.selectedNodeId);
  if (node) {
    setStatus(`已为“${node.title}”生成预览`);
  }
});

document.getElementById("sendPromptBtn").addEventListener("click", () => {
  const text = chatPrompt.value.trim();
  if (!text) {
    setStatus("请输入一段描述后再发送");
    return;
  }
  setStatus("已记录新的分析请求");
  analysisList.insertAdjacentHTML("afterbegin", `<li>${text}</li>`);
  chatPrompt.value = "";
});

createAssetBtn.addEventListener("click", () => {
  setStatus("已将当前选区标记为资产组");
});

addToChatBtn.addEventListener("click", () => {
  const selectedTitles = getSelectedNodes().map((node) => node.title).join("、");
  if (!selectedTitles) {
    return;
  }
  chatPrompt.value = `继续分析这些节点的关系：${selectedTitles}`;
  setStatus("已把选中节点加入对话输入");
});

groupNodesBtn.addEventListener("click", () => {
  setStatus("已为当前选区创建分组");
});

deleteSelectionBtn.addEventListener("click", () => {
  deleteNodes([...state.selectedNodeIds]);
});

nodeTitleInput.addEventListener("input", () => {
  const node = getNode(state.selectedNodeId);
  if (!node) {
    return;
  }
  node.title = nodeTitleInput.value;
  renderNode(node);
  updateInspectorState();
});

nodePromptInput.addEventListener("input", () => {
  const node = getNode(state.selectedNodeId);
  if (!node) {
    return;
  }
  node.prompt = nodePromptInput.value;
  renderNode(node);
});

nodeModelInput.addEventListener("change", () => {
  const node = getNode(state.selectedNodeId);
  if (!node) {
    return;
  }
  node.model = nodeModelInput.value;
  renderNode(node);
  updateInspectorState();
});

nodeSizeInput.addEventListener("change", () => {
  const node = getNode(state.selectedNodeId);
  if (node) {
    node.size = nodeSizeInput.value;
  }
});

nodeRunsInput.addEventListener("input", () => {
  const node = getNode(state.selectedNodeId);
  if (node) {
    node.runs = Number(nodeRunsInput.value) || 1;
  }
});

canvasFrame.addEventListener("pointerdown", (event) => {
  if (event.target.closest(".canvas-node")) {
    return;
  }
  if (event.button === 1 || (interaction.isSpacePressed && event.button === 0)) {
    event.preventDefault();
    state.isPanning = true;
    state.panStartX = event.clientX - state.offsetX;
    state.panStartY = event.clientY - state.offsetY;
    return;
  }
  if (event.button !== 0) {
    return;
  }
  event.preventDefault();
  const frameRect = canvasFrame.getBoundingClientRect();
  state.isSelecting = true;
  state.selectionStartX = event.clientX - frameRect.left;
  state.selectionStartY = event.clientY - frameRect.top;
  state.selectionCurrentX = state.selectionStartX;
  state.selectionCurrentY = state.selectionStartY;
  state.selectionMoved = false;
  syncSelectionState([]);
  state.nodes.forEach(renderNode);
  updateInspectorState();
  renderSelectionBox();
});

window.addEventListener("pointermove", (event) => {
  if (interaction.isDraggingMinimap) {
    focusCanvasFromMinimap(event.clientX, event.clientY);
    return;
  }
  if (state.isPanning) {
    state.offsetX = event.clientX - state.panStartX;
    state.offsetY = event.clientY - state.panStartY;
    setTransform();
    return;
  }
  if (!state.isSelecting) {
    return;
  }
  const frameRect = canvasFrame.getBoundingClientRect();
  state.selectionCurrentX = Math.max(0, Math.min(frameRect.width, event.clientX - frameRect.left));
  state.selectionCurrentY = Math.max(0, Math.min(frameRect.height, event.clientY - frameRect.top));
  state.selectionMoved = Math.abs(state.selectionCurrentX - state.selectionStartX) > 4 || Math.abs(state.selectionCurrentY - state.selectionStartY) > 4;
  renderSelectionBox();
  collectNodesInSelection();
});

window.addEventListener("pointerup", () => {
  interaction.isDraggingMinimap = false;
  state.isPanning = false;
  state.draggingNodeId = null;
  state.dragOriginPositions = new Map();
  if (state.isSelecting) {
    state.suppressCanvasClick = state.selectionMoved;
    state.isSelecting = false;
    renderSelectionBox();
  }
});

canvasFrame.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoomBy(event.deltaY > 0 ? -0.05 : 0.05);
}, { passive: false });

canvasFrame.addEventListener("click", (event) => {
  if (state.suppressCanvasClick) {
    state.suppressCanvasClick = false;
    return;
  }
  if (!event.target.closest(".canvas-node")) {
    selectNode(null);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    if (!["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)) {
      event.preventDefault();
    }
    interaction.isSpacePressed = true;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && !["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) {
    if (state.selectedNodeIds.size) {
      event.preventDefault();
      deleteNodes([...state.selectedNodeIds]);
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    interaction.isSpacePressed = false;
  }
});

searchInput.addEventListener("input", handleSearch);
window.addEventListener("resize", renderConnections);
window.addEventListener("resize", renderMinimap);

setStatus("空闲");
addWorkflow("storyboard");

typeConfig.audio = {
  badge: "音频",
  meta: "配乐 / 音效 / 旁白",
  model: "audio-lab",
  title: "音频节点",
  prompt: "描述音乐情绪、音效层次或人声内容，用于生成音频。",
  preview: "audio"
};

analysisByType.audio = [
  "音频节点适合承接脚本节奏、旁白文本和场景氛围要求。",
  "配乐和音效可以拆成多个节点，分别测试后再组合。",
  "如果你导入了本地音频，它只能单向输出给系统预设节点。"
];

workflowPresets.system = [
  { type: "text", title: "Text", prompt: "开启你的创作...", x: 96, y: 96, sourceKind: "system" },
  { type: "image", title: "图片生成", x: 690, y: 82, sourceKind: "system" },
  { type: "audio", title: "Audio", x: 70, y: 410, sourceKind: "system" },
  { type: "video", title: "Video", x: 680, y: 396, sourceKind: "system" }
];

Object.assign(state, {
  lastWorldPoint: { x: 260, y: 180 },
  contextWorldPoint: { x: 260, y: 180 },
  clipboard: { nodes: [], connections: [] }
});

function ensureCanvasMenus() {
  const canvasStage = document.querySelector(".canvas-stage");

  let contextMenu = document.getElementById("canvasContextMenu");
  if (!contextMenu) {
    contextMenu = document.createElement("div");
    contextMenu.id = "canvasContextMenu";
    contextMenu.className = "canvas-context-menu hidden";
    contextMenu.innerHTML = `
      <button class="canvas-context-menu__item" id="menuUploadBtn">上传</button>
      <button class="canvas-context-menu__item canvas-context-menu__item--muted" id="menuAssetBtn">添加资产</button>
      <button class="canvas-context-menu__item canvas-context-menu__item--active" id="menuAddNodeBtn">添加节点</button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut is-disabled"><span>撤销</span><span>Ctrl+Z</span></button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut is-disabled"><span>重做</span><span>Shift+Ctrl+Z</span></button>
      <button class="canvas-context-menu__item canvas-context-menu__item--shortcut" id="menuPasteBtn"><span>粘贴</span><span>Ctrl+V</span></button>
    `;
    canvasStage.appendChild(contextMenu);
  }

  let addNodeMenu = document.getElementById("addNodeMenu");
  if (!addNodeMenu) {
    addNodeMenu = document.createElement("div");
    addNodeMenu.id = "addNodeMenu";
    addNodeMenu.className = "canvas-context-submenu hidden";
    addNodeMenu.innerHTML = `
      <p class="canvas-context-submenu__title">添加节点</p>
      <button class="canvas-context-submenu__item" data-context-type="text"><span class="canvas-context-submenu__icon">≡</span><span><strong>文本</strong><small>单向输出到图片、视频、音频</small></span></button>
      <button class="canvas-context-submenu__item" data-context-type="image"><span class="canvas-context-submenu__icon">◫</span><span><strong>图片</strong><small>生成图片、海报和参考图</small></span></button>
      <button class="canvas-context-submenu__item" data-context-type="video"><span class="canvas-context-submenu__icon">▷</span><span><strong>视频</strong><small>宣传视频、动画、电影镜头</small></span></button>
      <button class="canvas-context-submenu__item" data-context-type="audio"><span class="canvas-context-submenu__icon">♪</span><span><strong>音频</strong><small>配乐、音效、旁白和语音</small></span></button>
    `;
    canvasStage.appendChild(addNodeMenu);
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

  return { contextMenu, addNodeMenu, uploadInput };
}

const extraUi = ensureCanvasMenus();
const contextMenu = extraUi.contextMenu;
const addNodeMenu = extraUi.addNodeMenu;
const uploadInput = extraUi.uploadInput;
const menuUploadBtn = document.getElementById("menuUploadBtn");
const menuAssetBtn = document.getElementById("menuAssetBtn");
const menuAddNodeBtn = document.getElementById("menuAddNodeBtn");
const menuPasteBtn = document.getElementById("menuPasteBtn");

function localizeCanvasUi() {
  document.title = "创意画布重设计版";
  const dockButtons = [...document.querySelectorAll(".left-dock__tool[data-type]")];
  const labels = [
    { type: "text", text: "文", title: "添加文本节点" },
    { type: "image", text: "图", title: "添加图片节点" },
    { type: "video", text: "视", title: "添加视频节点" },
    { type: "audio", text: "音", title: "添加音频节点" }
  ];
  dockButtons.forEach((button, index) => {
    const item = labels[index];
    if (!item) return;
    button.dataset.type = item.type;
    button.textContent = item.text;
    button.title = item.title;
  });
  document.querySelector(".canvas-hint").textContent = "左键框选节点，中键拖动画布，按住空格再左键也可平移。支持右键菜单、拖拽文件、复制粘贴。";
  document.querySelector(".search-pill span").textContent = "搜索节点 / 关键词";
  searchInput.placeholder = "例如：怪物、镜头、音频";
  createAssetBtn.textContent = "创建资产";
  addToChatBtn.textContent = "加入对话";
  groupNodesBtn.textContent = "打组";
  deleteSelectionBtn.textContent = "删除";
}

function previewSvg(kind, title = "") {
  const label = kind === "audio" ? "Audio" : kind === "video" ? "Video" : kind === "image" ? "Image" : "Text";
  const centerArtwork = kind === "audio"
    ? `<rect x="180" y="96" width="280" height="170" rx="30" fill="rgba(255,255,255,0.06)"/><g fill="rgba(255,255,255,0.24)"><rect x="235" y="132" width="12" height="90" rx="6"/><rect x="263" y="116" width="12" height="122" rx="6"/><rect x="291" y="95" width="12" height="164" rx="6"/><rect x="319" y="128" width="12" height="98" rx="6"/><rect x="347" y="86" width="12" height="182" rx="6"/><rect x="375" y="122" width="12" height="108" rx="6"/></g>`
    : `<circle cx="420" cy="90" r="70" fill="rgba(255,255,255,0.15)"/><path d="M0 290 Q120 180 210 250 T420 210 T640 280 V360 H0 Z" fill="#202432"/><path d="M150 285 L235 110 L305 285 Z" fill="#343a4d"/><path d="M250 285 L330 90 L410 285 Z" fill="#454d61"/><path d="M315 290 Q320 190 365 160 Q400 188 394 292 Z" fill="#1a1d28"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6f86d6"/><stop offset="55%" stop-color="#1f2740"/><stop offset="100%" stop-color="#0f1016"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>${centerArtwork}<rect x="14" y="14" width="92" height="26" rx="13" fill="rgba(0,0,0,0.36)"/><text x="60" y="31" font-size="15" text-anchor="middle" fill="white" font-family="Arial">${label}</text><text x="24" y="336" font-size="24" fill="rgba(255,255,255,0.72)" font-family="Arial">${title}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function cleanFileName(name) {
  return name.replace(/\.[^.]+$/, "");
}

function updateCanvasPointer(clientX, clientY) {
  const frameRect = canvasFrame.getBoundingClientRect();
  state.lastWorldPoint = {
    x: (clientX - frameRect.left - state.offsetX) / state.scale,
    y: (clientY - frameRect.top - state.offsetY) / state.scale
  };
}

function renderNodeMedia(node) {
  const media = node.element.querySelector(".canvas-node__media");
  media.innerHTML = "";
  node.element.classList.toggle("canvas-node--text", node.type === "text");
  node.element.classList.toggle("canvas-node--uploaded", node.sourceKind === "upload");
  if (node.type === "text") {
    const panel = document.createElement("div");
    panel.className = "canvas-node__text-surface";
    panel.textContent = node.prompt || "开启你的创作...";
    media.appendChild(panel);
    return;
  }
  if (node.type === "audio") {
    const panel = document.createElement("div");
    panel.className = "canvas-node__audio-surface";
    panel.innerHTML = `
      <div class="canvas-node__audio-wave">
        <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <strong>${node.fileName || node.title}</strong>
      <small>${node.sourceKind === "upload" ? "本地音频" : "音频生成节点"}</small>
    `;
    media.appendChild(panel);
    return;
  }
  if (node.type === "video" && node.src) {
    const video = document.createElement("video");
    video.className = "canvas-node__preview";
    video.src = node.src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.addEventListener("loadeddata", () => {
      video.play().catch(() => {});
    });
    media.appendChild(video);
    return;
  }
  const img = document.createElement("img");
  img.className = "canvas-node__preview";
  img.alt = node.title;
  img.draggable = false;
  img.src = node.src || previewSvg(node.type, node.title);
  media.appendChild(img);
}

function renderNode(node) {
  node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
  node.element.querySelector(".canvas-node__title").textContent = node.title;
  const originText = node.sourceKind === "upload" ? "本地导入" : "系统预设";
  const fileText = node.fileName ? ` · ${node.fileName}` : "";
  node.element.querySelector(".canvas-node__meta").textContent = `${originText} · ${typeConfig[node.type].meta} · ${node.model}${fileText}`;
  node.element.querySelector(".canvas-node__prompt").value = node.prompt;
  node.element.querySelector(".canvas-node__badge").textContent = typeConfig[node.type].badge;
  node.element.classList.toggle("is-selected", state.selectedNodeIds.has(node.id));
  renderNodeMedia(node);
  renderMinimap();
}

function updateInspectorState() {
  if (state.selectedNodeIds.size !== 1) {
    inspectorForm.classList.add("hidden");
    inspectorEmpty.classList.remove("hidden");
    inspectorEmpty.textContent = state.selectedNodeIds.size > 1
      ? `已选中 ${state.selectedNodeIds.size} 个节点，可一起拖动、复制或剪切。`
      : "先在画布中选择一个节点，右侧会显示当前节点说明与建议。";
    summaryTitle.textContent = `序列（${state.nodes.length} 节点）`;
    summaryMeta.textContent = "当前画布包含系统预设节点与上传节点，支持文件导入、右键菜单和快捷键编辑。";
    analysisList.innerHTML = `
      <li>文本节点只能把信息输出到系统图片、视频、音频节点。</li>
      <li>上传得到的独立节点只能单向输出到系统预设节点。</li>
      <li>支持 Ctrl/Cmd+C、Ctrl/Cmd+X、Ctrl/Cmd+V 管理当前选中节点。</li>
    `;
    return;
  }
  const node = getNode(state.selectedNodeId);
  if (!node) {
    return;
  }
  inspectorEmpty.classList.add("hidden");
  inspectorForm.classList.remove("hidden");
  nodeTitleInput.value = node.title;
  nodePromptInput.value = node.prompt;
  nodeModelInput.value = node.model;
  nodeSizeInput.value = node.size;
  nodeRunsInput.value = node.runs;
  summaryTitle.textContent = `${node.title}（${typeConfig[node.type].badge}）`;
  summaryMeta.textContent = `${node.sourceKind === "upload" ? "本地导入节点" : "系统预设节点"}，使用 ${node.model}，适合承担 ${typeConfig[node.type].meta} 角色。`;
  analysisList.innerHTML = (analysisByType[node.type] || []).map((item) => `<li>${item}</li>`).join("");
}

function validateConnection(fromNode, toNode) {
  if (!fromNode || !toNode) {
    return { ok: false, message: "连接节点不存在。" };
  }
  if (fromNode.id === toNode.id) {
    return { ok: false, message: "节点不能连接到自己。" };
  }
  if (state.connections.some((connection) => connection.from === fromNode.id && connection.to === toNode.id)) {
    return { ok: false, message: "这条连接已经存在。" };
  }
  if (fromNode.type === "text") {
    const allowed = toNode.sourceKind === "system" && ["image", "video", "audio"].includes(toNode.type);
    if (!allowed) {
      return { ok: false, message: "文本节点只能输出到系统图片、视频、音频节点。" };
    }
  }
  if (fromNode.sourceKind === "upload" && toNode.sourceKind !== "system") {
    return { ok: false, message: "上传节点只能单向输出到系统预设节点。" };
  }
  return { ok: true };
}

function addConnection(fromId, toId, options = {}) {
  const fromNode = getNode(fromId);
  const toNode = getNode(toId);
  const result = validateConnection(fromNode, toNode);
  if (!result.ok) {
    if (!options.silent) {
      setStatus(result.message);
    }
    return false;
  }
  state.connections.push({ from: fromId, to: toId });
  renderConnections();
  updateSession();
  if (!options.silent) {
    setStatus(`已连接“${fromNode.title}”到“${toNode.title}”。`);
  }
  return true;
}

function createNode(data) {
  const config = typeConfig[data.type];
  if (!config) {
    return null;
  }
  const template = document.getElementById("nodeTemplate");
  const element = template.content.firstElementChild.cloneNode(true);
  const node = {
    id: `node-${++state.nodeSeq}`,
    type: data.type,
    title: data.title || config.title,
    prompt: data.prompt || config.prompt,
    model: data.model || config.model,
    size: data.size || "1024x1024",
    runs: data.runs || 1,
    x: data.x ?? 180 + state.nodes.length * 60,
    y: data.y ?? 140 + state.nodes.length * 50,
    sourceKind: data.sourceKind || "system",
    src: data.src || "",
    fileName: data.fileName || "",
    element
  };

  element.dataset.id = node.id;
  element.addEventListener("dragstart", (event) => event.preventDefault());
  element.querySelector(".canvas-node__prompt").addEventListener("input", (event) => {
    node.prompt = event.target.value;
    if (state.selectedNodeId === node.id) {
      nodePromptInput.value = node.prompt;
    }
    if (node.type === "text") {
      renderNodeMedia(node);
    }
  });

  element.querySelector(".canvas-node__delete").addEventListener("click", (event) => {
    event.stopPropagation();
    deleteNodes([node.id]);
  });

  element.querySelector(".canvas-node__link").addEventListener("click", (event) => {
    event.stopPropagation();
    if (!state.linkFromNodeId) {
      state.linkFromNodeId = node.id;
      setStatus(`已从“${node.title}”开始连接，请再点一个目标节点。`);
      return;
    }
    if (state.linkFromNodeId === node.id) {
      state.linkFromNodeId = null;
      setStatus("已取消当前连接。");
      return;
    }
    addConnection(state.linkFromNodeId, node.id);
    state.linkFromNodeId = null;
  });

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    if (event.target.closest(".canvas-node__prompt") || event.target.closest(".canvas-node__link") || event.target.closest(".canvas-node__delete")) {
      return;
    }
    updateCanvasPointer(event.clientX, event.clientY);
    if (!state.selectedNodeIds.has(node.id)) {
      selectNode(node.id);
    }
    state.draggingNodeId = node.id;
    state.dragStartX = event.clientX - node.x * state.scale - state.offsetX;
    state.dragStartY = event.clientY - node.y * state.scale - state.offsetY;
    state.dragMoved = false;
    state.dragOriginPositions = new Map(
      [...state.selectedNodeIds].map((selectedId) => {
        const selectedNode = getNode(selectedId);
        return [selectedId, { x: selectedNode.x, y: selectedNode.y }];
      })
    );
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (state.draggingNodeId !== node.id) {
      return;
    }
    updateCanvasPointer(event.clientX, event.clientY);
    const nextX = (event.clientX - state.offsetX - state.dragStartX) / state.scale;
    const nextY = (event.clientY - state.offsetY - state.dragStartY) / state.scale;
    const origin = state.dragOriginPositions.get(node.id) || { x: node.x, y: node.y };
    const deltaX = nextX - origin.x;
    const deltaY = nextY - origin.y;
    state.dragMoved = state.dragMoved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
    [...state.selectedNodeIds].forEach((selectedId) => {
      const selectedNode = getNode(selectedId);
      const selectedOrigin = state.dragOriginPositions.get(selectedId);
      if (!selectedNode || !selectedOrigin) {
        return;
      }
      const nextNodeX = selectedOrigin.x + deltaX;
      const nextNodeY = selectedOrigin.y + deltaY;
      selectedNode.x = state.snapToGrid ? snapPosition(nextNodeX) : nextNodeX;
      selectedNode.y = state.snapToGrid ? snapPosition(nextNodeY) : nextNodeY;
      renderNode(selectedNode);
    });
    renderConnections();
    renderSelectionBox();
  });

  element.addEventListener("pointerup", () => {
    state.suppressNodeClick = state.dragMoved;
    state.draggingNodeId = null;
    state.dragOriginPositions = new Map();
    state.dragMoved = false;
  });

  element.addEventListener("click", () => {
    if (state.isSelecting) {
      return;
    }
    if (state.suppressNodeClick) {
      state.suppressNodeClick = false;
      return;
    }
    selectNode(node.id);
  });

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

function clearCanvas() {
  state.nodes.forEach((node) => node.element.remove());
  state.nodes = [];
  state.connections = [];
  state.linkFromNodeId = null;
  syncSelectionState([]);
  renderConnections();
  renderSelectionBox();
  updateSession();
  updateInspectorState();
}

function addWorkflow(name) {
  const preset = workflowPresets[name];
  if (!preset) {
    return;
  }
  clearCanvas();
  const created = preset.map((item) => createNode(item));
  if (name === "system") {
    addConnection(created[0].id, created[1].id, { silent: true });
    addConnection(created[0].id, created[2].id, { silent: true });
    addConnection(created[0].id, created[3].id, { silent: true });
  } else {
    for (let index = 0; index < created.length - 1; index += 1) {
      addConnection(created[index].id, created[index + 1].id, { silent: true });
    }
  }
  fitView();
  setStatus(name === "system" ? "已加载系统四节点布局。" : "已加载预设流程。");
}

function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();
  state.nodes.forEach((node) => {
    const visible = !query || `${node.title} ${node.prompt} ${node.type} ${node.fileName || ""}`.toLowerCase().includes(query);
    node.element.style.display = visible ? "block" : "none";
  });
  renderConnections();
  renderSelectionBox();
  renderMinimap();
}

function serializeSelection() {
  const selectedNodes = getSelectedNodes();
  if (!selectedNodes.length) {
    return null;
  }
  const minX = Math.min(...selectedNodes.map((node) => node.x));
  const minY = Math.min(...selectedNodes.map((node) => node.y));
  const selectedIds = new Set(selectedNodes.map((node) => node.id));
  return {
    nodes: selectedNodes.map((node) => ({
      type: node.type,
      title: node.title,
      prompt: node.prompt,
      model: node.model,
      size: node.size,
      runs: node.runs,
      x: node.x - minX,
      y: node.y - minY,
      sourceKind: node.sourceKind,
      src: node.src,
      fileName: node.fileName
    })),
    connections: state.connections
      .filter((connection) => selectedIds.has(connection.from) && selectedIds.has(connection.to))
      .map((connection) => ({
        fromIndex: selectedNodes.findIndex((node) => node.id === connection.from),
        toIndex: selectedNodes.findIndex((node) => node.id === connection.to)
      }))
  };
}

function copySelection(cut = false) {
  const snapshot = serializeSelection();
  if (!snapshot) {
    setStatus("请先选中节点，再执行复制或剪切。");
    return;
  }
  state.clipboard = snapshot;
  setStatus(cut ? `已剪切 ${snapshot.nodes.length} 个节点。` : `已复制 ${snapshot.nodes.length} 个节点。`);
  if (cut) {
    deleteNodes([...state.selectedNodeIds]);
  }
}

function pasteSelection(anchorPoint = state.lastWorldPoint) {
  if (!state.clipboard.nodes.length) {
    setStatus("当前没有可粘贴的节点，或请使用 Ctrl/Cmd+V 粘贴本地文件。");
    return;
  }
  const created = state.clipboard.nodes.map((item, index) => createNode({
    ...item,
    x: anchorPoint.x + item.x + 28 + index * 10,
    y: anchorPoint.y + item.y + 28 + index * 10
  }));
  state.clipboard.connections.forEach((connection) => {
    const fromNode = created[connection.fromIndex];
    const toNode = created[connection.toIndex];
    if (fromNode && toNode) {
      addConnection(fromNode.id, toNode.id, { silent: true });
    }
  });
  syncSelectionState(created.map((node) => node.id));
  state.nodes.forEach(renderNode);
  updateInspectorState();
  renderSelectionBox();
  setStatus(`已粘贴 ${created.length} 个节点。`);
}

function classifyFile(file) {
  if (!file?.type) {
    return null;
  }
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type.startsWith("audio/")) {
    return "audio";
  }
  return null;
}

function importFiles(files, anchorPoint) {
  const validFiles = files
    .map((file) => ({ file, type: classifyFile(file) }))
    .filter((item) => item.type);
  if (!validFiles.length) {
    setStatus("仅支持导入图片、视频和音频文件。");
    return;
  }
  const base = anchorPoint || state.lastWorldPoint;
  const created = validFiles.map((item, index) => createNode({
    type: item.type,
    title: cleanFileName(item.file.name),
    prompt: `来自本地文件：${item.file.name}`,
    sourceKind: "upload",
    src: URL.createObjectURL(item.file),
    fileName: item.file.name,
    x: base.x + (index % 3) * 42,
    y: base.y + Math.floor(index / 3) * 42
  }));
  syncSelectionState(created.map((node) => node.id));
  state.nodes.forEach(renderNode);
  updateInspectorState();
  renderSelectionBox();
  setStatus(`已导入 ${created.length} 个本地文件节点。`);
}

function hideContextMenus() {
  contextMenu.classList.add("hidden");
  addNodeMenu.classList.add("hidden");
}

function showContextMenu(clientX, clientY) {
  const frameRect = canvasFrame.getBoundingClientRect();
  const left = Math.min(clientX - frameRect.left, frameRect.width - 184);
  const top = Math.min(clientY - frameRect.top, frameRect.height - 260);
  contextMenu.style.left = `${Math.max(12, left)}px`;
  contextMenu.style.top = `${Math.max(12, top)}px`;
  addNodeMenu.style.left = `${Math.min(Math.max(206, left + 184), frameRect.width - 286)}px`;
  addNodeMenu.style.top = `${Math.max(12, top)}px`;
  contextMenu.classList.remove("hidden");
  addNodeMenu.classList.add("hidden");
  state.contextWorldPoint = {
    x: (clientX - frameRect.left - state.offsetX) / state.scale,
    y: (clientY - frameRect.top - state.offsetY) / state.scale
  };
}

localizeCanvasUi();
setStatus("空闲");
addWorkflow("system");

canvasFrame.addEventListener("pointermove", (event) => {
  updateCanvasPointer(event.clientX, event.clientY);
});

canvasFrame.addEventListener("contextmenu", (event) => {
  if (event.target.closest(".canvas-node")) {
    return;
  }
  event.preventDefault();
  updateCanvasPointer(event.clientX, event.clientY);
  showContextMenu(event.clientX, event.clientY);
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
    updateCanvasPointer(event.clientX, event.clientY);
  }
});

canvasFrame.addEventListener("dragleave", (event) => {
  if (!canvasFrame.contains(event.relatedTarget)) {
    canvasFrame.classList.remove("is-drop-target");
  }
});

canvasFrame.addEventListener("drop", (event) => {
  const files = [...(event.dataTransfer?.files || [])];
  if (!files.length) {
    return;
  }
  event.preventDefault();
  canvasFrame.classList.remove("is-drop-target");
  importFiles(files, {
    x: (event.clientX - canvasFrame.getBoundingClientRect().left - state.offsetX) / state.scale,
    y: (event.clientY - canvasFrame.getBoundingClientRect().top - state.offsetY) / state.scale
  });
});

window.addEventListener("pointerup", () => {
  canvasFrame.classList.remove("is-drop-target");
});

window.addEventListener("pointerdown", (event) => {
  if (!event.target.closest("#canvasContextMenu") && !event.target.closest("#addNodeMenu") && event.button !== 2) {
    hideContextMenus();
  }
});

window.addEventListener("keydown", (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (!modifier || isEditableTarget(event.target)) {
    return;
  }
  if (event.key.toLowerCase() === "c") {
    event.preventDefault();
    copySelection(false);
  }
  if (event.key.toLowerCase() === "x") {
    event.preventDefault();
    copySelection(true);
  }
});

window.addEventListener("paste", (event) => {
  const items = [...(event.clipboardData?.items || [])];
  const files = items
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
  if (files.length) {
    event.preventDefault();
    importFiles(files, state.lastWorldPoint);
    return;
  }
  if (isEditableTarget(event.target)) {
    return;
  }
  if (state.clipboard.nodes.length) {
    event.preventDefault();
    pasteSelection(state.lastWorldPoint);
  }
});

menuUploadBtn.addEventListener("click", () => {
  hideContextMenus();
  uploadInput.value = "";
  uploadInput.click();
});

menuAssetBtn.addEventListener("click", () => {
  hideContextMenus();
  setStatus("添加资产功能已预留，后续可继续接入。");
});

menuAddNodeBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  addNodeMenu.classList.toggle("hidden");
});

menuAddNodeBtn.addEventListener("mouseenter", () => {
  addNodeMenu.classList.remove("hidden");
});

menuPasteBtn.addEventListener("click", () => {
  hideContextMenus();
  pasteSelection(state.contextWorldPoint);
});

addNodeMenu.querySelectorAll("[data-context-type]").forEach((button) => {
  button.addEventListener("click", () => {
    const node = createNode({
      type: button.dataset.contextType,
      x: state.contextWorldPoint.x,
      y: state.contextWorldPoint.y,
      sourceKind: "system"
    });
    if (node) {
      selectNode(node.id);
      setStatus(`已添加 ${typeConfig[node.type].badge} 节点。`);
    }
    hideContextMenus();
  });
});

uploadInput.addEventListener("change", () => {
  if (!uploadInput.files?.length) {
    return;
  }
  importFiles([...uploadInput.files], state.contextWorldPoint);
});
