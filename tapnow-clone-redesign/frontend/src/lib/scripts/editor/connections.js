// Editor module: connection geometry, rendering, hover, and link management

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
    startX,
    startY,
    endX,
    endY,
    cp1x,
    cp1y,
    cp2x,
    cp2y,
    midX,
    midY
  };
}

function cubicBezierPoint(geometry, t) {
  const mt = 1 - t;
  return {
    x:
      mt ** 3 * geometry.startX +
      3 * mt ** 2 * t * geometry.cp1x +
      3 * mt * t ** 2 * geometry.cp2x +
      t ** 3 * geometry.endX,
    y:
      mt ** 3 * geometry.startY +
      3 * mt ** 2 * t * geometry.cp1y +
      3 * mt * t ** 2 * geometry.cp2y +
      t ** 3 * geometry.endY
  };
}

function getClosestConnectionAtPoint(point, threshold = 28) {
  let closest = null;
  let bestDistanceSq = threshold * threshold;
  state.connections.forEach((connection) => {
    const from = getNode(connection.from);
    const to = getNode(connection.to);
    if (!from || !to) return;
    const geometry = getConnectionGeometry(from, to);
    const steps = 40;
    for (let index = 0; index <= steps; index += 1) {
      const sample = cubicBezierPoint(geometry, index / steps);
      const dx = sample.x - point.x;
      const dy = sample.y - point.y;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= bestDistanceSq) {
        bestDistanceSq = distanceSq;
        closest = {
          key: getConnectionKey(connection.from, connection.to),
          point: { x: geometry.midX, y: geometry.midY }
        };
      }
    }
  });
  return closest;
}

function setHoveredConnection(key, point) {
  const keyChanged = state.hoveredConnectionKey !== key;
  state.hoveredConnectionKey = key;
  state.hoveredConnectionPoint = point ? { ...point } : null;
  if (keyChanged) {
    renderConnections();
  }
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

function getNodePortPoint(node, side = "right") {
  const offset = 15;
  return {
    x: node.x * state.scale + state.offsetX + (side === "left" ? -offset : node.width * state.scale + offset),
    y: node.y * state.scale + state.offsetY + (node.height * state.scale) / 2
  };
}

function syncLinkDragTargetClasses() {
  state.nodes.forEach((node) => {
    if (!node.element) return;
    const isTarget = state.linkDragTargetNodeId === node.id;
    node.element.classList.toggle("is-link-target", isTarget);
    if (isTarget && state.linkDragTargetSide) {
      node.element.dataset.linkTargetSide = state.linkDragTargetSide;
    } else {
      delete node.element.dataset.linkTargetSide;
    }
  });
}

function setLinkDragTarget(nodeId, side = null) {
  const normalizedSide = nodeId ? side || "left" : null;
  const changed =
    state.linkDragTargetNodeId !== nodeId ||
    state.linkDragTargetSide !== normalizedSide;
  state.linkDragTargetNodeId = nodeId;
  state.linkDragTargetSide = normalizedSide;
  if (changed) {
    syncLinkDragTargetClasses();
  }
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
    hitPath.addEventListener("mousemove", () => {
      setHoveredConnection(key, { x: geometry.midX, y: geometry.midY });
    });
    hitPath.addEventListener("mouseleave", (event) => {
      if (event.relatedTarget === ui.connectionDeleteBtn || event.relatedTarget?.closest?.("#connectionDeleteBtn")) return;
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
    const previewD = `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;

    const previewGlowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewGlowPath.setAttribute("class", "connection-path connection-path--preview-shadow");
    previewGlowPath.setAttribute("d", previewD);
    connectionsLayer.appendChild(previewGlowPath);

    const previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    previewPath.setAttribute("class", "connection-path connection-path--preview");
    previewPath.setAttribute("d", previewD);
    connectionsLayer.appendChild(previewPath);

    const startDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    startDot.setAttribute("class", "connection-preview-dot connection-preview-dot--start");
    startDot.setAttribute("cx", String(start.x));
    startDot.setAttribute("cy", String(start.y));
    startDot.setAttribute("r", "4");
    connectionsLayer.appendChild(startDot);

    const endDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    endDot.setAttribute("class", "connection-preview-dot connection-preview-dot--end");
    endDot.setAttribute("cx", String(end.x));
    endDot.setAttribute("cy", String(end.y));
    endDot.setAttribute("r", "5.5");
    connectionsLayer.appendChild(endDot);
  }

  if (state.hoveredConnectionKey && !state.connections.some((item) => getConnectionKey(item.from, item.to) === state.hoveredConnectionKey)) {
    state.hoveredConnectionKey = null;
    state.hoveredConnectionPoint = null;
  }
  updateConnectionDeleteButton();
}

function validateConnection(fromNode, toNode) {
  if (!fromNode || !toNode || fromNode.id === toNode.id) return false;
  if (fromNode.type === "text") {
    return !!toNode.preset && ["image", "video", "audio"].includes(toNode.type);
  }
  if (fromNode.sourceKind === "upload") {
    return ["image", "video", "audio"].includes(toNode.type) && toNode.sourceKind !== "upload";
  }
  return true;
}

function setLinkSource(nodeId) {
  state.linkFromNodeId = nodeId;
  renderAllNodes();
  syncLinkDragTargetClasses();
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
  setLinkDragTarget(null);
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
  setLinkDragTarget(null);
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
