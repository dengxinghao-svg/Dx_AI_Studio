// Editor module: inspector, workflow panel, text editor, and text fullscreen UI

function updateSession() {
  nodeCount.textContent = String(state.nodes.length);
  connectionCount.textContent = String(state.connections.length);
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }
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
          <small class="node-editor__asset-status">${item.status || DEFAULT_NODE_STATUS}</small>
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

function syncSelectionVisuals() {
  state.nodes.forEach((item) => {
    item.element.classList.toggle("is-selected", state.selectedNodeIds.has(item.id));
  });
  renderSelectionBox();
  renderMinimap();
  updateEditorPanel();
}

function ensureTextNodeSelected(nodeId) {
  if (state.selectedNodeIds.has(nodeId) && state.selectedNodeId === nodeId) return;
  state.activeGroupId = null;
  syncSelection([nodeId]);
  syncSelectionVisuals();
}

function buildTextToolbarMarkup() {
  return TEXT_TOOLBAR_ITEMS.map((item) => `
    <button
      class="canvas-node__text-tool${item.kind === "swatch" ? " canvas-node__text-tool--swatch" : ""}"
      type="button"
      data-slot="${item.slot}"
      title="${item.title}"
      aria-label="${item.title}"
    >
      ${item.kind === "swatch" ? '<span class="canvas-node__text-swatch"></span>' : `<span>${item.label}</span>`}
    </button>
  `).join("");
}

function getTextNodePanelColor(node) {
  return node?.panelColor || "rgba(255, 255, 255, 0.03)";
}

function syncTextToolbarSwatches(node) {
  if (!node) return;
  const color = getTextNodePanelColor(node);
  node.element?.querySelectorAll(".canvas-node__text-swatch").forEach((dot) => {
    dot.style.background = color;
    dot.closest(".canvas-node__text-tool")?.classList.toggle("is-active", !!node.panelColor);
  });
  if (state.fullscreenTextNodeId === node.id) {
    ui.textDocToolbar?.querySelectorAll(".canvas-node__text-swatch").forEach((dot) => {
      dot.style.background = color;
      dot.closest(".canvas-node__text-tool")?.classList.toggle("is-active", !!node.panelColor);
    });
  }
}

function hideColorMenu() {
  state.colorMenuMode = null;
  state.colorMenuTextNodeId = null;
  ui.textColorMenu.classList.add("hidden");
}

function setTextNodePanelColor(node, color) {
  if (!node || node.type !== "text") return;
  rememberHistory();
  node.panelColor = color;
  renderNode(node);
  renderConnections();
  updateEditorPanel();
  syncTextToolbarSwatches(node);
  if (state.fullscreenTextNodeId === node.id) {
    ui.textDocEditor?.closest(".text-doc-overlay__card")?.style.setProperty("--text-panel-accent", getTextNodePanelColor(node));
  }
  setStatus("已更新文本节点背景颜色。");
}

function showTextColorMenu(node, triggerButton) {
  if (!node || !triggerButton) return;
  const buttonRect = triggerButton.getBoundingClientRect();
  const stageRect = document.querySelector(".canvas-stage").getBoundingClientRect();
  const menuWidth = ui.textColorMenu.offsetWidth || 72;
  const left = buttonRect.left - stageRect.left + buttonRect.width / 2 - menuWidth / 2;
  const top = buttonRect.bottom - stageRect.top + 10;
  state.colorMenuMode = "text";
  state.colorMenuTextNodeId = node.id;
  ui.textColorMenu.classList.remove("hidden");
  ui.textColorMenu.style.left = `${Math.max(18, Math.min(stageRect.width - menuWidth - 18, left))}px`;
  ui.textColorMenu.style.top = `${Math.max(18, top)}px`;
}

function escapeHtml(text = "") {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parsePlainTextToRichHtml(text = "") {
  const normalized = (text || "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";
  const lines = normalized.split("\n");
  const blocks = [];
  let paragraphBuffer = [];
  let listType = null;
  let listItems = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    const content = paragraphBuffer.map((line) => escapeHtml(line.trim())).join("<br>");
    blocks.push(`<p>${content}</p>`);
    paragraphBuffer = [];
  }

  function flushList() {
    if (!listType || !listItems.length) return;
    blocks.push(`<${listType}>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${listType}>`);
    listType = null;
    listItems = [];
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }
    if (/^(---+|———+|___+)$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push("<hr>");
      return;
    }
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`);
      return;
    }
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote><p>${escapeHtml(quoteMatch[1])}</p></blockquote>`);
      return;
    }
    const unorderedMatch = line.match(/^[-•*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      listItems.push(unorderedMatch[1]);
      return;
    }
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      listItems.push(orderedMatch[1]);
      return;
    }
    flushList();
    paragraphBuffer.push(rawLine);
  });

  flushParagraph();
  flushList();
  return blocks.join("");
}

function sanitizeRichHtml(input = "") {
  if (!input) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");

  function sanitizeNode(node, inlineContext = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent || "";
      if (!value.trim() && !inlineContext) return "";
      return escapeHtml(value);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const tag = node.tagName.toUpperCase();
    const children = [...node.childNodes].map((child) => sanitizeNode(child, TEXT_ALLOWED_INLINE_TAGS.has(tag))).join("");

    if (TEXT_ALLOWED_INLINE_TAGS.has(tag)) {
      if (tag === "BR") return "<br>";
      const normalizedTag = tag === "B" ? "strong" : tag === "I" ? "em" : tag.toLowerCase();
      return `<${normalizedTag}>${children}</${normalizedTag}>`;
    }

    if (["P", "H1", "H2", "H3", "BLOCKQUOTE", "UL", "OL", "LI"].includes(tag)) {
      const normalizedTag = tag.toLowerCase();
      const inner = children.trim() || (tag === "LI" ? "&nbsp;" : "<br>");
      return `<${normalizedTag}>${inner}</${normalizedTag}>`;
    }

    if (tag === "HR") {
      return "<hr>";
    }

    if (["DIV", "SECTION", "ARTICLE"].includes(tag)) {
      const collapsed = children.trim();
      if (!collapsed) return "";
      const firstChildTag = node.firstElementChild ? node.firstElementChild.tagName.toUpperCase() : "";
      return TEXT_BLOCK_TAGS.has(firstChildTag)
        ? collapsed
        : `<p>${collapsed}</p>`;
    }

    return children;
  }

  const sanitized = [...doc.body.firstElementChild.childNodes]
    .map((child) => sanitizeNode(child))
    .join("")
    .trim();

  return sanitized || parsePlainTextToRichHtml(doc.body.textContent || "");
}

function normalizeTextContent(content = "") {
  if (!content) return "";
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeRichHtml(trimmed);
  }
  return parsePlainTextToRichHtml(trimmed);
}

function normalizeEditorHtml(html = "") {
  const normalized = sanitizeRichHtml(html);
  return normalized.replace(/^(?:<p><br><\/p>|<p>&nbsp;<\/p>)+|(?:<p><br><\/p>|<p>&nbsp;<\/p>)+$/g, "").trim();
}

function setEditableHtml(editor, html) {
  if (!editor) return;
  editor.innerHTML = html || "";
}

function syncTextNodeContent(node, editor, source = "node") {
  if (!node || !editor) return;
  node.content = normalizeEditorHtml(editor.innerHTML);
  if (source !== "node" && node.textEditorElement && node.textEditorElement !== editor && document.activeElement !== node.textEditorElement) {
    setEditableHtml(node.textEditorElement, node.content);
  }
  if (source !== "overlay" && ui.textDocEditor && ui.textDocEditor !== editor && state.fullscreenTextNodeId === node.id && document.activeElement !== ui.textDocEditor) {
    setEditableHtml(ui.textDocEditor, node.content);
  }
}

function getTextSelectionRoot() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const anchorNode = selection.anchorNode;
  return anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode;
}

function focusTextEditor(editor) {
  if (!editor) return;
  editor.focus();
}

function insertRichHtml(html) {
  if (document.queryCommandSupported?.("insertHTML")) {
    document.execCommand("insertHTML", false, html);
    return;
  }
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  range.deleteContents();
  const fragment = range.createContextualFragment(html);
  range.insertNode(fragment);
  range.collapse(false);
}

function applyTextCommand(slot, editor, node, source = "node") {
  if (!editor || !node) return;
  focusTextEditor(editor);
  if (slot === "copy") {
    const clipboardWrite = navigator.clipboard?.writeText(editor.innerText || "");
    if (clipboardWrite?.catch) clipboardWrite.catch(() => {});
    setStatus(`已复制“${node.title}”内容。`);
    return;
  }
  if (slot === "expand") {
    openTextFullscreen(node.id);
    return;
  }
  if (slot === "divider") {
    insertRichHtml("<hr><p><br></p>");
  } else if (slot === "bold") {
    document.execCommand("bold");
  } else if (slot === "italic") {
    document.execCommand("italic");
  } else if (slot === "list") {
    document.execCommand("insertUnorderedList");
  } else if (slot === "ordered") {
    document.execCommand("insertOrderedList");
  } else if (slot === "quote") {
    document.execCommand("formatBlock", false, "blockquote");
  } else if (slot === "h1" || slot === "h2" || slot === "h3") {
    document.execCommand("formatBlock", false, slot);
  }
  syncTextNodeContent(node, editor, source);
}

