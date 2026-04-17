// Editor module: workflow execution, run controls, and output summaries

function getWorkflowStatusLabel(status = DEFAULT_NODE_STATUS) {
  const map = {
    [DEFAULT_NODE_STATUS]: "空闲",
    queued: "排队中",
    running: "执行中",
    done: "已完成",
    error: "出错"
  };
  return map[status] || status || DEFAULT_NODE_STATUS;
}

function getWorkflowStatusTone(status = DEFAULT_NODE_STATUS) {
  if (status === "running") return "running";
  if (status === "done") return "done";
  if (status === "error") return "error";
  if (status === "queued") return "queued";
  return "idle";
}

function formatWorkflowTimestamp(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function getWorkflowOutputType(node) {
  if (!node?.output) return "-";
  return node.output.type || "-";
}

function getWorkflowOutputSummary(node) {
  if (!node?.output) return "当前节点尚未产生输出。";
  return node.output.summary || node.output.previewText || node.output.prompt || "当前节点已有输出，可继续向下游传递。";
}

function getWorkflowOutputPreviewMarkup(node) {
  if (!node?.output) {
    return '<p class="workflow-output-preview__empty">当前节点尚未产生输出。</p>';
  }

  if (node.output.type === "image" && node.output.previewUrl) {
    return `
      <figure class="workflow-output-preview__figure">
        <img class="workflow-output-preview__image" src="${node.output.previewUrl}" alt="${node.title}">
        <figcaption>${getWorkflowOutputSummary(node)}</figcaption>
      </figure>
    `;
  }

  if (node.output.type === "video" && node.output.previewUrl) {
    return `
      <figure class="workflow-output-preview__figure">
        <img class="workflow-output-preview__image" src="${node.output.previewUrl}" alt="${node.title}">
        <figcaption>${getWorkflowOutputSummary(node)}</figcaption>
      </figure>
    `;
  }

  if (node.output.type === "audio") {
    return `
      <div class="workflow-output-preview__card">
        <strong>音频结果</strong>
        <p>${getWorkflowOutputSummary(node)}</p>
      </div>
    `;
  }

  return `
    <div class="workflow-output-preview__card">
      <strong>${node.title}</strong>
      <p>${escapeHtml(getWorkflowOutputSummary(node))}</p>
    </div>
  `;
}

function getWorkflowSuggestions(node) {
  if (!node) {
    return [
      "先选中一个节点，再执行当前节点或整条链。",
      "通过连线建立 upstream / downstream 后，结果会自动向下游传递。",
      "优先从文本或素材节点开始，方便后续节点获得更稳定的输入。"
    ];
  }

  if (node.status === "error") {
    return [
      "当前节点执行失败，建议先检查上游输入是否完整。",
      "如果是图片、视频或音频节点，可以先确认 Prompt 是否足够明确。",
      "也可以点击“重置状态”后重新执行当前链路。"
    ];
  }

  if (!node.upstream?.length) {
    return [
      "当前节点没有上游输入，执行时会仅依赖自身 Prompt 或内容。",
      "可以先连接文本或参考素材，再执行下游链路。",
      "如果它是起始节点，建议先补充更完整的 Prompt。"
    ];
  }

  if (node.status === "done") {
    return [
      "当前节点已经有结果，可以继续执行下游节点。",
      "如果想对比不同结果，可以复制当前节点后再分支执行。",
      "右侧执行摘要已经展示本次输出，可作为继续生成的上下文。"
    ];
  }

  return [
    "当前节点已经接入上游素材，可以直接执行当前节点。",
    "执行整条链时，会优先刷新上游结果，再推进下游节点。",
    "如果只想验证局部链路，优先使用“执行当前节点”。"
  ];
}

function syncWorkflowActionButtons() {
  const disabled = state.isExecutingWorkflow;
  [runBtn, runSelectedNodeBtn, runChainBtn, resetWorkflowBtn].forEach((button) => {
    if (!button) return;
    button.disabled = disabled;
    button.classList.toggle("is-disabled", disabled);
  });
}

function getNodeExecutionMeta(node) {
  if (!node) {
    return {
      statusLabel: getWorkflowStatusLabel(),
      runCountLabel: "0 次",
      lastRunLabel: "-"
    };
  }

  return {
    statusLabel: getWorkflowStatusLabel(node.status),
    runCountLabel: `${node.runCount || 0} 次`,
    lastRunLabel: formatWorkflowTimestamp(node.lastRunAt)
  };
}

function updateWorkflowWorkbench() {
  const node = getNode(state.selectedNodeId);

  if (summaryTitle) {
    summaryTitle.textContent = node
      ? `${node.title} / ${node.type.toUpperCase()}`
      : `画布总览 / ${state.nodes.length} 节点`;
  }

  if (summaryMeta) {
    summaryMeta.textContent = node
      ? `当前节点状态为 ${node.status || DEFAULT_NODE_STATUS}，已接入 ${(node.upstream || []).length} 个上游节点，并连接到 ${(node.downstream || []).length} 个下游节点。`
      : "当前画布聚焦在节点工作流本身，右侧信息会随选中节点实时更新。";
  }

  if (!node) {
    if (workflowExecutionMode) workflowExecutionMode.textContent = "未执行";
    if (workflowLastRunValue) workflowLastRunValue.textContent = "-";
    if (workflowRunCountValue) workflowRunCountValue.textContent = "0";
    if (workflowInputCountValue) workflowInputCountValue.textContent = "0";
    if (workflowOutputTypeValue) workflowOutputTypeValue.textContent = "-";
    if (workflowSummaryValue) workflowSummaryValue.textContent = "请先选择节点后查看执行信息。";
    if (workflowErrorValue) workflowErrorValue.textContent = "无";
    if (workflowOutputPreview) workflowOutputPreview.innerHTML = '<p class="workflow-output-preview__empty">当前节点尚未产生输出。</p>';
    if (document.getElementById("analysisList")) {
      document.getElementById("analysisList").innerHTML = getWorkflowSuggestions(null).map((item) => `<li>${item}</li>`).join("");
    }
    return;
  }

  if (workflowExecutionMode) {
    workflowExecutionMode.textContent = state.activeExecutionMode || "单节点";
  }
  if (workflowLastRunValue) {
    workflowLastRunValue.textContent = formatWorkflowTimestamp(node.lastRunAt);
  }
  if (workflowRunCountValue) {
    workflowRunCountValue.textContent = String(node.runCount || 0);
  }
  if (workflowInputCountValue) {
    workflowInputCountValue.textContent = String((node.inputs || []).length);
  }
  if (workflowOutputTypeValue) {
    workflowOutputTypeValue.textContent = getWorkflowOutputType(node);
  }
  if (workflowSummaryValue) {
    workflowSummaryValue.textContent = getWorkflowOutputSummary(node);
  }
  if (workflowErrorValue) {
    workflowErrorValue.textContent = node.error || "无";
  }
  if (workflowOutputPreview) {
    workflowOutputPreview.innerHTML = getWorkflowOutputPreviewMarkup(node);
  }

  const analysisList = document.getElementById("analysisList");
  if (analysisList) {
    analysisList.innerHTML = getWorkflowSuggestions(node).map((item) => `<li>${item}</li>`).join("");
  }
}

function collectReachableNodeIds(startNodeId, options = {}) {
  const includeUpstream = options.includeUpstream !== false;
  const includeDownstream = !!options.includeDownstream;
  const visited = new Set();

  function visit(nodeId) {
    if (!nodeId || visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = getNode(nodeId);
    if (!node) return;
    if (includeUpstream) {
      (node.upstream || []).forEach(visit);
    }
    if (includeDownstream) {
      (node.downstream || []).forEach(visit);
    }
  }

  visit(startNodeId);
  return visited;
}

function sortWorkflowNodeIds(nodeIds) {
  const scoped = [...nodeIds].map((id) => getNode(id)).filter(Boolean);
  const remaining = new Map(
    scoped.map((node) => [node.id, new Set((node.upstream || []).filter((id) => nodeIds.has(id)))])
  );
  const ordered = [];
  const queue = [...remaining.entries()]
    .filter(([, deps]) => deps.size === 0)
    .map(([id]) => id)
    .sort();

  while (queue.length) {
    const currentId = queue.shift();
    if (!remaining.has(currentId)) continue;
    ordered.push(currentId);
    remaining.delete(currentId);
    remaining.forEach((deps, nodeId) => {
      if (deps.delete(currentId) && deps.size === 0) {
        queue.push(nodeId);
        queue.sort();
      }
    });
  }

  if (remaining.size) {
    ordered.push(...[...remaining.keys()].sort());
  }
  return ordered;
}

function collectNodeInputs(node) {
  return (node.upstream || [])
    .map((id) => getNode(id))
    .filter(Boolean)
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status || DEFAULT_NODE_STATUS,
      output: item.output || null,
      src: item.src || ""
    }));
}

