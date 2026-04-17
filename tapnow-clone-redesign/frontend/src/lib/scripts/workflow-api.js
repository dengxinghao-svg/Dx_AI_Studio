(function () {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function buildSummary(node, inputs, settings = {}, referenceAsset = null) {
    const upstream = inputs.length
      ? `基于 ${inputs.map((item) => item.title).join("、")} 的输入`
      : "基于当前节点自身内容";
    const model = node.model ? `，模型为 ${node.model}` : "";
    const settingText = Object.entries(settings || {})
      .slice(0, 3)
      .map(([, value]) => value)
      .filter(Boolean)
      .join(" / ");
    const settingSuffix = settingText ? `，参数：${settingText}` : "";
    const referenceSuffix = referenceAsset?.name ? `，参考素材：${referenceAsset.name}` : "";
    return `${upstream}${model}${settingSuffix}${referenceSuffix}，已完成 ${node.title} 的模拟执行。`;
  }

  async function executeNode(payload = {}) {
    const node = payload.node || {};
    const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
    const settings = payload.settings || node.settings || {};
    const referenceAsset = payload.referenceAsset || node.referenceAsset || null;
    const latency = 260 + Math.min(inputs.length * 90, 420);
    await delay(latency);

    if (payload.shouldFail) {
      const error = new Error(`模拟执行失败：${node.title || "未命名节点"}`);
      error.code = "MOCK_WORKFLOW_FAILURE";
      throw error;
    }

    const plainText = String(payload.content || payload.prompt || node.prompt || node.title || "").trim();
    const previewUrl = typeof window.previewSvg === "function"
      ? window.previewSvg(node.type || "image", node.title || "Untitled")
      : "";
    const summary = buildSummary(node, inputs, settings, referenceAsset);
    const outputByType = {
      text: {
        type: "document",
        summary,
        text: plainText || "已生成文档草稿。",
        previewText: (plainText || summary).slice(0, 160)
      },
      image: {
        type: "image",
        summary,
        prompt: plainText || "已生成图片结果。",
        previewUrl,
        model: payload.model || node.model || "",
        settings: { ...settings }
      },
      video: {
        type: "video",
        summary,
        prompt: plainText || "已生成视频分镜结果。",
        previewUrl,
        duration: settings.duration || "3秒",
        model: payload.model || node.model || "",
        settings: { ...settings }
      },
      audio: {
        type: "audio",
        summary,
        prompt: plainText || "已生成音频描述结果。",
        waveform: true,
        duration: settings.speed || "标准",
        model: payload.model || node.model || "",
        settings: { ...settings }
      }
    };

    return {
      status: "done",
      completedAt: Date.now(),
      output: outputByType[node.type] || {
        type: "unknown",
        summary
      }
    };
  }

  async function executeWorkflow(payload = {}) {
    const steps = Array.isArray(payload.steps) ? payload.steps : [];
    const results = [];
    for (const step of steps) {
      const result = await executeNode(step);
      results.push({ nodeId: step.node?.id, ...result });
    }
    return {
      completedAt: Date.now(),
      results
    };
  }

  window.DxWorkflowApi = {
    executeNode,
    executeWorkflow
  };
})();