function bindTextToolbar(toolbar, node, editor, source = "node") {
  toolbar.querySelectorAll(".canvas-node__text-tool").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      ensureTextNodeSelected(node.id);
      if (button.dataset.slot === "color") {
        showTextColorMenu(node, button);
        return;
      }
      applyTextCommand(button.dataset.slot, editor, node, source);
    });
  });
}

function getNodeSettingValue(node, key) {
  return node?.settings?.[key] || getDefaultNodeSettings(node?.type || "")[key] || "";
}

function cycleNodeModel(node) {
  const config = getNodeCapabilityConfig(node.type);
  if (!config?.models?.length) return;
  const currentIndex = Math.max(0, config.models.indexOf(node.model));
  node.model = config.models[(currentIndex + 1) % config.models.length];
  updateSession();
  updateEditorPanel();
}

function cycleNodeSetting(node, key) {
  const config = getNodeCapabilityConfig(node.type);
  const values = config?.settings?.[key];
  if (!values?.length) return;
  const currentValue = getNodeSettingValue(node, key);
  const currentIndex = Math.max(0, values.indexOf(currentValue));
  node.settings[key] = values[(currentIndex + 1) % values.length];
  updateSession();
  updateEditorPanel();
}

function requestNodeReferenceUpload(node) {
  state.pendingNodeUploadTargetId = node.id;
  ui.uploadInput.value = "";
  ui.uploadInput.click();
}

function getNodeEditorPreviewMarkup(node) {
  if (node.type === "audio") {
    return `
      <div class="node-editor__audio-preview">
        <div class="canvas-node__audio-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <strong>${node.output?.summary || (node.referenceAsset ? "已接入参考音频" : "等待生成音频输出")}</strong>
        <small>${node.referenceAsset?.name || node.fileName || "音乐、音效、旁白和语音"}</small>
      </div>
    `;
  }

  const previewSource = node.src || node.output?.previewUrl || previewSvg(node.type, node.title);
  if (node.type === "video" && node.sourceKind === "upload" && node.src) {
    return `<video class="node-editor__preview-media" src="${node.src}" muted loop playsinline preload="metadata"></video>`;
  }

  return `<img class="node-editor__preview-media" src="${previewSource}" alt="${node.title}">`;
}

function getReferenceAssetMarkup(node) {
  if (!node.referenceAsset) {
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }
  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;
  return `
    <article class="node-editor__asset" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <span class="node-editor__asset-name">${asset.name}</span>
      <small class="node-editor__asset-status">参考素材</small>
    </article>
  `;
}

function buildNodeEditorCanvasMarkup(node) {
  return `
    <button class="node-editor__upload" type="button" data-slot="upload-ref">上传参考</button>
    <div class="node-editor__preview-shell ${node.type === "audio" ? "node-editor__preview-shell--audio" : ""}">
      <div class="node-editor__preview-label">${node.title}</div>
      ${getNodeEditorPreviewMarkup(node)}
    </div>
    <div class="node-editor__inputs-list node-editor__inputs-list--references">
      ${getReferenceAssetMarkup(node)}
    </div>
  `;
}

function bindNodeEditorControls(node) {
  ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
    requestNodeReferenceUpload(node);
  });

  ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", () => {
    cycleNodeModel(node);
  });

  ui.editorFooter.querySelectorAll("[data-setting]").forEach((button) => {
    button.addEventListener("click", () => {
      cycleNodeSetting(node, button.dataset.setting);
    });
  });

  ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
    runSelectedNodeWorkflow();
  });

  ui.editorFooter.querySelector('[data-slot="reset-node"]')?.addEventListener("click", () => {
    resetWorkflowState(node.id);
  });
}

function handleTextEditorPaste(event, editor, node, source = "node") {
  event.preventDefault();
  const html = event.clipboardData?.getData("text/html") || "";
  const text = event.clipboardData?.getData("text/plain") || "";
  const richHtml = html ? sanitizeRichHtml(html) : parsePlainTextToRichHtml(text);
  if (!richHtml) return;
  insertRichHtml(richHtml);
  syncTextNodeContent(node, editor, source);
}

function updateEditorPanel() {
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  const node = getNode(state.selectedNodeId);
  const isSelectedTextNode = !!node && node.type === "text" && state.selectedNodeIds.size === 1;

  if ((state.isDraggingNodes && !isSelectedTextNode) || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  if (!node || (node.sourceKind === "upload" && ["image", "video"].includes(node.type))) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = node.type === "text"
    ? Math.min(760, Math.max(560, node.width * state.scale + 170))
    : Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : {
        statusLabel: node.status || DEFAULT_NODE_STATUS,
        runCountLabel: `${node.runCount || 0} 次`,
        lastRunLabel: "-"
      };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.toggle("node-editor--text-mode", node.type === "text");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  renderEditorInputs(node);

  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.innerHTML = "";
  ui.editorCanvas.classList.toggle("hidden", node.type === "text");
  ui.editorInputs.classList.toggle("node-editor__inputs--compact", node.type === "text");
  ui.editorPrompt.placeholder = node.type === "text" ? TEXT_AI_PLACEHOLDER : typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  const buildStatusHeader = () => `
    <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.runCountLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.lastRunLabel}</span>
  `;

  if (node.type === "text") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Gemini 3.1 Pro</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="mic">🎤</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">4</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => runSelectedNodeWorkflow());
    ui.editorFooter.querySelector('[data-slot="reset-node"]')?.addEventListener("click", () => resetWorkflowState(node.id));
    return;
  }

  ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);

  if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="quality">${getNodeSettingValue(node, "quality")}</button>
        <button class="node-editor__meta-chip" data-setting="style">${getNodeSettingValue(node, "style")}</button>
        <button class="node-editor__meta-chip" data-setting="preset">${getNodeSettingValue(node, "preset")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="style" title="切换风格">风</button>
        <button class="node-editor__icon-chip" data-setting="quality" title="切换画质">清</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "quality")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="duration">${getNodeSettingValue(node, "duration")}</button>
        <button class="node-editor__meta-chip" data-setting="motion">${getNodeSettingValue(node, "motion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="mode" title="切换生成模式">模</button>
        <button class="node-editor__icon-chip" data-setting="motion" title="切换运动强度">动</button>
        <button class="node-editor__icon-chip" data-setting="duration" title="切换时长">时</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "duration")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="voice">${getNodeSettingValue(node, "voice")}</button>
        <button class="node-editor__meta-chip" data-setting="speed">${getNodeSettingValue(node, "speed")}</button>
        <button class="node-editor__meta-chip" data-setting="emotion">${getNodeSettingValue(node, "emotion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="voice" title="切换音色">声</button>
        <button class="node-editor__icon-chip" data-setting="emotion" title="切换情绪">情</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "speed")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  }

  bindNodeEditorControls(node);
  ui.editorCanvas.querySelectorAll("video.node-editor__asset-thumb, video.node-editor__preview-media").forEach((media) => {
    media.addEventListener("loadeddata", () => {
      media.currentTime = 0;
    }, { once: true });
  });
}

const __imagePanelFinalBaseUpdate = updateEditorPanel;
updateEditorPanel = function updateEditorPanelFinalImageCleanup() {
  __imagePanelFinalBaseUpdate();

  if (!ui?.editorPanel || ui.editorPanel.classList.contains("hidden")) {
    return;
  }

  const node = getNode(state.selectedNodeId);
  if (!node || node.type !== "image") {
    return;
  }

  const referenceScopes = [
    ...ui.editorPanel.querySelectorAll(".node-editor__reference-block, .node-editor__inputs-list--references")
  ];

  referenceScopes.forEach((scope) => {
    const assets = [...scope.querySelectorAll(".node-editor__asset")];
    const hasAssets = assets.length > 0;
    scope.classList.toggle("has-assets", hasAssets);

    scope.querySelectorAll(".node-editor__inputs-empty").forEach((emptyState) => {
      emptyState.style.display = hasAssets ? "none" : "";
      emptyState.setAttribute("aria-hidden", hasAssets ? "true" : "false");
    });
  });

  const sendButton = ui.editorFooter?.querySelector('[data-slot="submit"]');
  if (sendButton) {
    sendButton.className = "node-editor__send node-editor__send--icon-only";
    sendButton.setAttribute("aria-label", "生成图片");
    sendButton.setAttribute("title", "生成图片");
    sendButton.innerHTML = `
      <span class="node-editor__send-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 18V6"></path>
          <path d="M7 11l5-5 5 5"></path>
        </svg>
      </span>
    `;
  }
};

function getReferenceAssetMarkup(node) {
  if (!node.referenceAsset) {
    const hasLinkedSources = Array.isArray(node.upstream) && node.upstream.some((id) => !!getNode(id));
    if (hasLinkedSources) {
      return "";
    }
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }

  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

  return `
    <article class="node-editor__asset" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <span class="node-editor__asset-name">${asset.name}</span>
      <small class="node-editor__asset-status">参考素材</small>
    </article>
  `;
}

