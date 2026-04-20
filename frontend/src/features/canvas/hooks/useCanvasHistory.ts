import { useCallback, useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ReactFlowInstance } from 'reactflow'
import type { CanvasGroup, CanvasSnapshot } from '../../../shared/types/canvas'
import { getSnapshotComparableSignature, normalizeCanvasSnapshot } from '../mock-canvas'
import { cloneSnapshot, toFlowEdge, toFlowNode } from '../canvas-core'
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeData } from '../workflow-types'

interface UseCanvasHistoryArgs {
  snapshot: CanvasSnapshot
  currentSnapshot: CanvasSnapshot
  hoveredEdgeId: string | null
  deleteEdge: (edgeId: string) => void
  reactFlowRef: MutableRefObject<ReactFlowInstance<WorkflowNodeData> | null>
  onSnapshotChange: (snapshot: CanvasSnapshot) => void
  setNodes: Dispatch<SetStateAction<WorkflowFlowNode[]>>
  setGroups: Dispatch<SetStateAction<CanvasGroup[]>>
  setEdges: Dispatch<SetStateAction<WorkflowFlowEdge[]>>
  setViewport: Dispatch<SetStateAction<CanvasSnapshot['viewport']>>
  setActiveGroupId: Dispatch<SetStateAction<string | null>>
  setGroupColorMenuOpen: Dispatch<SetStateAction<boolean>>
  setSelectedEdgeIds: Dispatch<SetStateAction<string[]>>
}

export function useCanvasHistory({
  currentSnapshot,
  deleteEdge,
  hoveredEdgeId,
  onSnapshotChange,
  reactFlowRef,
  setActiveGroupId,
  setEdges,
  setGroupColorMenuOpen,
  setGroups,
  setNodes,
  setSelectedEdgeIds,
  setViewport,
  snapshot,
}: UseCanvasHistoryArgs) {
  const skipExternalSyncRef = useRef(false)
  const historyLockRef = useRef(false)
  const undoStackRef = useRef<CanvasSnapshot[]>([])
  const redoStackRef = useRef<CanvasSnapshot[]>([])
  const latestSnapshotRef = useRef<CanvasSnapshot>(cloneSnapshot(currentSnapshot))
  const latestComparableRef = useRef(getSnapshotComparableSignature(currentSnapshot))

  useEffect(() => {
    if (skipExternalSyncRef.current) {
      skipExternalSyncRef.current = false
      return
    }

    const nextSnapshot = normalizeCanvasSnapshot(snapshot)
    setNodes(nextSnapshot.nodes.map(toFlowNode))
    setGroups(nextSnapshot.groups)
    setEdges(nextSnapshot.edges.map((edge) => toFlowEdge(edge, hoveredEdgeId, deleteEdge)))
    setViewport(nextSnapshot.viewport)
    setActiveGroupId(null)
    setGroupColorMenuOpen(false)
    reactFlowRef.current?.setViewport(nextSnapshot.viewport, { duration: 0 })
    latestSnapshotRef.current = cloneSnapshot(nextSnapshot)
    latestComparableRef.current = getSnapshotComparableSignature(nextSnapshot)
    undoStackRef.current = []
    redoStackRef.current = []
  }, [
    deleteEdge,
    hoveredEdgeId,
    reactFlowRef,
    setActiveGroupId,
    setEdges,
    setGroupColorMenuOpen,
    setGroups,
    setNodes,
    setViewport,
    snapshot,
  ])

  useEffect(() => {
    const nextComparable = getSnapshotComparableSignature(currentSnapshot)
    if (nextComparable === latestComparableRef.current) return

    if (!historyLockRef.current) {
      undoStackRef.current = [...undoStackRef.current.slice(-39), cloneSnapshot(latestSnapshotRef.current)]
      redoStackRef.current = []
    }

    latestSnapshotRef.current = cloneSnapshot(currentSnapshot)
    latestComparableRef.current = nextComparable
    historyLockRef.current = false
    skipExternalSyncRef.current = true
    onSnapshotChange(currentSnapshot)
  }, [currentSnapshot, onSnapshotChange])

  const applySnapshotState = useCallback(
    (nextSnapshot: CanvasSnapshot) => {
      historyLockRef.current = true
      setNodes(nextSnapshot.nodes.map(toFlowNode))
      setGroups(nextSnapshot.groups)
      setEdges(nextSnapshot.edges.map((edge) => toFlowEdge(edge, hoveredEdgeId, deleteEdge)))
      setViewport(nextSnapshot.viewport)
      setActiveGroupId(null)
      setGroupColorMenuOpen(false)
      setSelectedEdgeIds([])
      reactFlowRef.current?.setViewport(nextSnapshot.viewport, { duration: 0 })
    },
    [
      deleteEdge,
      hoveredEdgeId,
      reactFlowRef,
      setActiveGroupId,
      setEdges,
      setGroupColorMenuOpen,
      setGroups,
      setNodes,
      setSelectedEdgeIds,
      setViewport,
    ],
  )

  const undoHistory = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (!previous) return
    redoStackRef.current = [...redoStackRef.current, cloneSnapshot(latestSnapshotRef.current)]
    applySnapshotState(previous)
  }, [applySnapshotState])

  const redoHistory = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current = [...undoStackRef.current, cloneSnapshot(latestSnapshotRef.current)]
    applySnapshotState(next)
  }, [applySnapshotState])

  return {
    undoHistory,
    redoHistory,
  }
}
