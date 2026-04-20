import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { CanvasGroup } from '../../../shared/types/canvas'
import { createGroupFromSelection, layoutGroupNodes, removeNodesFromGroups } from '../canvas-layout'
import { cloneSelection, fromFlowNode, toFlowEdge, toFlowNode, type ClipboardPayload } from '../canvas-core'
import type { WorkflowFlowEdge, WorkflowFlowNode } from '../workflow-types'

interface UseCanvasSelectionActionsArgs {
  activeGroupId: string | null
  clipboard: ClipboardPayload | null
  groups: CanvasGroup[]
  hoveredEdgeId: string | null
  language: 'zh-CN' | 'en-US'
  projectName: string
  selectedEdgeIds: string[]
  selectedNodeIds: string[]
  textDocumentNodeId: string | null
  activeGroups: CanvasGroup[]
  nodes: WorkflowFlowNode[]
  edges: WorkflowFlowEdge[]
  setClipboard: Dispatch<SetStateAction<ClipboardPayload | null>>
  setActiveGroupId: Dispatch<SetStateAction<string | null>>
  setNodes: Dispatch<SetStateAction<WorkflowFlowNode[]>>
  setEdges: Dispatch<SetStateAction<WorkflowFlowEdge[]>>
  setGroups: Dispatch<SetStateAction<CanvasGroup[]>>
  setGroupColorMenuOpen: Dispatch<SetStateAction<boolean>>
  setContextMenu: Dispatch<SetStateAction<{ open: boolean; x: number; y: number; flowX: number; flowY: number }>>
  setSelectedEdgeIds: Dispatch<SetStateAction<string[]>>
  setTextDocumentNodeId: Dispatch<SetStateAction<string | null>>
}

