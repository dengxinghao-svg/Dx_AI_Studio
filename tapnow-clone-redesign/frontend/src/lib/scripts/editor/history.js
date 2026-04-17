// Editor module: snapshot history and undo/redo

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
  const normalized = normalizeSnapshotPayload(snapshot);
  state.nodeSeq = normalized.nodeSeq;
  state.groupSeq = normalized.groupSeq || 0;
  state.scale = normalized.scale;
  state.offsetX = normalized.offsetX;
  state.offsetY = normalized.offsetY;
  state.connections = normalized.connections.map((connection) => ({ ...connection }));
  state.groups = (normalized.groups || []).map((group) => ({
    ...group,
    nodeIds: [...group.nodeIds],
    frame: group.frame ? { ...group.frame } : null
  }));
  state.activeGroupId = null;
  state.hoveredGroupId = null;
  state.selectedNodeIds = new Set(normalized.selectedIds);
  state.selectedNodeId = normalized.selectedIds.length === 1 ? normalized.selectedIds[0] : null;
  canvasWorld.innerHTML = "";
  state.nodes = normalized.nodes.map((nodeData) => createNode(nodeData, { skipHistory: true }));
  setTransform();
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
