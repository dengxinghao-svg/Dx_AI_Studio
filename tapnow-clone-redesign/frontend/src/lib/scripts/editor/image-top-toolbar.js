(function setupImageTopToolbar() {
  if (window.__imageTopToolbarReady) {
    return;
  }
  window.__imageTopToolbarReady = true;

  const TOOLBAR_STRINGS = {
    crop: "\u88c1\u526a",
    multiAngle: "\u591a\u89d2\u5ea6\uff08\u9884\u7559\uff09",
    repaint: "\u91cd\u7ed8",
    more: "\u66f4\u591a",
    expand: "\u6269\u56fe",
    split: "\u5feb\u901f\u62c6\u5206",
    download: "\u4e0b\u8f7d",
    fullscreen: "\u5168\u5c4f\u67e5\u770b",
    imageTitle: "\u56fe\u7247\u751f\u6210",
    closeFullscreen: "\u5173\u95ed\u5168\u5c4f",
    cancelCrop: "\u53d6\u6d88\u88c1\u526a",
    cropRatio: "\u5bbd\u9ad8\u6bd4",
    confirmCrop: "\u786e\u8ba4\u88c1\u526a",
    originalRatio: "\u539f\u56fe\u6bd4\u4f8b",
    repaintMode: "\u91cd\u7ed8\u6a21\u5f0f",
    repaintTitle: "\u91cd\u7ed8",
    repaintClose: "\u9000\u51fa\u91cd\u7ed8",
    repaintBrush: "\u753b\u7b14",
    repaintErase: "\u64e6\u9664",
    repaintClear: "\u6e05\u7a7a",
    repaintUndo: "\u64a4\u9500",
    repaintApply: "\u786e\u8ba4\u91cd\u7ed8",
    repaintPlaceholder: "\u63cf\u8ff0\u60f3\u8981\u4fee\u6539\u4ec0\u4e48...",
    repaintHint: "\u7ed8\u5236\u84dd\u8272\u8499\u7248\u4ee5\u9650\u5b9a\u91cd\u7ed8\u533a\u57df",
    expandMode: "\u6269\u56fe\u6a21\u5f0f",
    splitMode: "\u5feb\u901f\u62c6\u5206",
    repaintPrompt: "\u7ee7\u627f\u5f53\u524d\u56fe\u50cf\u4fe1\u606f\uff0c\u5728\u8fd9\u5f20\u56fe\u7684\u57fa\u7840\u4e0a\u8fdb\u884c\u4e8c\u6b21\u521b\u4f5c",
    expandPrompt: "\u6269\u56fe\u6a21\u5f0f\uff1a\u57fa\u4e8e\u5f53\u524d\u56fe\u50cf\u5411\u5916\u5ef6\u5c55\u5185\u5bb9",
    splitPrompt: "\u5feb\u901f\u62c6\u5206\u6a21\u5f0f\uff1a\u8f93\u51fa\u5f53\u524d\u56fe\u7684\u5206\u5757\u7ed3\u679c",
    noImage: "\u6682\u65e0\u53ef\u7528\u56fe\u50cf",
    quickSplit2: "2x2",
    quickSplit3: "3x3",
    quickSplit4: "4x4"
  };

  const RATIO_OPTIONS = [
    { value: "original", label: TOOLBAR_STRINGS.originalRatio, ratio: null },
    { value: "1:1", label: "1:1", ratio: 1 / 1 },
    { value: "4:3", label: "4:3", ratio: 4 / 3 },
    { value: "3:4", label: "3:4", ratio: 3 / 4 },
    { value: "16:9", label: "16:9", ratio: 16 / 9 },
    { value: "9:16", label: "9:16", ratio: 9 / 16 },
    { value: "21:9", label: "21:9", ratio: 21 / 9 }
  ];

  const cropState = {
    nodeId: null,
    src: "",
    naturalWidth: 0,
    naturalHeight: 0,
    displayRect: null,
    ratio: "original",
    cropRect: null,
    isDragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0
  };

  const repaintState = {
    nodeId: null,
    src: "",
    naturalWidth: 0,
    naturalHeight: 0,
    displayRect: null,
    isDrawing: false,
    tool: "brush",
    brushSize: 28,
    history: []
  };

  function noop() {}

  function getEditorUi() {
    try {
      return ui || null;
    } catch (_error) {
      return null;
    }
  }

  function getCanvasFrameElement() {
    try {
      return canvasFrame || document.getElementById("canvasFrame");
    } catch (_error) {
      return document.getElementById("canvasFrame");
    }
  }

  function getCanvasWorldElement() {
    try {
      return canvasWorld || document.getElementById("canvasWorld");
    } catch (_error) {
      return document.getElementById("canvasWorld");
    }
  }

  function getSelectedNodeArray() {
    if (!state || !state.selectedNodeIds) return [];
    if (Array.isArray(state.selectedNodeIds)) return state.selectedNodeIds;
    return [...state.selectedNodeIds];
  }

  function getPrimarySelectedNode() {
    if (state?.selectedNodeId) {
      return getNode(state.selectedNodeId);
    }
    const ids = getSelectedNodeArray();
    return ids.length ? getNode(ids[0]) : null;
  }

  function isOnlySelectedNode(node) {
    const ids = getSelectedNodeArray();
    return !!node && ids.length === 1 && ids[0] === node.id;
  }

  function ensureToolbarUi() {
    const editorUi = getEditorUi();
    const frame = getCanvasFrameElement();
    if (!editorUi || !frame) {
      return null;
    }

    if (!editorUi.imageToolbarMenu) {
      const menu = document.createElement("div");
      menu.className = "image-toolbar-menu hidden";
      menu.innerHTML = [
        `<button type="button" class="image-toolbar-menu__item" data-image-menu-action="expand">${TOOLBAR_STRINGS.expand}</button>`,
        `<button type="button" class="image-toolbar-menu__item" data-image-menu-action="split">${TOOLBAR_STRINGS.split}</button>`
      ].join("");
      frame.appendChild(menu);
      editorUi.imageToolbarMenu = menu;
    }

    if (!editorUi.imageViewerOverlay) {
      const overlay = document.createElement("div");
      overlay.className = "image-viewer-overlay hidden";
      overlay.innerHTML = [
        '<div class="image-viewer-overlay__backdrop" data-image-viewer-close="1"></div>',
        '<div class="image-viewer-overlay__shell">',
        `  <div class="image-viewer-overlay__header"><span>${TOOLBAR_STRINGS.imageTitle}</span><button type="button" class="image-viewer-overlay__close" data-image-viewer-close="1">${TOOLBAR_STRINGS.closeFullscreen}</button></div>`,
        '  <div class="image-viewer-overlay__content">',
        '    <div class="image-viewer-overlay__stage"><img class="image-viewer-overlay__image" alt="image-viewer"></div>',
        '    <aside class="image-viewer-overlay__side">',
        `      <section><h4>${TOOLBAR_STRINGS.imageTitle}</h4><p class="image-viewer-overlay__meta" data-image-viewer-meta="title">-</p></section>`,
        '      <section><h4>Prompt</h4><p class="image-viewer-overlay__meta" data-image-viewer-meta="prompt">-</p></section>',
        '      <section><h4>Model</h4><p class="image-viewer-overlay__meta" data-image-viewer-meta="model">-</p></section>',
        '      <section><h4>Status</h4><p class="image-viewer-overlay__meta" data-image-viewer-meta="status">-</p></section>',
        '    </aside>',
        '  </div>',
        '</div>'
      ].join("");
      document.body.appendChild(overlay);
      editorUi.imageViewerOverlay = overlay;
    }

    if (!editorUi.imageCropOverlay) {
      const overlay = document.createElement("div");
      overlay.className = "image-crop-overlay hidden";
      overlay.innerHTML = [
        '<div class="image-crop-overlay__backdrop"></div>',
        '<div class="image-crop-overlay__shell">',
        `  <div class="image-crop-overlay__header"><span>${TOOLBAR_STRINGS.imageTitle}</span></div>`,
        '  <div class="image-crop-overlay__content">',
        '    <div class="image-crop-overlay__stage">',
        '      <img class="image-crop-overlay__image" alt="crop-image">',
        '      <div class="image-crop-overlay__mask"></div>',
        '      <div class="image-crop-overlay__box">',
        '        <span class="image-crop-overlay__handle image-crop-overlay__handle--tl"></span>',
        '        <span class="image-crop-overlay__handle image-crop-overlay__handle--tr"></span>',
        '        <span class="image-crop-overlay__handle image-crop-overlay__handle--bl"></span>',
        '        <span class="image-crop-overlay__handle image-crop-overlay__handle--br"></span>',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <div class="image-crop-overlay__footer">',
        `    <button type="button" class="image-crop-overlay__btn" data-crop-cancel="1">${TOOLBAR_STRINGS.cancelCrop}</button>`,
        '    <div class="image-crop-overlay__ratio-wrap">',
        `      <button type="button" class="image-crop-overlay__btn image-crop-overlay__btn--ratio" data-crop-ratio-toggle="1">${TOOLBAR_STRINGS.cropRatio}</button>`,
        '      <div class="image-crop-overlay__ratio-menu hidden"></div>',
        '    </div>',
        `    <button type="button" class="image-crop-overlay__btn image-crop-overlay__btn--primary" data-crop-confirm="1">${TOOLBAR_STRINGS.confirmCrop}</button>`,
        '  </div>',
        '</div>'
      ].join("");
      document.body.appendChild(overlay);
      editorUi.imageCropOverlay = overlay;

      const ratioMenu = overlay.querySelector(".image-crop-overlay__ratio-menu");
      ratioMenu.innerHTML = RATIO_OPTIONS.map((option) => (
        `<button type="button" class="image-crop-overlay__ratio-option" data-crop-ratio="${option.value}">${option.label}</button>`
      )).join("");
    }

    if (!editorUi.imageRepaintOverlay) {
      const overlay = document.createElement("div");
      overlay.className = "image-repaint-overlay hidden";
      overlay.innerHTML = [
        '<div class="image-repaint-overlay__backdrop" data-repaint-close="1"></div>',
        '<div class="image-repaint-overlay__shell">',
        '  <div class="image-repaint-overlay__toolbar">',
        `    <button type="button" class="image-repaint-overlay__tool" data-repaint-close="1" title="${TOOLBAR_STRINGS.repaintClose}">&#x2715;</button>`,
        `    <button type="button" class="image-repaint-overlay__tool is-active" data-repaint-tool="brush" title="${TOOLBAR_STRINGS.repaintBrush}">&#x270e;</button>`,
        `    <button type="button" class="image-repaint-overlay__tool" data-repaint-tool="erase" title="${TOOLBAR_STRINGS.repaintErase}">&#x232b;</button>`,
        `    <label class="image-repaint-overlay__slider-wrap" title="${TOOLBAR_STRINGS.repaintBrush}"><span>{</span><input type="range" min="8" max="96" step="2" value="28" data-repaint-size="1"><span>}</span></label>`,
        '    <span class="image-repaint-overlay__toolbar-divider"></span>',
        `    <button type="button" class="image-repaint-overlay__tool" data-repaint-undo="1" title="${TOOLBAR_STRINGS.repaintUndo}">&#x21b6;</button>`,
        `    <button type="button" class="image-repaint-overlay__tool" data-repaint-clear="1" title="${TOOLBAR_STRINGS.repaintClear}">&#x21ba;</button>`,
        '  </div>',
        `  <div class="image-repaint-overlay__title">${TOOLBAR_STRINGS.imageTitle}</div>`,
        '  <div class="image-repaint-overlay__viewport">',
        '    <div class="image-repaint-overlay__stage">',
        '      <img class="image-repaint-overlay__image" alt="repaint-image">',
        '      <canvas class="image-repaint-overlay__canvas"></canvas>',
        '    </div>',
        '  </div>',
        '  <div class="image-repaint-overlay__prompt">',
        `    <div class="image-repaint-overlay__hint">${TOOLBAR_STRINGS.repaintHint}</div>`,
        `    <textarea class="image-repaint-overlay__textarea" placeholder="${TOOLBAR_STRINGS.repaintPlaceholder}"></textarea>`,
        '    <div class="image-repaint-overlay__footer">',
        '      <div class="image-repaint-overlay__meta">',
        '        <span class="image-repaint-overlay__chip" data-repaint-meta="model">-</span>',
        '        <span class="image-repaint-overlay__chip" data-repaint-meta="version">-</span>',
        '        <span class="image-repaint-overlay__chip" data-repaint-meta="ratio">-</span>',
        '      </div>',
        `      <button type="button" class="image-repaint-overlay__apply" data-repaint-apply="1">${TOOLBAR_STRINGS.repaintApply}</button>`,
        '    </div>',
        '  </div>',
        '</div>'
      ].join("");
      document.body.appendChild(overlay);
      editorUi.imageRepaintOverlay = overlay;
    }

    bindToolbarUi();
    return editorUi.imageToolbarMenu;
  }

  let toolbarUiBound = false;
  function bindToolbarUi() {
    if (toolbarUiBound) {
      return;
    }
    toolbarUiBound = true;

    ui.imageToolbarMenu?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-image-menu-action]");
      if (!button) return;
      const node = getPrimarySelectedNode();
      if (!node || node.type !== "image") return;
      const action = button.dataset.imageMenuAction;
      hideImageToolbarMenu();
      if (action === "expand") {
        setImageMode(node, "expand");
      } else if (action === "split") {
        if (!node.settings) node.settings = {};
        if (!node.settings.quickSplit) node.settings.quickSplit = TOOLBAR_STRINGS.quickSplit2;
        setImageMode(node, "split");
      }
    });

    ui.imageViewerOverlay?.addEventListener("click", (event) => {
      if (event.target.closest("[data-image-viewer-close]")) {
        closeImageViewer();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (ui.imageToolbarMenu && !ui.imageToolbarMenu.classList.contains("hidden")) {
          hideImageToolbarMenu();
        }
        if (ui.imageViewerOverlay && !ui.imageViewerOverlay.classList.contains("hidden")) {
          closeImageViewer();
        }
        if (ui.imageCropOverlay && !ui.imageCropOverlay.classList.contains("hidden")) {
          closeCropOverlay();
        }
        if (ui.imageRepaintOverlay && !ui.imageRepaintOverlay.classList.contains("hidden")) {
          closeRepaintOverlay();
        }
      }
    });

    const cropOverlay = ui.imageCropOverlay;
    cropOverlay?.querySelector("[data-crop-cancel]")?.addEventListener("click", closeCropOverlay);
    cropOverlay?.querySelector("[data-crop-confirm]")?.addEventListener("click", confirmCrop);
    cropOverlay?.querySelector("[data-crop-ratio-toggle]")?.addEventListener("click", () => {
      cropOverlay.querySelector(".image-crop-overlay__ratio-menu")?.classList.toggle("hidden");
    });
    cropOverlay?.querySelector(".image-crop-overlay__ratio-menu")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-crop-ratio]");
      if (!button) return;
      cropState.ratio = button.dataset.cropRatio || "original";
      cropOverlay.querySelector(".image-crop-overlay__ratio-menu")?.classList.add("hidden");
      resetCropRect();
      renderCropBox();
    });

    const cropBox = cropOverlay?.querySelector(".image-crop-overlay__box");
    cropBox?.addEventListener("pointerdown", beginCropDrag);
    window.addEventListener("pointermove", moveCropDrag);
    window.addEventListener("pointerup", endCropDrag);

    const repaintOverlay = ui.imageRepaintOverlay;
    repaintOverlay?.addEventListener("click", (event) => {
      if (event.target.closest("[data-repaint-close]")) {
        closeRepaintOverlay();
        return;
      }
      const toolButton = event.target.closest("[data-repaint-tool]");
      if (toolButton) {
        setRepaintTool(toolButton.dataset.repaintTool || "brush");
        return;
      }
      if (event.target.closest("[data-repaint-clear]")) {
        clearRepaintMask(true);
        return;
      }
      if (event.target.closest("[data-repaint-undo]")) {
        undoRepaintStroke();
        return;
      }
      if (event.target.closest("[data-repaint-apply]")) {
        applyRepaintMask();
      }
    });
    repaintOverlay?.querySelector("[data-repaint-size]")?.addEventListener("input", (event) => {
      repaintState.brushSize = Number(event.target.value) || 28;
    });
    const repaintCanvas = repaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    repaintCanvas?.addEventListener("pointerdown", beginRepaintDraw);
    window.addEventListener("pointermove", moveRepaintDraw);
    window.addEventListener("pointerup", endRepaintDraw);

    document.addEventListener("pointerdown", (event) => {
      const insideToolbar = event.target.closest(".canvas-node__image-toolbar");
      const insideMenu = event.target.closest(".image-toolbar-menu");
      if (!insideToolbar && !insideMenu) {
        hideImageToolbarMenu();
      }
    });
  }

  function getImageNodePreview(node) {
    return node?.output?.previewUrl || node?.src || node?.referenceAsset?.src || "";
  }

  function hideImageToolbarMenu() {
    if (!ui.imageToolbarMenu) return;
    ui.imageToolbarMenu.classList.add("hidden");
    ui.imageToolbarMenu.removeAttribute("style");
  }

  function showImageToolbarMenu(anchorButton) {
    ensureToolbarUi();
    const node = getPrimarySelectedNode();
    if (!anchorButton || !node || node.type !== "image") return;
    const rect = anchorButton.getBoundingClientRect();
    ui.imageToolbarMenu.style.left = `${rect.left + window.scrollX - 8}px`;
    ui.imageToolbarMenu.style.top = `${rect.bottom + window.scrollY + 12}px`;
    ui.imageToolbarMenu.classList.remove("hidden");
  }

  function setImageMode(node, mode) {
    if (!node) return;
    if (!node.settings) node.settings = {};
    node.settings.imageEditMode = mode;
    const preview = getImageNodePreview(node);
    node.settings.imageEditSource = preview ? {
      nodeId: node.id,
      title: node.title,
      src: preview
    } : null;
    if (mode === "repaint" && preview) {
      node.settings.referenceAsset = { src: preview, title: node.title, type: "image" };
    }
    if (typeof updateEditorPanel === "function") updateEditorPanel();
    if (typeof rememberHistory === "function") rememberHistory();
  }

  function downloadImageNode(node) {
    const src = getImageNodePreview(node);
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `${(node.title || "image").replace(/\s+/g, "-").toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function openImageViewer(node) {
    ensureToolbarUi();
    const overlay = ui.imageViewerOverlay;
    if (!overlay || !node) return;
    const image = overlay.querySelector(".image-viewer-overlay__image");
    const title = overlay.querySelector('[data-image-viewer-meta="title"]');
    const prompt = overlay.querySelector('[data-image-viewer-meta="prompt"]');
    const model = overlay.querySelector('[data-image-viewer-meta="model"]');
    const status = overlay.querySelector('[data-image-viewer-meta="status"]');
    const src = getImageNodePreview(node);
    image.src = src || "";
    image.alt = node.title || "image";
    title.textContent = node.title || TOOLBAR_STRINGS.imageTitle;
    prompt.textContent = node.prompt || TOOLBAR_STRINGS.noImage;
    model.textContent = node.settings?.model || "-";
    status.textContent = node.status || "idle";
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("is-active"));
  }

  function closeImageViewer() {
    const overlay = ui.imageViewerOverlay;
    if (!overlay) return;
    overlay.classList.remove("is-active");
    setTimeout(() => overlay.classList.add("hidden"), 180);
  }

  function openCropOverlay(node) {
    ensureToolbarUi();
    const overlay = ui.imageCropOverlay;
    const image = overlay?.querySelector(".image-crop-overlay__image");
    const src = getImageNodePreview(node);
    if (!overlay || !image || !src) return;

    cropState.nodeId = node.id;
    cropState.src = src;
    cropState.ratio = node.settings?.crop?.ratio || "original";
    cropState.cropRect = null;
    cropState.displayRect = null;
    cropState.naturalWidth = 0;
    cropState.naturalHeight = 0;

    image.onload = () => {
      cropState.naturalWidth = image.naturalWidth;
      cropState.naturalHeight = image.naturalHeight;
      measureCropDisplayRect();
      resetCropRect();
      renderCropBox();
    };
    image.src = src;
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("is-active"));
  }

  function closeCropOverlay() {
    const overlay = ui.imageCropOverlay;
    if (!overlay) return;
    overlay.classList.remove("is-active");
    setTimeout(() => overlay.classList.add("hidden"), 180);
    cropState.nodeId = null;
    cropState.isDragging = false;
  }

  function setRepaintTool(tool) {
    repaintState.tool = tool === "erase" ? "erase" : "brush";
    ui.imageRepaintOverlay?.querySelectorAll("[data-repaint-tool]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.repaintTool === repaintState.tool);
    });
  }

  function openRepaintOverlay(node) {
    ensureToolbarUi();
    const overlay = ui.imageRepaintOverlay;
    const image = overlay?.querySelector(".image-repaint-overlay__image");
    const textarea = overlay?.querySelector(".image-repaint-overlay__textarea");
    if (!overlay || !image || !node) return;
    const src = getImageNodePreview(node);
    if (!src) return;

    repaintState.nodeId = node.id;
    repaintState.src = src;
    repaintState.naturalWidth = 0;
    repaintState.naturalHeight = 0;
    repaintState.displayRect = null;
    repaintState.isDrawing = false;
    repaintState.history = [];
    repaintState.brushSize = Number(node.settings?.repaintMask?.brushSize) || 28;

    const slider = overlay.querySelector("[data-repaint-size]");
    if (slider) slider.value = String(repaintState.brushSize);
    setRepaintTool(node.settings?.repaintMask?.tool || "brush");

    textarea.value = node.prompt || "";
    overlay.querySelector('[data-repaint-meta="model"]').textContent = node.settings?.model || "-";
    overlay.querySelector('[data-repaint-meta="version"]').textContent = node.settings?.modelVersion || "-";
    overlay.querySelector('[data-repaint-meta="ratio"]').textContent = node.settings?.ratioLabel || node.settings?.ratio || "-";

    image.onload = () => {
      repaintState.naturalWidth = image.naturalWidth;
      repaintState.naturalHeight = image.naturalHeight;
      measureRepaintDisplayRect();
      syncRepaintCanvas();
      restoreRepaintMask(node);
    };
    image.src = src;
    overlay.classList.remove("hidden");
    requestAnimationFrame(() => overlay.classList.add("is-active"));
  }

  function closeRepaintOverlay() {
    const overlay = ui.imageRepaintOverlay;
    if (!overlay) return;
    overlay.classList.remove("is-active");
    setTimeout(() => overlay.classList.add("hidden"), 180);
    repaintState.nodeId = null;
    repaintState.isDrawing = false;
  }

  function measureRepaintDisplayRect() {
    const overlay = ui.imageRepaintOverlay;
    const stage = overlay?.querySelector(".image-repaint-overlay__stage");
    if (!stage || !repaintState.naturalWidth || !repaintState.naturalHeight) return;
    const rect = stage.getBoundingClientRect();
    const imageRatio = repaintState.naturalWidth / repaintState.naturalHeight;
    const stageRatio = rect.width / rect.height;
    let width = rect.width;
    let height = rect.height;
    let left = 0;
    let top = 0;
    if (imageRatio > stageRatio) {
      height = width / imageRatio;
      top = (rect.height - height) / 2;
    } else {
      width = height * imageRatio;
      left = (rect.width - width) / 2;
    }
    repaintState.displayRect = { left, top, width, height };
  }

  function syncRepaintCanvas() {
    const overlay = ui.imageRepaintOverlay;
    const canvas = overlay?.querySelector(".image-repaint-overlay__canvas");
    if (!canvas || !repaintState.displayRect) return;
    canvas.width = Math.round(repaintState.displayRect.width);
    canvas.height = Math.round(repaintState.displayRect.height);
    canvas.style.left = `${repaintState.displayRect.left}px`;
    canvas.style.top = `${repaintState.displayRect.top}px`;
    canvas.style.width = `${repaintState.displayRect.width}px`;
    canvas.style.height = `${repaintState.displayRect.height}px`;
    clearRepaintMask(false);
  }

  function restoreRepaintMask(node) {
    const dataUrl = node?.settings?.repaintMask?.dataUrl;
    if (!dataUrl) return;
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      pushRepaintHistory();
    };
    image.src = dataUrl;
  }

  function clearRepaintMask(pushHistory) {
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (pushHistory) pushRepaintHistory();
  }

  function pushRepaintHistory() {
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    if (!canvas) return;
    repaintState.history.push(canvas.toDataURL("image/png"));
    if (repaintState.history.length > 20) {
      repaintState.history.shift();
    }
  }

  function undoRepaintStroke() {
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context || repaintState.history.length <= 1) {
      clearRepaintMask(false);
      return;
    }
    repaintState.history.pop();
    const previous = repaintState.history[repaintState.history.length - 1];
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!previous) return;
    const image = new Image();
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = previous;
  }

  function getRepaintPoint(event) {
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return {
      canvas,
      x: (x / rect.width) * canvas.width,
      y: (y / rect.height) * canvas.height
    };
  }

  function beginRepaintDraw(event) {
    const point = getRepaintPoint(event);
    if (!point) return;
    event.preventDefault();
    repaintState.isDrawing = true;
    drawRepaintPoint(point.x, point.y, true);
  }

  function moveRepaintDraw(event) {
    if (!repaintState.isDrawing) return;
    const point = getRepaintPoint(event);
    if (!point) return;
    drawRepaintPoint(point.x, point.y, false);
  }

  function endRepaintDraw() {
    if (!repaintState.isDrawing) return;
    repaintState.isDrawing = false;
    pushRepaintHistory();
  }

  function drawRepaintPoint(x, y, resetPath) {
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = repaintState.brushSize;
    if (repaintState.tool === "erase") {
      context.globalCompositeOperation = "destination-out";
      context.strokeStyle = "rgba(0,0,0,1)";
    } else {
      context.globalCompositeOperation = "source-over";
      context.strokeStyle = "rgba(106, 191, 255, 0.72)";
      context.fillStyle = "rgba(106, 191, 255, 0.72)";
    }
    if (resetPath) {
      context.beginPath();
      context.arc(x, y, repaintState.brushSize / 2, 0, Math.PI * 2);
      if (repaintState.tool === "erase") {
        context.fill();
      } else {
        context.fill();
      }
      context.beginPath();
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
      context.stroke();
    }
  }

  function applyRepaintMask() {
    const node = getNode(repaintState.nodeId);
    const canvas = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__canvas");
    const textarea = ui.imageRepaintOverlay?.querySelector(".image-repaint-overlay__textarea");
    if (!node || !canvas) {
      closeRepaintOverlay();
      return;
    }
    if (!node.settings) node.settings = {};
    node.settings.imageEditMode = "repaint";
    node.settings.imageEditSource = {
      nodeId: node.id,
      title: node.title,
      src: repaintState.src
    };
    node.settings.repaintMask = {
      dataUrl: canvas.toDataURL("image/png"),
      brushSize: repaintState.brushSize,
      tool: repaintState.tool,
      updatedAt: new Date().toISOString()
    };
    if (textarea) {
      node.prompt = textarea.value;
    }
    if (!node.output) node.output = {};
    node.output.summary = TOOLBAR_STRINGS.repaintMode;
    if (typeof updateEditorPanel === "function") updateEditorPanel();
    if (typeof rememberHistory === "function") rememberHistory();
    closeRepaintOverlay();
  }

  function measureCropDisplayRect() {
    const overlay = ui.imageCropOverlay;
    const stage = overlay?.querySelector(".image-crop-overlay__stage");
    if (!stage || !cropState.naturalWidth || !cropState.naturalHeight) return;
    const stageRect = stage.getBoundingClientRect();
    const imageRatio = cropState.naturalWidth / cropState.naturalHeight;
    const stageRatio = stageRect.width / stageRect.height;
    let width = stageRect.width;
    let height = stageRect.height;
    let left = stageRect.left;
    let top = stageRect.top;
    if (imageRatio > stageRatio) {
      height = width / imageRatio;
      top = stageRect.top + (stageRect.height - height) / 2;
    } else {
      width = height * imageRatio;
      left = stageRect.left + (stageRect.width - width) / 2;
    }
    cropState.displayRect = { left, top, width, height };
  }

  function resetCropRect() {
    if (!cropState.displayRect) return;
    const { width, height } = cropState.displayRect;
    const padding = 24;
    let cropWidth = width - padding * 2;
    let cropHeight = height - padding * 2;
    const ratioOption = RATIO_OPTIONS.find((option) => option.value === cropState.ratio);
    if (ratioOption && ratioOption.ratio) {
      const targetRatio = ratioOption.ratio;
      cropWidth = Math.min(cropWidth, cropHeight * targetRatio);
      cropHeight = cropWidth / targetRatio;
      if (cropHeight > height - padding * 2) {
        cropHeight = height - padding * 2;
        cropWidth = cropHeight * targetRatio;
      }
    }
    cropState.cropRect = {
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight
    };
  }

  function renderCropBox() {
    const overlay = ui.imageCropOverlay;
    const box = overlay?.querySelector(".image-crop-overlay__box");
    const mask = overlay?.querySelector(".image-crop-overlay__mask");
    if (!box || !mask || !cropState.displayRect || !cropState.cropRect) return;
    const { left, top } = cropState.displayRect;
    box.style.left = `${left + cropState.cropRect.x}px`;
    box.style.top = `${top + cropState.cropRect.y}px`;
    box.style.width = `${cropState.cropRect.width}px`;
    box.style.height = `${cropState.cropRect.height}px`;

    mask.style.setProperty("--crop-left", `${cropState.cropRect.x}px`);
    mask.style.setProperty("--crop-top", `${cropState.cropRect.y}px`);
    mask.style.setProperty("--crop-width", `${cropState.cropRect.width}px`);
    mask.style.setProperty("--crop-height", `${cropState.cropRect.height}px`);
  }

  function beginCropDrag(event) {
    if (!cropState.cropRect || !cropState.displayRect) return;
    event.preventDefault();
    cropState.isDragging = true;
    const boxRect = event.currentTarget.getBoundingClientRect();
    cropState.dragOffsetX = event.clientX - boxRect.left;
    cropState.dragOffsetY = event.clientY - boxRect.top;
  }

  function moveCropDrag(event) {
    if (!cropState.isDragging || !cropState.cropRect || !cropState.displayRect) return;
    const x = event.clientX - cropState.displayRect.left - cropState.dragOffsetX;
    const y = event.clientY - cropState.displayRect.top - cropState.dragOffsetY;
    cropState.cropRect.x = Math.max(0, Math.min(x, cropState.displayRect.width - cropState.cropRect.width));
    cropState.cropRect.y = Math.max(0, Math.min(y, cropState.displayRect.height - cropState.cropRect.height));
    renderCropBox();
  }

  function endCropDrag() {
    cropState.isDragging = false;
  }

  function confirmCrop() {
    const node = getNode(cropState.nodeId);
    if (!node || !cropState.cropRect || !cropState.displayRect || !cropState.naturalWidth || !cropState.naturalHeight) {
      closeCropOverlay();
      return;
    }

    const sx = (cropState.cropRect.x / cropState.displayRect.width) * cropState.naturalWidth;
    const sy = (cropState.cropRect.y / cropState.displayRect.height) * cropState.naturalHeight;
    const sw = (cropState.cropRect.width / cropState.displayRect.width) * cropState.naturalWidth;
    const sh = (cropState.cropRect.height / cropState.displayRect.height) * cropState.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const context = canvas.getContext("2d");
    if (!context) {
      closeCropOverlay();
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      node.src = dataUrl;
      if (!node.output) node.output = {};
      node.output.previewUrl = dataUrl;
      node.output.src = dataUrl;
      node.output.summary = `${TOOLBAR_STRINGS.confirmCrop} · ${cropState.ratio}`;
      if (!node.settings) node.settings = {};
      node.settings.crop = {
        ratio: cropState.ratio,
        updatedAt: new Date().toISOString()
      };
      if (typeof renderNode === "function") renderNode(node);
      if (typeof updateEditorPanel === "function") updateEditorPanel();
      if (typeof renderMinimap === "function") renderMinimap();
      if (typeof rememberHistory === "function") rememberHistory();
      closeCropOverlay();
    };
    image.src = cropState.src;
  }

  function getToolbarIcon(kind) {
    const icons = {
      crop: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3v12a3 3 0 0 0 3 3h12"></path>
          <path d="M3 6h12a3 3 0 0 1 3 3v12"></path>
          <path d="M14 3v4"></path>
          <path d="M3 14h4"></path>
        </svg>
      `,
      multiAngle: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z"></path>
          <path d="M12 3v18"></path>
          <path d="M5 7l7 4 7-4"></path>
        </svg>
      `,
      repaint: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14 4l6 6"></path>
          <path d="M4 20c2 .4 4.4-.2 6-1.8L18 10l-4-4-8 8C4.4 15.6 3.8 18 4 20z"></path>
          <path d="M7.5 16.5c.8.2 1.8.2 2.7 0"></path>
        </svg>
      `,
      more: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="12" r="1.5"></circle>
          <circle cx="12" cy="12" r="1.5"></circle>
          <circle cx="18" cy="12" r="1.5"></circle>
        </svg>
      `,
      download: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v11"></path>
          <path d="M7 10l5 5 5-5"></path>
          <path d="M5 20h14"></path>
        </svg>
      `,
      fullscreen: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4H4v4"></path>
          <path d="M16 4h4v4"></path>
          <path d="M20 16v4h-4"></path>
          <path d="M4 16v4h4"></path>
          <path d="M9 9L4 4"></path>
          <path d="M15 9l5-5"></path>
          <path d="M15 15l5 5"></path>
          <path d="M9 15l-5 5"></path>
        </svg>
      `
    };
    return icons[kind] || "";
  }

  function createToolbarButton(icon, title, action, extraClass = "") {
    return `<button type="button" class="canvas-node__image-tool ${extraClass}" data-image-tool="${action}" title="${title}"><span class="canvas-node__image-tool-icon">${icon}</span></button>`;
  }

  function ensureFloatingToolbar() {
    ensureToolbarUi();
    const editorUi = getEditorUi();
    const frame = getCanvasFrameElement();
    if (!editorUi || !frame) return;
    if (!editorUi.imageNodeToolbar) {
      const toolbar = document.createElement("div");
      toolbar.className = "canvas-node__image-toolbar canvas-node__image-toolbar--floating hidden";
      toolbar.innerHTML = [
        createToolbarButton(getToolbarIcon("crop"), TOOLBAR_STRINGS.crop, "crop"),
        createToolbarButton(getToolbarIcon("multiAngle"), TOOLBAR_STRINGS.multiAngle, "multi-angle", "is-disabled"),
        createToolbarButton(getToolbarIcon("repaint"), TOOLBAR_STRINGS.repaint, "repaint"),
        createToolbarButton(getToolbarIcon("more"), TOOLBAR_STRINGS.more, "more"),
        '<span class="canvas-node__image-toolbar-divider"></span>',
        createToolbarButton(getToolbarIcon("download"), TOOLBAR_STRINGS.download, "download"),
        createToolbarButton(getToolbarIcon("fullscreen"), TOOLBAR_STRINGS.fullscreen, "fullscreen")
      ].join("");

      toolbar.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      toolbar.addEventListener("click", (event) => {
        const button = event.target.closest("[data-image-tool]");
        const node = getPrimarySelectedNode();
        if (!button || !node || node.type !== "image") return;
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.imageTool;
        if (action === "crop") {
          openCropOverlay(node);
          return;
        }
        if (action === "multi-angle") {
          return;
        }
        if (action === "repaint") {
          setImageMode(node, "repaint");
          openRepaintOverlay(node);
          return;
        }
        if (action === "more") {
            if (editorUi.imageToolbarMenu && !editorUi.imageToolbarMenu.classList.contains("hidden")) {
              hideImageToolbarMenu();
            } else {
              showImageToolbarMenu(button);
          }
          return;
        }
        if (action === "download") {
          downloadImageNode(node);
          return;
        }
        if (action === "fullscreen") {
          openImageViewer(node);
        }
      });

      editorUi.imageNodeToolbar = toolbar;
      frame.appendChild(toolbar);
    }
  }

  function syncImageToolbar() {
    ensureFloatingToolbar();
    const editorUi = getEditorUi();
    const frame = getCanvasFrameElement();
    const world = getCanvasWorldElement();
    if (!editorUi || !editorUi.imageNodeToolbar || !frame || !world) return;
    const selectedIds = getSelectedNodeArray();
    const node = getPrimarySelectedNode();
    if (!(selectedIds.length === 1 && node && node.type === "image")) {
      editorUi.imageNodeToolbar.classList.add("hidden");
      hideImageToolbarMenu();
      return;
    }

    const element = world.querySelector(`.canvas-node[data-id="${node.id}"]`) ||
      world.querySelector(`.canvas-node[data-node-id="${node.id}"]`);
    if (!element) {
      editorUi.imageNodeToolbar.classList.add("hidden");
      hideImageToolbarMenu();
      return;
    }

    const frameRect = frame.getBoundingClientRect();
    const nodeRect = element.getBoundingClientRect();
    const centerX = nodeRect.left - frameRect.left + nodeRect.width / 2;
    const topY = nodeRect.top - frameRect.top;

    editorUi.imageNodeToolbar.style.left = `${centerX}px`;
    editorUi.imageNodeToolbar.style.top = `${topY}px`;
    editorUi.imageNodeToolbar.classList.remove("hidden");
  }

  const originalRenderNode = typeof renderNode === "function" ? renderNode : noop;
  window.renderNode = function patchedRenderNode(node) {
    originalRenderNode(node);
    syncImageToolbar();
  };
  renderNode = window.renderNode;

  const originalBeginNodeDrag = typeof beginNodeDrag === "function" ? beginNodeDrag : noop;
  window.beginNodeDrag = function patchedBeginNodeDrag(event, node, element) {
    if (event.target.closest(".canvas-node__image-toolbar")) {
      return;
    }
    const result = originalBeginNodeDrag(event, node, element);
    requestAnimationFrame(syncImageToolbar);
    return result;
  };
  beginNodeDrag = window.beginNodeDrag;

  const originalHandleNodeClick = typeof handleNodeClick === "function" ? handleNodeClick : noop;
  window.handleNodeClick = function patchedHandleNodeClick(event, node) {
    if (event.target.closest(".canvas-node__image-toolbar")) {
      return;
    }
    const result = originalHandleNodeClick(event, node);
    requestAnimationFrame(syncImageToolbar);
    return result;
  };
  handleNodeClick = window.handleNodeClick;

  const originalUpdateEditorPanel = typeof updateEditorPanel === "function" ? updateEditorPanel : noop;
  window.updateEditorPanel = function patchedUpdateEditorPanel() {
    originalUpdateEditorPanel();
    syncImageToolbar();
  };
  updateEditorPanel = window.updateEditorPanel;

  window.addEventListener("resize", syncImageToolbar);
  document.addEventListener("pointermove", () => {
    if (state?.draggingNodeIds?.length || state?.isPanning) {
      syncImageToolbar();
    }
  });

  ensureToolbarUi();
  ensureFloatingToolbar();
  syncImageToolbar();
})();
