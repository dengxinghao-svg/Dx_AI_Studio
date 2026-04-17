// Editor module: node rendering, node CRUD, clipboard, import, and canvas fitting helpers

function renderNode(node) {
  if (node.type === "text") {
    node.width = Math.max(TEXT_NODE_MIN_WIDTH, node.width || TEXT_NODE_DEFAULT_WIDTH);
    node.height = Math.max(TEXT_NODE_MIN_HEIGHT, node.height || TEXT_NODE_DEFAULT_HEIGHT);
  }
  node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
  node.element.style.width = `${node.width}px`;
  node.element.style.height = `${node.height}px`;
  node.element.style.setProperty("--text-panel-accent", getTextNodePanelColor(node));
  node.element.classList.toggle("is-selected", state.selectedNodeIds.has(node.id));
  node.element.classList.toggle("is-link-source", state.linkFromNodeId === node.id);
  node.element.classList.toggle("is-link-target", state.linkDragTargetNodeId === node.id);
  if (state.linkDragTargetNodeId === node.id && state.linkDragTargetSide) {
    node.element.dataset.linkTargetSide = state.linkDragTargetSide;
  } else {
    delete node.element.dataset.linkTargetSide;
  }
  node.element.dataset.status = node.status || DEFAULT_NODE_STATUS;
  node.element.classList.toggle("is-running", node.status === "running");
  node.element.classList.toggle("is-done", node.status === "done");
  node.element.classList.toggle("is-error", node.status === "error");
  node.element.classList.toggle("canvas-node--text", node.type === "text");
  node.element.classList.toggle("canvas-node--text-rich", node.type === "text");
  node.element.classList.toggle("canvas-node--uploaded", node.sourceKind === "upload");
  node.element.classList.toggle(
    "canvas-node--uploaded-visual",
    node.sourceKind === "upload" && ["image", "video"].includes(node.type)
  );
  const badge = node.element.querySelector(".canvas-node__badge");
  const title = node.element.querySelector(".canvas-node__title");
  const media = node.element.querySelector(".canvas-node__media");
  const body = node.element.querySelector(".canvas-node__body");
  let statusPill = node.element.querySelector(".canvas-node__status-pill");
  if (!statusPill) {
    statusPill = document.createElement("div");
    statusPill.className = "canvas-node__status-pill";
    node.element.querySelector(".canvas-node__header")?.appendChild(statusPill);
  }
  node.element.querySelectorAll(".canvas-node__text-toolbar, .canvas-node__resize-handle").forEach((item) => item.remove());
  badge.textContent = node.type === "text" ? typeConfig.text.badge : node.title;
  title.textContent = node.title;
  statusPill.dataset.tone = typeof getWorkflowStatusTone === "function" ? getWorkflowStatusTone(node.status) : (node.status || DEFAULT_NODE_STATUS);
  statusPill.innerHTML = `
    <strong>${typeof getWorkflowStatusLabel === "function" ? getWorkflowStatusLabel(node.status) : (node.status || DEFAULT_NODE_STATUS)}</strong>
    <span>${node.runCount || 0} 次</span>
  `;
  body.classList.add("hidden");
  media.innerHTML = "";

  if (node.type === "text") {
    const toolbar = document.createElement("div");
    toolbar.className = "canvas-node__text-toolbar";
    toolbar.innerHTML = buildTextToolbarMarkup();
    toolbar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      ensureTextNodeSelected(node.id);
    });
    node.element.appendChild(toolbar);

    const surface = document.createElement("div");
    surface.className = "canvas-node__text-surface";
    const editor = document.createElement("div");
    editor.className = "canvas-node__text-editor canvas-node__text-input";
    editor.contentEditable = "true";
    editor.spellcheck = false;
    editor.dataset.placeholder = TEXT_NODE_PLACEHOLDER;
    setEditableHtml(editor, normalizeTextContent(node.content || ""));
    bindTextEditor(editor, node, "node");
    bindTextToolbar(toolbar, node, editor, "node");
    node.textEditorElement = editor;
    surface.appendChild(editor);
    media.appendChild(surface);
    syncTextToolbarSwatches(node);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "canvas-node__resize-handle";
    resizeHandle.title = "拖拽调整文本节点大小";
    resizeHandle.addEventListener("pointerdown", (event) => {
      startTextNodeResize(event, node);
    });
    node.element.appendChild(resizeHandle);
    return;
  }

  const previewSource = node.src || node.output?.previewUrl || previewSvg(node.type, node.title);
  if (node.type === "audio") {
    media.innerHTML = `
      <div class="canvas-node__audio-surface">
        <div class="canvas-node__audio-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <strong>${node.sourceKind === "upload" ? "外部音频" : "音频节点"}</strong>
        <small>${node.output?.summary || node.fileName || "音乐、音效、旁白和语音"}</small>
      </div>
    `;
    return;
  }

  const useVideoElement = node.type === "video" && node.src && node.sourceKind === "upload";
  const preview = useVideoElement ? document.createElement("video") : document.createElement("img");
  preview.className = "canvas-node__preview";
  preview.draggable = false;
  if (useVideoElement) {
    preview.src = node.src;
    preview.muted = true;
    preview.loop = true;
    preview.playsInline = true;
    preview.preload = "metadata";
    preview.addEventListener("loadeddata", () => preview.play().catch(() => {}));
  } else {
    preview.alt = node.title;
    preview.src = previewSource;
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

function createNode(nodeData, options = {}) {
  const config = typeConfig[nodeData.type];
  const template = document.getElementById("nodeTemplate");
  const element = template.content.firstElementChild.cloneNode(true);
  const isTextNode = nodeData.type === "text";
  const legacyTextContent = isTextNode && nodeData.content == null
    ? (nodeData.prompt && nodeData.prompt !== typeConfig.text.prompt ? nodeData.prompt : "")
    : "";
  const node = {
    id: nodeData.id || `node-${++state.nodeSeq}`,
    type: nodeData.type,
    title: nodeData.title || config.title,
    prompt: nodeData.prompt ?? (isTextNode ? "" : config.prompt),
    content: nodeData.content ?? legacyTextContent,
    panelColor: nodeData.panelColor || "",
    model: nodeData.model || config.model,
    settings: normalizeNodeSettings(nodeData.type, nodeData.settings),
    x: nodeData.x ?? 160,
    y: nodeData.y ?? 140,
    width: nodeData.width || (isTextNode ? TEXT_NODE_DEFAULT_WIDTH : 236),
    height: nodeData.height || (isTextNode ? TEXT_NODE_DEFAULT_HEIGHT : 170),
    sourceKind: nodeData.sourceKind || "system",
    preset: Boolean(nodeData.preset),
    src: nodeData.src || "",
    fileName: nodeData.fileName || "",
    referenceAsset: nodeData.referenceAsset ? { ...nodeData.referenceAsset } : null,
    status: nodeData.status || DEFAULT_NODE_STATUS,
    inputs: Array.isArray(nodeData.inputs) ? [...nodeData.inputs] : [],
    output: nodeData.output ?? null,
    error: nodeData.error || null,
    lastRunAt: nodeData.lastRunAt || null,
    runCount: nodeData.runCount || 0,
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

function toggleNodeSelection(nodeId) {
  state.activeGroupId = null;
  const nextIds = new Set(state.selectedNodeIds);
  if (nextIds.has(nodeId)) {
    nextIds.delete(nodeId);
  } else {
    nextIds.add(nodeId);
  }
  syncSelection([...nextIds]);
  renderAllNodes();
  renderSelectionBox();
  renderMinimap();
  updateEditorPanel();
}

function adjustCanvasScale(nextScale) {
  state.scale = Math.min(1.85, Math.max(0.55, Number(nextScale.toFixed(2))));
  setTransform();
}

function panCanvasBy(deltaX = 0, deltaY = 0) {
  state.offsetX += deltaX;
  state.offsetY += deltaY;
  setTransform();
}

function seedPresetNodes() {
  removeNodeElements();
  state.connections = [];
  syncSelection([]);
  state.nodeSeq = 0;
  createNode({
    type: "text",
    title: "文本",
    x: 120,
    y: 460,
    preset: true,
    width: TEXT_NODE_DEFAULT_WIDTH,
    height: TEXT_NODE_DEFAULT_HEIGHT
  });
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
  if (event.shiftKey) return;
  if (
    event.target.closest(".canvas-node__delete") ||
    event.target.closest(".canvas-node__link") ||
    event.target.closest(".canvas-node__port") ||
    event.target.closest(".canvas-node__text-input") ||
    event.target.closest(".canvas-node__text-toolbar") ||
    event.target.closest(".canvas-node__resize-handle")
  ) return;
  updateLastPointer(event.clientX, event.clientY);
  if (!state.selectedNodeIds.has(node.id)) {
    syncSelection([node.id]);
    renderAllNodes();
  }
  if (node.type !== "text") {
    ui.editorPanel.classList.add("hidden");
  }
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
  if (
    event.target.closest(".canvas-node__text-input") ||
    event.target.closest(".canvas-node__text-toolbar") ||
    event.target.closest(".canvas-node__resize-handle")
  ) return;
  state.hoveredGroupId = null;
  if (event.shiftKey) {
    toggleNodeSelection(node.id);
    return;
  }
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
      content: node.content ?? "",
      panelColor: node.panelColor || "",
      model: node.model,
      settings: { ...(node.settings || {}) },
      x: node.x - minX,
      y: node.y - minY,
      width: node.width,
      height: node.height,
      sourceKind: node.sourceKind,
      preset: false,
      src: node.src,
      fileName: node.fileName,
      referenceAsset: node.referenceAsset ? { ...node.referenceAsset } : null
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

ui.editorPrompt.addEventListener("focus", () => {
  state.pendingEditorSnapshot = serializeCanvasState();
});

ui.editorPrompt.addEventListener("input", (event) => {
  const node = getNode(state.selectedNodeId);
  if (!node) return;
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

function showQuickAddMenu() {
  const stage = document.querySelector(".canvas-stage");
  const stageRect = stage.getBoundingClientRect();
  const triggerRect = quickAddBtn.getBoundingClientRect();
  const menuWidth = ui.addNodeMenu.offsetWidth || 292;
  const menuHeight = ui.addNodeMenu.offsetHeight || 278;
  const left = Math.min(
    Math.max(18, triggerRect.right - stageRect.left + 10),
    stageRect.width - menuWidth - 18
  );
  const top = Math.min(
    Math.max(18, triggerRect.top - stageRect.top + 2),
    stageRect.height - menuHeight - 18
  );

  const viewCenterClientX = canvasFrame.getBoundingClientRect().left + canvasFrame.clientWidth / 2;
  const viewCenterClientY = canvasFrame.getBoundingClientRect().top + canvasFrame.clientHeight / 2;
  state.contextWorldPoint = worldFromClient(viewCenterClientX, viewCenterClientY);

  ui.contextMenu.classList.add("hidden");
  ui.addNodeMenu.style.left = `${left}px`;
  ui.addNodeMenu.style.top = `${top}px`;
  ui.addNodeMenu.classList.toggle("hidden");
}

function hideContextMenus() {
  ui.contextMenu.classList.add("hidden");
  ui.addNodeMenu.classList.add("hidden");
}
