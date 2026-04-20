import type { CanvasEdge, CanvasGroup, CanvasNode, CanvasNodeType, CanvasSnapshot } from '../../shared/types/canvas'
import type { AppLanguage } from '../../shared/i18n/messages'
import { ensureImageSettings } from './image-node-config'

const TEXT_NODE_DEFAULT_WIDTH = 296
const TEXT_NODE_DEFAULT_HEIGHT = 378
const VISUAL_NODE_WIDTH = 236
const VISUAL_NODE_HEIGHT = 170

const nodeTypeAliases: Record<CanvasNodeType, CanvasNodeType> = {
  text: 'text',
  image: 'image',
  video: 'video',
  audio: 'audio',
  note: 'text',
  task: 'text',
  'text-gen': 'text',
  'image-gen': 'image',
  'video-gen': 'video',
  asset: 'asset',
  review: 'text',
  decision: 'text',
  'template-ref': 'asset',
}

const nodeCatalog = {
  'zh-CN': {
    text: {
      badge: '文本',
      title: '文本节点',
      description: '整理上下文、目标和结构化说明。',
      prompt: '写下你的目标、限制条件和希望模型输出的格式。',
      model: 'gpt-5.4',
      size: { width: TEXT_NODE_DEFAULT_WIDTH, height: TEXT_NODE_DEFAULT_HEIGHT },
      settings: {},
    },
    image: {
      badge: '图片',
      title: '图片方向',
      description: '提炼主视觉、风格和构图方向。',
      prompt: '描述主体、镜头、风格、构图和输出比例。',
      model: 'nano-banana',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: ensureImageSettings(),
    },
    video: {
      badge: '视频',
      title: '视频方向',
      description: '把脚本、镜头或关键帧转成视频段落。',
      prompt: '描述时长、镜头运动、节奏和输出比例。',
      model: 'doubao-seedance-2-0-260128',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
    audio: {
      badge: '音频',
      title: '音频节点',
      description: '预留配音、转写和音频处理流程。',
      prompt: '补充语气、语言、节奏和音频约束。',
      model: 'elevenlabs/eleven_v3',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
    asset: {
      badge: '资产',
      title: '输出资产',
      description: '沉淀最终脚本、图像和交付结果。',
      prompt: '记录导出说明、链接、引用素材和备注。',
      model: 'manual',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
  },
  'en-US': {
    text: {
      badge: 'Text',
      title: 'Text Node',
      description: 'Organize context, goals, and structured instructions.',
      prompt: 'Write down your goal, constraints, and expected output format.',
      model: 'gpt-5.4',
      size: { width: TEXT_NODE_DEFAULT_WIDTH, height: TEXT_NODE_DEFAULT_HEIGHT },
      settings: {},
    },
    image: {
      badge: 'Image',
      title: 'Image Direction',
      description: 'Define hero visual, style, and composition.',
      prompt: 'Describe subject, shot, style, composition, and aspect ratio.',
      model: 'nano-banana',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: ensureImageSettings(),
    },
    video: {
      badge: 'Video',
      title: 'Video Direction',
      description: 'Turn script, motion, and keyframes into a video brief.',
      prompt: 'Describe duration, camera movement, pacing, and output ratio.',
      model: 'doubao-seedance-2-0-260128',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
    audio: {
      badge: 'Audio',
      title: 'Audio Node',
      description: 'Reserve voice, transcription, and audio processing flow.',
      prompt: 'Add tone, language, pacing, and audio constraints.',
      model: 'elevenlabs/eleven_v3',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
    asset: {
      badge: 'Asset',
      title: 'Output Asset',
      description: 'Collect final scripts, visuals, and delivery artifacts.',
      prompt: 'Record export notes, links, references, and delivery remarks.',
      model: 'manual',
      size: { width: VISUAL_NODE_WIDTH, height: VISUAL_NODE_HEIGHT },
      settings: {},
    },
  },
} as const

const comparableNodeFields = [
  'id',
  'type',
  'title',
  'description',
  'prompt',
  'content',
  'status',
  'model',
  'width',
  'height',
  'badge',
  'sourceKind',
  'runCount',
  'lastRunAt',
  'settings',
  'outputText',
  'errorMessage',
  'panelColor',
] as const

const comparableEdgeFields = ['id', 'source', 'target'] as const

function inferNodeType(type: CanvasNodeType): keyof typeof nodeCatalog['zh-CN'] {
  return (nodeTypeAliases[type] ?? 'text') as keyof typeof nodeCatalog['zh-CN']
}

function buildNodeId(type: keyof typeof nodeCatalog['zh-CN']) {
  return `${type}-${Math.random().toString(36).slice(2, 10)}`
}

export function createCanvasNode(
  type: CanvasNodeType,
  position: { x: number; y: number },
  language: AppLanguage = 'zh-CN',
  overrides: Partial<CanvasNode> = {},
): CanvasNode {
  const normalizedType = inferNodeType(type)
  const preset = nodeCatalog[language][normalizedType]

  return {
    id: overrides.id ?? buildNodeId(normalizedType),
    type: normalizedType,
    title: overrides.title ?? preset.title,
    description: overrides.description ?? preset.description,
    prompt: overrides.prompt ?? preset.prompt,
    content: overrides.content ?? '',
    position: overrides.position ?? position,
    status: overrides.status ?? 'idle',
    model: overrides.model ?? preset.model,
    width: overrides.width ?? preset.size.width,
    height: overrides.height ?? preset.size.height,
    badge: overrides.badge ?? preset.badge,
    sourceKind: overrides.sourceKind ?? 'system',
    runCount: overrides.runCount ?? 0,
    lastRunAt: overrides.lastRunAt ?? null,
    settings: normalizedType === 'image' ? ensureImageSettings(overrides.settings ?? preset.settings) : overrides.settings ?? preset.settings,
    outputText: overrides.outputText ?? null,
    errorMessage: overrides.errorMessage ?? null,
    panelColor: overrides.panelColor ?? null,
  }
}

export function normalizeCanvasSnapshot(snapshot?: Partial<CanvasSnapshot> | null): CanvasSnapshot {
  const source = snapshot ?? {}
  const nodes = Array.isArray(source.nodes)
    ? source.nodes.map((node) =>
        createCanvasNode(node.type ?? 'text', node.position ?? { x: 120, y: 140 }, 'zh-CN', {
          ...node,
          type: inferNodeType(node.type ?? 'text'),
          title: node.title,
          description: node.description,
          prompt: node.prompt ?? node.description,
          content: node.content ?? '',
          position: node.position ?? { x: 120, y: 140 },
          status: node.status ?? 'idle',
        }),
      )
    : []

  const edges: CanvasEdge[] = Array.isArray(source.edges)
    ? source.edges.map((edge, index) => ({
        id: edge.id ?? `edge-${index + 1}`,
        source: edge.source,
        target: edge.target,
      }))
    : []

  const groups: CanvasGroup[] = Array.isArray(source.groups)
    ? source.groups.map((group) => ({
        id: group.id,
        title: group.title,
        nodeIds: group.nodeIds ?? [],
        color: group.color ?? '#7c8cff',
      }))
    : []

  return {
    version: source.version ?? 2,
    savedAt: source.savedAt ?? new Date().toISOString(),
    viewport: {
      x: source.viewport?.x ?? 0,
      y: source.viewport?.y ?? 0,
      zoom: source.viewport?.zoom ?? 1,
    },
    nodes,
    edges,
    groups,
  }
}

export function getSnapshotComparableSignature(snapshot: CanvasSnapshot) {
  return JSON.stringify({
    version: snapshot.version,
    viewport: snapshot.viewport,
    nodes: snapshot.nodes.map((node) => Object.fromEntries(comparableNodeFields.map((field) => [field, node[field]]))),
    edges: snapshot.edges.map((edge) => Object.fromEntries(comparableEdgeFields.map((field) => [field, edge[field]]))),
    groups: snapshot.groups.map((group) => ({
      id: group.id,
      title: group.title,
      nodeIds: group.nodeIds,
      color: group.color,
    })),
  })
}

export const mockCanvas: CanvasSnapshot = normalizeCanvasSnapshot({
  version: 2,
  savedAt: new Date().toISOString(),
  viewport: {
    x: 0,
    y: 0,
    zoom: 0.92,
  },
  nodes: [
    createCanvasNode('text', { x: 120, y: 220 }, 'zh-CN', {
      id: 'node-text-1',
      title: '项目目标',
      description: '定义这条个人办公流的目标、输入和预期输出。',
      prompt: '整理会议纪要、待办和决策，再生成结构化周报。',
    }),
    createCanvasNode('image', { x: 520, y: 160 }, 'zh-CN', {
      id: 'node-image-1',
      title: '图片方向',
      description: '从文本节点提炼画面方向。',
    }),
    createCanvasNode('video', { x: 860, y: 240 }, 'zh-CN', {
      id: 'node-video-1',
      title: '视频方向',
      description: '把图片节点和镜头描述整理成视频草案。',
    }),
    createCanvasNode('asset', { x: 520, y: 470 }, 'zh-CN', {
      id: 'node-asset-1',
      title: '输出资产',
      description: '沉淀脚本、图像和最终导出物。',
      prompt: '记录本次流程生成的摘要、封面和导出链接。',
    }),
  ],
  edges: [
    { id: 'edge-1', source: 'node-text-1', target: 'node-image-1' },
    { id: 'edge-2', source: 'node-image-1', target: 'node-video-1' },
    { id: 'edge-3', source: 'node-text-1', target: 'node-asset-1' },
  ],
  groups: [
    {
      id: 'group-1',
      title: '基础内容流',
      nodeIds: ['node-text-1', 'node-image-1', 'node-video-1'],
      color: '#7c8cff',
    },
  ],
})

export function createDefaultCanvasSnapshot(projectName: string, language: AppLanguage = 'zh-CN'): CanvasSnapshot {
  return normalizeCanvasSnapshot({
    version: 2,
    savedAt: new Date().toISOString(),
    viewport: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    nodes: [
      createCanvasNode('text', { x: 140, y: 180 }, language, {
        id: 'node-text-root',
        title: projectName,
        description:
          language === 'zh-CN'
            ? '从这里开始整理你的工作目标、上下文和输出要求。'
            : 'Start here to organize your goal, context, and output requirements.',
        prompt:
          language === 'zh-CN'
            ? '列出本项目的背景、关键输入、交付物和时间要求。'
            : 'List the project background, key inputs, deliverables, and timing requirements.',
      }),
      createCanvasNode('image', { x: 510, y: 150 }, language, {
        id: 'node-image-root',
        title: language === 'zh-CN' ? '图片方向' : 'Image Direction',
      }),
      createCanvasNode('video', { x: 830, y: 260 }, language, {
        id: 'node-video-root',
        title: language === 'zh-CN' ? '视频方向' : 'Video Direction',
      }),
    ],
    edges: [
      { id: 'edge-root-1', source: 'node-text-root', target: 'node-image-root' },
      { id: 'edge-root-2', source: 'node-image-root', target: 'node-video-root' },
    ],
    groups: [],
  })
}
