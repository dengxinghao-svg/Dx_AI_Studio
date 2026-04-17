// Editor module: image node enhancements

;(() => {
  const IMAGE_MODELS = [
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

  const IMAGE_RATIOS = [
    { value: "1:1", label: "1:1", available: true },
    { value: "4:3", label: "4:3", available: true },
    { value: "3:4", label: "3:4", available: true },
    { value: "16:9", label: "16:9", available: true },
    { value: "9:16", label: "9:16", available: true }
  ];

  let activeMentionMenu = null;
  let activeMentionCleanup = null;
  let activeMentionState = null;

  function getImageModel(value) {
    return IMAGE_MODELS.find((item) => item.value === value) || IMAGE_MODELS[0];
  }

  function ensureImageNodeState(node) {
    if (!node || node.type !== "image") return;
    node.settings = node.settings || {};
    const defaultModel = IMAGE_MODELS.find((item) => item.available) || IMAGE_MODELS[0];
    if (!node.model || !IMAGE_MODELS.some((item) => item.value === node.model)) {
      node.model = defaultModel.value;
    }
    const activeModel = getImageModel(node.model);
    if (!node.settings.modelVersion || !activeModel.versions.some((item) => item.value === node.settings.modelVersion)) {
      node.settings.modelVersion = activeModel.versions[0]?.value || "";
    }
    if (!node.settings.ratio || !IMAGE_RATIOS.some((item) => item.value === node.settings.ratio)) {
      node.settings.ratio = "4:3";
    }
  }

  function getImageModelLabel(value) {
    return getImageModel(value)?.label || "选择模型";
  }

  function getImageVersionLabel(node) {
    const model = getImageModel(node?.model);
    const version = model.versions.find((item) => item.value === node?.settings?.modelVersion) || model.versions[0];
    return version?.label || "选择版本";
  }

  function hideMentionMenu() {
    activeMentionCleanup?.();
    activeMentionCleanup = null;
    activeMentionMenu?.remove();
    activeMentionMenu = null;
    activeMentionState = null;
  }

  function getMentionContext(text, caretIndex) {
    const beforeCaret = text.slice(0, caretIndex);
    const triggerIndex = beforeCaret.lastIndexOf("@");
    if (triggerIndex < 0) return null;
    const between = beforeCaret.slice(triggerIndex + 1);
    if (between.includes("\n")) return null;
    const hasBoundary = triggerIndex === 0 || /\s/.test(beforeCaret[triggerIndex - 1]);
    if (!hasBoundary || /\s/.test(between)) return null;
    return {
      query: between.toLowerCase(),
      start: triggerIndex,
      end: caretIndex
    };
  }

  function getMentionCandidates(node) {
    if (!node) return [];
    return (node.upstream || [])
      .map((id) => getNode(id))
      .filter(Boolean)
      .slice(0, 7)
      .map((item, index) => ({
        id: item.id,
        title: `Image${index + 1}`,
        sourceTitle: item.title,
        type: item.type,
        preview: item.src || item.output?.previewUrl || previewSvg(item.type, item.title)
      }));
  }

  function insertMention(node, mention) {
    if (!node || !mention || !activeMentionState) return;
    const context = activeMentionState.context;
    const promptInput = ui.editorPrompt;
    const nextValue = `${promptInput.value.slice(0, context.start)}@${mention.title} ${promptInput.value.slice(context.end)}`;
    promptInput.value = nextValue;
    node.prompt = nextValue;
    const caret = context.start + mention.title.length + 2;
    promptInput.focus();
    promptInput.setSelectionRange(caret, caret);
    hideMentionMenu();
    updateSession();
  }

  function showMentionMenu(anchor, items, context) {
    hideMentionMenu();
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
    activeMentionMenu = menu;
    activeMentionState = { items, index: 0, context };

    menu.querySelectorAll("[data-index]").forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        insertMention(getNode(state.selectedNodeId), items[Number(button.dataset.index)]);
      });
    });

    const onPointerDown = (event) => {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      hideMentionMenu();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    activeMentionCleanup = () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }

  function refreshMentionMenu(node) {
    if (!node || node.type !== "image" || state.selectedNodeId !== node.id) {
      hideMentionMenu();
      return;
    }
    const promptInput = ui.editorPrompt;
    const context = getMentionContext(promptInput.value || "", promptInput.selectionStart || 0);
    if (!context) {
      hideMentionMenu();
      return;
    }
    const items = getMentionCandidates(node).filter((item) => !context.query || item.title.toLowerCase().includes(context.query));
    if (!items.length) {
      hideMentionMenu();
      return;
    }
    showMentionMenu(promptInput, items, context);
  }

  function bindPromptMentionEvents() {
    if (ui.editorPrompt.dataset.imageMentionBound === "true") return;
    ui.editorPrompt.dataset.imageMentionBound = "true";

    ui.editorPrompt.addEventListener("input", () => {
      const node = getNode(state.selectedNodeId);
      if (!node || node.type !== "image") {
        hideMentionMenu();
        return;
      }
      refreshMentionMenu(node);
    });

    ui.editorPrompt.addEventListener("click", () => {
      const node = getNode(state.selectedNodeId);
      if (!node || node.type !== "image") {
        hideMentionMenu();
        return;
      }
      refreshMentionMenu(node);
    });

    ui.editorPrompt.addEventListener("keydown", (event) => {
      if (!activeMentionMenu || !activeMentionState) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        activeMentionState.index = (activeMentionState.index + 1) % activeMentionState.items.length;
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeMentionState.index = (activeMentionState.index - 1 + activeMentionState.items.length) % activeMentionState.items.length;
      } else if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(getNode(state.selectedNodeId), activeMentionState.items[activeMentionState.index]);
        return;
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideMentionMenu();
        return;
      } else {
        return;
      }
      activeMentionMenu.querySelectorAll("[data-index]").forEach((button) => {
        button.classList.toggle("is-active", Number(button.dataset.index) === activeMentionState.index);
      });
    });

    ui.editorPrompt.addEventListener("blur", () => {
      window.setTimeout(() => hideMentionMenu(), 120);
    });
  }

  const previousShowNodeOptionMenu = showNodeOptionMenu;
  showNodeOptionMenu = function(anchor, title, options, currentValue, onSelect) {
    if (!options?.length || typeof options[0] === "string") {
      return previousShowNodeOptionMenu(anchor, title, options, currentValue, onSelect);
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

  const previousGetReferenceAssetMarkup = getReferenceAssetMarkup;
  getReferenceAssetMarkup = function(node) {
    if (node?.type !== "image") {
      return previousGetReferenceAssetMarkup(node);
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

  const previousBuildNodeEditorCanvasMarkup = buildNodeEditorCanvasMarkup;
  buildNodeEditorCanvasMarkup = function(node) {
    if (node?.type !== "image") {
      return previousBuildNodeEditorCanvasMarkup(node);
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

  const previousBindNodeEditorControls = bindNodeEditorControls;
  bindNodeEditorControls = function(node) {
    bindPromptMentionEvents();
    if (node?.type !== "image") {
      return previousBindNodeEditorControls(node);
    }

    ensureImageNodeState(node);

    ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
      requestNodeReferenceUpload(node);
    });

    ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(event.currentTarget, "选择模型", IMAGE_MODELS, node.model, (value) => {
        const selected = getImageModel(value);
        if (!selected.available) return;
        node.model = selected.value;
        node.settings.modelVersion = selected.versions[0]?.value || "";
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="version"]')?.addEventListener("click", (event) => {
      const model = getImageModel(node.model);
      showNodeOptionMenu(event.currentTarget, "选择版本", model.versions || [], node.settings.modelVersion, (value) => {
        node.settings.modelVersion = value;
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-setting="ratio"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(event.currentTarget, "选择比例", IMAGE_RATIOS, getNodeSettingValue(node, "ratio"), (value) => {
        node.settings.ratio = value;
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
      runSelectedNodeWorkflow();
    });
  };

  const previousUpdateEditorPanel = updateEditorPanel;
  updateEditorPanel = function() {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      hideMentionMenu();
      return previousUpdateEditorPanel();
    }

    ensureImageNodeState(node);
    updateWorkflowInspector();
    if (typeof updateWorkflowWorkbench === "function") {
      updateWorkflowWorkbench();
    }

    if (state.isDraggingNodes || state.draggingGroupId) {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideMentionMenu();
      return;
    }

    if (node.sourceKind === "upload") {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideMentionMenu();
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
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="version">${getImageVersionLabel(node)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-setting="ratio">${getNodeSettingValue(node, "ratio")}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__send node-editor__send--label node-editor__send--primary" data-slot="run-node">生成图片</button>
      </div>
    `;

    bindNodeEditorControls(node);
    refreshMentionMenu(node);
  };

  IMAGE_MODELS.splice(
    0,
    IMAGE_MODELS.length,
    {
      value: "nano-banana",
      label: "Nano-banana",
      available: true,
      versions: [
        { value: "nano-banana-pro", label: "Pro", available: true },
        { value: "nano-banana-1-0", label: "1.0", available: true },
        { value: "nano-banana-flash", label: "Flash", available: true }
      ]
    },
    {
      value: "midjourney",
      label: "Midjourney",
      available: false,
      versions: [
        { value: "mj-v7-0", label: "MJ V7.0", available: false },
        { value: "mj-v6-1", label: "MJ V6.1", available: false },
        { value: "niji-v6", label: "NIJI V6", available: false },
        { value: "niji-v7", label: "NIJI V7", available: false }
      ]
    },
    {
      value: "flux",
      label: "FLUX",
      available: false,
      versions: [
        { value: "flux-2-pro", label: "Flux.2-Pro", available: false },
        { value: "flux-1-kontext-pro", label: "Flux.1 Kontext-Pro", available: false }
      ]
    },
    {
      value: "gpt-image",
      label: "GPT",
      available: false,
      versions: [
        { value: "gpt-image-1-5", label: "image 1.5", available: false },
        { value: "gpt-image-1-0", label: "image 1.0", available: false }
      ]
    },
    {
      value: "jimeng",
      label: "即梦",
      available: false,
      versions: [
        { value: "jimeng-5-0-lite", label: "5.0 Lite", available: false },
        { value: "jimeng-4-5", label: "4.5", available: false },
        { value: "jimeng-4-0-extreme", label: "4.0 极速版", available: false }
      ]
    }
  );

  const IMAGE_FORMAT_RATIOS = [
    { value: "auto", label: "自适应", icon: "◌" },
    { value: "1:1", label: "1:1", icon: "□" },
    { value: "9:16", label: "9:16", icon: "▯" },
    { value: "16:9", label: "16:9", icon: "▭" },
    { value: "3:4", label: "3:4", icon: "▮" },
    { value: "4:3", label: "4:3", icon: "▱" },
    { value: "3:2", label: "3:2", icon: "▭" },
    { value: "2:3", label: "2:3", icon: "▮" },
    { value: "5:4", label: "5:4", icon: "▤" },
    { value: "4:5", label: "4:5", icon: "▥" },
    { value: "21:9", label: "21:9", icon: "▬" }
  ];

  const IMAGE_QUALITY_OPTIONS = {
    "nano-banana-pro": [
      { value: "1k", label: "1K" },
      { value: "2k", label: "2K" },
      { value: "4k", label: "4K" }
    ],
    "nano-banana-flash": [
      { value: "512p", label: "512P" },
      { value: "1k", label: "1K" },
      { value: "2k", label: "2K" },
      { value: "4k", label: "4K" }
    ],
    "nano-banana-1-0": [
      { value: "auto", label: "自适应" }
    ]
  };

  const previousEnsureImageNodeStateFinal = ensureImageNodeState;
  ensureImageNodeState = function(node) {
    previousEnsureImageNodeStateFinal(node);
    if (!node || node.type !== "image") return;
    const qualityOptions = IMAGE_QUALITY_OPTIONS[node?.settings?.modelVersion] || IMAGE_QUALITY_OPTIONS["nano-banana-pro"];
    if (!qualityOptions.some((item) => item.value === node.settings.quality)) {
      node.settings.quality = qualityOptions[qualityOptions.length - 1]?.value || qualityOptions[0]?.value || "";
      if (node.settings.modelVersion === "nano-banana-flash") {
        node.settings.quality = "1k";
      }
      if (node.settings.modelVersion === "nano-banana-1-0") {
        node.settings.quality = "auto";
      }
    }
    if (!IMAGE_FORMAT_RATIOS.some((item) => item.value === node.settings.ratio)) {
      node.settings.ratio = "16:9";
    }
  };

  function getImageQualityOptionsFinal(node) {
    return IMAGE_QUALITY_OPTIONS[node?.settings?.modelVersion] || IMAGE_QUALITY_OPTIONS["nano-banana-pro"];
  }

  function getImageQualityLabelFinal(node) {
    return getImageQualityOptionsFinal(node).find((item) => item.value === node?.settings?.quality)?.label || "1K";
  }

  function getImageFormatLabelFinal(node) {
    const ratio = IMAGE_FORMAT_RATIOS.find((item) => item.value === node?.settings?.ratio)?.label || "16:9";
    return `${ratio} · ${getImageQualityLabelFinal(node)}`;
  }

  function showImageFormatMenuFinal(anchor, node) {
    hideNodeOptionMenu();
    if (!anchor || !node) return;

    ensureImageNodeState(node);
    const qualityOptions = getImageQualityOptionsFinal(node);
    const rect = anchor.getBoundingClientRect();
    const menu = document.createElement("div");
    menu.className = "node-editor__format-menu";
    menu.innerHTML = `
      <div class="node-editor__format-section">
        <div class="node-editor__format-title">画质</div>
        <div class="node-editor__quality-list">
          ${qualityOptions.map((option) => `
            <button class="node-editor__quality-pill ${option.value === node.settings.quality ? "is-active" : ""}" type="button" data-quality="${option.value}">
              ${option.label}
            </button>
          `).join("")}
        </div>
      </div>
      <div class="node-editor__format-section">
        <div class="node-editor__format-title">比例</div>
        <div class="node-editor__ratio-grid">
          ${IMAGE_FORMAT_RATIOS.map((option) => `
            <button class="node-editor__ratio-card ${option.value === node.settings.ratio ? "is-active" : ""}" type="button" data-ratio="${option.value}">
              <span class="node-editor__ratio-icon">${option.icon}</span>
              <span class="node-editor__ratio-label">${option.label}</span>
            </button>
          `).join("")}
        </div>
      </div>
    `;

    menu.style.left = `${Math.max(16, rect.left)}px`;
    menu.style.top = `${rect.top - 10}px`;
    menu.style.transform = "translateY(-100%)";
    document.body.appendChild(menu);
    activeNodeOptionMenu = menu;

    const close = () => hideNodeOptionMenu();
    const onPointerDown = (event) => {
      if (menu.contains(event.target) || anchor.contains(event.target)) return;
      close();
    };

    const syncMenuSelection = () => {
      menu.querySelectorAll("[data-quality]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.quality === node.settings.quality);
      });
      menu.querySelectorAll("[data-ratio]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.ratio === node.settings.ratio);
      });
      const formatChip = ui.editorFooter?.querySelector('[data-slot="format"]');
      if (formatChip) {
        formatChip.textContent = getImageFormatLabelFinal(node);
      }
    };

    menu.querySelectorAll("[data-quality]").forEach((button) => {
      button.addEventListener("click", () => {
        node.settings.quality = button.dataset.quality;
        updateSession();
        syncMenuSelection();
      });
    });

    menu.querySelectorAll("[data-ratio]").forEach((button) => {
      button.addEventListener("click", () => {
        node.settings.ratio = button.dataset.ratio;
        updateSession();
        syncMenuSelection();
      });
    });

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("resize", close, { once: true });
    window.addEventListener("scroll", close, { once: true });
    activeNodeOptionMenuCleanup = () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }

  const previousGetReferenceAssetMarkupFinal = getReferenceAssetMarkup;
  getReferenceAssetMarkup = function(node) {
    if (node?.type !== "image") {
      return previousGetReferenceAssetMarkupFinal(node);
    }
    if (!node.referenceAsset) {
      return `<span class="node-editor__inputs-empty">暂无参考素材</span>`;
    }

    const asset = node.referenceAsset;
    const thumb = asset.type === "audio"
      ? `<span class="node-editor__asset-type">${asset.type.toUpperCase()}</span>`
      : asset.type === "video"
        ? `<video class="node-editor__asset-thumb" src="${asset.src}" muted playsinline preload="metadata" draggable="false"></video>`
        : `<img class="node-editor__asset-thumb" src="${asset.src}" alt="${asset.name}" draggable="false">`;

    return `
      <article class="node-editor__asset node-editor__asset--reference-card" title="${asset.name}" draggable="false" data-readonly-reference="true">
        <div class="node-editor__asset-preview">${thumb}</div>
        <div class="node-editor__asset-body">
          <span class="node-editor__asset-name">${asset.name}</span>
          <small class="node-editor__asset-status">参考素材</small>
        </div>
      </article>
    `;
  };

  function hideReferencePreview() {
    activeReferencePreviewCleanup?.();
    activeReferencePreviewCleanup = null;
    activeReferencePreview?.remove();
    activeReferencePreview = null;
  }

  function showReferencePreview(assetEl) {
    hideReferencePreview();
    if (!assetEl) return;
    const media = assetEl.querySelector("img, video");
    if (!media?.src) return;

    const rect = assetEl.getBoundingClientRect();
    const width = 220;
    const height = 148;
    const popup = document.createElement("div");
    popup.className = "node-editor__asset-hover-preview";
    popup.innerHTML = media.tagName.toLowerCase() === "video"
      ? `<video src="${media.src}" autoplay muted loop playsinline preload="metadata"></video>`
      : `<img src="${media.src}" alt="${assetEl.getAttribute("title") || "参考素材预览"}">`;

    const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2));
    const top = rect.top - height - 14 > 16
      ? rect.top - height - 14
      : Math.min(window.innerHeight - height - 16, rect.bottom + 14);

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    document.body.appendChild(popup);
    activeReferencePreview = popup;

    const close = () => hideReferencePreview();
    window.addEventListener("scroll", close, { once: true });
    window.addEventListener("resize", close, { once: true });
    activeReferencePreviewCleanup = () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("resize", close);
    };
  }

  function bindReadOnlyReferenceAssets() {
    ui.editorCanvas.querySelectorAll('[data-readonly-reference="true"]').forEach((assetEl) => {
      assetEl.setAttribute("draggable", "false");
      assetEl.querySelectorAll("img, video").forEach((media) => {
        media.setAttribute("draggable", "false");
      });

      assetEl.addEventListener("dragstart", (event) => {
        event.preventDefault();
      });
      assetEl.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      assetEl.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      assetEl.addEventListener("mouseenter", () => {
        showReferencePreview(assetEl);
      });
      assetEl.addEventListener("mouseleave", () => {
        hideReferencePreview();
      });
    });
  }

  const previousBindNodeEditorControlsFinal = bindNodeEditorControls;
  bindNodeEditorControls = function(node) {
    if (!node || node.type !== "image") {
      return previousBindNodeEditorControlsFinal(node);
    }

    bindPromptMentionEvents();
    ensureImageNodeState(node);

    ui.editorCanvas.querySelector('[data-slot="upload-ref"]')?.addEventListener("click", () => {
      requestNodeReferenceUpload(node);
    });
    bindReadOnlyReferenceAssets();

    ui.editorFooter.querySelector('[data-slot="model"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(event.currentTarget, "选择模型", IMAGE_MODELS, node.model, (value) => {
        const selected = getImageModel(value);
        if (!selected.available) return;
        node.model = selected.value;
        node.settings.modelVersion = selected.versions[0]?.value || "";
        node.settings.quality = "";
        ensureImageNodeState(node);
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="version"]')?.addEventListener("click", (event) => {
      const model = getImageModel(node.model);
      showNodeOptionMenu(event.currentTarget, "选择版本", model.versions || [], node.settings.modelVersion, (value) => {
        node.settings.modelVersion = value;
        node.settings.quality = "";
        ensureImageNodeState(node);
        updateSession();
        updateEditorPanel();
      });
    });

    ui.editorFooter.querySelector('[data-slot="format"]')?.addEventListener("click", (event) => {
      showImageFormatMenuFinal(event.currentTarget, node);
    });

    ui.editorFooter.querySelector('[data-slot="run-node"]')?.addEventListener("click", () => {
      runSelectedNodeWorkflow();
    });
  };

  const previousUpdateEditorPanelFinal = updateEditorPanel;
  updateEditorPanel = function() {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      hideMentionMenu();
      return previousUpdateEditorPanelFinal();
    }

    ensureImageNodeState(node);
    updateWorkflowInspector();
    if (typeof updateWorkflowWorkbench === "function") {
      updateWorkflowWorkbench();
    }

    if (state.isDraggingNodes || state.draggingGroupId) {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideMentionMenu();
      return;
    }

    if (node.sourceKind === "upload") {
      ui.editorPanel.classList.add("hidden");
      hideNodeOptionMenu();
      hideMentionMenu();
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
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="version">${getImageVersionLabel(node)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="format">${getImageFormatLabelFinal(node)}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__send node-editor__send--label node-editor__send--primary" data-slot="run-node">生成图片</button>
      </div>
    `;

    bindNodeEditorControls(node);
    refreshMentionMenu(node);
  };

  const previousBindNodeEditorControlsBatch = bindNodeEditorControls;
  bindNodeEditorControls = function(node) {
    if (!node || node.type !== "image") {
      return previousBindNodeEditorControlsBatch(node);
    }

    previousBindNodeEditorControlsBatch(node);
    node.settings = node.settings || {};
    if (![1, 2, 4].includes(Number(node.settings.batchCount))) {
      node.settings.batchCount = 1;
    }

    ui.editorFooter.querySelector('[data-slot="batch-count"]')?.addEventListener("click", (event) => {
      showNodeOptionMenu(
        event.currentTarget,
        "选择生成数量",
        [
          { value: "1", label: "1x", available: true },
          { value: "2", label: "2x", available: true },
          { value: "4", label: "4x", available: true }
        ],
        String(node.settings.batchCount || 1),
        (value) => {
          node.settings.batchCount = Number(value) || 1;
          updateSession();
          updateEditorPanel();
        }
      );
    });
  };

  const previousUpdateEditorPanelBatch = updateEditorPanel;
  updateEditorPanel = function() {
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") {
      return previousUpdateEditorPanelBatch();
    }

    node.settings = node.settings || {};
    if (![1, 2, 4].includes(Number(node.settings.batchCount))) {
      node.settings.batchCount = 1;
    }

    previousUpdateEditorPanelBatch();

    ui.editorFooter.innerHTML = `
      <div class="node-editor__meta-group node-editor__meta-group--image">
        <span class="node-editor__status-badge" data-tone="${typeof getWorkflowStatusTone === "function" ? getWorkflowStatusTone(node.status) : (node.status || DEFAULT_NODE_STATUS)}">${typeof getNodeExecutionMeta === "function" ? getNodeExecutionMeta(node).statusLabel : (node.status || DEFAULT_NODE_STATUS)}</span>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="model">${getImageModelLabel(node.model)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="version">${getImageVersionLabel(node)}</button>
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown" data-slot="format">${getImageFormatLabelFinal(node)}</button>
      </div>
      <div class="node-editor__meta-group node-editor__meta-group--right">
        <button class="node-editor__meta-chip node-editor__meta-chip--dropdown node-editor__meta-chip--count" data-slot="batch-count">${node.settings.batchCount}x</button>
        <button class="node-editor__send node-editor__send--label node-editor__send--primary" data-slot="run-node">生成图片</button>
      </div>
    `;

    bindNodeEditorControls(node);
  };
})();

;(() => {
  let hoverPreview = null;

  function isReadonlyReferenceTarget(target) {
    return target?.closest?.(".node-editor__reference-block .node-editor__asset, .node-editor__inputs-list--references .node-editor__asset, .node-editor__asset--reference-card");
  }

  function removeHoverPreview() {
    hoverPreview?.remove();
    hoverPreview = null;
  }

  function renderHoverPreview(assetCard) {
    removeHoverPreview();
    if (!assetCard) return;
    const media = assetCard.querySelector("img, video");
    if (!media?.src) return;

    const rect = assetCard.getBoundingClientRect();
    const preview = document.createElement("div");
    preview.className = "node-editor__asset-hover-preview";
    preview.innerHTML = media.tagName.toLowerCase() === "video"
      ? `<video src="${media.src}" autoplay muted loop playsinline preload="metadata"></video>`
      : `<img src="${media.src}" alt="${assetCard.getAttribute("title") || "参考素材预览"}">`;

    const width = 220;
    const height = 148;
    const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2));
    const top = rect.top - height - 14 > 16
      ? rect.top - height - 14
      : Math.min(window.innerHeight - height - 16, rect.bottom + 14);

    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
    document.body.appendChild(preview);
    hoverPreview = preview;
  }

  document.addEventListener("dragstart", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("drop", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("pointerdown", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("click", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("mouseover", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    renderHoverPreview(assetCard);
  }, true);

  document.addEventListener("mouseout", (event) => {
    const assetCard = isReadonlyReferenceTarget(event.target);
    if (!assetCard) return;
    if (assetCard.contains(event.relatedTarget)) return;
    removeHoverPreview();
  }, true);

  window.addEventListener("scroll", removeHoverPreview, true);
  window.addEventListener("resize", removeHoverPreview);
})();

;(() => {
  let readonlyAssetPreview = null;
  let readonlyAssetDragLocked = false;
  window.__readonlyEditorAssetDrag = false;

  function getEditorAssetCard(target) {
    const assetCard = target?.closest?.(".node-editor .node-editor__asset");
    return assetCard && ui.editorPanel?.contains(assetCard) ? assetCard : null;
  }

  function markReadonlyAssetCard(assetCard) {
    if (!assetCard) return;
    assetCard.setAttribute("draggable", "false");
    assetCard.querySelectorAll("img, video, picture, source").forEach((media) => {
      media.setAttribute("draggable", "false");
    });
  }

  function clearReadonlyAssetPreview() {
    readonlyAssetPreview?.remove();
    readonlyAssetPreview = null;
  }

  function showReadonlyAssetPreview(assetCard) {
    clearReadonlyAssetPreview();
    if (!assetCard) return;
    markReadonlyAssetCard(assetCard);
    const media = assetCard.querySelector("img, video");
    if (!media?.src) return;

    const rect = assetCard.getBoundingClientRect();
    const width = 220;
    const height = 148;
    const popup = document.createElement("div");
    popup.className = "node-editor__asset-hover-preview";
    popup.innerHTML = media.tagName.toLowerCase() === "video"
      ? `<video src="${media.src}" autoplay muted loop playsinline preload="metadata"></video>`
      : `<img src="${media.src}" alt="${assetCard.getAttribute("title") || "素材预览"}">`;

    popup.style.left = `${Math.min(window.innerWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2))}px`;
    popup.style.top = `${rect.top - height - 14 > 16 ? rect.top - height - 14 : Math.min(window.innerHeight - height - 16, rect.bottom + 14)}px`;
    document.body.appendChild(popup);
    readonlyAssetPreview = popup;
  }

  document.addEventListener("pointerdown", (event) => {
    const assetCard = getEditorAssetCard(event.target);
    if (!assetCard) return;
    readonlyAssetDragLocked = true;
    window.__readonlyEditorAssetDrag = true;
    markReadonlyAssetCard(assetCard);
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("pointerup", () => {
    readonlyAssetDragLocked = false;
    window.__readonlyEditorAssetDrag = false;
  }, true);

  document.addEventListener("dragstart", (event) => {
    const assetCard = getEditorAssetCard(event.target);
    if (!assetCard) return;
    readonlyAssetDragLocked = true;
    window.__readonlyEditorAssetDrag = true;
    markReadonlyAssetCard(assetCard);
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("dragend", () => {
    readonlyAssetDragLocked = false;
    window.__readonlyEditorAssetDrag = false;
  }, true);

  canvasFrame?.addEventListener("drop", (event) => {
    if (!readonlyAssetDragLocked) return;
    readonlyAssetDragLocked = false;
    window.__readonlyEditorAssetDrag = false;
    event.preventDefault();
    event.stopPropagation();
    canvasFrame.classList.remove("is-drop-target");
  }, true);

  canvasFrame?.addEventListener("dragover", (event) => {
    if (!readonlyAssetDragLocked) return;
    event.preventDefault();
    event.stopPropagation();
    canvasFrame.classList.remove("is-drop-target");
  }, true);

  document.addEventListener("click", (event) => {
    const assetCard = getEditorAssetCard(event.target);
    if (!assetCard) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("mouseover", (event) => {
    const assetCard = getEditorAssetCard(event.target);
    if (!assetCard) return;
    showReadonlyAssetPreview(assetCard);
  }, true);

  document.addEventListener("mouseout", (event) => {
    const assetCard = getEditorAssetCard(event.target);
    if (!assetCard) return;
    if (assetCard.contains(event.relatedTarget)) return;
    clearReadonlyAssetPreview();
  }, true);

  document.addEventListener("drop", (event) => {
    if (!window.__readonlyEditorAssetDrag) return;
    window.__readonlyEditorAssetDrag = false;
    readonlyAssetDragLocked = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  document.addEventListener("dragover", (event) => {
    if (!window.__readonlyEditorAssetDrag) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  window.addEventListener("scroll", clearReadonlyAssetPreview, true);
  window.addEventListener("blur", clearReadonlyAssetPreview);
  window.addEventListener("resize", clearReadonlyAssetPreview);
})();

;(() => {
  function syncImagePanelVisuals(node) {
    if (!node || node.type !== "image") return;

    const linkedCards = [...(ui.editorPanel?.querySelectorAll(".node-editor__asset") || [])];
    const hasCards = linkedCards.length > 0;

    ui.editorPanel?.querySelectorAll(".node-editor__inputs-empty").forEach((emptyState) => {
      emptyState.style.display = hasCards ? "none" : "";
    });

    const sendButton = ui.editorFooter?.querySelector(".node-editor__send");
    if (sendButton) {
      sendButton.classList.add("node-editor__send--icon-only");
      sendButton.setAttribute("aria-label", "生成图片");
      sendButton.setAttribute("title", "生成图片");
      sendButton.innerHTML = `
        <span class="node-editor__send-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" focusable="false">
            <path d="M10 15V5"></path>
            <path d="M6.5 8.5L10 5l3.5 3.5"></path>
          </svg>
        </span>
      `;
    }
  }

  function decorateLinkedImageAssets(node) {
    if (!node || node.type !== "image" || !ui.editorInputs) return;
    const upstreamIds = Array.isArray(node.upstream) ? node.upstream.slice(0, 7) : [];
    const cards = [...ui.editorInputs.querySelectorAll(".node-editor__asset")];
    cards.forEach((card, index) => {
      const sourceNodeId = upstreamIds[index];
      if (!sourceNodeId) return;
      card.classList.add("node-editor__asset--linked-source");
      card.dataset.sourceNodeId = sourceNodeId;
      card.setAttribute("draggable", "false");
      card.querySelectorAll("img, video, picture, source").forEach((media) => {
        media.setAttribute("draggable", "false");
      });
      if (!card.querySelector(".node-editor__asset-remove")) {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "node-editor__asset-remove";
        removeBtn.dataset.action = "remove-linked-asset";
        removeBtn.dataset.sourceNodeId = sourceNodeId;
        removeBtn.setAttribute("aria-label", "从列表中移除素材");
        removeBtn.textContent = "×";
        card.appendChild(removeBtn);
      }
    });
  }

  const previousImageEnhancementPanel = updateEditorPanel;
  updateEditorPanel = function() {
    previousImageEnhancementPanel();
    const node = getNode(state.selectedNodeId);
    if (!node || node.type !== "image") return;
    decorateLinkedImageAssets(node);
    syncImagePanelVisuals(node);
  };

  document.addEventListener("click", (event) => {
    const removeBtn = event.target?.closest?.(".node-editor__asset-remove");
    if (!removeBtn) return;
    const selectedNode = getNode(state.selectedNodeId);
    const sourceNodeId = removeBtn.dataset.sourceNodeId;
    if (selectedNode?.type === "image" && sourceNodeId) {
      event.preventDefault();
      event.stopPropagation();
      removeConnection(sourceNodeId, selectedNode.id);
    }
  }, true);
})();

;(() => {
  let syncFrame = 0;

  function getSelectedImageNode() {
    const node = getNode?.(state?.selectedNodeId);
    return node?.type === "image" ? node : null;
  }

  function ensureIconOnlySendButton() {
    const sendButton = ui?.editorFooter?.querySelector?.(".node-editor__send");
    if (!sendButton) return;
    sendButton.classList.add("node-editor__send--icon-only");
    sendButton.setAttribute("aria-label", "生成图片");
    sendButton.setAttribute("title", "生成图片");
    const expectedMarkup = `
      <span class="node-editor__send-icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="M10 15V5"></path>
          <path d="M6.5 8.5L10 5l3.5 3.5"></path>
        </svg>
      </span>
    `;
    if (!sendButton.querySelector(".node-editor__send-icon")) {
      sendButton.innerHTML = expectedMarkup;
      return;
    }
    sendButton.innerHTML = expectedMarkup;
  }

  function syncReferenceEmptyState() {
    const panel = ui?.editorPanel;
    if (!panel) return;
    const referenceBlock = panel.querySelector(".node-editor__reference-block");
    if (!referenceBlock) return;
    const assetCards = referenceBlock.querySelectorAll(".node-editor__asset");
    const emptyState = referenceBlock.querySelector(".node-editor__inputs-empty");
    referenceBlock.classList.toggle("has-assets", assetCards.length > 0);
    if (emptyState) {
      emptyState.style.display = assetCards.length > 0 ? "none" : "";
    }
  }

  function syncImageEditorUi() {
    const node = getSelectedImageNode();
    if (!node || ui?.editorPanel?.classList?.contains("hidden")) return;
    ensureIconOnlySendButton();
    syncReferenceEmptyState();
  }

  function scheduleImageEditorUiSync() {
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(syncImageEditorUi);
  }

  const previousUpdateEditorPanelForImageUi = updateEditorPanel;
  updateEditorPanel = function() {
    previousUpdateEditorPanelForImageUi();
    scheduleImageEditorUiSync();
  };

  const globalObserver = new MutationObserver(() => {
    if (!getSelectedImageNode()) return;
    scheduleImageEditorUiSync();
  });

  globalObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "style"]
  });

  ["click", "pointerup", "input", "change", "keydown"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!getSelectedImageNode()) return;
      scheduleImageEditorUiSync();
    }, true);
  });

  window.addEventListener("resize", scheduleImageEditorUiSync);
})();