function applyExecutionResult(node, result) {
  node.status = result.status || "done";
  node.output = result.output ?? null;
  node.error = null;
  node.lastRunAt = result.completedAt || Date.now();
  node.runCount = (node.runCount || 0) + 1;
  if (["image", "video"].includes(node.type) && node.sourceKind !== "upload" && result.output?.previewUrl) {
    node.src = result.output.previewUrl;
  }
  renderNode(node);
}

function markNodeExecutionError(node, error) {
  node.status = "error";
  node.error = error?.message || "执行失败";
  node.lastRunAt = Date.now();
  renderNode(node);
}

async function executeWorkflowPlan(rootNodeId, options = {}) {
  const rootNode = getNode(rootNodeId);
  if (!rootNode || state.isExecutingWorkflow) return;

  rememberHistory();
  state.isExecutingWorkflow = true;
  state.activeExecutionMode = options.includeDownstream ? "整条链" : "单节点";
  syncWorkflowActionButtons();

  const reachableIds = collectReachableNodeIds(rootNodeId, {
    includeUpstream: true,
    includeDownstream: !!options.includeDownstream
  });
  const orderedIds = sortWorkflowNodeIds(reachableIds);

  orderedIds.forEach((id) => {
    const node = getNode(id);
    if (!node) return;
    node.status = "queued";
    node.error = null;
    renderNode(node);
  });
  updateSession();
  updateEditorPanel();

  try {
    for (const nodeId of orderedIds) {
      const node = getNode(nodeId);
      if (!node) continue;

      node.inputs = collectNodeInputs(node);
      node.status = "running";
      renderNode(node);
      updateSession();
      updateEditorPanel();

      const result = await window.DxWorkflowApi.executeNode({
        node: {
          id: node.id,
          type: node.type,
          title: node.title,
          prompt: node.prompt,
          content: node.content,
          model: node.model,
          settings: { ...(node.settings || {}) },
          referenceAsset: node.referenceAsset ? { ...node.referenceAsset } : null
        },
        prompt: node.prompt,
        content: node.content,
        model: node.model,
        settings: { ...(node.settings || {}) },
        referenceAsset: node.referenceAsset ? { ...node.referenceAsset } : null,
        inputs: node.inputs,
        mode: state.activeExecutionMode
      });

      applyExecutionResult(node, result);
      updateSession();
      updateEditorPanel();
    }

    setStatus(
      options.includeDownstream
        ? "已完成整条链执行。"
        : `已完成“${rootNode.title}”执行。`
    );
  } catch (error) {
    const activeNode = orderedIds.map((id) => getNode(id)).find((node) => node?.status === "running");
    if (activeNode) {
      markNodeExecutionError(activeNode, error);
    }
    orderedIds.forEach((id) => {
      const node = getNode(id);
      if (node && node.status === "queued") {
        node.status = DEFAULT_NODE_STATUS;
        renderNode(node);
      }
    });
    setStatus(error?.message || "工作流执行失败。");
  } finally {
    state.isExecutingWorkflow = false;
    syncWorkflowActionButtons();
    updateSession();
    updateEditorPanel();
  }
}

