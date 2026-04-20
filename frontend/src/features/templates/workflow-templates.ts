import type { AppLanguage } from '../../shared/i18n/messages'
import type { CanvasSnapshot } from '../../shared/types/canvas'
import { createCanvasNode, normalizeCanvasSnapshot } from '../canvas/mock-canvas'

export type WorkflowTemplateKey =
  | 'meeting-notes'
  | 'weekly-report'
  | 'requirement-breakdown'
  | 'prompt-organizer'
  | 'campaign-planner'

export interface WorkflowTemplateDefinition {
  key: WorkflowTemplateKey
  title: Record<AppLanguage, string>
  summary: Record<AppLanguage, string>
  createProjectName: (language: AppLanguage) => string
  buildSnapshot: (language: AppLanguage, projectName: string) => CanvasSnapshot
}

function buildMeetingNotes(language: AppLanguage) {
  return normalizeCanvasSnapshot({
    nodes: [
      createCanvasNode('text', { x: 80, y: 120 }, language, {
        id: 'meeting-input',
        title: language === 'zh-CN' ? '会议原始记录' : 'Meeting Raw Notes',
        description:
          language === 'zh-CN'
            ? '粘贴会议纪要、录音转写或零散记录。'
            : 'Paste raw meeting notes, transcriptions, or loose bullets.',
        prompt:
          language === 'zh-CN'
            ? '保留关键事实、负责人、时间节点和风险。'
            : 'Keep key facts, owners, deadlines, and risks.',
      }),
      createCanvasNode('text', { x: 430, y: 90 }, language, {
        id: 'meeting-summary',
        title: language === 'zh-CN' ? '结构化纪要' : 'Structured Summary',
        description:
          language === 'zh-CN'
            ? '整理成摘要、决策、行动项和待确认问题。'
            : 'Turn notes into summary, decisions, action items, and open questions.',
        prompt:
          language === 'zh-CN'
            ? '输出格式：会议摘要 / 决策 / 行动项 / 待确认。'
            : 'Output as summary / decisions / action items / open questions.',
      }),
      createCanvasNode('asset', { x: 780, y: 180 }, language, {
        id: 'meeting-output',
        title: language === 'zh-CN' ? '纪要输出' : 'Delivery',
        description:
          language === 'zh-CN'
            ? '沉淀最终可发送给团队的会议纪要。'
            : 'Collect the final shareable meeting summary.',
      }),
    ],
    edges: [
      { id: 'meeting-edge-1', source: 'meeting-input', target: 'meeting-summary' },
      { id: 'meeting-edge-2', source: 'meeting-summary', target: 'meeting-output' },
    ],
    groups: [
      {
        id: 'meeting-group',
        title: language === 'zh-CN' ? '会议整理流程' : 'Meeting Flow',
        nodeIds: ['meeting-input', 'meeting-summary', 'meeting-output'],
        color: '#7c8cff',
      },
    ],
  })
}

function buildWeeklyReport(language: AppLanguage) {
  return normalizeCanvasSnapshot({
    nodes: [
      createCanvasNode('text', { x: 80, y: 120 }, language, {
        id: 'weekly-input',
        title: language === 'zh-CN' ? '本周素材池' : 'Weekly Inputs',
        description:
          language === 'zh-CN'
            ? '汇总本周完成事项、阻塞、数据和下周计划。'
            : 'Collect completed work, blockers, metrics, and next week plans.',
      }),
      createCanvasNode('text', { x: 430, y: 80 }, language, {
        id: 'weekly-summary',
        title: language === 'zh-CN' ? '周报正文' : 'Weekly Report',
        description:
          language === 'zh-CN'
            ? '输出适合团队同步或上级汇报的周报。'
            : 'Draft a polished weekly report for team sync or leadership update.',
        prompt:
          language === 'zh-CN'
            ? '按完成事项 / 风险问题 / 下周计划输出。'
            : 'Organize as completed work / risks / next week plan.',
      }),
      createCanvasNode('text', { x: 430, y: 360 }, language, {
        id: 'weekly-brief',
        title: language === 'zh-CN' ? '一句话汇报' : 'Leadership Brief',
        description:
          language === 'zh-CN'
            ? '压缩成适合 IM 或日报摘要的一段话。'
            : 'Compress the report into a short leadership-ready brief.',
      }),
    ],
    edges: [
      { id: 'weekly-edge-1', source: 'weekly-input', target: 'weekly-summary' },
      { id: 'weekly-edge-2', source: 'weekly-summary', target: 'weekly-brief' },
    ],
    groups: [
      {
        id: 'weekly-group',
        title: language === 'zh-CN' ? '周报流程' : 'Weekly Report Flow',
        nodeIds: ['weekly-input', 'weekly-summary', 'weekly-brief'],
        color: '#5ed1b8',
      },
    ],
  })
}

