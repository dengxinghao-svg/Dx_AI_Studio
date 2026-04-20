import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from 'reactflow'
import { Link } from 'react-router-dom'
import type { CanvasGroup, CanvasNode, CanvasNodeType, CanvasSnapshot } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'
import { FloatingNodeEditor } from './FloatingNodeEditor'
import { getSnappedPosition, removeNodesFromGroups } from './canvas-layout'
import { CanvasContextMenu } from './CanvasContextMenu'
import { CanvasMinimapDock } from './CanvasMinimapDock'
import { ImageNodeOverlays } from './ImageNodeOverlays'
import { ImageNodeToolbar } from './ImageNodeToolbar'
import {
  buildQuickAddTypes,
  fromFlowNode,
  getSaveStateLabel,
  toFlowEdge,
  toFlowNode,
  type ClipboardPayload,
  type ContextMenuState,
  type CanvasWorkspaceProps,
} from './canvas-core'
import { useCanvasExecution } from './hooks/useCanvasExecution'
import { useCanvasFloatingLayout } from './hooks/useCanvasFloatingLayout'
import { useCanvasHistory } from './hooks/useCanvasHistory'
import { useCanvasKeyboardShortcuts } from './hooks/useCanvasKeyboardShortcuts'
import { useCanvasSelectionActions } from './hooks/useCanvasSelectionActions'
import { createCanvasNode, normalizeCanvasSnapshot } from './mock-canvas'
import { TextDocumentOverlay } from './TextDocumentOverlay'
import { TEXT_NODE_PANEL_COLORS } from './text-node-colors'
import { WorkflowEdge } from './WorkflowEdge'
import { WorkflowNode } from './WorkflowNode'
import type { WorkflowFlowEdge, WorkflowFlowNode, WorkflowNodeData } from './workflow-types'
import 'reactflow/dist/style.css'

const nodeTypes = {
  workflow: WorkflowNode,
}

const edgeTypes = {
  workflow: WorkflowEdge,
}

