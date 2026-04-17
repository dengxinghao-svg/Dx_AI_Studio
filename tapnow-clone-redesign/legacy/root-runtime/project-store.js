(function () {
  const STORAGE_KEY = "dx_ai_studio_projects_v1";

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { nextProjectIndex: 1, lastOpenedProjectId: null, locale: "zh-CN", projects: [] };
      }
      const parsed = JSON.parse(raw);
      return {
        nextProjectIndex: parsed.nextProjectIndex || 1,
        lastOpenedProjectId: parsed.lastOpenedProjectId || null,
        locale: parsed.locale || "zh-CN",
        projects: Array.isArray(parsed.projects) ? parsed.projects : []
      };
    } catch {
      return { nextProjectIndex: 1, lastOpenedProjectId: null, locale: "zh-CN", projects: [] };
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function listProjects() {
    return readStore().projects;
  }

  function getProject(projectId) {
    return readStore().projects.find((project) => project.id === projectId) || null;
  }

  function createProject(payload = {}) {
    const store = readStore();
    const index = store.nextProjectIndex++;
    const now = Date.now();
    const project = {
      id: `project-${now}-${Math.random().toString(36).slice(2, 6)}`,
      name: payload.name || `未命名项目 (${index})`,
      createdAt: now,
      updatedAt: now,
      snapshot: payload.snapshot || null
    };
    store.projects.unshift(project);
    store.lastOpenedProjectId = project.id;
    writeStore(store);
    return clone(project);
  }

  function updateProject(projectId, updater) {
    const store = readStore();
    const index = store.projects.findIndex((project) => project.id === projectId);
    if (index < 0) return null;

    const current = store.projects[index];
    const next = typeof updater === "function"
      ? updater(clone(current))
      : { ...current, ...updater };

    store.projects[index] = {
      ...current,
      ...next,
      updatedAt: Date.now()
    };
    writeStore(store);
    return clone(store.projects[index]);
  }

  function renameProject(projectId, name) {
    return updateProject(projectId, (project) => ({
      ...project,
      name: name || project.name
    }));
  }

  function saveSnapshot(projectId, snapshot) {
    return updateProject(projectId, (project) => ({
      ...project,
      snapshot: clone(snapshot)
    }));
  }

  function deleteProject(projectId) {
    const store = readStore();
    store.projects = store.projects.filter((project) => project.id !== projectId);
    if (store.lastOpenedProjectId === projectId) {
      store.lastOpenedProjectId = store.projects[0]?.id || null;
    }
    writeStore(store);
    return clone(store.projects);
  }

  function setLastOpenedProject(projectId) {
    const store = readStore();
    store.lastOpenedProjectId = projectId;
    writeStore(store);
  }

  function getLastOpenedProjectId() {
    return readStore().lastOpenedProjectId;
  }

  function getLocale() {
    return readStore().locale || "zh-CN";
  }

  function setLocale(locale) {
    const store = readStore();
    store.locale = locale || "zh-CN";
    writeStore(store);
    return store.locale;
  }

  window.DxProjectStore = {
    clone,
    listProjects,
    getProject,
    createProject,
    updateProject,
    renameProject,
    saveSnapshot,
    deleteProject,
    setLastOpenedProject,
    getLastOpenedProjectId,
    getLocale,
    setLocale
  };
})();