function buildRequirementBreakdown(language: AppLanguage) {
  return normalizeCanvasSnapshot({
    nodes: [
      createCanvasNode('text', { x: 90, y: 120 }, language, {
        id: 'req-input',
        title: language === 'zh-CN' ? '需求原文' : 'Requirement Source',
        description:
          language === 'zh-CN'
            ? '放入业务需求、反馈、会议结论或口头需求。'
            : 'Paste business requirements, feedback, meeting decisions, or informal asks.',
      }),
      createCanvasNode('text', { x: 420, y: 90 }, language, {
        id: 'req-breakdown',
        title: language === 'zh-CN' ? '需求拆解' : 'Requirement Breakdown',
        description:
          language === 'zh-CN'
            ? '拆成目标、范围、约束、验收标准和依赖。'
            : 'Break requirements into goals, scope, constraints, acceptance, and dependencies.',
      }),
      createCanvasNode('text', { x: 760, y: 220 }, language, {
        id: 'req-task',
        title: language === 'zh-CN' ? '执行清单' : 'Execution Checklist',
        description:
          language === 'zh-CN'
            ? '生成可执行的任务清单和优先级。'
            : 'Generate an execution checklist with priorities.',
      }),
    ],
    edges: [
      { id: 'req-edge-1', source: 'req-input', target: 'req-breakdown' },
      { id: 'req-edge-2', source: 'req-breakdown', target: 'req-task' },
    ],
    groups: [
      {
        id: 'req-group',
        title: language === 'zh-CN' ? '需求分析流程' : 'Requirement Analysis Flow',
        nodeIds: ['req-input', 'req-breakdown', 'req-task'],
        color: '#ffb86a',
      },
    ],
  })
}

function buildPromptOrganizer(language: AppLanguage) {
  return normalizeCanvasSnapshot({
    nodes: [
      createCanvasNode('text', { x: 80, y: 120 }, language, {
        id: 'prompt-goal',
        title: language === 'zh-CN' ? '目标与限制' : 'Goal and Constraints',
        description:
          language === 'zh-CN'
            ? '写清目标、限制、语气和引用素材。'
            : 'Clarify the goal, constraints, tone, and source material.',
      }),
      createCanvasNode('text', { x: 420, y: 90 }, language, {
        id: 'prompt-structured',
        title: language === 'zh-CN' ? '结构化 Prompt' : 'Structured Prompt',
        description:
          language === 'zh-CN'
            ? '沉淀最终可复用的 Prompt 模板。'
            : 'Build the reusable prompt template.',
      }),
      createCanvasNode('asset', { x: 760, y: 210 }, language, {
        id: 'prompt-library',
        title: language === 'zh-CN' ? 'Prompt 库' : 'Prompt Library',
        description:
          language === 'zh-CN'
            ? '保存最终版本、示例输出和适用场景。'
            : 'Store the final prompt, sample output, and use cases.',
      }),
    ],
    edges: [
      { id: 'prompt-edge-1', source: 'prompt-goal', target: 'prompt-structured' },
      { id: 'prompt-edge-2', source: 'prompt-structured', target: 'prompt-library' },
    ],
    groups: [
      {
        id: 'prompt-group',
        title: language === 'zh-CN' ? 'Prompt 整理流程' : 'Prompt Flow',
        nodeIds: ['prompt-goal', 'prompt-structured', 'prompt-library'],
        color: '#7c8cff',
      },
    ],
  })
}