export function useCanvasSelectionActions({
  activeGroupId,
  activeGroups,
  clipboard,
  edges,
  groups,
  hoveredEdgeId,
  language,
  nodes,
  projectName,
  selectedEdgeIds,
  selectedNodeIds,
  setActiveGroupId,
  setClipboard,
  setContextMenu,
  setEdges,
  setGroupColorMenuOpen,
  setGroups,
  setNodes,
  setSelectedEdgeIds,
  setTextDocumentNodeId,
  textDocumentNodeId,
}: UseCanvasSelectionActionsArgs) {
  const copySelectionToClipboard = useCallback(() => {
    if (!selectedNodeIds.length) return
    const nodeSet = new Set(selectedNodeIds)
    setClipboard({
      nodes: nodes.filter((node) => nodeSet.has(node.id)).map(fromFlowNode),
      edges: edges
        .filter((edge) => nodeSet.has(edge.source) && nodeSet.has(edge.target))
        .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    })
  }, [edges, nodes, selectedNodeIds, setClipboard])

  const pasteClipboard = useCallback(
    (anchor?: { x: number; y: number }) => {
      if (!clipboard) return
      const cloned = cloneSelection(clipboard, language, anchor)
      if (!cloned.nodes.length) return
      setActiveGroupId(null)
      setNodes((currentNodes) => [
        ...currentNodes.map((node) => ({ ...node, selected: false })),
        ...cloned.nodes.map((node) => ({ ...toFlowNode(node), selected: true })),
      ])
      setEdges((currentEdges) => [
        ...currentEdges,
        ...cloned.edges.map((edge) => toFlowEdge(edge, hoveredEdgeId, () => {})),
      ])
    },
    [clipboard, hoveredEdgeId, language, setActiveGroupId, setEdges, setNodes],
  )

  const duplicateSelection = useCallback(() => {
    if (!selectedNodeIds.length) return
    const cloned = cloneSelection(
      {
        nodes: nodes.filter((node) => selectedNodeIds.includes(node.id)).map(fromFlowNode),
        edges: edges
          .filter((edge) => selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target))
          .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
      },
      language,
    )
    setActiveGroupId(null)
    setNodes((currentNodes) => [
      ...currentNodes.map((node) => ({ ...node, selected: false })),
      ...cloned.nodes.map((node) => ({ ...toFlowNode(node), selected: true })),
    ])
    setEdges((currentEdges) => [
      ...currentEdges,
      ...cloned.edges.map((edge) => toFlowEdge(edge, hoveredEdgeId, () => {})),
    ])
  }, [edges, hoveredEdgeId, language, nodes, selectedNodeIds, setActiveGroupId, setEdges, setNodes])

  const deleteSelection = useCallback(() => {
    if (!selectedNodeIds.length && !selectedEdgeIds.length) return
    if (selectedEdgeIds.length) {
      setEdges((currentEdges) => currentEdges.filter((edge) => !selectedEdgeIds.includes(edge.id)))
      setSelectedEdgeIds([])
    }
    if (selectedNodeIds.length) {
      const removeSet = new Set(selectedNodeIds)
      setNodes((currentNodes) => currentNodes.filter((node) => !removeSet.has(node.id)))
      setEdges((currentEdges) => currentEdges.filter((edge) => !removeSet.has(edge.source) && !removeSet.has(edge.target)))
      setGroups((currentGroups) => removeNodesFromGroups(currentGroups, removeSet))
      if (textDocumentNodeId && removeSet.has(textDocumentNodeId)) setTextDocumentNodeId(null)
      if (activeGroupId && groups.find((group) => group.id === activeGroupId)?.nodeIds.some((id) => removeSet.has(id))) {
        setActiveGroupId(null)
      }
    }
  }, [
    activeGroupId,
    groups,
    selectedEdgeIds,
    selectedNodeIds,
    setActiveGroupId,
    setEdges,
    setGroups,
    setNodes,
    setSelectedEdgeIds,
    setTextDocumentNodeId,
    textDocumentNodeId,
  ])

  const cutSelection = useCallback(() => {
    copySelectionToClipboard()
    deleteSelection()
  }, [copySelectionToClipboard, deleteSelection])

  const groupSelection = useCallback(() => {
    if (selectedNodeIds.length < 2) return
    const filteredGroups = groups
      .map((group) => ({
        ...group,
        nodeIds: group.nodeIds.filter((id) => !selectedNodeIds.includes(id)),
      }))
      .filter((group) => group.nodeIds.length > 1)
    const nextGroup = createGroupFromSelection(selectedNodeIds, filteredGroups, `${projectName} Group`)
    setGroups(nextGroup ? [...filteredGroups, nextGroup] : filteredGroups)
    setActiveGroupId(nextGroup?.id ?? null)
    setGroupColorMenuOpen(false)
    setContextMenu((current) => ({ ...current, open: false }))
  }, [groups, projectName, selectedNodeIds, setActiveGroupId, setContextMenu, setGroupColorMenuOpen, setGroups])

  const ungroupSelection = useCallback(() => {
    const targetIds = new Set(activeGroupId ? [activeGroupId] : activeGroups.map((group) => group.id))
    if (!targetIds.size) return
    setGroups((current) => current.filter((group) => !targetIds.has(group.id)))
    setActiveGroupId(null)
    setGroupColorMenuOpen(false)
  }, [activeGroupId, activeGroups, setActiveGroupId, setGroupColorMenuOpen, setGroups])

  const arrangeActiveGroup = useCallback(() => {
    if (!activeGroupId) return
    const target = groups.find((group) => group.id === activeGroupId)
    if (!target) return
    setNodes((currentNodes) => layoutGroupNodes(target, currentNodes))
    setGroupColorMenuOpen(false)
  }, [activeGroupId, groups, setGroupColorMenuOpen, setNodes])

  const setActiveGroupColor = useCallback(
    (color: string) => {
      if (!activeGroupId) return
      setGroups((current) => current.map((group) => (group.id === activeGroupId ? { ...group, color } : group)))
      setGroupColorMenuOpen(false)
    },
    [activeGroupId, setGroupColorMenuOpen, setGroups],
  )

  return {
    copySelectionToClipboard,
    pasteClipboard,
    duplicateSelection,
    deleteSelection,
    cutSelection,
    groupSelection,
    ungroupSelection,
    arrangeActiveGroup,
    setActiveGroupColor,
  }
}