export function CanvasWorkspace({
  projectId,
  projectName,
  saveState,
  snapshot,
  lastOpenedAt,
  draftUpdatedAt,
  onSnapshotChange,
  onRunSelectedNode,
}: CanvasWorkspaceProps) {
  const { t, locale, language } = useI18n()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<WorkflowNodeData> | null>(null)
  const contextMenuRef = useRef<HTMLDivElement | null>(null)

  const normalizedSnapshot = useMemo(() => normalizeCanvasSnapshot(snapshot), [snapshot])
  const [minimapVisible, setMinimapVisible] = useState(true)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [clipboard, setClipboard] = useState<ClipboardPayload | null>(null)
  const [alignmentGuides, setAlignmentGuides] = useState<Array<{ orientation: 'vertical' | 'horizontal'; position: number }>>([])
  const [textDocumentNodeId, setTextDocumentNodeId] = useState<string | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [groupColorMenuOpen, setGroupColorMenuOpen] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [imageOverlayMode, setImageOverlayMode] = useState<'viewer' | 'crop' | 'repaint' | 'expand' | 'split' | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
    flowX: 160,
    flowY: 140,
  })
  const [nodes, setNodes] = useState<WorkflowFlowNode[]>(() => normalizedSnapshot.nodes.map(toFlowNode))
  const [edges, setEdges] = useState<WorkflowFlowEdge[]>(() =>
    normalizedSnapshot.edges.map((edge) => toFlowEdge(edge, null, () => {})),
  )
  const [groups, setGroups] = useState<CanvasGroup[]>(() => normalizedSnapshot.groups)
  const [viewport, setViewport] = useState(normalizedSnapshot.viewport)

  const currentSnapshot = useMemo<CanvasSnapshot>(
    () => ({
      version: 2,
      savedAt: new Date().toISOString(),
      viewport,
      nodes: nodes.map(fromFlowNode),
      edges: edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
      groups,
    }),
    [edges, groups, nodes, viewport],
  )

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId))
    setSelectedEdgeIds((current) => current.filter((id) => id !== edgeId))
  }, [])

  const quickAddTypes = useMemo(() => buildQuickAddTypes(language, t), [language, t])
  const selectedNodeIds = useMemo(() => nodes.filter((node) => node.selected).map((node) => node.id), [nodes])
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeIds[0]) ?? null, [nodes, selectedNodeIds])
  const selectedNodeData = selectedNode?.data ?? null
  const selectedNodeCanvas = useMemo(() => (selectedNode ? fromFlowNode(selectedNode) : null), [selectedNode])

  const {
    activeGroups,
    groupBounds,
    activeGroupBounds,
    selectedBounds,
    selectedToolbarStyle,
    activeGroupToolbarStyle,
    floatingEditorStyle,
    imageToolbarStyle,
  } = useCanvasFloatingLayout({
    activeGroupId,
    groups,
    nodes,
    selectedNode,
    selectedNodeIds,
    viewport,
  })

  const updateNodeById = useCallback((nodeId: string, fields: Partial<WorkflowNodeData>) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              width: typeof fields.nodeWidth === 'number' ? fields.nodeWidth : node.width,
              height: typeof fields.nodeHeight === 'number' ? fields.nodeHeight : node.height,
              data: {
                ...node.data,
                ...fields,
              },
            }
          : node,
      ),
    )
  }, [])

  const updateSelectedNode = useCallback(
    (fields: Partial<CanvasNode>) => {
      if (!selectedNode) return
      updateNodeById(selectedNode.id, {
        title: fields.title ?? selectedNode.data.title,
        description: fields.description ?? selectedNode.data.description,
        prompt: fields.prompt ?? selectedNode.data.prompt,
        content: fields.content ?? selectedNode.data.content,
        settings: fields.settings ?? selectedNode.data.settings,
        status: fields.status ?? selectedNode.data.status,
        model: fields.model ?? selectedNode.data.model,
        panelColor: fields.panelColor ?? selectedNode.data.panelColor,
        outputText: fields.outputText ?? selectedNode.data.outputText,
        errorMessage: fields.errorMessage ?? selectedNode.data.errorMessage,
        lastRunAt: fields.lastRunAt ?? selectedNode.data.lastRunAt,
        runCount: fields.runCount ?? selectedNode.data.runCount,
        badge: fields.badge ?? selectedNode.data.badge,
        type: fields.type ?? selectedNode.data.type,
        nodeWidth: fields.width ?? selectedNode.data.nodeWidth,
        nodeHeight: fields.height ?? selectedNode.data.nodeHeight,
      })
    },
    [selectedNode, updateNodeById],
  )

  const history = useCanvasHistory({
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
  })

  const {
    copySelectionToClipboard,
    pasteClipboard,
    duplicateSelection,
    deleteSelection,
    cutSelection,
    groupSelection,
    ungroupSelection,
    arrangeActiveGroup,
    setActiveGroupColor,
  } = useCanvasSelectionActions({
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
  })

  const { isRunningSelectedNode, canRunSelectedNode, workflowSuggestions, getUpstreamNodes, handleRunSelectedNode } =
    useCanvasExecution({
      edges,
      nodes,
      onRunSelectedNode,
      projectId,
      selectedNode,
      t,
      updateNodeById,
    })

  const getStageCenterPosition = useCallback(() => {
    const stageRect = stageRef.current?.getBoundingClientRect()
    if (stageRect && reactFlowRef.current) {
      return reactFlowRef.current.screenToFlowPosition({
        x: stageRect.left + stageRect.width * 0.45,
        y: stageRect.top + stageRect.height * 0.42,
      })
    }
    return { x: 160, y: 140 }
  }, [])

  const addNode = useCallback(
    (type: CanvasNodeType, overridePosition?: { x: number; y: number }) => {
      const nextCanvasNode = createCanvasNode(type, overridePosition ?? getStageCenterPosition(), language)
      setActiveGroupId(null)
      setNodes((currentNodes) => [
        ...currentNodes.map((node) => ({ ...node, selected: false })),
        { ...toFlowNode(nextCanvasNode), selected: true },
      ])
      setContextMenu((current) => ({ ...current, open: false }))
    },
    [getStageCenterPosition, language],
  )

  useCanvasKeyboardShortcuts({
    canRunSelectedNode,
    copySelectionToClipboard,
    cutSelection,
    deleteSelection,
    getStageCenterPosition,
    groupSelection,
    handleRunSelectedNode,
    onEscape: () => {
      setContextMenu((current) => ({ ...current, open: false }))
      setGroupColorMenuOpen(false)
      setImageOverlayMode(null)
      if (textDocumentNodeId) {
        setTextDocumentNodeId(null)
      }
    },
    pasteClipboard,
    redoHistory: history.redoHistory,
    selectedNodeIds,
    setIsSpacePressed,
    ungroupSelection,
    undoHistory: history.undoHistory,
    fitView: () => void reactFlowRef.current?.fitView({ duration: 280, padding: 0.2 }),
    resetView: () => {
      const nextViewport = { x: 0, y: 0, zoom: 1 }
      setViewport(nextViewport)
      void reactFlowRef.current?.setViewport(nextViewport, { duration: 260 })
    },
    zoomIn: () => void reactFlowRef.current?.zoomIn({ duration: 160 }),
    zoomOut: () => void reactFlowRef.current?.zoomOut({ duration: 160 }),
  })

  useEffect(() => {
    if (!contextMenu.open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (contextMenuRef.current?.contains(target)) return
      setContextMenu((current) => ({ ...current, open: false }))
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [contextMenu.open])

  const interactiveNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          canvasZoom: viewport.zoom,
          nodeWidth:
            typeof node.style?.width === 'number' ? node.style.width : node.width ?? (node.data.type === 'text' ? 296 : 236),
          nodeHeight:
            typeof node.style?.height === 'number' ? node.style.height : node.height ?? (node.data.type === 'text' ? 378 : 170),
          nodeX: node.position.x,
          nodeY: node.position.y,
          onTextContentChange: (nodeId: string, content: string) => updateNodeById(nodeId, { content }),
          onPanelColorChange: (nodeId: string, color: string | null) => updateNodeById(nodeId, { panelColor: color }),
          onOpenTextDocument: (nodeId: string) => setTextDocumentNodeId(nodeId),
          onFocusNode: (nodeId: string) => {
            setActiveGroupId(null)
            setNodes((currentNodes) => currentNodes.map((item) => ({ ...item, selected: item.id === nodeId })))
          },
          onResizeNode: (
            nodeId: string,
            next: {
              width: number
              height: number
              position?: { x: number; y: number }
            },
          ) => {
            setNodes((currentNodes) =>
              currentNodes.map((item) =>
                item.id === nodeId
                  ? {
                      ...item,
                      position: next.position ?? item.position,
                      width: next.width,
                      height: next.height,
                      style: {
                        ...item.style,
                        width: next.width,
                        height: next.height,
                      },
                    }
                  : item,
              ),
            )
          },
        },
      })),
    [nodes, updateNodeById, viewport.zoom],
  )

  const interactiveEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          hovered: hoveredEdgeId === edge.id,
          onDelete: deleteEdge,
        },
      })),
    [deleteEdge, edges, hoveredEdgeId],
  )

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      let nextGuides: typeof alignmentGuides = []

      setNodes((currentNodes) => {
        let nextNodes = currentNodes

        for (const change of changes) {
          if (change.type === 'select') {
            nextNodes = nextNodes.map((node) => (node.id === change.id ? { ...node, selected: change.selected } : node))
            continue
          }

          if (change.type === 'position' && change.position) {
            const { position, guides } = getSnappedPosition(change.id, change.position, nextNodes, snapToGrid)
            nextGuides = change.dragging ? guides : []
            nextNodes = nextNodes.map((node) => (node.id === change.id ? { ...node, position } : node))
            continue
          }

          if (change.type === 'remove') {
            const removedIds = new Set(changes.filter((item) => item.type === 'remove').map((item) => item.id))
            nextNodes = nextNodes.filter((node) => !removedIds.has(node.id))
            setEdges((currentEdges) => currentEdges.filter((edge) => !removedIds.has(edge.source) && !removedIds.has(edge.target)))
            setGroups((currentGroups) => removeNodesFromGroups(currentGroups, removedIds))
            if (textDocumentNodeId && removedIds.has(textDocumentNodeId)) setTextDocumentNodeId(null)
            continue
          }

          if (change.type === 'dimensions' && change.dimensions) {
            const { width, height } = change.dimensions
            nextNodes = nextNodes.map((node) =>
              node.id === change.id
                ? {
                    ...node,
                    width,
                    height,
                    style: {
                      ...node.style,
                      width,
                      height,
                    },
                  }
                : node,
            )
          }
        }

        return nextNodes
      })

      setAlignmentGuides(nextGuides)
    },
    [snapToGrid, textDocumentNodeId],
  )

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((currentEdges) => {
      let nextEdges = currentEdges
      for (const change of changes) {
        if (change.type === 'remove') {
          nextEdges = nextEdges.filter((edge) => edge.id !== change.id)
        }
        if (change.type === 'select') {
          setSelectedEdgeIds((current) =>
            change.selected ? [...new Set([...current, change.id])] : current.filter((id) => id !== change.id),
          )
        }
      }
      return nextEdges
    })
  }, [])

  const sessionNodeCount = nodes.length
  const sessionEdgeCount = edges.length
  const viewportZoom = Math.round(viewport.zoom * 100)
  const selectedUpstreamNodes = useMemo(() => (selectedNode ? getUpstreamNodes(selectedNode.id) : []), [getUpstreamNodes, selectedNode])
  const textDocumentNode = useMemo(
    () => (textDocumentNodeId ? nodes.find((node) => node.id === textDocumentNodeId) : null),
    [nodes, textDocumentNodeId],
  )

  return (
    <main className="canvas-app-shell">
      <section className="canvas-stage-panel">
        <Link className="canvas-floating-title" to="/workspace" title={t('common.backToWorkspace')}>
          <div className="canvas-floating-title__mark" />
          <div>
            <p className="canvas-floating-title__meta">{t('canvas.workspaceMeta')}</p>
            <h1>{projectName}</h1>
          </div>
        </Link>

        <div className="canvas-stage" ref={stageRef}>
          <aside className="canvas-left-dock canvas-left-dock--floating">
            <button className="canvas-left-dock__main" type="button" title={t('canvas.quickAddText')} onClick={() => addNode('text')}>
              +
            </button>
            {quickAddTypes.map((item) => (
              <button key={item.type} className="canvas-left-dock__tool" type="button" title={item.label} onClick={() => addNode(item.type)}>
                {item.icon}
              </button>
            ))}
            <div className="canvas-left-dock__divider" />
            <button className="canvas-left-dock__tool canvas-left-dock__tool--muted" type="button" title={t('canvas.fitView')} onClick={() => void reactFlowRef.current?.fitView({ duration: 280, padding: 0.2 })}>
              F
            </button>
            <button className="canvas-left-dock__tool canvas-left-dock__tool--muted" type="button" title={t('canvas.resetView')} onClick={() => {
              const nextViewport = { x: 0, y: 0, zoom: 1 }
              setViewport(nextViewport)
              void reactFlowRef.current?.setViewport(nextViewport, { duration: 260 })
            }}>
              R
            </button>
          </aside>

          <div className="canvas-group-layer">
            {groupBounds.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`canvas-group${activeGroupId === group.id ? ' is-active' : ''}`}
                style={
                  {
                    left: `${group.left}px`,
                    top: `${group.top}px`,
                    width: `${group.width}px`,
                    height: `${group.height}px`,
                    '--group-color': group.color,
                  } as CSSProperties
                }
                onClick={() => {
                  const targetGroup = groups.find((item) => item.id === group.id)
                  if (!targetGroup) return
                  setActiveGroupId(group.id)
                  setNodes((currentNodes) =>
                    currentNodes.map((item) => ({
                      ...item,
                      selected: targetGroup.nodeIds.includes(item.id),
                    })),
                  )
                }}
              >
                <span className="canvas-group__label">{group.title}</span>
              </button>
            ))}

            {alignmentGuides.map((guide, index) => (
              <div
                key={`${guide.orientation}-${guide.position}-${index}`}
                className={`canvas-guide canvas-guide--${guide.orientation}`}
                style={
                  guide.orientation === 'vertical'
                    ? { left: `${guide.position * viewport.zoom + viewport.x}px` }
                    : { top: `${guide.position * viewport.zoom + viewport.y}px` }
                }
              />
            ))}
          </div>

          <ReactFlow
            nodes={interactiveNodes}
            edges={interactiveEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance
              void instance.setViewport(viewport, { duration: 0 })
            }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={() => {
              setActiveGroupId(null)
              setGroupColorMenuOpen(false)
            }}
            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            onNodeContextMenu={(event, node) => {
              event.preventDefault()
              setNodes((currentNodes) =>
                currentNodes.map((item) => ({
                  ...item,
                  selected: selectedNodeIds.includes(node.id) ? item.selected : item.id === node.id,
                })),
              )
              if (!stageRef.current || !reactFlowRef.current) return
              const stageRect = stageRef.current.getBoundingClientRect()
              const flowPosition = reactFlowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
              setContextMenu({
                open: true,
                x: Math.max(16, Math.min(event.clientX - stageRect.left, stageRect.width - 250)),
                y: Math.max(16, Math.min(event.clientY - stageRect.top, stageRect.height - 360)),
                flowX: flowPosition.x,
                flowY: flowPosition.y,
              })
            }}
            onConnect={(connection: Connection) => {
              if (!connection.source || !connection.target || connection.source === connection.target) return
              if (edges.some((edge) => edge.source === connection.source && edge.target === connection.target)) return
              const source = connection.source
              const target = connection.target
              setEdges((currentEdges) => [
                ...currentEdges,
                toFlowEdge({ id: `edge-${source}-${target}-${Date.now()}`, source, target }, hoveredEdgeId, deleteEdge),
              ])
            }}
            onMoveEnd={(_, nextViewport) => setViewport(nextViewport)}
            onPaneContextMenu={(event) => {
              event.preventDefault()
              if (!stageRef.current || !reactFlowRef.current) return
              const stageRect = stageRef.current.getBoundingClientRect()
              const flowPosition = reactFlowRef.current.screenToFlowPosition({ x: event.clientX, y: event.clientY })
              setContextMenu({
                open: true,
                x: Math.max(16, Math.min(event.clientX - stageRect.left, stageRect.width - 250)),
                y: Math.max(16, Math.min(event.clientY - stageRect.top, stageRect.height - 360)),
                flowX: flowPosition.x,
                flowY: flowPosition.y,
              })
            }}
            onPaneClick={() => {
              setContextMenu((current) => ({ ...current, open: false }))
              setSelectedEdgeIds([])
              setActiveGroupId(null)
              setGroupColorMenuOpen(false)
            }}
            fitView
            minZoom={0.55}
            maxZoom={1.85}
            deleteKeyCode={null}
            snapToGrid={snapToGrid}
            snapGrid={[18, 18]}
            selectionOnDrag={!isSpacePressed}
            nodesDraggable={!isSpacePressed}
            panOnDrag={isSpacePressed ? [0, 1, 2] : [1]}
            multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
            defaultEdgeOptions={{ animated: false }}
            proOptions={{ hideAttribution: true }}
          >
            <Background id="canvas-dots" variant={BackgroundVariant.Dots} size={1.2} gap={18} color="rgba(255,255,255,0.12)" />
            <Background id="canvas-lines" variant={BackgroundVariant.Lines} gap={108} size={1} color="rgba(255,255,255,0.03)" />
            {minimapVisible ? (
              <MiniMap
                className="canvas-minimap"
                nodeStrokeWidth={3}
                pannable
                zoomable
                maskColor="rgba(6, 9, 16, 0.7)"
                nodeColor={(node) => {
                  const type = (node.data as WorkflowNodeData).type
                  switch (type) {
                    case 'image':
                      return '#f6b96a'
                    case 'video':
                      return '#87b4ff'
                    case 'asset':
                      return '#73d5b6'
                    default:
                      return '#9f8cff'
                  }
                }}
              />
            ) : null}
          </ReactFlow>

          {activeGroupId && activeGroupBounds ? (
            <div className="canvas-group-toolbar" style={activeGroupToolbarStyle}>
              <button type="button" className="canvas-group-toolbar__button canvas-group-toolbar__button--color" onClick={() => setGroupColorMenuOpen((current) => !current)} title={t('canvas.groupColor')}>
                <span className="canvas-group-toolbar__dot" style={{ background: groups.find((group) => group.id === activeGroupId)?.color }} />
              </button>
              <button type="button" className="canvas-group-toolbar__button" onClick={arrangeActiveGroup}>{t('canvas.groupArrange')}</button>
              <button type="button" className="canvas-group-toolbar__button" onClick={ungroupSelection}>{t('canvas.groupUngroup')}</button>
              {groupColorMenuOpen ? (
                <div className="canvas-group-toolbar__palette">
                  {TEXT_NODE_PANEL_COLORS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="canvas-group-toolbar__swatch"
                      title={t(item.key)}
                      style={{ '--swatch': item.value } as CSSProperties}
                      onClick={() => setActiveGroupColor(item.value)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <ImageNodeToolbar
            open={Boolean(selectedNode && selectedNode.data.type === 'image')}
            style={imageToolbarStyle}
            settings={selectedNode?.data.settings}
            onModeChange={(mode) => {
              if (!selectedNode) return

              if (mode.startsWith('split:')) {
                const quickSplit = mode.split(':')[1] ?? '2x2'
                updateNodeById(selectedNode.id, {
                  settings: {
                    ...(selectedNode.data.settings ?? {}),
                    imageEditMode: 'split',
                    quickSplit,
                  },
                })
                setImageOverlayMode('split')
                return
              }

              updateNodeById(selectedNode.id, {
                settings: {
                  ...(selectedNode.data.settings ?? {}),
                  imageEditMode: mode,
                },
              })

              if (mode === 'crop' || mode === 'repaint' || mode === 'expand' || mode === 'split') {
                setImageOverlayMode(mode)
              }
            }}
            onOpenViewer={() => setImageOverlayMode('viewer')}
            onDownload={() => {
              if (!selectedNode) return
              const blob = new Blob([selectedNode.data.outputText || selectedNode.data.prompt || ''], {
                type: 'text/plain;charset=utf-8',
              })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `${selectedNode.data.title || 'image-node'}.txt`
              document.body.appendChild(link)
              link.click()
              link.remove()
              URL.revokeObjectURL(url)
            }}
          />

          {selectedNodeIds.length > 1 && !activeGroupId && selectedBounds ? (
            <div className="canvas-selection-toolbar" style={selectedToolbarStyle}>
              <span className="canvas-selection-toolbar__count">{t('canvas.selectionCount', { count: selectedNodeIds.length })}</span>
              <button type="button" onClick={duplicateSelection}>{t('canvas.duplicate')}</button>
              <button type="button" onClick={copySelectionToClipboard}>{t('canvas.copy')}</button>
              <button type="button" onClick={cutSelection}>{t('canvas.cut')}</button>
              <button type="button" disabled={selectedNodeIds.length < 2} onClick={groupSelection}>{t('canvas.groupSelected')}</button>
              <button type="button" className="is-danger" onClick={deleteSelection}>{t('canvas.delete')}</button>
            </div>
          ) : null}

          <div ref={contextMenuRef}>
            <CanvasContextMenu
              open={contextMenu.open}
              x={contextMenu.x}
              y={contextMenu.y}
              hasSelection={Boolean(selectedNodeIds.length || selectedEdgeIds.length)}
              canPaste={Boolean(clipboard)}
              canGroup={selectedNodeIds.length > 1}
              canUngroup={Boolean(activeGroupId || activeGroups.length)}
              canRun={Boolean(selectedNode && selectedNode.data.type === 'text')}
              items={quickAddTypes}
              onAddNode={(type) => addNode(type, { x: contextMenu.flowX, y: contextMenu.flowY })}
              onDuplicate={duplicateSelection}
              onDelete={deleteSelection}
              onPaste={() => pasteClipboard({ x: contextMenu.flowX, y: contextMenu.flowY })}
              onFitView={() => void reactFlowRef.current?.fitView({ duration: 280, padding: 0.2 })}
              onResetView={() => {
                const nextViewport = { x: 0, y: 0, zoom: 1 }
                setViewport(nextViewport)
                void reactFlowRef.current?.setViewport(nextViewport, { duration: 260 })
              }}
              onGroup={groupSelection}
              onUngroup={ungroupSelection}
              onRunSelected={() => void handleRunSelectedNode()}
            />
          </div>

          <CanvasMinimapDock
            minimapVisible={minimapVisible}
            snapToGrid={snapToGrid}
            viewportZoom={viewportZoom}
            onToggleMinimap={() => setMinimapVisible((current) => !current)}
            onToggleSnap={() => setSnapToGrid((current) => !current)}
            onFitView={() => void reactFlowRef.current?.fitView({ duration: 280, padding: 0.2 })}
          />

          {nodes.length === 0 ? (
            <div className="canvas-empty-state">
              <h2>{t('canvas.emptyCanvasTitle')}</h2>
              <p>{t('canvas.emptyCanvasSummary')}</p>
              <button type="button" onClick={() => addNode('text')}>{t('canvas.emptyCanvasAction')}</button>
            </div>
          ) : null}

          <p className="canvas-global-hint">{t('canvas.globalDockHint')}</p>

          <FloatingNodeEditor
            open={Boolean(selectedNode)}
            node={selectedNodeCanvas}
            upstreamNodes={selectedUpstreamNodes}
            canRun={canRunSelectedNode}
            isRunning={isRunningSelectedNode}
            style={floatingEditorStyle}
            onChange={updateSelectedNode}
            onRun={() => void handleRunSelectedNode()}
          />
        </div>
      </section>

      <aside className="canvas-inspector">
        <div className="canvas-inspector__topbar">
          <span>{projectName}</span>
          <div className="canvas-inspector__window">
            <button type="button" title={t('canvas.newNode')} onClick={() => addNode('text')}>+</button>
            <button type="button" title={t('canvas.fitView')} onClick={() => void reactFlowRef.current?.fitView({ duration: 280, padding: 0.2 })}>F</button>
          </div>
        </div>

        <div className="canvas-inspector__content">
          <section className="canvas-card canvas-card--summary">
            <h2>{selectedNodeData?.title ?? t('canvas.summaryTitle', { count: sessionNodeCount })}</h2>
            <p>{selectedNodeData?.description ?? t('canvas.summaryText')}</p>
            <div className="canvas-card__actions">
              <button type="button" disabled={!canRunSelectedNode} onClick={() => void handleRunSelectedNode()}>
                {isRunningSelectedNode ? t('canvas.statusRunning') : t('canvas.runSelected')}
              </button>
              <button type="button" disabled>{t('canvas.runChain')}</button>
              <button type="button" onClick={() => {
                const nextViewport = { x: 0, y: 0, zoom: 1 }
                setViewport(nextViewport)
                void reactFlowRef.current?.setViewport(nextViewport, { duration: 260 })
              }}>{t('canvas.reset')}</button>
            </div>
            <p className="canvas-card__helper">
              {selectedNodeData?.type === 'text' ? t('canvas.outputApplied') : t('canvas.textOnlyHint')}
            </p>
          </section>

          <section className="canvas-card">
            <h3>{t('canvas.executionOutput')}</h3>
            {selectedNodeData ? (
              <div className="canvas-output-panel">
                <div className="canvas-output-panel__block">
                  <strong>{t('canvas.output')}</strong>
                  <pre>{selectedNodeData.outputText || t('canvas.noExecutionYet')}</pre>
                </div>
                <div className="canvas-output-panel__block">
                  <strong>{t('canvas.error')}</strong>
                  <pre>{selectedNodeData.errorMessage || '-'}</pre>
                </div>
              </div>
            ) : (
              <p className="canvas-card__empty">{t('canvas.noExecutionYet')}</p>
            )}
          </section>

          <section className="canvas-card">
            <h3>{t('canvas.improvements')}</h3>
            <ul className="canvas-analysis-list">
              {workflowSuggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="canvas-card">
            <h3>{t('canvas.sessionState')}</h3>
            <ul className="canvas-session-list">
              <li><strong>{t('canvas.autosave')}</strong><span>{getSaveStateLabel(saveState, t)}</span></li>
              <li><strong>{t('canvas.nodeCount')}</strong><span>{sessionNodeCount}</span></li>
              <li><strong>{t('canvas.edgeCount')}</strong><span>{sessionEdgeCount}</span></li>
              <li><strong>{t('canvas.groupCount')}</strong><span>{groups.length}</span></li>
              <li><strong>{t('canvas.lastOpened')}</strong><span>{lastOpenedAt ? new Date(lastOpenedAt).toLocaleString(locale) : t('canvas.neverTracked')}</span></li>
              <li><strong>{t('canvas.draftUpdated')}</strong><span>{draftUpdatedAt ? new Date(draftUpdatedAt).toLocaleString(locale) : t('canvas.noDraftYet')}</span></li>
            </ul>
          </section>
        </div>
      </aside>

      <TextDocumentOverlay
        open={Boolean(textDocumentNode)}
        node={textDocumentNode ? fromFlowNode(textDocumentNode) : null}
        upstreamNodes={textDocumentNode ? getUpstreamNodes(textDocumentNode.id) : []}
        onClose={() => setTextDocumentNodeId(null)}
        onChange={(nodeId, content) => updateNodeById(nodeId, { content })}
        onPanelColorChange={(nodeId, color) => updateNodeById(nodeId, { panelColor: color })}
      />
      <ImageNodeOverlays
        node={selectedNodeCanvas?.type === 'image' ? selectedNodeCanvas : null}
        openMode={imageOverlayMode}
        onClose={() => setImageOverlayMode(null)}
      />
    </main>
  )
}
