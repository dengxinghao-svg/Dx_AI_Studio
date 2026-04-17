(function () {
  const store = window.DxProjectStore;
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");

  const titleMeta = document.querySelector(".floating-title__meta");
  const titleHeading = document.querySelector(".floating-title h1");
  const floatingTitleTrigger = document.getElementById("floatingTitleTrigger");
  const editorProjectTitle = document.getElementById("editorProjectTitle");

  let currentLocale = store.getLocale();
  let currentProject = null;

  const messages = {
    "zh-CN": {
      pageTitle: "Dx_AI_Studio 编辑器",
      chatTitle: "未命名对话",
      hint: "左键框选节点，中键拖动画布，按住空格再左键也可平移。",
      run: "立即探索",
      share: "分享",
      createAsset: "创建资产",
      addToChat: "加入对话",
      group: "打组",
      delete: "删除",
      summaryTitle: (count) => `画布总览（${count} 节点）`,
      summaryMeta: "当前画布聚焦在工作流节点关系，右侧信息会随选中节点实时更新。",
      runSelectedNode: "执行当前节点",
      runChain: "执行整条链",
      resetWorkflow: "重置状态",
      nodeEditor: "节点编辑",
      strengthen: "可以加强的连接",
      session: "会话状态",
      workflowRun: "工作流执行",
      assistant: "AI 对话",
      inspectorEmpty: "先在画布中选择一个节点，右侧会显示当前节点说明与建议。",
      sessionLabels: ["状态", "节点数", "连线数", "节点状态", "上游数量", "下游数量", "上游节点", "下游节点"],
      workflowLabels: ["执行模式", "最近运行", "运行次数", "输入数", "输出类型", "执行摘要", "错误信息"],
      workflowDefaults: {
        status: "未选择",
        none: "无",
        notExecuted: "未执行",
        summary: "请选择节点后查看执行信息。",
        output: "当前节点尚未产生输出。"
      },
      workflows: ["分镜流程", "商品广告", "短视频"],
      chatPlaceholder: "描述操作作用，或继续扩写当前节点...",
      dock: [
        { text: "文", title: "添加文本节点" },
        { text: "图", title: "添加图片节点" },
        { text: "视", title: "添加视频节点" },
        { text: "资", title: "添加资产节点" }
      ],
      mini: ["关闭缩略图", "节点按网格吸附", "总览所有节点"],
      shortcutHint: "快捷键",
      context: ["上传", "添加资产", "添加节点", "撤销", "重做", "粘贴"],
      addNodeTitle: "添加节点",
      addNode: [
        ["文本", "单向输出到图片、视频、音频预设节点"],
        ["图片", "生成图片、海报和参考图"],
        ["视频", "宣传视频、动画、电影镜头"],
        ["音频", "音乐、音效、旁白和语音"]
      ],
      editor: {
        upload: "上传",
        upstream: "上游连接",
        downstream: "下游连接",
        input: "输入模式",
        addReference: "添加引用",
        addShot: "添加镜头",
        voiceMode: "语音模式",
        addVoice: "添加音色",
        style: "风格",
        videoOptions: "首尾帧 · 16:9 · 自适应 · 3s",
        ttsMode: "文字转语音",
        loading: "加载中",
        quotaVideo: "15秒",
        quotaAudio: "5 / 百字"
      }
    },
    en: {
      pageTitle: "Dx_AI_Studio Editor",
      chatTitle: "Untitled Chat",
      hint: "Left drag to select nodes. Middle drag pans the canvas. Hold Space + left drag to pan too.",
      run: "Explore",
      share: "Share",
      createAsset: "Create Asset",
      addToChat: "Add To Chat",
      group: "Group",
      delete: "Delete",
      summaryTitle: (count) => `Canvas Overview (${count} nodes)`,
      summaryMeta: "The canvas focuses on workflow relationships, and the right panel updates with the current selection.",
      runSelectedNode: "Run Selected Node",
      runChain: "Run Whole Chain",
      resetWorkflow: "Reset State",
      nodeEditor: "Node Editor",
      strengthen: "Connections To Improve",
      session: "Session Status",
      workflowRun: "Workflow Execution",
      assistant: "AI Chat",
      inspectorEmpty: "Select a node on the canvas and details will appear here.",
      sessionLabels: ["Status", "Nodes", "Links", "Node Status", "Upstream Count", "Downstream Count", "Upstream Nodes", "Downstream Nodes"],
      workflowLabels: ["Execution Mode", "Last Run", "Run Count", "Inputs", "Output Type", "Summary", "Error"],
      workflowDefaults: {
        status: "Not selected",
        none: "None",
        notExecuted: "Not run",
        summary: "Select a node to inspect workflow execution.",
        output: "The current node has not produced output yet."
      },
      workflows: ["Storyboard", "Product Ad", "Short Video"],
      chatPlaceholder: "Describe the action, or continue expanding the current node...",
      dock: [
        { text: "T", title: "Add text node" },
        { text: "I", title: "Add image node" },
        { text: "V", title: "Add video node" },
        { text: "A", title: "Add asset node" }
      ],
      mini: ["Hide minimap", "Snap to grid", "Overview all nodes"],
      shortcutHint: "Shortcuts",
      context: ["Upload", "Add Asset", "Add Node", "Undo", "Redo", "Paste"],
      addNodeTitle: "Add Node",
      addNode: [
        ["Text", "One-way output to image, video, and audio preset nodes"],
        ["Image", "Generate images, posters, and references"],
        ["Video", "Create promo videos, animation, and film shots"],
        ["Audio", "Music, sound effects, narration, and voice"]
      ],
      editor: {
        upload: "Upload",
        upstream: "Upstream link",
        downstream: "Downstream link",
        input: "Input mode",
        addReference: "Add reference",
        addShot: "Add shot",
        voiceMode: "Voice mode",
        addVoice: "Add voice",
        style: "Style",
        videoOptions: "End frame · 16:9 · Adaptive · 3s",
        ttsMode: "Text to speech",
        loading: "Loading",
        quotaVideo: "15s",
        quotaAudio: "5 / 100 chars"
      }
    }
  };

  function t() {
    return messages[currentLocale] || messages["zh-CN"];
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function getCurrentProjectName(project = currentProject) {
    return project?.name || titleMeta?.textContent || editorProjectTitle?.textContent || "Untitled Project";
  }

  function applyProjectTitle(project) {
    if (!project) return;
    if (titleMeta) titleMeta.textContent = project.name;
    if (editorProjectTitle) editorProjectTitle.textContent = project.name;
    document.title = `${project.name} - ${t().pageTitle}`;
  }

  function setTextContent(selector, value) {
    const element = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (element) element.textContent = value;
  }

  function applyEditorLocale(project = currentProject) {
    document.documentElement.lang = currentLocale === "en" ? "en" : "zh-CN";
    document.title = `${getCurrentProjectName(project)} - ${t().pageTitle}`;

    setTextContent(titleHeading, t().chatTitle);
    setTextContent(".canvas-hint", t().hint);
    setTextContent("#runBtn", t().run);
    setTextContent("#shareBtn", t().share);
    setTextContent("#createAssetBtn", t().createAsset);
    setTextContent("#addToChatBtn", t().addToChat);
    setTextContent("#groupNodesBtn", t().group);
    setTextContent("#deleteSelectionBtn", t().delete);

    if (typeof state !== "undefined" && typeof getNode === "function") {
      const selectedNode = getNode(state.selectedNodeId);
      if (!selectedNode) {
        setTextContent("#summaryTitle", t().summaryTitle(state.nodes?.length || 0));
        setTextContent("#summaryMeta", t().summaryMeta);
      }
    }

    setTextContent("#runSelectedNodeBtn", t().runSelectedNode);
    setTextContent("#runChainBtn", t().runChain);
    setTextContent("#resetWorkflowBtn", t().resetWorkflow);

    const cardHeadings = document.querySelectorAll(".inspector-card h3");
    if (cardHeadings[0]) cardHeadings[0].textContent = t().nodeEditor;
    if (cardHeadings[1]) cardHeadings[1].textContent = t().strengthen;
    if (cardHeadings[2]) cardHeadings[2].textContent = t().session;
    if (cardHeadings[3]) cardHeadings[3].textContent = t().workflowRun;

    const chatSectionHeading = document.querySelector(".inspector-card--chat h3");
    if (chatSectionHeading) chatSectionHeading.textContent = t().assistant;

    const empty = document.getElementById("inspectorEmpty");
    if (empty) empty.textContent = t().inspectorEmpty;

    const sessionLabels = document.querySelectorAll("#sessionList strong");
    t().sessionLabels.forEach((label, index) => {
      if (sessionLabels[index]) sessionLabels[index].textContent = label;
    });

    const workflowLabels = document.querySelectorAll("#workflowRunList strong");
    t().workflowLabels.forEach((label, index) => {
      if (workflowLabels[index]) workflowLabels[index].textContent = label;
    });

    const workflowOutputPreview = document.getElementById("workflowOutputPreview");
    if (workflowOutputPreview?.querySelector(".workflow-output-preview__empty")) {
      workflowOutputPreview.innerHTML = `<p class="workflow-output-preview__empty">${t().workflowDefaults.output}</p>`;
    }

    if (document.getElementById("workflowExecutionMode")?.textContent?.trim() === "") {
      setTextContent("#workflowExecutionMode", t().workflowDefaults.notExecuted);
    }
    if (document.getElementById("workflowErrorValue")?.textContent?.trim() === "") {
      setTextContent("#workflowErrorValue", t().workflowDefaults.none);
    }

    const sessionValues = {
      workflowStatusValue: t().workflowDefaults.status,
      workflowUpstreamTitles: currentLocale === "en" ? "No node selected" : "未选择节点",
      workflowDownstreamTitles: currentLocale === "en" ? "No node selected" : "未选择节点"
    };
    Object.entries(sessionValues).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.lockedByData) {
        el.textContent = value;
      }
    });

    const chatChips = document.querySelectorAll(".chat-chip");
    chatChips.forEach((chip, index) => {
      if (t().workflows[index]) chip.textContent = t().workflows[index];
    });

    const chatPrompt = document.getElementById("chatPrompt");
    if (chatPrompt) chatPrompt.placeholder = t().chatPlaceholder;

    document.querySelectorAll(".left-dock__tool[data-type]").forEach((button, index) => {
      const item = t().dock[index];
      if (!item) return;
      button.textContent = item.text;
      button.title = item.title;
    });

    [
      document.getElementById("toggleMinimapBtn"),
      document.getElementById("snapGridBtn"),
      document.getElementById("overviewBtn")
    ].forEach((button, index) => {
      if (button && t().mini[index]) button.title = t().mini[index];
    });

    const shortcutHelpBtn = document.getElementById("shortcutHelpBtn");
    if (shortcutHelpBtn) shortcutHelpBtn.title = t().shortcutHint;
    setTextContent("#shortcutQueryBtn span:last-child", t().shortcutHint);

    document.querySelectorAll("#canvasContextMenu .canvas-context-menu__item").forEach((item, index) => {
      const spans = item.querySelectorAll("span");
      if (spans.length) {
        spans[0].textContent = t().context[index];
      } else if (t().context[index]) {
        item.textContent = t().context[index];
      }
    });

    setTextContent("#addNodeMenu .canvas-context-submenu__title", t().addNodeTitle);
    document.querySelectorAll("#addNodeMenu .canvas-context-submenu__item").forEach((item, index) => {
      const strong = item.querySelector("strong");
      const small = item.querySelector("small");
      if (strong && t().addNode[index]) strong.textContent = t().addNode[index][0];
      if (small && t().addNode[index]) small.textContent = t().addNode[index][1];
    });

    document.querySelectorAll(".node-editor__upload").forEach((button) => {
      button.textContent = t().editor.upload;
    });
    document.querySelectorAll('.node-editor__tool[data-slot="input-mode"]').forEach((button) => {
      button.title = t().editor.input;
      button.textContent = currentLocale === "en" ? "In" : "输入";
    });
    document.querySelectorAll('.node-editor__tool[data-slot="add-reference"]').forEach((button) => {
      button.title = t().editor.addReference;
    });
    document.querySelectorAll('.node-editor__tool[data-slot="add-shot"]').forEach((button) => {
      button.title = t().editor.addShot;
    });
    document.querySelectorAll('.node-editor__tool[data-slot="voice-mode"]').forEach((button) => {
      button.title = t().editor.voiceMode;
      button.textContent = currentLocale === "en" ? "Vo" : "语";
    });
    document.querySelectorAll('.node-editor__tool[data-slot="add-voice"]').forEach((button) => {
      button.title = t().editor.addVoice;
    });
    document.querySelectorAll(".node-editor__port--left").forEach((button) => {
      button.title = t().editor.upstream;
    });
    document.querySelectorAll(".node-editor__port--right").forEach((button) => {
      button.title = t().editor.downstream;
    });
    document.querySelectorAll('[data-slot="style"]').forEach((button) => {
      button.textContent = t().editor.style;
    });
    document.querySelectorAll('[data-slot="video-options"]').forEach((button) => {
      button.textContent = t().editor.videoOptions;
    });
    document.querySelectorAll('[data-slot="tts-mode"]').forEach((button) => {
      button.textContent = t().editor.ttsMode;
    });
    document.querySelectorAll('[data-slot="loading"]').forEach((button) => {
      button.textContent = t().editor.loading;
    });
    document.querySelectorAll('[data-slot="quota"]').forEach((button) => {
      const text = button.textContent || "";
      if (text.includes("15") || text.includes("秒") || text.includes("s")) {
        button.textContent = t().editor.quotaVideo;
      } else if (text.includes("5")) {
        button.textContent = t().editor.quotaAudio;
      }
    });
  }

  function persistSnapshot() {
    if (!projectId || typeof serializeCanvasState !== "function") return;
    const snapshot = clone(serializeCanvasState());
    store.saveSnapshot(projectId, snapshot);
    currentProject = store.getProject(projectId) || currentProject;
  }

  function schedulePersist() {
    clearTimeout(schedulePersist.timer);
    schedulePersist.timer = setTimeout(persistSnapshot, 220);
  }

  if (!projectId) {
    window.location.replace("../workspace/index.html");
    return;
  }

  currentProject = store.getProject(projectId);
  if (!currentProject) {
    window.location.replace("../workspace/index.html");
    return;
  }

  applyProjectTitle(currentProject);
  applyEditorLocale(currentProject);

  if (currentProject.snapshot && Array.isArray(currentProject.snapshot.nodes) && currentProject.snapshot.nodes.length) {
    restoreSnapshot(clone(currentProject.snapshot));
  } else {
    persistSnapshot();
  }

  if (floatingTitleTrigger) {
    const goBack = (event) => {
      event.preventDefault();
      persistSnapshot();
      window.location.href = "../workspace/index.html";
    };
    floatingTitleTrigger.addEventListener("click", goBack);
    floatingTitleTrigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        goBack(event);
      }
    });
  }

  if (typeof window.updateEditorPanel === "function") {
    const originalUpdateEditorPanel = window.updateEditorPanel;
    window.updateEditorPanel = function wrappedUpdateEditorPanel() {
      const result = originalUpdateEditorPanel.apply(this, arguments);
      applyEditorLocale(currentProject);
      return result;
    };
  }

  window.addEventListener("pointerup", schedulePersist);
  window.addEventListener("keyup", schedulePersist);
  window.addEventListener("beforeunload", persistSnapshot);
  window.addEventListener("storage", () => {
    currentLocale = store.getLocale();
    currentProject = store.getProject(projectId) || currentProject;
    applyProjectTitle(currentProject);
    applyEditorLocale(currentProject);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persistSnapshot();
  });
})();
