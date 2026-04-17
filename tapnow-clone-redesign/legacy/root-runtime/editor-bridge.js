(function () {
  const store = window.DxProjectStore;
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project");
  const titleMeta = document.querySelector(".floating-title__meta");
  const editorProjectTitle = document.getElementById("editorProjectTitle");
  const floatingTitleTrigger = document.getElementById("floatingTitleTrigger");
  let currentLocale = store.getLocale();

  const editorMessages = {
    "zh-CN": {
      pageTitle: "Dx_AI_Studio 编辑器",
      chatTitle: "未命名对话",
      hint: "左键框选节点，中键拖动画布，按住空格再左键也可平移。",
      run: "立即探索",
      share: "分享",
      createAsset: "创建资产",
      group: "打组",
      delete: "删除",
      inspectorEdit: "节点编辑",
      inspectorEmpty: "先在画布中选择一个节点，右侧会显示当前节点说明与建议。",
      strengthen: "可以加强的连接",
      session: "会话状态",
      status: "状态",
      nodes: "节点数",
      links: "连线数",
      workflows: ["分镜流程", "商品广告", "短视频"],
      chatPlaceholder: "描述操作作用，或继续扩写当前节点...",
      dock: [
        { text: "文", title: "添加文本节点" },
        { text: "图", title: "添加图片节点" },
        { text: "视", title: "添加视频节点" },
        { text: "音", title: "添加音频节点" }
      ],
      mini: ["关闭缩略图", "节点按网格吸附", "总览所有节点"],
      context: ["上传", "添加资产", "添加节点", "撤销", "重做", "粘贴"],
      addNodeTitle: "添加节点",
      addNode: [
        ["文本", "单向输出到图片、视频、音频预设节点"],
        ["图片", "生成图片、海报和参考图"],
        ["视频", "宣传视频、动画、电影镜头"],
        ["音频", "配乐、音效、旁白和语音"]
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
      group: "Group",
      delete: "Delete",
      inspectorEdit: "Node Editor",
      inspectorEmpty: "Select a node on the canvas and details will appear here.",
      strengthen: "Connections To Improve",
      session: "Session Status",
      status: "Status",
      nodes: "Nodes",
      links: "Links",
      workflows: ["Storyboard", "Product Ad", "Short Video"],
      chatPlaceholder: "Describe the action, or continue expanding the current node...",
      dock: [
        { text: "T", title: "Add text node" },
        { text: "I", title: "Add image node" },
        { text: "V", title: "Add video node" },
        { text: "A", title: "Add audio node" }
      ],
      mini: ["Hide minimap", "Snap to grid", "Overview all nodes"],
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

  function tm() {
    return editorMessages[currentLocale] || editorMessages["zh-CN"];
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function applyProjectTitle(project) {
    if (titleMeta) titleMeta.textContent = project.name;
    if (editorProjectTitle) editorProjectTitle.textContent = project.name;
    document.title = `${project.name} - ${tm().pageTitle}`;
  }

  function applyEditorLocale() {
    document.documentElement.lang = currentLocale === "en" ? "en" : "zh-CN";
    document.title = `${titleMeta?.textContent || project.name} - ${tm().pageTitle}`;
    const titleMain = document.querySelector(".floating-title h1");
    const hint = document.querySelector(".canvas-hint");
    const runBtn = document.getElementById("runBtn");
    const shareBtn = document.getElementById("shareBtn");
    const createAssetBtn = document.getElementById("createAssetBtn");
    const groupNodesBtn = document.getElementById("groupNodesBtn");
    const deleteSelectionBtn = document.getElementById("deleteSelectionBtn");
    const editHeading = document.querySelector(".inspector-card h3");
    const empty = document.getElementById("inspectorEmpty");
    const strengthenHeading = document.querySelectorAll(".inspector-card h3")[1];
    const sessionHeading = document.querySelectorAll(".inspector-card h3")[2];
    const chatChips = document.querySelectorAll(".chat-chip");
    const chatPrompt = document.getElementById("chatPrompt");

    if (titleMain) titleMain.textContent = tm().chatTitle;
    if (hint) hint.textContent = tm().hint;
    if (runBtn) runBtn.textContent = tm().run;
    if (shareBtn) shareBtn.textContent = tm().share;
    if (createAssetBtn) createAssetBtn.textContent = tm().createAsset;
    if (groupNodesBtn) groupNodesBtn.textContent = tm().group;
    if (deleteSelectionBtn) deleteSelectionBtn.textContent = tm().delete;
    if (editHeading) editHeading.textContent = tm().inspectorEdit;
    if (empty) empty.textContent = tm().inspectorEmpty;
    if (strengthenHeading) strengthenHeading.textContent = tm().strengthen;
    if (sessionHeading) sessionHeading.textContent = tm().session;
    if (chatPrompt) chatPrompt.placeholder = tm().chatPlaceholder;

    const sessionLabels = document.querySelectorAll(".session-list strong");
    if (sessionLabels[0]) sessionLabels[0].textContent = tm().status;
    if (sessionLabels[1]) sessionLabels[1].textContent = tm().nodes;
    if (sessionLabels[2]) sessionLabels[2].textContent = tm().links;

    chatChips.forEach((chip, index) => {
      if (tm().workflows[index]) {
        chip.textContent = tm().workflows[index];
      }
    });

    const dockButtons = document.querySelectorAll(".left-dock__tool[data-type]");
    dockButtons.forEach((button, index) => {
      const item = tm().dock[index];
      if (!item) return;
      button.textContent = item.text;
      button.title = item.title;
    });

    const miniButtons = [document.getElementById("toggleMinimapBtn"), document.getElementById("snapGridBtn"), document.getElementById("overviewBtn")];
    miniButtons.forEach((button, index) => {
      if (button && tm().mini[index]) {
        button.title = tm().mini[index];
      }
    });

    const contextItems = document.querySelectorAll("#canvasContextMenu .canvas-context-menu__item");
    contextItems.forEach((item, index) => {
      const spans = item.querySelectorAll("span");
      if (spans.length) {
        spans[0].textContent = tm().context[index];
      } else if (tm().context[index]) {
        item.textContent = tm().context[index];
      }
    });

    const addNodeTitle = document.querySelector("#addNodeMenu .canvas-context-submenu__title");
    if (addNodeTitle) addNodeTitle.textContent = tm().addNodeTitle;
    document.querySelectorAll("#addNodeMenu .canvas-context-submenu__item").forEach((item, index) => {
      const strong = item.querySelector("strong");
      const small = item.querySelector("small");
      if (strong && tm().addNode[index]) strong.textContent = tm().addNode[index][0];
      if (small && tm().addNode[index]) small.textContent = tm().addNode[index][1];
    });

    document.querySelectorAll(".node-editor__upload").forEach((button) => {
      button.textContent = tm().editor.upload;
    });
    document.querySelectorAll('.node-editor__tool[data-slot=\"input-mode\"]').forEach((button) => {
      button.title = tm().editor.input;
      button.textContent = currentLocale === "en" ? "In" : "输";
    });
    document.querySelectorAll('.node-editor__tool[data-slot=\"add-reference\"]').forEach((button) => {
      button.title = tm().editor.addReference;
    });
    document.querySelectorAll('.node-editor__tool[data-slot=\"add-shot\"]').forEach((button) => {
      button.title = tm().editor.addShot;
    });
    document.querySelectorAll('.node-editor__tool[data-slot=\"voice-mode\"]').forEach((button) => {
      button.title = tm().editor.voiceMode;
      button.textContent = currentLocale === "en" ? "Vo" : "声";
    });
    document.querySelectorAll('.node-editor__tool[data-slot=\"add-voice\"]').forEach((button) => {
      button.title = tm().editor.addVoice;
    });
    document.querySelectorAll(".node-editor__port--left").forEach((button) => {
      button.title = tm().editor.upstream;
    });
    document.querySelectorAll(".node-editor__port--right").forEach((button) => {
      button.title = tm().editor.downstream;
    });
    document.querySelectorAll('[data-slot="style"]').forEach((button) => {
      button.textContent = tm().editor.style;
    });
    document.querySelectorAll('[data-slot="video-options"]').forEach((button) => {
      button.textContent = tm().editor.videoOptions;
    });
    document.querySelectorAll('[data-slot="tts-mode"]').forEach((button) => {
      button.textContent = tm().editor.ttsMode;
    });
    document.querySelectorAll('[data-slot="loading"]').forEach((button) => {
      button.textContent = tm().editor.loading;
    });
    document.querySelectorAll('[data-slot="quota"]').forEach((button) => {
      if (button.textContent.includes("15") || button.textContent.includes("秒") || button.textContent.includes("s")) {
        button.textContent = tm().editor.quotaVideo;
      } else if (button.textContent.includes("5")) {
        button.textContent = tm().editor.quotaAudio;
      }
    });
  }

  function persistSnapshot() {
    if (!projectId || typeof serializeCanvasState !== "function") return;
    const snapshot = clone(serializeCanvasState());
    store.saveSnapshot(projectId, snapshot);
  }

  function schedulePersist() {
    clearTimeout(schedulePersist.timer);
    schedulePersist.timer = setTimeout(persistSnapshot, 220);
  }

  if (!projectId) {
    window.location.replace("./index.html");
    return;
  }

  const project = store.getProject(projectId);
  if (!project) {
    window.location.replace("./index.html");
    return;
  }

  applyProjectTitle(project);
  applyEditorLocale();

  if (project.snapshot && Array.isArray(project.snapshot.nodes) && project.snapshot.nodes.length) {
    restoreSnapshot(clone(project.snapshot));
  } else {
    persistSnapshot();
  }

  if (floatingTitleTrigger) {
    const goBack = (event) => {
      event.preventDefault();
      persistSnapshot();
      window.location.href = "./index.html";
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
      applyEditorLocale();
      return result;
    };
  }

  window.addEventListener("pointerup", schedulePersist);
  window.addEventListener("keyup", schedulePersist);
  window.addEventListener("beforeunload", persistSnapshot);
  window.addEventListener("storage", () => {
    currentLocale = store.getLocale();
    applyEditorLocale();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) persistSnapshot();
  });
})();
