import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<{ hovered?: boolean; onDelete?: (edgeId: string) => void }>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const showDelete = selected || data?.hovered

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: showDelete ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.34)',
          strokeWidth: showDelete ? 2.2 : 1.5,
        }}
      />
      {showDelete ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="workflow-edge__delete"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            onClick={() => data?.onDelete?.(id)}
            title="删除连线"
          >
            ×
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}