function runSelectedNodeWorkflow() {
  const node = getNode(state.selectedNodeId);
  if (!node) {
    setStatus("请先选中一个节点。");
    return;
  }
  executeWorkflowPlan(node.id, { includeDownstream: false });
}

function runSelectedChainWorkflow() {
  const node = getNode(state.selectedNodeId);
  if (node) {
    executeWorkflowPlan(node.id, { includeDownstream: true });
    return;
  }

  const firstNode = state.nodes[0];
  if (!firstNode) {
    setStatus("当前画布没有可执行的节点。");
    return;
  }
  executeWorkflowPlan(firstNode.id, { includeDownstream: true });
}

function resetWorkflowState(targetNodeId = state.selectedNodeId) {
  rememberHistory();
  const ids = targetNodeId
    ? collectReachableNodeIds(targetNodeId, { includeUpstream: true, includeDownstream: true })
    : new Set(state.nodes.map((node) => node.id));

  ids.forEach((id) => {
    const node = getNode(id);
    if (!node) return;
    node.status = DEFAULT_NODE_STATUS;
    node.inputs = [];
    node.output = null;
    node.error = null;
    node.lastRunAt = null;
    node.runCount = 0;
    if (node.sourceKind !== "upload" && node.type !== "text") {
      node.src = "";
    }
    renderNode(node);
  });

  state.activeExecutionMode = null;
  updateSession();
  updateEditorPanel();
  setStatus("已重置当前工作流状态。");
}