const __baseUpdateEditorPanel = updateEditorPanel;
updateEditorPanel = function updateEditorPanelPatched() {
  __baseUpdateEditorPanel();

  const node = getNode(state.selectedNodeId);
  if (!node || node.type !== "image" || ui.editorPanel.classList.contains("hidden")) {
    return;
  }

  const hasLinkedSources = Array.isArray(node.upstream) && node.upstream.some((id) => !!getNode(id));
  if (hasLinkedSources) {
    ui.editorPanel.querySelectorAll(".node-editor__inputs-empty").forEach((emptyState) => {
      emptyState.style.display = "none";
    });
  }

  const sendButton = ui.editorFooter?.querySelector('.node-editor__send[data-slot="submit"]');
  if (sendButton && !sendButton.classList.contains("node-editor__send--icon-only")) {
    sendButton.className = "node-editor__send node-editor__send--icon-only";
    sendButton.setAttribute("aria-label", "生成图片");
    sendButton.setAttribute("title", "生成图片");
    sendButton.innerHTML = `
      <span class="node-editor__send-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 18V6"></path>
          <path d="M7 11l5-5 5 5"></path>
        </svg>
      </span>
    `;
  }
};

;(() => {
  const IMAGE_MODELS_V2 = [
    {
      value: "nano-banana",
      label: "Nano-banana",
      available: true,
      versions: [
        { value: "nano-banana-v1", label: "V1", available: true },
        { value: "nano-banana-v2", label: "V2", available: true }
      ]
    },
    {
      value: "midjourney",
      label: "Midjourney",
      available: false,
      versions: [{ value: "midjourney-v7", label: "V7", available: false }]
    },
    {
      value: "flux",
      label: "FLUX",
      available: false,
      versions: [
        { value: "flux-pro", label: "Pro", available: false },
        { value: "flux-ultra", label: "Ultra", available: false }
      ]
    },
    {
      value: "gpt-image",
      label: "GPT",
      available: false,
      versions: [{ value: "gpt-image-1", label: "Image-1", available: false }]
    },
    {
      value: "jimeng",
      label: "即梦",
      available: false,
      versions: [{ value: "jimeng-v3", label: "V3", available: false }]
    }
  ];

  const IMAGE_RATIOS_V2 = [
    { value: "1:1", label: "1:1", available: true },
    { value: "4:3", label: "4:3", available: true },
    { value: "3:4", label: "3:4", available: true },
    { value: "16:9", label: "16:9", available: true },
    { value: "9:16", label: "9:16", available: true }
  ];

  let activeImageMentionMenuV2 = null;
  let activeImageMentionCleanupV2 = null;
  let activeImageMentionStateV2 = null;

  function getImageModelV2(value) {
    return IMAGE_MODELS_V2.find((item) => item.value === value) || IMAGE_MODELS_V2[0];
  }

  function ensureImageNodeStateV2(node) {
    if (!node || node.type !== "image") return;
    node.settings = node.settings || {};
    const fallbackModel = IMAGE_MODELS_V2.find((item) => item.available) || IMAGE_MODELS_V2[0];
    if (!node.model || !IMAGE_MODELS_V2.some((item) => item.value === node.model)) {
      node.model = fallbackModel.value;
    }
    const activeModel = getImageModelV2(node.model);
    if (!node.settings.modelVersion || !activeModel.versions.some((item) => item.value === node.settings.modelVersion)) {
      node.settings.modelVersion = activeModel.versions[0]?.value || "";
    }
    if (!node.settings.ratio || !IMAGE_RATIOS_V2.some((item) => item.value === node.settings.ratio)) {
      node.settings.ratio = "4:3";
    }
  }

  function getImageModelLabelV2(value) {
    return getImageModelV2(value)?.label || "选择模型";
  }

  function getImageVersionLabelV2(node) {
    const model = getImageModelV2(node?.model);
    const version = model.versions.find((item) => item.value === node?.settings?.modelVersion) || model.versions[0];
    return version?.label || "选择版本";
  }

  function getImageMentionCandidatesV2(node) {
    if (!node) return [];
    return (node.upstream || [])
      .map((id) => getNode(id))
      .filter(Boolean)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        preview: item.src || item.output?.previewUrl || previewSvg(item.type, item.title)
      }));
  }

  function hideImageMentionMenuV2() {
    activeImageMentionCleanupV2?.();
    activeImageMentionCleanupV2 = null;
    activeImageMentionMenuV2?.remove();
    activeImageMentionMenuV2 = null;
    activeImageMentionStateV2 = null;
  }

  function getMentionContextV2(text, caretIndex) {
    const beforeCaret = text.slice(0, caretIndex);
    const triggerIndex = beforeCaret.lastIndexOf("@");
    if (triggerIndex < 0) return null;
    const between = beforeCaret.slice(triggerIndex + 1);
    if (between.includes("\n")) return null;
    const hasBoundary = triggerIndex === 0 || /\s/.test(beforeCaret[triggerIndex - 1]);
    if (!hasBoundary || /\s/.test(between)) return null;
    return { query: between.toLowerCase(), start: triggerIndex, end: caretIndex };
  }

  function insertImageMentionV2(node, mention) {
    if (!node || !mention || !activeImageMentionStateV2) return;
    const promptInput = ui.editorPrompt;
    const context = activeImageMentionStateV2.context;
    const nextValue = `${promptInput.value.slice(0, context.start)}@${mention.title} ${promptInput.value.slice(context.end)}`;
    promptInput.value = nextValue;
    node.prompt = nextValue;
    const caret = context.start + mention.title.length + 2;
    promptInput.focus();
    promptInput.setSelectionRange(caret, caret);
    hideImageMentionMenuV2();
    updateSession();
  }

  function showImageMentionMenuV2(anchor, items, context) {
    hideImageMentionMenuV2();
    if (!anchor || !items.length) return;
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "node-editor__mention-menu";
    menu.innerHTML = `
      <div class="node-editor__mention-title">已连接节点</div>
      <div class="node-editor__mention-list">
        ${items.map((item, index) => `
          <button class="node-editor__mention-option ${index === 0 ? "is-active" : ""}" type="button" data-index="${index}">
            <span class="node-editor__mention-thumb">${item.preview ? `<img src="${item.preview}" alt="${item.title}">` : `<span>${item.type}</span>`}</span>
            <span class="node-editor__mention-body">
              <strong>${item.title}</strong>
              <small>${item.type === "image" ? "图片素材" : item.type === "video" ? "视频素材" : item.type === "audio" ? "音频素材" : "文本素材"}</small>
            </span>
          </button>
        `).join("")}
      </div>
    `;
    menu.style.left = `${Math.max(16, rect.right - 260)}px`;
    menu.style.top = `${rect.top + 18}px`;
    document.body.appendChild(menu);
    activeImageMentionMenuV2 = menu;
    activeImageMentionStateV2 = { items, index: 0, context };

    menu.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        insertImageMentionV2(getNode(state.selectedNodeId), items[Number(button.dataset.index)]);
      });
    });

    const close = () => hideImageMentionMenuV2();
    const onPointerDown = (event) => {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    activeImageMentionCleanupV2 = () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }

  function refreshImageMentionMenuV2(node) {
    if (!node || node.type !== "image" || state.selectedNodeId !== node.id) {
      hideImageMentionMenuV2();
      return;
    }
    const promptInput = ui.editorPrompt;
    const context = getMentionContextV2(promptInput.value || "", promptInput.selectionStart || 0);
    if (!context) {
      hideImageMentionMenuV2();
      return;
    }
    const candidates = getImageMentionCandidatesV2(node).filter((item) => !context.query || item.title.toLowerCase().includes(context.query));
    if (!candidates.length) {
      hideImageMentionMenuV2();
      return;
    }
    showImageMentionMenuV2(promptInput, candidates, context);
  }

  function bindImageMentionInteractionsV2() {
    if (ui.editorPrompt.dataset.imageMentionBoundV2 === "true") return;
    ui.editorPrompt.dataset.imageMentionBoundV2 = "true";

    ui.editorPrompt.addEventListener("input", () => {
      const node = getNode(state.selectedNodeId);
      if (!node || node.type !== "image") {
        hideImageMentionMenuV2();
        return;
      }
      refreshImageMentionMenuV2(node);
    });

    ui.editorPrompt.addEventListener("click", () => {
      const node = getNode(state.selectedNodeId);
      if (!node || node.type !== "image") {
        hideImageMentionMenuV2();
        return;
      }
      refreshImageMentionMenuV2(node);
    });

    ui.editorPrompt.addEventListener("keydown", (event) => {
      if (!activeImageMentionMenuV2 || !activeImageMentionStateV2) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeImageMentionStateV2.index = (activeImageMentionStateV2.index + 1) % activeImageMentionStateV2.items.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeImageMentionStateV2.index = (activeImageMentionStateV2.index - 1 + activeImageMentionStateV2.items.length) % activeImageMentionStateV2.items.length;
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertImageMentionV2(getNode(state.selectedNodeId), activeImageMentionStateV2.items[activeImageMentionStateV2.index]);
        return;
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideImageMentionMenuV2();
        return;
      } else {
        return;
      }
      activeImageMentionMenuV2.querySelectorAll("[data-index]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.index) === activeImageMentionStateV2.index);
      });
    });

    ui.editorPrompt.addEventListener("blur", () => {
      window.setTimeout(() => hideImageMentionMenuV2(), 120);
    });
  }

  const finalShowNodeOptionMenu = showNodeOptionMenu;
  showNodeOptionMenu = function(anchor, title, options, currentValue, onSelect) {
    if (!options?.length || typeof options[0] === "string") {
      return finalShowNodeOptionMenu(anchor, title, options, currentValue, onSelect);
    }

    hideNodeOptionMenu();
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "node-editor__select-menu";
    menu.innerHTML = `
      <div class="node-editor__select-title">${title}</div>
      <div class="node-editor__select-list">
        ${options.map((option) => `
          <button
            class="node-editor__select-option ${option.value === currentValue ? "is-active" : ""} ${option.available === false ? "is-disabled" : ""}"
            type="button"
            data-value="${option.value}"
            ${option.available === false ? "disabled" : ""}
          >
            <span class="node-editor__select-option-label">${option.label}</span>
            ${option.available === false ? `<small class="node-editor__select-option-meta">未开放</small>` : ""}
          </button>
        `).join("")}
      </div>
    `;

    menu.style.left = `${Math.max(16, rect.left)}px`;
    menu.style.top = `${rect.bottom + 8}px`;
    document.body.appendChild(menu);
    activeNodeOptionMenu = menu;

    const close = () => hideNodeOptionMenu();
    const onPointerDown = (event) => {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      close();
    };

    menu.querySelectorAll("[data-value]").forEach((button) => {
      if (button.disabled) return;
      button.addEventListener("click", () => {
        onSelect(button.dataset.value);
        close();
      });
    });

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", close, { once: true });
    window.addEventListener("scroll", close, { once: true });
    activeNodeOptionMenuCleanup = () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  };

  const finalGetReferenceAssetMarkup = getReferenceAssetMarkup;
  getReferenceAssetMarkup = function(node) {
    if (node?.type !== "image") {
      return finalGetReferenceAssetMarkup(node);
    }
    if (!node.referenceAsset) {
      return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
    }

    const asset = node.referenceAsset;
    const thumb = asset.type === "audio"
      ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
      : asset.type === "video"
        ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
        : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

    return `
      <article class="node-editor__asset node-editor__asset--reference-card" title="${asset.name}">
        <div class="node-editor__asset-preview">${thumb}</div>
        <div class="node-editor__asset-body">
          <span class="node-editor__asset-name">${asset.name}</span>
          <small class="node-editor__asset-status">参考素材</small>
        </div>
      </article>
    `;
  };

  const finalBuildNodeEditorCanvasMarkup = buildNodeEditorCanvasMarkup;
  buildNodeEditorCanvasMarkup = function(node) {
    if (node?.type !== "image") {
      return finalBuildNodeEditorCanvasMarkup(node);
    }
    return `
      <div class="node-editor__canvas node-editor__canvas--image">
        <button class="node-editor__upload node-editor__upload--image" type="button" data-slot="upload-ref">上传参考</button>
        <div class="node-editor__reference-block">
          <div class="node-editor__reference-title">参考素材</div>
          <div class="node-editor__inputs-list node-editor__inputs-list--references node-editor__inputs-list--image">
            ${getReferenceAssetMarkup(node)}
          </div>
        </div>
      </div>
    `;
  };

  const finalBindNodeEditorControls = bindNodeEditorControls;
  bindNodeEditorControls = function(node) {
    bindImageMentionInteractionsV2();
    if (node?.type !== "image") {
      return finalBindNodeEditorControls(node);
    }

    ensureImageNodeStateV2(node);

    ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
      requestNodeReferenceUpload(node);
    });

    ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(event.currentTarget, "选择模型", IMAGE_MODELS_V2, node.model, (value) => {
        const nextModel = getImageModelV2(value);
        if (!nextModel?.available) return;
        node.model = nextModel.value;
        node.settings.modelVersion = nextModel.versions[0]?.value || "";
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="version"]')?.addEventListener("click", (event) => {
      const model = getImageModelV2(node.model);
      showNodeOptionMenu(event.currentTarget, "选择版本", model.versions || [], node.settings.modelVersion, (value) => {
        node.settings.modelVersion = value;
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-setting="ratio"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(event.currentTarget, "选择比例", IMAGE_RATIOS_V2, getNodeSettingValue(node, "ratio"), (value) => {
        node.settings.ratio = value;
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
      runSelectedNodeWorkflow();
    });
  };

  const finalUpdateEditorPanel = updateEditorPanel;
  updateEditorPanel = function() {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      hideImageMentionMenuV2();
      return finalUpdateEditorPanel();
    }

    ensureImageNodeStateV2(node);
    updateWorkflowInspector();
    if (typeof updateWorkflowWorkbench === "function") {
      updateWorkflowWorkbench();
    }

    if (state.isDraggingNodes || state.draggingGroupId) {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideImageMentionMenuV2();
      return;
    }

    if (node.sourceKind === "upload") {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideImageMentionMenuV2();
      return;
    }

    const panelWidth = Math.min(760, Math.max(540, canvasFrame.clientWidth - 80));
    const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
    const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
    const executionMeta = typeof getNodeExecutionMeta === "function"
      ? getNodeExecutionMeta(node)
      : { statusLabel: node.status || DEFAULT_NODE_STATUS };
    const tone = typeof getWorkflowStatusTone === "function"
      ? getWorkflowStatusTone(node.status)
      : (node.status || DEFAULT_NODE_STATUS);

    ui.editorPanel.classList.remove("hidden");
    ui.editorPanel.classList.remove("node-editor--text-mode");
    ui.editorPanel.style.width = `${panelWidth}px`;
    ui.editorPanel.style.left = `${idealLeft}px`;
    ui.editorPanel.style.top = `${idealTop}px`;
    ui.editorPanel.style.bottom = "auto";
    ui.editorPanel.style.transform = "translateX(-50%)";

    renderEditorInputs(node);
    ui.editorToolbar.innerHTML = "";
    ui.editorCanvas.classList.remove("hidden");
    ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);
    ui.editorInputs.classList.remove("node-editor__inputs--compact");
    ui.editorPrompt.placeholder = "输入 @ 调用已接入素材，描述你想生成的图像";
    ui.editorPrompt.value = node.prompt || "";

    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group node-editor__meta-group--image">
        <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="model">${getImageModelLabelV2(node.model)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="version">${getImageVersionLabelV2(node)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__send node-editor__send--label node-editor__send--primary" data-slot="run-node">生成图片</button>
      </div>
    `;

    bindNodeEditorControls(node);
    refreshImageMentionMenuV2(node);
  };
})();

const IMAGE_NODE_MODEL_CATALOG = [
  {
    value: "nano-banana",
    label: "Nano-banana",
    available: true,
    versions: [
      { value: "nano-banana-v1", label: "V1", available: true },
      { value: "nano-banana-v2", label: "V2", available: true }
    ]
  },
  {
    value: "midjourney",
    label: "Midjourney",
    available: false,
    versions: [
      { value: "midjourney-v7", label: "V7", available: false }
    ]
  },
  {
    value: "flux",
    label: "FLUX",
    available: false,
    versions: [
      { value: "flux-pro", label: "Pro", available: false },
      { value: "flux-ultra", label: "Ultra", available: false }
    ]
  },
  {
    value: "gpt-image",
    label: "GPT",
    available: false,
    versions: [
      { value: "gpt-image-1", label: "Image-1", available: false }
    ]
  },
  {
    value: "jimeng",
    label: "即梦",
    available: false,
    versions: [
      { value: "jimeng-v3", label: "V3", available: false }
    ]
  }
];

const IMAGE_NODE_RATIO_OPTIONS = [
  { value: "1:1", label: "1:1", available: true },
  { value: "4:3", label: "4:3", available: true },
  { value: "3:4", label: "3:4", available: true },
  { value: "16:9", label: "16:9", available: true },
  { value: "9:16", label: "9:16", available: true }
];

let activeImageMentionMenu = null;
let activeImageMentionCleanup = null;
let activeImageMentionState = null;

function getImageModelOption(value) {
  return IMAGE_NODE_MODEL_CATALOG.find((option) => option.value === value) || IMAGE_NODE_MODEL_CATALOG[0];
}

function ensureImageNodeOptionState(node) {
  if (!node || node.type !== "image") return;
  node.settings = node.settings || {};
  const fallbackModel = IMAGE_NODE_MODEL_CATALOG.find((option) => option.available) || IMAGE_NODE_MODEL_CATALOG[0];
  const currentModel = getImageModelOption(node.model);
  if (!node.model || !IMAGE_NODE_MODEL_CATALOG.some((option) => option.value === node.model)) {
    node.model = fallbackModel.value;
  } else {
    node.model = currentModel.value;
  }
  const activeModel = getImageModelOption(node.model);
  if (!node.settings.modelVersion || !activeModel.versions.some((version) => version.value === node.settings.modelVersion)) {
    node.settings.modelVersion = activeModel.versions[0]?.value || "";
  }
  if (!node.settings.ratio || !IMAGE_NODE_RATIO_OPTIONS.some((option) => option.value === node.settings.ratio)) {
    node.settings.ratio = "4:3";
  }
}

function getImageModelLabel(value) {
  return getImageModelOption(value)?.label || value || "选择模型";
}

function getImageModelVersionLabel(node) {
  const model = getImageModelOption(node?.model);
  const version = model?.versions?.find((item) => item.value === node?.settings?.modelVersion) || model?.versions?.[0];
  return version?.label || "选择版本";
}

function getImageMentionCandidates(node) {
  if (!node) return [];
  return (node.upstream || [])
    .map((id) => getNode(id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      preview: item.src || item.output?.previewUrl || previewSvg(item.type, item.title)
    }));
}

function hideImageMentionMenu() {
  activeImageMentionCleanup?.();
  activeImageMentionCleanup = null;
  activeImageMentionMenu?.remove();
  activeImageMentionMenu = null;
  activeImageMentionState = null;
}

function getPromptMentionContext(text, caretIndex) {
  const beforeCaret = text.slice(0, caretIndex);
  const triggerIndex = beforeCaret.lastIndexOf("@");
  if (triggerIndex < 0) return null;
  const between = beforeCaret.slice(triggerIndex + 1);
  if (between.includes("\n")) return null;
  const hasBoundary = triggerIndex === 0 || /\s/.test(beforeCaret[triggerIndex - 1]);
  if (!hasBoundary) return null;
  if (/\s/.test(between)) return null;
  return {
    query: between.toLowerCase(),
    start: triggerIndex,
    end: caretIndex
  };
}

function insertPromptMention(node, mention) {
  if (!node || !mention || !activeImageMentionState) return;
  const promptInput = ui.editorPrompt;
  const { context } = activeImageMentionState;
  const nextValue = `${promptInput.value.slice(0, context.start)}@${mention.title} ${promptInput.value.slice(context.end)}`;
  promptInput.value = nextValue;
  node.prompt = nextValue;
  const caret = context.start + mention.title.length + 2;
  promptInput.focus();
  promptInput.setSelectionRange(caret, caret);
  hideImageMentionMenu();
  updateSession();
}

function showImageMentionMenu(anchor, items, context) {
  hideImageMentionMenu();
  if (!anchor || !items.length) return;
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "node-editor__mention-menu";
  menu.innerHTML = `
    <div class="node-editor__mention-title">已连接节点</div>
    <div class="node-editor__mention-list">
      ${items.map((item, index) => `
        <button class="node-editor__mention-option ${index === 0 ? "is-active" : ""}" type="button" data-index="${index}">
          <span class="node-editor__mention-thumb">${item.preview ? `<img src="${item.preview}" alt="${item.title}">` : `<span>${item.type}</span>`}</span>
          <span class="node-editor__mention-body">
            <strong>${item.title}</strong>
            <small>${item.type === "image" ? "图片素材" : item.type === "video" ? "视频素材" : item.type === "audio" ? "音频素材" : "文本素材"}</small>
          </span>
        </button>
      `).join("")}
    </div>
  `;
  menu.style.left = `${Math.max(16, rect.right - 260)}px`;
  menu.style.top = `${rect.top + 18}px`;
  document.body.appendChild(menu);
  activeImageMentionMenu = menu;
  activeImageMentionState = { items, index: 0, context };

  const applyHighlight = () => {
    menu.querySelectorAll("[data-index]").forEach((button) => {
      button.classList.toggle("is-active", Number(button.dataset.index) === activeImageMentionState.index);
    });
  };

  menu.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    button.addEventListener("click", () => {
      insertPromptMention(getNode(state.selectedNodeId), items[Number(button.dataset.index)]);
    });
  });

  const close = () => hideImageMentionMenu();
  const onPointerDown = (event) => {
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    close();
  };
  window.addEventListener("pointerdown", onPointerDown, true);
  activeImageMentionCleanup = () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
  };
}

function refreshImageMentionMenu(node) {
  if (!node || node.type !== "image" || state.selectedNodeId !== node.id) {
    hideImageMentionMenu();
    return;
  }
  const promptInput = ui.editorPrompt;
  const context = getPromptMentionContext(promptInput.value || "", promptInput.selectionStart || 0);
  if (!context) {
    hideImageMentionMenu();
    return;
  }
  const candidates = getImageMentionCandidates(node).filter((item) => !context.query || item.title.toLowerCase().includes(context.query));
  if (!candidates.length) {
    hideImageMentionMenu();
    return;
  }
  showImageMentionMenu(promptInput, candidates, context);
}

function bindImagePromptMentionInteractions() {
  if (ui.editorPrompt.dataset.imageMentionBound === "true") return;
  ui.editorPrompt.dataset.imageMentionBound = "true";

  ui.editorPrompt.addEventListener("input", () => {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      hideImageMentionMenu();
      return;
    }
    refreshImageMentionMenu(node);
  });

  ui.editorPrompt.addEventListener("click", () => {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      hideImageMentionMenu();
      return;
    }
    refreshImageMentionMenu(node);
  });

  ui.editorPrompt.addEventListener("keydown", (event) => {
    if (!activeImageMentionMenu || !activeImageMentionState) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeImageMentionState.index = (activeImageMentionState.index + 1) % activeImageMentionState.items.length;
      activeImageMentionMenu.querySelectorAll("[data-index]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.index) === activeImageMentionState.index);
      });
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeImageMentionState.index = (activeImageMentionState.index - 1 + activeImageMentionState.items.length) % activeImageMentionState.items.length;
      activeImageMentionMenu.querySelectorAll("[data-index]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.index) === activeImageMentionState.index);
      });
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertPromptMention(getNode(state.selectedNodeId), activeImageMentionState.items[activeImageMentionState.index]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      hideImageMentionMenu();
    }
  });

  ui.editorPrompt.addEventListener("blur", () => {
    window.setTimeout(() => hideImageMentionMenu(), 120);
  });
}

const __legacyShowNodeOptionMenu = showNodeOptionMenu;
showNodeOptionMenu = function(anchor, title, options, currentValue, onSelect) {
  if (!options?.length || typeof options[0] === "string") {
    return __legacyShowNodeOptionMenu(anchor, title, options, currentValue, onSelect);
  }

  hideNodeOptionMenu();
  if (!anchor) return;

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "node-editor__select-menu";
  menu.innerHTML = `
    <div class="node-editor__select-title">${title}</div>
    <div class="node-editor__select-list">
      ${options.map((option) => `
        <button
          class="node-editor__select-option ${option.value === currentValue ? "is-active" : ""} ${option.available === false ? "is-disabled" : ""}"
          type="button"
          data-value="${option.value}"
          ${option.available === false ? "disabled" : ""}
        >
          <span class="node-editor__select-option-label">${option.label}</span>
          ${option.available === false ? `<small class="node-editor__select-option-meta">未开放</small>` : ""}
        </button>
      `).join("")}
    </div>
  `;

  menu.style.left = `${Math.max(16, rect.left)}px`;
  menu.style.top = `${rect.bottom + 8}px`;
  document.body.appendChild(menu);
  activeNodeOptionMenu = menu;

  const close = () => hideNodeOptionMenu();
  const onPointerDown = (event) => {
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    close();
  };

  menu.querySelectorAll("[data-value]").forEach((button) => {
    if (button.disabled) return;
    button.addEventListener("click", () => {
      onSelect(button.dataset.value);
      close();
    });
  });

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", close, { once: true });
  window.addEventListener("scroll", close, { once: true });
  activeNodeOptionMenuCleanup = () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
  };
};

const __legacyGetReferenceAssetMarkupV2 = getReferenceAssetMarkup;
getReferenceAssetMarkup = function(node) {
  if (node?.type !== "image") {
    return __legacyGetReferenceAssetMarkupV2(node);
  }
  if (!node.referenceAsset) {
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }

  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

  return `
    <article class="node-editor__asset node-editor__asset--reference-card" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <div class="node-editor__asset-body">
        <span class="node-editor__asset-name">${asset.name}</span>
        <small class="node-editor__asset-status">参考素材</small>
      </div>
    </article>
  `;
};

const __legacyBuildNodeEditorCanvasMarkupV2 = buildNodeEditorCanvasMarkup;
buildNodeEditorCanvasMarkup = function(node) {
  if (node?.type !== "image") {
    return __legacyBuildNodeEditorCanvasMarkupV2(node);
  }

  return `
    <div class="node-editor__canvas node-editor__canvas--image">
      <button class="node-editor__upload node-editor__upload--image" type="button" data-slot="upload-ref">上传参考</button>
      <div class="node-editor__reference-block">
        <div class="node-editor__reference-title">参考素材</div>
        <div class="node-editor__inputs-list node-editor__inputs-list--references node-editor__inputs-list--image">
          ${getReferenceAssetMarkup(node)}
        </div>
      </div>
    </div>
  `;
};

const __legacyBindNodeEditorControlsV2 = bindNodeEditorControls;
bindNodeEditorControls = function(node) {
  bindImagePromptMentionInteractions();
  if (node?.type !== "image") {
    return __legacyBindNodeEditorControlsV2(node);
  }

  ensureImageNodeOptionState(node);

  ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
    requestNodeReferenceUpload(node);
  });

  ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
    showNodeOptionMenu(event.currentTarget, "选择模型", IMAGE_NODE_MODEL_CATALOG, node.model, (value) => {
      const nextModel = getImageModelOption(value);
      if (!nextModel?.available) return;
      node.model = nextModel.value;
      node.settings.modelVersion = nextModel.versions[0]?.value || "";
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelector('[data-slot="version"]')?.addEventListener("click", (event) => {
    const model = getImageModelOption(node.model);
    showNodeOptionMenu(event.currentTarget, "选择版本", model.versions || [], node.settings.modelVersion, (value) => {
      node.settings.modelVersion = value;
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelector('[data-setting="ratio"]')?.addEventListener("click", (event) => {
    showNodeOptionMenu(event.currentTarget, "选择比例", IMAGE_NODE_RATIO_OPTIONS, getNodeSettingValue(node, "ratio"), (value) => {
      node.settings.ratio = value;
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
    runSelectedNodeWorkflow();
  });
};

const __legacyUpdateEditorPanelV2 = updateEditorPanel;
updateEditorPanel = function() {
  const node = getNode(state.selectedNodeId);
  if (!node || node.type !== "image") {
    hideImageMentionMenu();
    return __legacyUpdateEditorPanelV2();
  }

  ensureImageNodeOptionState(node);
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  if (state.isDraggingNodes || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    hideNodeOptionMenu();
    hideImageMentionMenu();
    return;
  }

  if (node.sourceKind === "upload") {
    ui.editorPanel.classList.add("hidden");
    hideNodeOptionMenu();
    hideImageMentionMenu();
    return;
  }

  const panelWidth = Math.min(760, Math.max(540, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : { statusLabel: node.status || DEFAULT_NODE_STATUS };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.remove("node-editor--text-mode");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";

  renderEditorInputs(node);
  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.classList.remove("hidden");
  ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);
  ui.editorInputs.classList.remove("node-editor__inputs--compact");
  ui.editorPrompt.placeholder = "输入 @ 调用已接入素材，描述你想生成的图像";
  ui.editorPrompt.value = node.prompt || "";

  ui.editorFooter.innerHTML = `
    <div class="node-editor__meta-group node-editor__meta-group--image">
      <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
      <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="model">${getImageModelLabel(node.model)}</button>
      <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="version">${getImageModelVersionLabel(node)}</button>
      <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
    </div>
    <div class="node-editor__meta-group node-editor__meta-group--right">
      <button class="node-editor__send node-editor__send--label node-editor__send--primary" data-slot="run-node">生成图片</button>
    </div>
  `;

  bindNodeEditorControls(node);
  refreshImageMentionMenu(node);
};

const __previousGetReferenceAssetMarkup = getReferenceAssetMarkup;
getReferenceAssetMarkup = function(node) {
  if (node.type !== "image") {
    return __previousGetReferenceAssetMarkup(node);
  }

  if (!node.referenceAsset) {
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }

  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

  return `
    <article class="node-editor__asset node-editor__asset--reference-card" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <div class="node-editor__asset-body">
        <span class="node-editor__asset-name">${asset.name}</span>
        <small class="node-editor__asset-status">参考素材</small>
      </div>
    </article>
  `;
};

const __previousBuildNodeEditorCanvasMarkup = buildNodeEditorCanvasMarkup;
buildNodeEditorCanvasMarkup = function(node) {
  if (node.type !== "image") {
    return __previousBuildNodeEditorCanvasMarkup(node);
  }

  return `
    <div class="node-editor__canvas node-editor__canvas--image">
      <button class="node-editor__upload node-editor__upload--image" type="button" data-slot="upload-ref">上传参考</button>
      <div class="node-editor__inputs-list node-editor__inputs-list--references node-editor__inputs-list--image">
        ${getReferenceAssetMarkup(node)}
      </div>
    </div>
  `;
};

const __previousBindNodeEditorControls = bindNodeEditorControls;
bindNodeEditorControls = function(node) {
  if (node.type !== "image") {
    __previousBindNodeEditorControls(node);
    return;
  }

  ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
    requestNodeReferenceUpload(node);
  });

  const config = getNodeCapabilityConfig(node.type);
  ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
    showNodeOptionMenu(event.currentTarget, "选择模型", config?.models || [], node.model, (value) => {
      node.model = value;
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelector('[data-setting="ratio"]')?.addEventListener("click", (event) => {
    const options = config?.settings?.ratio || [];
    showNodeOptionMenu(event.currentTarget, "选择比例", options, getNodeSettingValue(node, "ratio"), (value) => {
      node.settings.ratio = value;
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
    runSelectedNodeWorkflow();
  });
};

const __previousUpdateEditorPanel = updateEditorPanel;
updateEditorPanel = function() {
  const node = getNode(state.selectedNodeId);
  if (!node || node.type !== "image") {
    __previousUpdateEditorPanel();
    return;
  }

  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  if (state.isDraggingNodes || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : {
        statusLabel: node.status || DEFAULT_NODE_STATUS,
        runCountLabel: `${node.runCount || 0} 次`,
        lastRunLabel: "-"
      };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.remove("node-editor--text-mode");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";

  renderEditorInputs(node);
  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.classList.remove("hidden");
  ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);
  ui.editorInputs.classList.remove("node-editor__inputs--compact");
  ui.editorPrompt.placeholder = typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  ui.editorFooter.innerHTML = `
    <div class="node-editor__meta-group node-editor__meta-group--image">
      <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
      <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="model">${node.model}</button>
      <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
    </div>
    <div class="node-editor__meta-group node-editor__meta-group--right">
      <button class="node-editor__send node-editor__send--primary" data-slot="run-node">生成</button>
    </div>
  `;

  bindNodeEditorControls(node);
  ui.editorCanvas.querySelectorAll("video.node-editor__asset-thumb").forEach((media) => {
    media.addEventListener("loadeddata", () => {
      media.currentTime = 0;
    }, { once: true });
  });
};

function bindTextEditor(editor, node, source = "node") {
  editor.addEventListener("focus", () => {
    ensureTextNodeSelected(node.id);
    state.pendingTextSnapshot = serializeCanvasState();
  });
  editor.addEventListener("input", () => {
    syncTextNodeContent(node, editor, source);
  });
  editor.addEventListener("paste", (event) => {
    handleTextEditorPaste(event, editor, node, source);
  });
  editor.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    ensureTextNodeSelected(node.id);
  });
  editor.addEventListener("blur", () => {
    syncTextNodeContent(node, editor, source);
    const snapshotContent = state.pendingTextSnapshot?.nodes?.find((item) => item.id === node.id)?.content ?? "";
    if (state.pendingTextSnapshot && node.content !== snapshotContent) {
      pushHistory(state.pendingTextSnapshot);
    }
    state.pendingTextSnapshot = null;
  });
}

function renderTextFullscreenAssets(node) {
  if (!ui.textDocAssets) return;
  const upstreamNodes = (node.upstream || []).map((id) => getNode(id)).filter(Boolean);
  if (!upstreamNodes.length) {
    ui.textDocAssets.textContent = "暂无接入素材";
    return;
  }
  ui.textDocAssets.innerHTML = upstreamNodes.map((item) => `
    <article class="text-doc-overlay__asset" title="${item.title}">
      <div class="text-doc-overlay__asset-preview">${getAssetPreviewMarkup(item)}</div>
      <span>${item.title}</span>
    </article>
  `).join("");
}

function openTextFullscreen(nodeId) {
  const node = getNode(nodeId);
  if (!node || node.type !== "text") return;
  state.fullscreenTextNodeId = node.id;
  ui.textDocOverlay.classList.remove("hidden");
  ui.textDocEditor?.closest(".text-doc-overlay__card")?.style.setProperty("--text-panel-accent", getTextNodePanelColor(node));
  ui.textDocTitle.textContent = node.title;
  ui.textDocMetaTitle.textContent = node.title;
  ui.textDocMetaModel.textContent = "Gemini 3.1 Pro";
  ui.textDocMetaStatus.textContent = node.status || "idle";
  ui.textDocToolbar.innerHTML = buildTextToolbarMarkup();
  setEditableHtml(ui.textDocEditor, normalizeTextContent(node.content || ""));
  const plainText = ui.textDocEditor.innerText.trim();
  ui.textDocSummary.textContent = plainText
    ? `${plainText.slice(0, 88)}${plainText.length > 88 ? "..." : ""}`
    : "文档内容会在这里自动生成摘要预览。";
  bindTextToolbar(ui.textDocToolbar, node, ui.textDocEditor, "overlay");
  syncTextToolbarSwatches(node);
  renderTextFullscreenAssets(node);
  requestAnimationFrame(() => {
    focusTextEditor(ui.textDocEditor);
  });
}

function closeTextFullscreen(save = true) {
  const node = getNode(state.fullscreenTextNodeId);
  if (save && node && ui.textDocEditor) {
    syncTextNodeContent(node, ui.textDocEditor, "overlay");
    renderNode(node);
    renderConnections();
    updateEditorPanel();
  }
  state.fullscreenTextNodeId = null;
  ui.textDocOverlay.classList.add("hidden");
  ui.textDocEditor?.closest(".text-doc-overlay__card")?.style.removeProperty("--text-panel-accent");
}

function startTextNodeResize(event, node) {
  event.preventDefault();
  event.stopPropagation();
  ensureTextNodeSelected(node.id);
  state.isResizingNode = true;
  state.resizingNodeId = node.id;
  state.resizeStartMouseX = event.clientX;
  state.resizeStartMouseY = event.clientY;
  state.resizeStartWidth = node.width;
  state.resizeStartHeight = node.height;
  state.resizeSnapshot = serializeCanvasState();
  state.resizeMoved = false;
}

function updateEditorPanel() {
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  const node = getNode(state.selectedNodeId);
  const isSelectedTextNode = !!node && node.type === "text" && state.selectedNodeIds.size === 1;

  if ((state.isDraggingNodes && !isSelectedTextNode) || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  if (!node || (node.sourceKind === "upload" && ["image", "video"].includes(node.type))) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = node.type === "text"
    ? Math.min(760, Math.max(560, node.width * state.scale + 170))
    : Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : {
        statusLabel: node.status || DEFAULT_NODE_STATUS,
        runCountLabel: `${node.runCount || 0} ?`,
        lastRunLabel: "-"
      };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.toggle("node-editor--text-mode", node.type === "text");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  renderEditorInputs(node);

  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.innerHTML = "";
  ui.editorCanvas.classList.toggle("hidden", node.type === "text");
  ui.editorInputs.classList.toggle("node-editor__inputs--compact", node.type === "text");
  ui.editorPrompt.placeholder = node.type === "text" ? TEXT_AI_PLACEHOLDER : typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  const buildStatusHeader = () => `
    <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.runCountLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.lastRunLabel}</span>
  `;

  if (node.type === "text") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Gemini 3.1 Pro</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="mic">🎤</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">4</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Banana Pro</button>
        <button class="node-editor__meta-chip" data-slot="ratio">16:9 · 4K</button>
        <button class="node-editor__meta-chip" data-slot="style">风格</button>
        <button class="node-editor__meta-chip" data-slot="preset">Sony Veni...</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">🎤</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">30</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Kling 3.0 Omni</button>
        <button class="node-editor__meta-chip" data-slot="video-options">首尾帧 · 16:9 · 自适应 · 3s</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="mute">静</button>
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">🎤</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">15秒</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">ElevenLabs V3</button>
        <button class="node-editor__meta-chip" data-slot="tts-mode">文字转语音</button>
        <button class="node-editor__meta-chip" data-slot="loading">加载中</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="tune">调</button>
        <button class="node-editor__icon-chip" data-slot="mic">🎤</button>
        <button class="node-editor__quota" data-slot="quota">5 / 秒</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  }

  ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener('click', () => {
    runSelectedNodeWorkflow();
  });
  ui.editorFooter.querySelector('[data-slot="reset-node"]')?.addEventListener('click', () => {
    resetWorkflowState(node.id);
  });
}

let activeNodeOptionMenu = null;
let activeNodeOptionMenuCleanup = null;

function hideNodeOptionMenu() {
  activeNodeOptionMenuCleanup?.();
  activeNodeOptionMenuCleanup = null;
  activeNodeOptionMenu?.remove();
  activeNodeOptionMenu = null;
}

function showNodeOptionMenu(anchor, title, options, currentValue, onSelect) {
  hideNodeOptionMenu();
  if (!anchor || !options?.length) return;

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "node-editor__select-menu";
  menu.innerHTML = `
    <div class="node-editor__select-title">${title}</div>
    <div class="node-editor__select-list">
      ${options.map((option) => `
        <button class="node-editor__select-option ${option === currentValue ? "is-active" : ""}" type="button" data-value="${option}">
          <span>${option}</span>
        </button>
      `).join("")}
    </div>
  `;

  menu.style.left = `${Math.max(16, rect.left)}px`;
  menu.style.top = `${rect.bottom + 8}px`;
  document.body.appendChild(menu);
  activeNodeOptionMenu = menu;

  const close = () => hideNodeOptionMenu();
  const onPointerDown = (event) => {
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    close();
  };

  menu.querySelectorAll("[data-value]").forEach((button) => {
    button.addEventListener("click", () => {
      onSelect(button.dataset.value);
      close();
    });
  });

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", close, { once: true });
  window.addEventListener("scroll", close, { once: true });
  activeNodeOptionMenuCleanup = () => {
    window.removeEventListener("pointerdown", onPointerDown, true);
  };
}

function getReferenceAssetMarkup(node) {
  if (!node.referenceAsset) {
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }

  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

  return `
    <article class="node-editor__asset node-editor__asset--reference" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <div class="node-editor__asset-body">
        <span class="node-editor__asset-name">${asset.name}</span>
        <small class="node-editor__asset-status">参考素材</small>
      </div>
    </article>
  `;
}

function buildNodeEditorCanvasMarkup(node) {
  if (node.type === "image") {
    return `
      <div class="node-editor__reference-bar">
        <button class="node-editor__upload" type="button" data-slot="upload-ref">上传参考</button>
        <div class="node-editor__inputs-list node-editor__inputs-list--references">
          ${getReferenceAssetMarkup(node)}
        </div>
      </div>
    `;
  }

  if (node.type === "audio") {
    return `
      <button class="node-editor__upload" type="button" data-slot="upload-ref">上传参考</button>
      <div class="node-editor__preview-shell node-editor__preview-shell--audio">
        <div class="node-editor__preview-label">${node.title}</div>
        ${getNodeEditorPreviewMarkup(node)}
      </div>
      <div class="node-editor__inputs-list node-editor__inputs-list--references">
        ${getReferenceAssetMarkup(node)}
      </div>
    `;
  }

  return `
    <button class="node-editor__upload" type="button" data-slot="upload-ref">上传参考</button>
    <div class="node-editor__preview-shell">
      <div class="node-editor__preview-label">${node.title}</div>
      ${getNodeEditorPreviewMarkup(node)}
    </div>
    <div class="node-editor__inputs-list node-editor__inputs-list--references">
      ${getReferenceAssetMarkup(node)}
    </div>
  `;
}

function bindNodeEditorControls(node) {
  ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
    requestNodeReferenceUpload(node);
  });

  const config = getNodeCapabilityConfig(node.type);

  ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
    const options = config?.models || [];
    showNodeOptionMenu(event.currentTarget, "选择模型", options, node.model, (value) => {
      node.model = value;
      updateSession();
      updateEditorPanel();
    });
  });

  ui.editorFooter.querySelectorAll("[data-setting]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const key = button.dataset.setting;
      const options = config?.settings?.[key] || [];
      showNodeOptionMenu(event.currentTarget, "选择参数", options, getNodeSettingValue(node, key), (value) => {
        node.settings[key] = value;
        updateSession();
        updateEditorPanel();
      });
    });
  });

  ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
    runSelectedNodeWorkflow();
  });
}

function updateEditorPanel() {
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  const node = getNode(state.selectedNodeId);
  const isSelectedTextNode = !!node && node.type === "text" && state.selectedNodeIds.size === 1;

  if ((state.isDraggingNodes && !isSelectedTextNode) || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    hideNodeOptionMenu();
    return;
  }

  if (!node || (node.sourceKind === "upload" && ["image", "video"].includes(node.type))) {
    ui.editorPanel.classList.add("hidden");
    hideNodeOptionMenu();
    return;
  }

  const panelWidth = node.type === "text"
    ? Math.min(760, Math.max(560, node.width * state.scale + 170))
    : Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : {
        statusLabel: node.status || DEFAULT_NODE_STATUS,
        runCountLabel: `${node.runCount || 0} 次`,
        lastRunLabel: "-"
      };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.toggle("node-editor--text-mode", node.type === "text");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  renderEditorInputs(node);

  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.innerHTML = "";
  ui.editorCanvas.classList.toggle("hidden", node.type === "text");
  ui.editorInputs.classList.toggle("node-editor__inputs--compact", node.type === "text");
  ui.editorPrompt.placeholder = node.type === "text" ? TEXT_AI_PLACEHOLDER : typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  const buildStatusHeader = () => `
    <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
  `;

  if (node.type === "text") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Gemini 3.1 Pro</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="mic">⌁</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">4</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => runSelectedNodeWorkflow());
    return;
  }

  ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);

  if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group node-editor__meta-group--image">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="quality">${getNodeSettingValue(node, "quality")}</button>
        <button class="node-editor__meta-chip" data-setting="style">${getNodeSettingValue(node, "style")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__send node-editor__send--label" data-slot="run-node">生成图片</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="duration">${getNodeSettingValue(node, "duration")}</button>
        <button class="node-editor__meta-chip" data-setting="motion">${getNodeSettingValue(node, "motion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="voice">${getNodeSettingValue(node, "voice")}</button>
        <button class="node-editor__meta-chip" data-setting="speed">${getNodeSettingValue(node, "speed")}</button>
        <button class="node-editor__meta-chip" data-setting="emotion">${getNodeSettingValue(node, "emotion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
      </div>
    `;
  }

  bindNodeEditorControls(node);
  ui.editorCanvas.querySelectorAll("video.node-editor__asset-thumb, video.node-editor__preview-media").forEach((media) => {
    media.addEventListener("loadeddata", () => {
      media.currentTime = 0;
    }, { once: true });
  });
}

