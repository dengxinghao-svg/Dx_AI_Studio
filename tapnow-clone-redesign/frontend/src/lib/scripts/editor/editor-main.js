// Editor module: bootstrap entrypoint

localizeUi();
bindEvents();
setStatus("空闲");
seedPresetNodes();
renderConnections();
renderMinimap();
updateEditorPanel();
syncWorkflowActionButtons();
ui.groupColorList.innerHTML = GROUP_SWATCHES.map((item) => `
  <button class="group-color-menu__swatch" data-color="${item.value}" title="${item.name}" style="--swatch:${item.value}"></button>
`).join("");
ui.groupColorList.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveGroupColor(button.dataset.color);
    ui.groupColorMenu.classList.add("hidden");
    updateGroupToolbar();
  });
});
ui.groupToolbar.addEventListener("mouseleave", () => {
  if (!state.activeGroupId) {
    state.hoveredGroupId = null;
    hideGroupToolbar();
  }
});
ui.groupColorMenu.addEventListener("mouseleave", () => {
  if (!state.activeGroupId) {
    state.hoveredGroupId = null;
    hideGroupToolbar();
  }
});
