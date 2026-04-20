import { MarkerType, type Edge } from 'reactflow'
import type { CanvasNode, CanvasNodeType, CanvasSnapshot } from '../../shared/types/canvas'
import type { TranslationVariables } from '../../shared/i18n/context'
import { createCanvasNode } from './mock-canvas'
import type { WorkflowFlowNode } from './workflow-types'

export interface CanvasWorkspaceProps {
  projectId: string
  projectName: string
  saveState: 'idle' | 'saving' | 'saved'
  snapshot: CanvasSnapshot
  lastOpenedAt: string | null
  draftUpdatedAt: string | null
  onSnapshotChange: (snapshot: CanvasSnapshot) => void
  onRunSelectedNode: (payload: {
    projectId: string
    node: CanvasNode
    upstreamContext: string[]
    onChunk?: (payload: { accumulatedText: string; chunk: string; modelUsed: string | null }) => void
  }) => Promise<{
    status: CanvasNode['status']
    modelUsed: string | null
    outputText: string | null
    errorMessage: string | null
    completedAt: string
  }>
}

export type ClipboardPayload = {
  nodes: CanvasNode[]
  edges: CanvasSnapshot['edges']
}

export type ContextMenuState = {
  open: boolean
  x: number
  y: number
  flowX: number
  flowY: number
}

export function cloneSnapshot(snapshot: CanvasSnapshot) {
  return JSON.parse(JSON.stringify(snapshot)) as CanvasSnapshot
}

export function toFlowNode(node: CanvasNode): WorkflowFlowNode {
  const width = node.width ?? (node.type === 'text' ? 296 : 236)
  const height = node.height ?? (node.type === 'text' ? 378 : 170)

  return {
    id: node.id,
    type: 'workflow',
    position: node.position,
    width,
    height,
    selected: false,
    data: {
      title: node.title,
      description: node.description,
      prompt: node.prompt,
      content: node.content,
      settings: node.settings,
      status: node.status,
      model: node.model,
      badge: node.badge,
      type: node.type,
      runCount: node.runCount,
      outputText: node.outputText,
      errorMessage: node.errorMessage,
      lastRunAt: node.lastRunAt,
      panelColor: node.panelColor,
    },
    style: {
      width,
      height,
    },
  }
}

export function fromFlowNode(node: WorkflowFlowNode): CanvasNode {
  return {
    id: node.id,
    type: node.data.type,
    title: node.data.title,
    description: node.data.description,
    prompt: node.data.prompt,
    content: node.data.content ?? '',
    position: node.position,
    status: node.data.status,
    model: node.data.model,
    badge: node.data.badge,
    settings: node.data.settings,
    width: typeof node.style?.width === 'number' ? node.style.width : node.width ?? undefined,
    height: typeof node.style?.height === 'number' ? node.style.height : node.height ?? undefined,
    runCount: node.data.runCount ?? 0,
    outputText: node.data.outputText ?? null,
    errorMessage: node.data.errorMessage ?? null,
    lastRunAt: node.data.lastRunAt ?? null,
    panelColor: node.data.panelColor ?? null,
  }
}

export function toFlowEdge(
  edge: CanvasSnapshot['edges'][number],
  hoveredEdgeId: string | null,
  onDelete: (edgeId: string) => void,
): Edge<{ hovered?: boolean; onDelete?: (edgeId: string) => void }> {
  return {
    ...edge,
    type: 'workflow',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'rgba(255,255,255,0.68)',
    },
    data: {
      hovered: hoveredEdgeId === edge.id,
      onDelete,
    },
  }
}

export function getSaveStateLabel(
  saveState: CanvasWorkspaceProps['saveState'],
  t: (key: string, values?: TranslationVariables) => string,
) {
  switch (saveState) {
    case 'saving':
      return t('common.saveSaving')
    case 'saved':
      return t('common.saveSaved')
    default:
      return t('common.saveIdle')
  }
}

export function cloneSelection(
  clipboard: ClipboardPayload,
  language: 'zh-CN' | 'en-US',
  anchor?: { x: number; y: number },
) {
  if (!clipboard.nodes.length) return { nodes: [] as CanvasNode[], edges: [] as CanvasSnapshot['edges'] }

  const minX = Math.min(...clipboard.nodes.map((node) => node.position.x))
  const minY = Math.min(...clipboard.nodes.map((node) => node.position.y))
  const offset = anchor ? { x: anchor.x - minX, y: anchor.y - minY } : { x: 42, y: 42 }
  const idMap = new Map<string, string>()

  const nodes = clipboard.nodes.map((node) => {
    const next = createCanvasNode(node.type, node.position, language, {
      ...node,
      id: undefined,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      status: 'idle',
      runCount: 0,
      outputText: null,
      errorMessage: null,
      lastRunAt: null,
    })
    idMap.set(node.id, next.id)
    return next
  })

  const edges = clipboard.edges
    .map((edge) => {
      const source = idMap.get(edge.source)
      const target = idMap.get(edge.target)
      if (!source || !target) return null
      return {
        id: `edge-${source}-${target}-${Date.now()}`,
        source,
        target,
      }
    })
    .filter((edge): edge is CanvasSnapshot['edges'][number] => Boolean(edge))

  return { nodes, edges }
}

export function buildQuickAddTypes(
  language: 'zh-CN' | 'en-US',
  t: (key: string, values?: TranslationVariables) => string,
): Array<{ type: CanvasNodeType; label: string; short: string; icon: string }> {
  return [
    { type: 'text', label: t('canvas.quickAddText'), short: language === 'zh-CN' ? '文' : 'T', icon: '文' },
    { type: 'image', label: t('canvas.quickAddImage'), short: language === 'zh-CN' ? '图' : 'I', icon: '图' },
    { type: 'video', label: t('canvas.quickAddVideo'), short: language === 'zh-CN' ? '视' : 'V', icon: '视' },
    { type: 'asset', label: t('canvas.quickAddAsset'), short: language === 'zh-CN' ? '资' : 'A', icon: '资' },
  ]
}