function buildCampaignPlanner(language: AppLanguage) {
  return normalizeCanvasSnapshot({
    nodes: [
      createCanvasNode('text', { x: 80, y: 110 }, language, {
        id: 'campaign-brief',
        title: language === 'zh-CN' ? '传播 Brief' : 'Campaign Brief',
        description:
          language === 'zh-CN'
            ? '整理受众、卖点、渠道和时间节点。'
            : 'Collect audience, message, channels, and timeline.',
      }),
      createCanvasNode('text', { x: 420, y: 80 }, language, {
        id: 'campaign-copy',
        title: language === 'zh-CN' ? '图文文案' : 'Copy Draft',
        description:
          language === 'zh-CN'
            ? '生成标题、短文案和重点卖点。'
            : 'Generate headline, short copy, and key selling points.',
      }),
      createCanvasNode('image', { x: 420, y: 340 }, language, {
        id: 'campaign-visual',
        title: language === 'zh-CN' ? '视觉方向' : 'Visual Direction',
        description:
          language === 'zh-CN'
            ? '把文案转成主视觉和图像提示。'
            : 'Turn the copy into a visual direction and image prompt.',
      }),
      createCanvasNode('asset', { x: 770, y: 210 }, language, {
        id: 'campaign-package',
        title: language === 'zh-CN' ? '交付包' : 'Delivery Pack',
        description:
          language === 'zh-CN'
            ? '沉淀最终文案、视觉和投放备注。'
            : 'Collect the final copy, visuals, and launch notes.',
      }),
    ],
    edges: [
      { id: 'campaign-edge-1', source: 'campaign-brief', target: 'campaign-copy' },
      { id: 'campaign-edge-2', source: 'campaign-copy', target: 'campaign-visual' },
      { id: 'campaign-edge-3', source: 'campaign-copy', target: 'campaign-package' },
      { id: 'campaign-edge-4', source: 'campaign-visual', target: 'campaign-package' },
    ],
    groups: [
      {
        id: 'campaign-group',
        title: language === 'zh-CN' ? '图文策划流程' : 'Campaign Flow',
        nodeIds: ['campaign-brief', 'campaign-copy', 'campaign-visual', 'campaign-package'],
        color: '#ff8b8b',
      },
    ],
  })
}

export const workflowTemplates: WorkflowTemplateDefinition[] = [
  {
    key: 'meeting-notes',
    title: { 'zh-CN': '会议纪要整理', 'en-US': 'Meeting Notes' },
    summary: {
      'zh-CN': '把会议原始记录整理成结构化纪要、行动项和可发送版本。',
      'en-US': 'Turn raw meeting notes into a structured summary, action items, and a final shareable version.',
    },
    createProjectName: (language) => (language === 'zh-CN' ? '会议纪要整理' : 'Meeting Notes'),
    buildSnapshot: buildMeetingNotes,
  },
  {
    key: 'weekly-report',
    title: { 'zh-CN': '周报生成', 'en-US': 'Weekly Report' },
    summary: {
      'zh-CN': '汇总本周事项、风险和计划，输出完整周报与一句话摘要。',
      'en-US': 'Collect weekly progress, risks, and plans, then generate a full report plus a short brief.',
    },
    createProjectName: (language) => (language === 'zh-CN' ? '周报生成' : 'Weekly Report'),
    buildSnapshot: buildWeeklyReport,
  },
  {
    key: 'requirement-breakdown',
    title: { 'zh-CN': '需求拆解', 'en-US': 'Requirement Breakdown' },
    summary: {
      'zh-CN': '把模糊需求拆成目标、范围、验收标准和执行清单。',
      'en-US': 'Break a fuzzy request into goals, scope, acceptance criteria, and an execution checklist.',
    },
    createProjectName: (language) => (language === 'zh-CN' ? '需求拆解' : 'Requirement Breakdown'),
    buildSnapshot: buildRequirementBreakdown,
  },
  {
    key: 'prompt-organizer',
    title: { 'zh-CN': '提示词整理', 'en-US': 'Prompt Organizer' },
    summary: {
      'zh-CN': '沉淀目标、限制与最终 Prompt 模板，形成个人复用库。',
      'en-US': 'Capture goals, constraints, and a final reusable prompt template.',
    },
    createProjectName: (language) => (language === 'zh-CN' ? '提示词整理' : 'Prompt Organizer'),
    buildSnapshot: buildPromptOrganizer,
  },
  {
    key: 'campaign-planner',
    title: { 'zh-CN': '图文内容策划', 'en-US': 'Campaign Planner' },
    summary: {
      'zh-CN': '从传播 brief 到图文文案、主视觉和最终交付包。',
      'en-US': 'Go from a campaign brief to copy, visual direction, and a final delivery package.',
    },
    createProjectName: (language) => (language === 'zh-CN' ? '图文内容策划' : 'Campaign Planner'),
    buildSnapshot: buildCampaignPlanner,
  },
]
