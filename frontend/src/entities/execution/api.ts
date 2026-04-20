import { apiFetch } from '../../shared/api/http'
import { appConfig } from '../../shared/config/app-config'
import type { CanvasNode } from '../../shared/types/canvas'

export interface ExecuteNodeRequest {
  projectId?: string
  node: CanvasNode
  upstreamContext: string[]
}

export interface ExecuteNodeResponse {
  nodeId: string
  nodeType: string
  status: CanvasNode['status']
  modelUsed: string | null
  outputText: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string
}

export interface ExecuteNodeStreamChunk {
  type: 'chunk'
  chunk: string
  accumulatedText: string
  modelUsed: string | null
}

export interface ExecuteNodeStreamDone extends ExecuteNodeResponse {
  type: 'done'
}

export interface ExecuteNodeStreamError {
  type: 'error'
  nodeId: string
  nodeType: string
  status: CanvasNode['status']
  modelUsed: string | null
  outputText: string | null
  errorMessage: string | null
  startedAt: string
  completedAt: string
}

export type ExecuteNodeStreamEvent = ExecuteNodeStreamChunk | ExecuteNodeStreamDone | ExecuteNodeStreamError

export function executeNode(payload: ExecuteNodeRequest) {
  return apiFetch<ExecuteNodeResponse>('/api/v1/executions/run-node', {
    method: 'POST',
    body: JSON.stringify({
      projectId: payload.projectId,
      nodeId: payload.node.id,
      nodeType: payload.node.type,
      title: payload.node.title,
      prompt: payload.node.prompt,
      content: payload.node.content,
      description: payload.node.description,
      model: payload.node.model,
      upstreamContext: payload.upstreamContext,
    }),
  })
}

function buildExecutionBody(payload: ExecuteNodeRequest) {
  return JSON.stringify({
    projectId: payload.projectId,
    nodeId: payload.node.id,
    nodeType: payload.node.type,
    title: payload.node.title,
    prompt: payload.node.prompt,
    content: payload.node.content,
    description: payload.node.description,
    model: payload.node.model,
    upstreamContext: payload.upstreamContext,
  })
}

function parseSseEvent(block: string): ExecuteNodeStreamEvent | null {
  const dataLines = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())

  if (!dataLines.length) return null

  const payload = dataLines.join('\n')
  if (!payload) return null
  return JSON.parse(payload) as ExecuteNodeStreamEvent
}

export async function executeTextNodeStream(
  payload: ExecuteNodeRequest,
  handlers: {
    onChunk?: (event: ExecuteNodeStreamChunk) => void
    onDone?: (event: ExecuteNodeStreamDone) => void
  } = {},
) {
  const response = await fetch(`${appConfig.backendBaseUrl}/api/v1/executions/run-node/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: buildExecutionBody(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Streaming response body is empty.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let doneEvent: ExecuteNodeStreamDone | null = null

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    let separatorIndex = buffer.indexOf('\n\n')
    while (separatorIndex !== -1) {
      const block = buffer.slice(0, separatorIndex).trim()
      buffer = buffer.slice(separatorIndex + 2)
      separatorIndex = buffer.indexOf('\n\n')

      if (!block) continue

      const event = parseSseEvent(block)
      if (!event) continue

      if (event.type === 'chunk') {
        handlers.onChunk?.(event)
        continue
      }

      if (event.type === 'done') {
        doneEvent = event
        handlers.onDone?.(event)
        continue
      }

      throw new Error(event.errorMessage || 'Streaming execution failed.')
    }

    if (done) break
  }

  if (!doneEvent) {
    throw new Error('Streaming execution finished without a completion event.')
  }

  return doneEvent
}
