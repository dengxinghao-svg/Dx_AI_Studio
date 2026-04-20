import type { Edge, Node as FlowNode } from 'reactflow'
import type { CanvasNode } from '../../shared/types/canvas'

export type WorkflowNodeData = {
  title: string
  description?: string
  prompt?: string
  content?: string | null
  settings?: CanvasNode['settings']
  status: CanvasNode['status']
  model?: string
  badge?: string
  type: CanvasNode['type']
  runCount?: number
  outputText?: string | null
  errorMessage?: string | null
  lastRunAt?: string | null
  panelColor?: string | null
  isStreaming?: boolean
  canvasZoom?: number
  nodeWidth?: number
  nodeHeight?: number
  nodeX?: number
  nodeY?: number
  onTextContentChange?: (nodeId: string, content: string) => void
  onPanelColorChange?: (nodeId: string, color: string | null) => void
  onOpenTextDocument?: (nodeId: string) => void
  onFocusNode?: (nodeId: string) => void
  onResizeNode?: (
    nodeId: string,
    next: {
      width: number
      height: number
      position?: { x: number; y: number }
    },
  ) => void
}

export type WorkflowFlowNode = FlowNode<WorkflowNodeData>
export type WorkflowFlowEdge = Edge<{
  hovered?: boolean
  onDelete?: (edgeId: string) => void
}>
