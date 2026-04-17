(function () {
  const STORAGE_KEY = "dx_ai_studio_projects_v1";
  const STORE_VERSION = 2;
  const UNTITLED_ZH = /^未命名项目(?:\s+|\s*\()(\d+)\)?$/;
  const UNTITLED_EN = /^Untitled Project(?:\s+|\s*\()(\d+)\)?$/i;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function defaultProjectName(locale, projectNumber) {
    return locale === "en" ? `Untitled Project ${projectNumber}` : `未命名项目 ${projectNumber}`;
  }

  function isUntitledName(name) {
    const value = String(name || "").trim();
    return !value || UNTITLED_ZH.test(value) || UNTITLED_EN.test(value);
  }

  function getFirstAvailableNumber(usedNumbers) {
    let next = 1;
    while (usedNumbers.has(next)) next += 1;
    return next;
  }

  function sortProjects(projects) {
    return [...projects].sort((a, b) => {
      const updatedDiff = (b.updatedAt || 0) - (a.updatedAt || 0);
      if (updatedDiff !== 0) return updatedDiff;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }

  function normalizeSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return {
      ...clone(snapshot),
      version: snapshot.version || 1,
      savedAt: snapshot.savedAt || Date.now()
    };
  }

  function normalizeProjects(projects, locale) {
    const source = Array.isArray(projects) ? projects : [];
    const orderedByCreation = [...source].sort((a, b) => {
      const createdDiff = (a.createdAt || a.updatedAt || 0) - (b.createdAt || b.updatedAt || 0);
      if (createdDiff !== 0) return createdDiff;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    const numberById = new Map();
    orderedByCreation.forEach((project, index) => {
      numberById.set(project.id, index + 1);
    });

    const normalized = source.map((project) => {
      const item = { ...project };
      item.projectNumber = numberById.get(project.id) || 1;
      item.createdAt = item.createdAt || item.updatedAt || Date.now();
      item.updatedAt = item.updatedAt || item.createdAt;
      item.snapshot = normalizeSnapshot(item.snapshot);
      item.snapshotVersion = item.snapshot?.version || item.snapshotVersion || null;
      if (isUntitledName(item.name)) {
        item.name = defaultProjectName(locale, item.projectNumber);
      }
      return item;
    });

    return sortProjects(normalized);
  }

  function readStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { version: STORE_VERSION, nextProjectIndex: 1, lastOpenedProjectId: null, locale: "zh-CN", projects: [] };
      }
      const parsed = JSON.parse(raw);
      const locale = parsed.locale || "zh-CN";
      return {
        version: parsed.version || STORE_VERSION,
        nextProjectIndex: 1,
        lastOpenedProjectId: parsed.lastOpenedProjectId || null,
        locale,
        projects: normalizeProjects(parsed.projects, locale)
      };
    } catch {
      return { version: STORE_VERSION, nextProjectIndex: 1, lastOpenedProjectId: null, locale: "zh-CN", projects: [] };
    }
  }

  function writeStore(store) {
    const locale = store.locale || "zh-CN";
    const normalizedStore = {
      ...store,
      version: STORE_VERSION,
      nextProjectIndex: 1,
      locale,
      projects: normalizeProjects(store.projects, locale)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedStore));
  }

  function listProjects() {
    return clone(readStore().projects);
  }

  function getProject(projectId) {
    return readStore().projects.find((project) => project.id === projectId) || null;
  }

  function createProject(payload = {}) {
    const store = readStore();
    const usedNumbers = new Set(store.projects.map((project) => project.projectNumber).filter(Boolean));
    const projectNumber = payload.projectNumber || getFirstAvailableNumber(usedNumbers);
    const now = Date.now();
    const project = {
      id: `project-${now}-${Math.random().toString(36).slice(2, 6)}`,
      projectNumber,
      name: payload.name || defaultProjectName(store.locale, projectNumber),
      createdAt: now,
      updatedAt: now,
      snapshot: normalizeSnapshot(payload.snapshot),
      snapshotVersion: payload.snapshot?.version || null
    };
    store.projects = sortProjects([project, ...store.projects]);
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
      projectNumber: next.projectNumber || current.projectNumber,
      snapshot: normalizeSnapshot(next.snapshot !== undefined ? next.snapshot : current.snapshot),
      snapshotVersion: (next.snapshot && next.snapshot.version) || next.snapshotVersion || current.snapshotVersion || null,
      updatedAt: Date.now()
    };
    store.projects = sortProjects(store.projects);
    writeStore(store);
    return clone(store.projects.find((project) => project.id === projectId) || null);
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
      snapshot: normalizeSnapshot(snapshot),
      snapshotVersion: snapshot?.version || project.snapshotVersion || null
    }));
  }

  function deleteProject(projectId) {
    const store = readStore();
    store.projects = sortProjects(store.projects.filter((project) => project.id !== projectId));
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
    setLocale,
    normalizeSnapshot
  };
})();
