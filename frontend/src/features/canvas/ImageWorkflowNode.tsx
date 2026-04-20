import { Handle, Position, type NodeProps } from 'reactflow'
import { useI18n } from '../../shared/i18n/useI18n'
import type { TranslationVariables } from '../../shared/i18n/context'
import {
  ensureImageSettings,
  getImageModelLabel,
  getImageRatioLabel,
  getImageVersionLabel,
} from './image-node-config'
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

export function ImageWorkflowNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const { t } = useI18n()
  const imageSettings = ensureImageSettings(data.settings)
  const previewText = data.outputText?.trim() || data.description || data.prompt || t('canvas.imageNodeEmpty')

  return (
    <article
      className={`workflow-node workflow-node--image ${selected ? 'is-selected' : ''}`}
      data-status={data.status}
      onMouseDownCapture={() => data.onFocusNode?.(id)}
    >
      <Handle className="workflow-node__handle workflow-node__handle--left" type="target" position={Position.Left} />

      <header className="workflow-node__header">
        <span className="workflow-node__badge">{data.badge ?? t('canvas.nodeTypeImage')}</span>
        <div className="workflow-node__status" data-tone={getStatusTone(data.status)}>
          <strong>{getStatusLabel(data.status, t)}</strong>
          <span>{t('canvas.timesRun', { count: data.runCount ?? 0 })}</span>
        </div>
      </header>

      <div className="workflow-node__preview workflow-node__preview--image workflow-node__preview--rich">
        <div className="workflow-node__preview-topbar">
          <span className="workflow-node__preview-chip">{getImageModelLabel(imageSettings.imageModel)}</span>
          <span className="workflow-node__preview-chip">{getImageVersionLabel(imageSettings.imageModel, imageSettings.imageModelVersion)}</span>
          <span className="workflow-node__preview-chip">{getImageRatioLabel(imageSettings.imageRatio)}</span>
        </div>
        <div className="workflow-node__preview-body">
          <span>{t('canvas.nodeTypeImage')}</span>
          <small>{t('canvas.imageReferenceHint')}</small>
        </div>
      </div>

      <div className="workflow-node__body">
        <h3 className="workflow-node__title">{data.title}</h3>
        <p className="workflow-node__copy">{previewText}</p>
        <div className="workflow-node__meta workflow-node__meta--stack">
          <span>{getImageModelLabel(imageSettings.imageModel)}</span>
          <span>{getImageVersionLabel(imageSettings.imageModel, imageSettings.imageModelVersion)}</span>
          <span>{getImageRatioLabel(imageSettings.imageRatio)}</span>
        </div>
      </div>

      <Handle className="workflow-node__handle workflow-node__handle--right" type="source" position={Position.Right} />
    </article>
  )
}
