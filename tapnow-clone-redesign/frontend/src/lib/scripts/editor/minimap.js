// Editor module: minimap, viewport transform, and selection box rendering

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
  const previewRect = minimapPreview.getBoundingClientRect();
  const sceneRect = minimapScene.getBoundingClientRect();
  const sceneOffsetX = sceneRect.left - previewRect.left;
  const sceneOffsetY = sceneRect.top - previewRect.top;
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
  minimapViewport.style.left = `${sceneOffsetX + padX + (viewLeft - bounds.minX) * scale}px`;
  minimapViewport.style.top = `${sceneOffsetY + padY + (viewTop - bounds.minY) * scale}px`;
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
