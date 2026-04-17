// Editor module: group state helpers, toolbar, rendering, and group actions

function getGroup(groupId) {
  return state.groups.find((group) => group.id === groupId);
}

function getNodeGroup(nodeId) {
  return state.groups.find((group) => group.nodeIds.includes(nodeId));
}

function cleanupGroups() {
  state.groups = state.groups
    .map((group) => {
      const nodeIds = (group.nodeIds || []).filter((id, index, arr) => arr.indexOf(id) === index && !!getNode(id));
      if (nodeIds.length < 2) return null;
      const frame = group.frame || getNodesFrame(nodeIds);
      if (!frame) return null;
      return {
        ...group,
        nodeIds,
        frame
      };
    })
    .filter(Boolean);

  if (state.activeGroupId && !getGroup(state.activeGroupId)) {
    state.activeGroupId = null;
  }

  if (state.hoveredGroupId && !getGroup(state.hoveredGroupId)) {
    state.hoveredGroupId = null;
  }
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
  hideColorMenu();
}

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

  if (state.colorMenuMode === "group" && !ui.groupColorMenu.classList.contains("hidden")) {
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
