import { useMemo } from 'react'
import type { CanvasGroup } from '../../../shared/types/canvas'
import { getGroupBounds, getGroupsForSelection, getNodesFrame } from '../canvas-layout'
import type { WorkflowFlowNode } from '../workflow-types'

interface UseCanvasFloatingLayoutArgs {
  nodes: WorkflowFlowNode[]
  groups: CanvasGroup[]
  selectedNodeIds: string[]
  selectedNode: WorkflowFlowNode | null
  activeGroupId: string | null
  viewport: { x: number; y: number; zoom: number }
}

export function useCanvasFloatingLayout({
  activeGroupId,
  groups,
  nodes,
  selectedNode,
  selectedNodeIds,
  viewport,
}: UseCanvasFloatingLayoutArgs) {
  const activeGroups = useMemo(() => getGroupsForSelection(groups, selectedNodeIds), [groups, selectedNodeIds])
  const groupBounds = useMemo(() => getGroupBounds(groups, nodes, viewport), [groups, nodes, viewport])
  const activeGroupBounds = useMemo(
    () => groupBounds.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, groupBounds],
  )

  const selectedBounds = useMemo(() => {
    if (selectedNodeIds.length < 2) return null
    const selection = nodes.filter((node) => selectedNodeIds.includes(node.id))
    if (!selection.length) return null
    const frame = getNodesFrame(selection)
    return {
      left: frame.left * viewport.zoom + viewport.x,
      top: frame.top * viewport.zoom + viewport.y,
      width: (frame.right - frame.left) * viewport.zoom,
      height: (frame.bottom - frame.top) * viewport.zoom,
    }
  }, [nodes, selectedNodeIds, viewport])

  const selectedNodeBounds = useMemo(() => {
    if (!selectedNode) return null
    const width =
      typeof selectedNode.style?.width === 'number' ? selectedNode.style.width : selectedNode.width ?? 236
    const height =
      typeof selectedNode.style?.height === 'number' ? selectedNode.style.height : selectedNode.height ?? 170

    return {
      left: selectedNode.position.x * viewport.zoom + viewport.x,
      top: selectedNode.position.y * viewport.zoom + viewport.y,
      width: width * viewport.zoom,
      height: height * viewport.zoom,
    }
  }, [selectedNode, viewport])

  const selectedToolbarStyle = selectedBounds
    ? {
        left: `${selectedBounds.left + selectedBounds.width / 2}px`,
        top: `${Math.max(18, selectedBounds.top - 54)}px`,
      }
    : undefined

  const activeGroupToolbarStyle = activeGroupBounds
    ? {
        left: `${activeGroupBounds.left + activeGroupBounds.width / 2}px`,
        top: `${Math.max(18, activeGroupBounds.top - 56)}px`,
      }
    : undefined

  const floatingEditorStyle =
    selectedNodeBounds
      ? {
          left: `${selectedNodeBounds.left + selectedNodeBounds.width / 2}px`,
          top: `${selectedNodeBounds.top + selectedNodeBounds.height + 18}px`,
          width: `${Math.min(720, Math.max(selectedNode?.data.type === 'text' ? 460 : 420, selectedNodeBounds.width))}px`,
          transform: 'translateX(-50%)',
        }
      : undefined

  const imageToolbarStyle =
    selectedNodeBounds && selectedNode?.data.type === 'image'
      ? {
          left: `${selectedNodeBounds.left + selectedNodeBounds.width / 2}px`,
          top: `${Math.max(18, selectedNodeBounds.top - 58)}px`,
          transform: 'translateX(-50%)',
        }
      : undefined

  return {
    activeGroups,
    groupBounds,
    activeGroupBounds,
    selectedBounds,
    selectedNodeBounds,
    selectedToolbarStyle,
    activeGroupToolbarStyle,
    floatingEditorStyle,
    imageToolbarStyle,
  }
}