function applyTextCommand(slot, editor, node, source = "node") {
  if (!editor || !node) return;
  focusTextEditor(editor);
  if (slot === "copy") {
    const clipboardWrite = navigator.clipboard?.writeText(editor.innerText || "");
    if (clipboardWrite?.catch) clipboardWrite.catch(() => {});
    setStatus(`已复制“${node.title}”内容。`);
    return;
  }
  if (slot === "expand") {
    openTextFullscreen(node.id);
    return;
  }
  if (slot === "divider") {
    insertRichHtml("<hr><p><br></p>");
  } else if (slot === "bold") {
    document.execCommand("bold");
  } else if (slot === "italic") {
    document.execCommand("italic");
  } else if (slot === "list") {
    document.execCommand("insertUnorderedList");
  } else if (slot === "ordered") {
    document.execCommand("insertOrderedList");
  } else if (slot === "quote") {
    document.execCommand("formatBlock", false, "blockquote");
  } else if (slot === "h1" || slot === "h2" || slot === "h3") {
    document.execCommand("formatBlock", false, slot);
  }
  syncTextNodeContent(node, editor, source);
}

function getNodeEditorPreviewMarkup(node) {
  if (node.type === "audio") {
    return `
      <div class="node-editor__audio-preview">
        <div class="canvas-node__audio-wave">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
        <strong>${node.output?.summary || (node.referenceAsset ? "已接入参考音频" : "等待生成音频输出")}</strong>
        <small>${node.referenceAsset?.name || node.fileName || "音乐、音效、旁白和语音"}</small>
      </div>
    `;
  }

  const previewSource = node.src || node.output?.previewUrl || previewSvg(node.type, node.title);
  if (node.type === "video" && node.sourceKind === "upload" && node.src) {
    return `<video class="node-editor__preview-media" src="${node.src}" muted loop playsinline preload="metadata"></video>`;
  }

  return `<img class="node-editor__preview-media" src="${previewSource}" alt="${node.title}">`;
}

