import { Handle, Position, type NodeProps } from 'reactflow'
import type { TranslationVariables } from '../../shared/i18n/context'
import { useI18n } from '../../shared/i18n/useI18n'
import { ImageWorkflowNode } from './ImageWorkflowNode'
import { TextWorkflowNode } from './TextWorkflowNode'
import type { WorkflowNodeData } from './workflow-types'

function getStatusTone(status: WorkflowNodeData['status']) {
  switch (status) {
    case 'queued':
      return 'queued'
    case 'running':
      return 'running'
    case 'done':
      return 'done'
    case 'failed':
      return 'failed'
    default:
      return 'idle'
  }
}

function getStatusLabel(status: WorkflowNodeData['status'], t: (key: string, values?: TranslationVariables) => string) {
  switch (status) {
    case 'queued':
      return t('canvas.statusQueued')
    case 'running':
      return t('canvas.statusRunning')
    case 'done':
      return t('canvas.statusDone')
    case 'failed':
      return t('canvas.statusFailed')
    default:
      return t('canvas.statusIdle')
  }
}

function getPreviewLabel(type: string, t: (key: string, values?: TranslationVariables) => string) {
  switch (type) {
    case 'image':
      return t('canvas.nodeTypeImage')
    case 'video':
      return t('canvas.nodeTypeVideo')
    case 'audio':
      return t('canvas.nodeTypeAudio')
    case 'asset':
      return t('canvas.nodeTypeAsset')
    default:
      return t('canvas.nodeTypeText')
  }
}

export function WorkflowNode(props: NodeProps<WorkflowNodeData>) {
  const { data, selected } = props
  const { t } = useI18n()

  if (data.type === 'text') {
    return <TextWorkflowNode {...props} />
  }

  if (data.type === 'image') {
    return <ImageWorkflowNode {...props} />
  }

  const previewLabel = getPreviewLabel(data.type, t)

  return (
    <article className={`workflow-node ${selected ? 'is-selected' : ''}`} data-status={data.status}>
      <Handle className="workflow-node__handle workflow-node__handle--left" type="target" position={Position.Left} />
      <header className="workflow-node__header">
        <span className="workflow-node__badge">{data.badge ?? previewLabel}</span>
        <div className="workflow-node__status" data-tone={getStatusTone(data.status)}>
          <strong>{getStatusLabel(data.status, t)}</strong>
          <span>{t('canvas.timesRun', { count: data.runCount ?? 0 })}</span>
        </div>
      </header>

      <div className={`workflow-node__preview workflow-node__preview--${data.type}`}>
        <span>{previewLabel}</span>
      </div>

      <div className="workflow-node__body">
        <h3 className="workflow-node__title">{data.title}</h3>
        <p className="workflow-node__copy">{data.description || data.prompt || t('canvas.noDraftYet')}</p>
        <div className="workflow-node__meta">
          <span>{data.model ?? 'manual'}</span>
        </div>
      </div>

      <Handle className="workflow-node__handle workflow-node__handle--right" type="source" position={Position.Right} />
    </article>
  )
}
