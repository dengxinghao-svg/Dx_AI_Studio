import type { CanvasGroup, CanvasViewport } from '../../shared/types/canvas'
import type { WorkflowFlowNode } from './workflow-types'

export interface AlignmentGuide {
  orientation: 'vertical' | 'horizontal'
  position: number
}

export interface GroupBounds {
  id: string
  title: string
  color: string
  left: number
  top: number
  width: number
  height: number
}

const GRID_SIZE = 18
const SNAP_THRESHOLD = 14

export function getNodeRect(node: WorkflowFlowNode) {
  const width = typeof node.style?.width === 'number' ? node.style.width : node.width ?? 236
  const height = typeof node.style?.height === 'number' ? node.style.height : node.height ?? 170
  return {
    left: node.position.x,
    top: node.position.y,
    width,
    height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
    right: node.position.x + width,
    bottom: node.position.y + height,
  }
}

function findClosestSnap(target: number, candidates: number[]) {
  let best: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - target)
    if (distance < bestDistance && distance <= SNAP_THRESHOLD) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

export function getSnappedPosition(
  nodeId: string,
  nextPosition: { x: number; y: number },
  nodes: WorkflowFlowNode[],
  snapToGrid: boolean,
) {
  const current = nodes.find((node) => node.id === nodeId)
  if (!current) return { position: nextPosition, guides: [] as AlignmentGuide[] }

  const width = typeof current.style?.width === 'number' ? current.style.width : current.width ?? 236
  const height = typeof current.style?.height === 'number' ? current.style.height : current.height ?? 170

  let x = nextPosition.x
  let y = nextPosition.y
  const guides: AlignmentGuide[] = []

  if (snapToGrid) {
    x = Math.round(x / GRID_SIZE) * GRID_SIZE
    y = Math.round(y / GRID_SIZE) * GRID_SIZE
  }

  const lefts: number[] = []
  const centersX: number[] = []
  const rights: number[] = []
  const tops: number[] = []
  const centersY: number[] = []
  const bottoms: number[] = []

  nodes.forEach((node) => {
    if (node.id === nodeId) return
    const rect = getNodeRect(node)
    lefts.push(rect.left)
    centersX.push(rect.centerX)
    rights.push(rect.right)
    tops.push(rect.top)
    centersY.push(rect.centerY)
    bottoms.push(rect.bottom)
  })

  const snapLeft = findClosestSnap(x, lefts)
  const snapCenterX = findClosestSnap(x + width / 2, centersX)
  const snapRight = findClosestSnap(x + width, rights)
  const snapTop = findClosestSnap(y, tops)
  const snapCenterY = findClosestSnap(y + height / 2, centersY)
  const snapBottom = findClosestSnap(y + height, bottoms)

  if (snapLeft !== null) {
    x = snapLeft
    guides.push({ orientation: 'vertical', position: snapLeft })
  } else if (snapCenterX !== null) {
    x = snapCenterX - width / 2
    guides.push({ orientation: 'vertical', position: snapCenterX })
  } else if (snapRight !== null) {
    x = snapRight - width
    guides.push({ orientation: 'vertical', position: snapRight })
  }

  if (snapTop !== null) {
    y = snapTop
    guides.push({ orientation: 'horizontal', position: snapTop })
  } else if (snapCenterY !== null) {
    y = snapCenterY - height / 2
    guides.push({ orientation: 'horizontal', position: snapCenterY })
  } else if (snapBottom !== null) {
    y = snapBottom - height
    guides.push({ orientation: 'horizontal', position: snapBottom })
  }

  return { position: { x, y }, guides }
}

export function createGroupFromSelection(selectedIds: string[], existingGroups: CanvasGroup[], title: string): CanvasGroup | null {
  const uniqueIds = [...new Set(selectedIds)]
  if (uniqueIds.length < 2) return null

  return {
    id: `group-${Math.random().toString(36).slice(2, 10)}`,
    title,
    nodeIds: uniqueIds,
    color: existingGroups.length % 2 === 0 ? '#7c8cff' : '#5ed1b8',
  }
}

export function removeNodesFromGroups(groups: CanvasGroup[], removedIds: Set<string>) {
  return groups
    .map((group) => ({
      ...group,
      nodeIds: group.nodeIds.filter((id) => !removedIds.has(id)),
    }))
    .filter((group) => group.nodeIds.length > 1)
}

export function getGroupsForSelection(groups: CanvasGroup[], selectedIds: string[]) {
  if (!selectedIds.length) return []
  const selectedSet = new Set(selectedIds)
  return groups.filter((group) => group.nodeIds.every((id) => selectedSet.has(id)))
}

export function layoutGroupNodes(group: CanvasGroup, nodes: WorkflowFlowNode[]) {
  const members = group.nodeIds
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is WorkflowFlowNode => Boolean(node))
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)

  if (!members.length) return nodes

  const frame = getNodesFrame(members)
  const maxWidth = Math.max(...members.map((node) => getNodeRect(node).width))
  const anchorX = frame.left + 18
  let currentY = frame.top + 18
  const nextPositions = new Map<string, { x: number; y: number }>()

  members.forEach((member) => {
    const rect = getNodeRect(member)
    nextPositions.set(member.id, {
      x: anchorX + Math.max(0, (maxWidth - rect.width) / 2),
      y: currentY,
    })
    currentY += rect.height + 22
  })

  return nodes.map((node) =>
    nextPositions.has(node.id)
      ? {
          ...node,
          position: nextPositions.get(node.id)!,
        }
      : node,
  )
}

export function getNodesFrame(input: WorkflowFlowNode[]) {
  const rects = input.map(getNodeRect)
  return {
    left: Math.min(...rects.map((rect) => rect.left)) - 18,
    top: Math.min(...rects.map((rect) => rect.top)) - 16,
    right: Math.max(...rects.map((rect) => rect.right)) + 18,
    bottom: Math.max(...rects.map((rect) => rect.bottom)) + 18,
  }
}

export function getGroupBounds(groups: CanvasGroup[], nodes: WorkflowFlowNode[], viewport: CanvasViewport): GroupBounds[] {
  return groups
    .map((group) => {
      const members = group.nodeIds
        .map((id) => nodes.find((node) => node.id === id))
        .filter((node): node is WorkflowFlowNode => Boolean(node))

      if (members.length < 2) return null

      const frame = getNodesFrame(members)
      return {
        id: group.id,
        title: group.title,
        color: group.color || '#7c8cff',
        left: frame.left * viewport.zoom + viewport.x,
        top: frame.top * viewport.zoom + viewport.y,
        width: (frame.right - frame.left) * viewport.zoom,
        height: (frame.bottom - frame.top) * viewport.zoom,
      }
    })
    .filter((item): item is GroupBounds => Boolean(item))
}