function getReferenceAssetMarkup(node) {
  if (!node.referenceAsset) {
    return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
  }

  const asset = node.referenceAsset;
  const thumb = asset.type === "audio"
    ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
    : asset.type === "video"
      ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata"></video>`
      : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}">`;

  return `
    <article class="node-editor__asset" title="${asset.name}">
      <div class="node-editor__asset-preview">${thumb}</div>
      <span class="node-editor__asset-name">${asset.name}</span>
      <small class="node-editor__asset-status">参考素材</small>
    </article>
  `;
}

function buildNodeEditorCanvasMarkup(node) {
  return `
    <button class="node-editor__upload" type="button" data-slot="upload-ref">上传参考</button>
    <div class="node-editor__preview-shell ${node.type === "audio" ? "node-editor__preview-shell--audio" : ""}">
      <div class="node-editor__preview-label">${node.title}</div>
      ${getNodeEditorPreviewMarkup(node)}
    </div>
    <div class="node-editor__inputs-list node-editor__inputs-list--references">
      ${getReferenceAssetMarkup(node)}
    </div>
  `;
}

function updateEditorPanel() {
  updateWorkflowInspector();
  if (typeof updateWorkflowWorkbench === "function") {
    updateWorkflowWorkbench();
  }

  const node = getNode(state.selectedNodeId);
  const isSelectedTextNode = !!node && node.type === "text" && state.selectedNodeIds.size === 1;

  if ((state.isDraggingNodes && !isSelectedTextNode) || state.draggingGroupId) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  if (!node || (node.sourceKind === "upload" && ["image", "video"].includes(node.type))) {
    ui.editorPanel.classList.add("hidden");
    return;
  }

  const panelWidth = node.type === "text"
    ? Math.min(760, Math.max(560, node.width * state.scale + 170))
    : Math.min(760, Math.max(520, canvasFrame.clientWidth - 80));
  const idealLeft = node.x * state.scale + state.offsetX + (node.width * state.scale) / 2;
  const idealTop = node.y * state.scale + state.offsetY + node.height * state.scale + 18;
  const executionMeta = typeof getNodeExecutionMeta === "function"
    ? getNodeExecutionMeta(node)
    : {
        statusLabel: node.status || DEFAULT_NODE_STATUS,
        runCountLabel: `${node.runCount || 0} 次`,
        lastRunLabel: "-"
      };
  const tone = typeof getWorkflowStatusTone === "function"
    ? getWorkflowStatusTone(node.status)
    : (node.status || DEFAULT_NODE_STATUS);

  ui.editorPanel.classList.remove("hidden");
  ui.editorPanel.classList.toggle("node-editor--text-mode", node.type === "text");
  ui.editorPanel.style.width = `${panelWidth}px`;
  ui.editorPanel.style.left = `${idealLeft}px`;
  ui.editorPanel.style.top = `${idealTop}px`;
  ui.editorPanel.style.bottom = "auto";
  ui.editorPanel.style.transform = "translateX(-50%)";
  renderEditorInputs(node);

  ui.editorToolbar.innerHTML = "";
  ui.editorCanvas.innerHTML = "";
  ui.editorCanvas.classList.toggle("hidden", node.type === "text");
  ui.editorInputs.classList.toggle("node-editor__inputs--compact", node.type === "text");
  ui.editorPrompt.placeholder = node.type === "text" ? TEXT_AI_PLACEHOLDER : typeConfig[node.type].prompt;
  ui.editorPrompt.value = node.prompt;

  const buildStatusHeader = () => `
    <span class="node-editor__status-badge" data-tone="${tone}">${executionMeta.statusLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.runCountLabel}</span>
    <span class="node-editor__status-meta">${executionMeta.lastRunLabel}</span>
  `;

  if (node.type === "text") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">Gemini 3.1 Pro</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-slot="mic">⌁</button>
        <button class="node-editor__icon-chip" data-slot="speed">1x</button>
        <button class="node-editor__quota" data-slot="quota">4</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => runSelectedNodeWorkflow());
    ui.editorFooter.querySelector('[data-slot="reset-node"]')?.addEventListener("click", () => resetWorkflowState(node.id));
    return;
  }

  ui.editorCanvas.innerHTML = buildNodeEditorCanvasMarkup(node);

  if (node.type === "image") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="quality">${getNodeSettingValue(node, "quality")}</button>
        <button class="node-editor__meta-chip" data-setting="style">${getNodeSettingValue(node, "style")}</button>
        <button class="node-editor__meta-chip" data-setting="preset">${getNodeSettingValue(node, "preset")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="style" title="切换风格">风</button>
        <button class="node-editor__icon-chip" data-setting="quality" title="切换画质">质</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "quality")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else if (node.type === "video") {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
        <button class="node-editor__meta-chip" data-setting="duration">${getNodeSettingValue(node, "duration")}</button>
        <button class="node-editor__meta-chip" data-setting="motion">${getNodeSettingValue(node, "motion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="mode" title="切换生成模式">模</button>
        <button class="node-editor__icon-chip" data-setting="motion" title="切换运动强度">动</button>
        <button class="node-editor__icon-chip" data-setting="duration" title="切换时长">时</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "duration")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  } else {
    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group">
        ${buildStatusHeader()}
        <button class="node-editor__meta-chip" data-slot="model">${node.model}</button>
        <button class="node-editor__meta-chip" data-setting="mode">${getNodeSettingValue(node, "mode")}</button>
        <button class="node-editor__meta-chip" data-setting="voice">${getNodeSettingValue(node, "voice")}</button>
        <button class="node-editor__meta-chip" data-setting="speed">${getNodeSettingValue(node, "speed")}</button>
        <button class="node-editor__meta-chip" data-setting="emotion">${getNodeSettingValue(node, "emotion")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__icon-chip" data-slot="run-node" title="执行当前节点">▶</button>
        <button class="node-editor__icon-chip" data-slot="reset-node" title="重置执行状态">↺</button>
        <button class="node-editor__icon-chip" data-setting="voice" title="切换音色">声</button>
        <button class="node-editor__icon-chip" data-setting="emotion" title="切换情绪">情</button>
        <button class="node-editor__quota" data-slot="quota">${getNodeSettingValue(node, "speed")}</button>
        <button class="node-editor__send" data-slot="submit">↑</button>
      </div>
    `;
  }

  bindNodeEditorControls(node);
  ui.editorCanvas.querySelectorAll("video.node-editor__asset-thumb, video.node-editor__preview-media").forEach((media) => {
    media.addEventListener("loadeddata", () => {
      media.currentTime = 0;
    }, { once: true });
  });
}

