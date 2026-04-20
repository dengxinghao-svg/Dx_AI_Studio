export type NodeStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed'

export type CanvasNodeType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'note'
  | 'task'
  | 'text-gen'
  | 'image-gen'
  | 'video-gen'
  | 'asset'
  | 'review'
  | 'decision'
  | 'template-ref'

export interface CanvasPosition {
  x: number
  y: number
}

export interface CanvasNode {
  id: string
  type: CanvasNodeType
  title: string
  description?: string
  prompt?: string
  content?: string | null
  position: CanvasPosition
  status: NodeStatus
  model?: string
  width?: number
  height?: number
  badge?: string
  sourceKind?: 'system' | 'upload'
  runCount?: number
  lastRunAt?: string | null
  settings?: Record<string, string>
  outputText?: string | null
  errorMessage?: string | null
  panelColor?: string | null
}

export interface CanvasEdge {
  id: string
  source: string
  target: string
}

export interface CanvasGroup {
  id: string
  title: string
  nodeIds: string[]
  color?: string
}

export interface CanvasViewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasSnapshot {
  version: number
  savedAt: string
  viewport: CanvasViewport
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  groups: CanvasGroup[]
}
