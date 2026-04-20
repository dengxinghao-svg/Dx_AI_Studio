import { useCallback, useMemo, useState } from 'react'
import type { CanvasNode } from '../../../shared/types/canvas'
import type { TranslationVariables } from '../../../shared/i18n/context'
import { buildCompletedNodePatch, buildStreamingNodePatch } from '../text-stream'
import { fromFlowNode } from '../canvas-core'
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeData } from '../workflow-types'

interface UseCanvasExecutionArgs {
  projectId: string
  selectedNode: WorkflowFlowNode | null
  nodes: WorkflowFlowNode[]
  edges: WorkflowFlowEdge[]
  updateNodeById: (nodeId: string, fields: Partial<WorkflowNodeData>) => void
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
  t: (key: string, values?: TranslationVariables) => string
}

export function useCanvasExecution({
  edges,
  nodes,
  onRunSelectedNode,
  projectId,
  selectedNode,
  t,
  updateNodeById,
}: UseCanvasExecutionArgs) {
  const [isRunningSelectedNode, setIsRunningSelectedNode] = useState(false)

  const getUpstreamNodes = useCallback(
    (nodeId: string) => {
      const upstreamIds = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source)
      return nodes.filter((node) => upstreamIds.includes(node.id)).map(fromFlowNode)
    },
    [edges, nodes],
  )

  const getUpstreamContext = useCallback(
    (nodeId: string) =>
      getUpstreamNodes(nodeId)
        .map((node) => node.outputText || node.content || node.prompt || node.description || node.title)
        .filter((item): item is string => Boolean(item && item.trim())),
    [getUpstreamNodes],
  )

  const handleRunSelectedNode = useCallback(async () => {
    if (!selectedNode) return
    const canvasNode = fromFlowNode(selectedNode)
    const selectedNodeId = selectedNode.id
    const baseRunCount = selectedNode.data.runCount ?? 0

    setIsRunningSelectedNode(true)
    updateNodeById(selectedNodeId, { status: 'running', errorMessage: null, isStreaming: true })

    try {
      const result = await onRunSelectedNode({
        projectId,
        node: canvasNode,
        upstreamContext: getUpstreamContext(selectedNode.id),
        onChunk: ({ accumulatedText, modelUsed }) => {
          updateNodeById(
            selectedNodeId,
            buildStreamingNodePatch({
              accumulatedText,
              baseNode: canvasNode,
              modelUsed,
            }),
          )
        },
      })

      updateNodeById(
        selectedNodeId,
        buildCompletedNodePatch({
          baseNode: canvasNode,
          completedAt: result.completedAt,
          errorMessage: result.errorMessage,
          modelUsed: result.modelUsed,
          outputText: result.outputText,
          runCount: baseRunCount + 1,
          status: result.status,
        }),
      )
    } catch (error) {
      updateNodeById(selectedNodeId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        isStreaming: false,
      })
    } finally {
      setIsRunningSelectedNode(false)
    }
  }, [getUpstreamContext, onRunSelectedNode, projectId, selectedNode, updateNodeById])

  const workflowSuggestions = useMemo(() => {
    switch (selectedNode?.data.type) {
      case 'image':
        return [t('canvas.imageSuggestion1'), t('canvas.imageSuggestion2'), t('canvas.imageSuggestion3')]
      case 'video':
        return [t('canvas.videoSuggestion1'), t('canvas.videoSuggestion2'), t('canvas.videoSuggestion3')]
      case 'asset':
        return [t('canvas.assetSuggestion1'), t('canvas.assetSuggestion2'), t('canvas.assetSuggestion3')]
      default:
        return [t('canvas.textSuggestion1'), t('canvas.textSuggestion2'), t('canvas.textSuggestion3')]
    }
  }, [selectedNode?.data.type, t])

  const canRunSelectedNode = Boolean(selectedNode && selectedNode.data.type === 'text' && !isRunningSelectedNode)

  return {
    isRunningSelectedNode,
    canRunSelectedNode,
    workflowSuggestions,
    getUpstreamNodes,
    handleRunSelectedNode,
  }
}
