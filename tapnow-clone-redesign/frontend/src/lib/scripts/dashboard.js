(function () {
  const store = window.DxProjectStore;
  const projectGallery = document.getElementById("projectGallery");
  const searchInput = document.getElementById("projectSearchInput");
  const filterBtn = document.getElementById("projectFilterBtn");
  const gridBtn = document.getElementById("projectGridBtn");
  const listBtn = document.getElementById("projectListBtn");
  const languageToggleBtn = document.getElementById("languageToggleBtn");
  const languageMenu = document.getElementById("languageMenu");
  const newBtn = document.getElementById("dashboardNewProjectBtn");
  const cardMenu = document.getElementById("projectCardMenu");

  let activeMenuProjectId = null;
  let currentLocale = store.getLocale();

  const messages = {
    "zh-CN": {
      workspace: "工作空间",
      personal: "个人",
      searchPlaceholder: "搜索项目",
      showAll: "显示全部",
      grid: "网格视图",
      list: "列表视图",
      languageTitle: "语言",
      newProject: "+ 新建项目",
      createProject: "新建项目",
      projectMenu: "项目菜单",
      blankPanel: "独立空白面板",
      lastEdited: (value) => `最后修改：${value}`,
      open: "打开",
      rename: "重命名",
      move: "移动至...",
      delete: "删除",
      renamePrompt: "输入新的项目名称",
      moveReserved: (name) => `“${name}”的移动功能已预留。`,
      keepOne: "至少保留一个项目。",
      english: "English",
      chinese: "简体中文",
      languageShort: "CN"
    },
    en: {
      workspace: "Workspace",
      personal: "Personal",
      searchPlaceholder: "Search projects",
      showAll: "Show all",
      grid: "Grid view",
      list: "List view",
      languageTitle: "Language",
      newProject: "+ New Project",
      createProject: "New Project",
      projectMenu: "Project menu",
      blankPanel: "Independent blank canvas",
      lastEdited: (value) => `Last edited: ${value}`,
      open: "Open",
      rename: "Rename",
      move: "Move to...",
      delete: "Delete",
      renamePrompt: "Enter a new project name",
      moveReserved: (name) => `Move is reserved for "${name}".`,
      keepOne: "Keep at least one project.",
      english: "English",
      chinese: "简体中文",
      languageShort: "EN"
    }
  };

  function t() {
    return messages[currentLocale] || messages["zh-CN"];
  }

  function formatUpdatedAt(timestamp) {
    if (!timestamp) return t().blankPanel;
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const value = currentLocale === "en"
      ? `${year}-${month}-${day} ${hour}:${minute}`
      : `${year}年${month}月${day}日 ${hour}:${minute}`;
    return t().lastEdited(value);
  }

  function buildProjectPreview(project) {
    const imageNode = project.snapshot?.nodes?.find((node) => node.type === "image" && node.src);
    if (imageNode?.src) {
      return `<img src="${imageNode.src}" alt="${project.name}">`;
    }
    return '<div class="project-card__cover-gradient"></div>';
  }

  function navigateToEditor(projectId) {
    store.setLastOpenedProject(projectId);
    window.location.href = `../editor/index.html?project=${encodeURIComponent(projectId)}`;
  }

  function applyDashboardLocale() {
    document.documentElement.lang = currentLocale === "en" ? "en" : "zh-CN";
    document.title = "Dx_AI_Studio";
    document.querySelector(".workspace-dashboard__nav-link").textContent = t().workspace;
    document.querySelector(".workspace-dashboard__tab").textContent = t().personal;
    searchInput.placeholder = t().searchPlaceholder;
    filterBtn.textContent = t().showAll;
    gridBtn.title = t().grid;
    listBtn.title = t().list;
    languageToggleBtn.title = t().languageTitle;
    languageToggleBtn.textContent = t().languageShort;
    newBtn.textContent = t().newProject;
    cardMenu.querySelector('[data-action="open"]').textContent = t().open;
    cardMenu.querySelector('[data-action="rename"]').textContent = t().rename;
    cardMenu.querySelector('[data-action="move"]').textContent = t().move;
    cardMenu.querySelector('[data-action="delete"]').textContent = t().delete;
    languageMenu.querySelector('[data-locale="en"]').textContent = t().english;
    languageMenu.querySelector('[data-locale="zh-CN"]').textContent = t().chinese;
    languageMenu.querySelectorAll("[data-locale]").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.locale === currentLocale);
    });
  }

  function renderProjects() {
    projectGallery.querySelectorAll(".project-card:not(.project-card--create)").forEach((card) => card.remove());
    projectGallery.querySelector(".project-card--create .project-card__create-text").textContent = t().createProject;

    store.listProjects().forEach((project) => {
      const card = document.createElement("article");
      card.className = "project-card";
      card.dataset.projectId = project.id;
      card.dataset.projectName = project.name;
      card.innerHTML = `
        <button class="project-card__menu-trigger" type="button" data-project-menu="${project.id}" title="${t().projectMenu}">
          <span>⋮</span>
        </button>
        <div class="project-card__cover">${buildProjectPreview(project)}</div>
        <div class="project-card__content">
          <h3 class="project-card__title">${project.name}</h3>
          <p class="project-card__meta">${formatUpdatedAt(project.updatedAt)}</p>
        </div>
      `;
      projectGallery.appendChild(card);
    });

    filterProjects();
  }

  function filterProjects() {
    const keyword = (searchInput.value || "").trim().toLowerCase();
    projectGallery.querySelectorAll(".project-card").forEach((card) => {
      if (card.dataset.projectAction === "new") {
        card.classList.remove("is-hidden");
        return;
      }
      const name = (card.dataset.projectName || "").toLowerCase();
      card.classList.toggle("is-hidden", !!keyword && !name.includes(keyword));
    });
  }

  function hideMenu() {
    cardMenu.classList.add("hidden");
    document.querySelectorAll(".project-card.is-menu-open").forEach((card) => {
      card.classList.remove("is-menu-open");
    });
    activeMenuProjectId = null;
  }

  function showMenu(projectId, anchor) {
    const rect = anchor.getBoundingClientRect();
    cardMenu.style.left = `${Math.min(window.innerWidth - 172, rect.right - 150)}px`;
    cardMenu.style.top = `${Math.min(window.innerHeight - 220, rect.bottom + 8)}px`;
    cardMenu.classList.remove("hidden");
    document.querySelectorAll(".project-card.is-menu-open").forEach((card) => {
      card.classList.remove("is-menu-open");
    });
    anchor.closest(".project-card")?.classList.add("is-menu-open");
    activeMenuProjectId = projectId;
  }

  function hideLanguageMenu() {
    languageMenu.classList.add("hidden");
  }

  function showLanguageMenu() {
    const rect = languageToggleBtn.getBoundingClientRect();
    languageMenu.style.left = `${Math.min(window.innerWidth - 160, rect.left)}px`;
    languageMenu.style.top = `${rect.bottom + 8}px`;
    languageMenu.classList.remove("hidden");
  }

  function createProjectAndOpen() {
    const project = store.createProject();
    navigateToEditor(project.id);
  }

  function renameProject(projectId) {
    const project = store.getProject(projectId);
    if (!project) return;
    const nextName = window.prompt(t().renamePrompt, project.name);
    if (!nextName) return;
    store.renameProject(projectId, nextName.trim() || project.name);
    renderProjects();
  }

  function moveProject(projectId) {
    const project = store.getProject(projectId);
    if (!project) return;
    window.alert(t().moveReserved(project.name));
  }

  function deleteProject(projectId) {
    const projects = store.listProjects();
    if (projects.length <= 1) {
      window.alert(t().keepOne);
      return;
    }
    store.deleteProject(projectId);
    hideMenu();
    renderProjects();
  }

  function setLocale(locale) {
    currentLocale = store.setLocale(locale);
    applyDashboardLocale();
    renderProjects();
    hideLanguageMenu();
  }

  function bindEvents() {
    searchInput.addEventListener("input", filterProjects);
    filterBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterProjects();
    });
    gridBtn.addEventListener("click", () => {
      projectGallery.classList.remove("is-list");
      gridBtn.classList.add("is-active");
      listBtn.classList.remove("is-active");
    });
    listBtn.addEventListener("click", () => {
      projectGallery.classList.add("is-list");
      listBtn.classList.add("is-active");
      gridBtn.classList.remove("is-active");
    });
    languageToggleBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (languageMenu.classList.contains("hidden")) {
        showLanguageMenu();
      } else {
        hideLanguageMenu();
      }
    });
    languageMenu.addEventListener("click", (event) => {
      const locale = event.target.closest("[data-locale]")?.dataset.locale;
      if (!locale) return;
      setLocale(locale);
    });
    newBtn.addEventListener("click", createProjectAndOpen);

    projectGallery.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-project-menu]");
      if (trigger) {
        event.stopPropagation();
        const projectId = trigger.dataset.projectMenu;
        if (activeMenuProjectId === projectId && !cardMenu.classList.contains("hidden")) {
          hideMenu();
        } else {
          showMenu(projectId, trigger);
        }
        return;
      }

      const card = event.target.closest(".project-card");
      if (!card) return;
      if (card.dataset.projectAction === "new") {
        createProjectAndOpen();
        return;
      }
      navigateToEditor(card.dataset.projectId);
    });

    cardMenu.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (!action || !activeMenuProjectId) return;
      if (action === "open") navigateToEditor(activeMenuProjectId);
      if (action === "rename") renameProject(activeMenuProjectId);
      if (action === "move") moveProject(activeMenuProjectId);
      if (action === "delete") deleteProject(activeMenuProjectId);
      if (action !== "delete") hideMenu();
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("#projectCardMenu") && !event.target.closest("[data-project-menu]")) {
        hideMenu();
      }
      if (!event.target.closest("#languageMenu") && !event.target.closest("#languageToggleBtn")) {
        hideLanguageMenu();
      }
    });

    window.addEventListener("storage", () => {
      currentLocale = store.getLocale();
      applyDashboardLocale();
      renderProjects();
    });
  }

  applyDashboardLocale();
  renderProjects();
  bindEvents();
})();
