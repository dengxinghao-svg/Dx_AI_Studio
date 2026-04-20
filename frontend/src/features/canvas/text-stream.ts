import type { CanvasNode } from '../../shared/types/canvas'
import { normalizeTextContent } from './text-format'

export function buildStreamingNodePatch(payload: {
  modelUsed: string | null
  accumulatedText: string
  baseNode: CanvasNode
}) {
  const { accumulatedText, baseNode, modelUsed } = payload

  return {
    status: 'running' as const,
    model: modelUsed ?? baseNode.model,
    outputText: accumulatedText,
    content: normalizeTextContent(accumulatedText),
    errorMessage: null,
    isStreaming: true,
  }
}

export function buildCompletedNodePatch(payload: {
  baseNode: CanvasNode
  modelUsed: string | null
  outputText: string | null
  errorMessage: string | null
  completedAt: string
  status: CanvasNode['status']
  runCount: number
}) {
  const { baseNode, completedAt, errorMessage, modelUsed, outputText, runCount, status } = payload

  return {
    status,
    model: modelUsed ?? baseNode.model,
    outputText,
    content: baseNode.type === 'text' && outputText ? normalizeTextContent(outputText) : baseNode.content,
    errorMessage,
    lastRunAt: completedAt,
    runCount,
    isStreaming: false,
  }
}
