// Editor module: editor event binding

function bindEvents() {
  const floatingTitleTrigger = document.getElementById("floatingTitleTrigger");
  if (floatingTitleTrigger) {
    const goToWorkspace = (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.href = "../workspace/index.html";
    };
    floatingTitleTrigger.addEventListener("click", goToWorkspace);
    floatingTitleTrigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        goToWorkspace(event);
      }
    });
  }

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

  runBtn?.addEventListener("click", () => {
    runSelectedChainWorkflow();
  });
  runSelectedNodeBtn?.addEventListener("click", () => {
    runSelectedNodeWorkflow();
  });
  runChainBtn?.addEventListener("click", () => {
    runSelectedChainWorkflow();
  });
  resetWorkflowBtn?.addEventListener("click", () => {
    resetWorkflowState();
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

  ui.textColorList.innerHTML = GROUP_SWATCHES.map((item) => `
    <button class="group-color-menu__swatch" data-color="${item.value}" title="${item.name}" style="--swatch:${item.value}"></button>
  `).join("");

  ui.groupColorBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    state.colorMenuMode = "group";
    state.colorMenuTextNodeId = null;
    ui.groupColorMenu.classList.toggle("hidden");
    if (ui.groupColorMenu.classList.contains("hidden")) {
      hideColorMenu();
      return;
    }
    updateGroupToolbar();
  });

  ui.groupLayoutBtn.addEventListener("click", () => {
    hideColorMenu();
    layoutActiveGroup();
  });

  ui.groupUngroupBtn.addEventListener("click", () => {
    hideColorMenu();
    ungroupActiveGroup();
  });

  ui.groupColorList.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveGroupColor(button.dataset.color);
      ui.groupColorMenu.classList.add("hidden");
    });
  });

  ui.textColorList.querySelectorAll("[data-color]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = getNode(state.colorMenuTextNodeId);
      setTextNodePanelColor(node, button.dataset.color);
      hideColorMenu();
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
      if (state.pendingNodeUploadTargetId) {
        const node = getNode(state.pendingNodeUploadTargetId);
        const file = ui.uploadInput.files[0];
        state.pendingNodeUploadTargetId = null;
        if (node && file) {
          const assetType = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : null;
          if (assetType) {
            rememberHistory();
            node.referenceAsset = {
              type: assetType,
              name: file.name,
              src: URL.createObjectURL(file)
            };
            if (node.sourceKind === "upload") {
              node.src = node.referenceAsset.src;
              node.fileName = file.name;
            }
            renderNode(node);
            updateSession();
            updateEditorPanel();
            setStatus(`已为“${node.title}”接入参考素材。`);
          } else {
            setStatus("仅支持图片、视频和音频文件。");
          }
        }
      } else {
        importFiles([...ui.uploadInput.files], state.contextWorldPoint);
      }
    }
    ui.uploadInput.value = "";
  });

  canvasFrame.addEventListener("pointerdown", (event) => {
    updateLastPointer(event.clientX, event.clientY);
    if (!event.target.closest(".canvas-node") && !event.target.closest(".canvas-group") && !event.target.closest(".connection-hit") && !event.target.closest("#connectionDeleteBtn") && !event.target.closest("#selectionToolbar") && !event.target.closest("#canvasContextMenu") && !event.target.closest("#addNodeMenu") && !event.target.closest("#groupToolbar") && !event.target.closest("#groupColorMenu") && !event.target.closest("#textColorMenu") && !event.target.closest("#nodeEditorPanel")) {
      hideContextMenus();
      state.activeGroupId = null;
      state.hoveredGroupId = null;
      hideGroupToolbar();
      if (!state.isLinkDragging) {
        clearLinkSource();
      }
    }
    if (event.target.closest(".connection-hit") || event.target.closest("#connectionDeleteBtn") || event.target.closest("#selectionToolbar") || event.target.closest("#canvasContextMenu") || event.target.closest("#addNodeMenu") || event.target.closest("#groupToolbar") || event.target.closest("#groupColorMenu") || event.target.closest("#textColorMenu") || event.target.closest("#nodeEditorPanel")) return;
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
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier) {
      adjustCanvasScale(state.scale + (event.deltaY > 0 ? -0.05 : 0.05));
      return;
    }
    const selectedNode = getNode(state.selectedNodeId);
    const selectedTextNode = selectedNode && selectedNode.type === "text" ? selectedNode : null;
    if (selectedTextNode && event.target.closest?.(`[data-id="${selectedTextNode.id}"]`)) {
      const textEditor = selectedTextNode.element?.querySelector(".canvas-node__text-input");
      if (textEditor) {
        textEditor.scrollTop += event.deltaY;
        return;
      }
    }
    panCanvasBy(0, -event.deltaY);
  }, { passive: false });

  minimapPreview.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    interaction.isDraggingMinimap = true;
    focusCanvasFromMinimap(event.clientX, event.clientY);
    minimapPreview.setPointerCapture(event.pointerId);
  });

  canvasFrame.addEventListener("dragenter", (event) => {
    if (window.__readonlyEditorAssetDrag === true) {
      event.preventDefault();
      canvasFrame.classList.remove("is-drop-target");
      return;
    }
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
      canvasFrame.classList.add("is-drop-target");
    }
  });
  canvasFrame.addEventListener("dragover", (event) => {
    if (window.__readonlyEditorAssetDrag === true) {
      event.preventDefault();
      canvasFrame.classList.remove("is-drop-target");
      return;
    }
    if ([...(event.dataTransfer?.types || [])].includes("Files")) {
      event.preventDefault();
      canvasFrame.classList.add("is-drop-target");
      updateLastPointer(event.clientX, event.clientY);
    }
  });
  canvasFrame.addEventListener("drop", (event) => {
    if (window.__readonlyEditorAssetDrag === true) {
      window.__readonlyEditorAssetDrag = false;
      event.preventDefault();
      event.stopPropagation();
      canvasFrame.classList.remove("is-drop-target");
      return;
    }
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
      const hoveredNodeElement = event.target?.closest?.(".canvas-node");
      const hoveredNodeId = hoveredNodeElement?.dataset?.id || null;
      const sourceNodeId = state.linkDragFromNodeId;
      const hoveredNode = hoveredNodeId && hoveredNodeId !== sourceNodeId ? getNode(hoveredNodeId) : null;
      if (hoveredNode) {
        const hoveredRect = hoveredNodeElement.getBoundingClientRect();
        const hoverSide = event.clientX <= hoveredRect.left + hoveredRect.width / 2 ? "left" : "right";
        setLinkDragTarget(hoveredNode.id, hoverSide);
        state.linkPreviewPoint = getNodePortPoint(hoveredNode, hoverSide);
      } else {
        setLinkDragTarget(null);
        state.linkPreviewPoint = {
          x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
          y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
        };
      }
      renderConnections();
      return;
    }
    if (state.isResizingNode) {
      const node = getNode(state.resizingNodeId);
      if (!node) {
        state.isResizingNode = false;
        state.resizingNodeId = null;
        state.resizeSnapshot = null;
        return;
      }
      const deltaX = (event.clientX - state.resizeStartMouseX) / state.scale;
      const deltaY = (event.clientY - state.resizeStartMouseY) / state.scale;
      const nextWidth = Math.max(TEXT_NODE_MIN_WIDTH, state.resizeStartWidth + deltaX);
      const easedHeight = state.resizeStartHeight + deltaY + deltaX * 0.18;
      const nextHeight = Math.max(TEXT_NODE_MIN_HEIGHT, easedHeight);
      state.resizeMoved = state.resizeMoved || Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1;
      node.width = Math.round(nextWidth);
      node.height = Math.round(nextHeight);
      renderNode(node);
      renderGroups();
      renderConnections();
      renderSelectionBox();
      updateEditorPanel();
      return;
    }
    if (
      !state.isPanning &&
      !state.isDraggingNodes &&
      !state.isResizingNode &&
      !state.draggingGroupId &&
      !state.isSelecting &&
      !event.target.closest("#connectionDeleteBtn")
    ) {
      const point = framePointFromClient(event.clientX, event.clientY);
      const hovered = getClosestConnectionAtPoint(point);
      if (hovered) {
        setHoveredConnection(hovered.key, hovered.point);
      } else if (!event.target.closest(".connection-hit")) {
        clearHoveredConnection();
      }
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
      const fromNodeId = state.linkDragFromNodeId;
      const targetPort = event.target?.closest?.(".canvas-node__port");
      const targetNode = event.target?.closest?.(".canvas-node") || targetPort?.closest(".canvas-node");
      const hoveredTargetNodeId = state.linkDragTargetNodeId;
      const targetNodeId = hoveredTargetNodeId || targetNode?.dataset?.id;
      if (fromNodeId && targetNodeId && fromNodeId !== targetNodeId) {
        addConnection(fromNodeId, targetNodeId);
      }
      clearLinkDrag();
      return;
    }
    if (state.isResizingNode) {
      if (state.resizeSnapshot && state.resizeMoved) {
        pushHistory(state.resizeSnapshot);
      }
      state.isResizingNode = false;
      state.resizingNodeId = null;
      state.resizeSnapshot = null;
      state.resizeMoved = false;
      updateEditorPanel();
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

  canvasFrame.addEventListener("mouseleave", (event) => {
    if (event.relatedTarget?.closest?.("#connectionDeleteBtn")) return;
    clearHoveredConnection();
  });

  canvasFrame.addEventListener("click", (event) => {
    if (state.suppressCanvasClick) {
      state.suppressCanvasClick = false;
      return;
    }
    if (event.target.closest(".connection-hit") || event.target.closest("#connectionDeleteBtn") || event.target.closest("#selectionToolbar") || event.target.closest("#canvasContextMenu") || event.target.closest("#addNodeMenu") || event.target.closest("#groupToolbar") || event.target.closest("#groupColorMenu") || event.target.closest("#textColorMenu") || event.target.closest("#nodeEditorPanel")) {
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
    if (event.key === "F5" && !isEditableTarget(event.target)) {
      event.preventDefault();
      runSelectedChainWorkflow();
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (!modifier || isEditableTarget(event.target)) return;
    const lowerKey = event.key.toLowerCase();
    if (lowerKey === "c") {
      event.preventDefault();
      copySelection(false);
    } else if (lowerKey === "x") {
      event.preventDefault();
      copySelection(true);
    } else if (lowerKey === "v") {
      if (state.clipboard?.nodes?.length) {
        event.preventDefault();
        pasteSelection(state.lastWorldPoint);
      }
    } else if (lowerKey === "z" && event.shiftKey) {
      event.preventDefault();
      redo();
    } else if (lowerKey === "z") {
      event.preventDefault();
      undo();
    } else if (event.key === "+" || event.key === "=" || event.code === "NumpadAdd") {
      event.preventDefault();
      adjustCanvasScale(state.scale + 0.05);
    } else if (event.key === "-" || event.code === "NumpadSubtract") {
      event.preventDefault();
      adjustCanvasScale(state.scale - 0.05);
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
