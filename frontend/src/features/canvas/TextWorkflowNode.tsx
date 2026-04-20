import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { useI18n } from '../../shared/i18n/useI18n'
import type { TranslationVariables } from '../../shared/i18n/context'
import { getTextPanelColor, TEXT_NODE_PANEL_COLORS } from './text-node-colors'
import {
  applyTextCommand,
  copyEditorText,
  normalizeEditorHtml,
  normalizeTextContent,
  setEditableHtml,
  TEXT_TOOLBAR_ITEMS,
  type TextToolbarAction,
} from './text-format'
import { startTextNodeResize } from './text-node-resize'
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

export function TextWorkflowNode({
  id,
  data,
  selected,
}: NodeProps<WorkflowNodeData>) {
  const { t } = useI18n()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || (document.activeElement === editor && !data.isStreaming)) return
    setEditableHtml(editor, normalizeTextContent(data.content || ''))
  }, [data.content, data.isStreaming])

  useEffect(() => {
    if (!colorMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (toolbarRef.current?.contains(target)) return
      setColorMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [colorMenuOpen])

  async function handleToolbar(action: TextToolbarAction) {
    const editor = editorRef.current
    if (!editor) return

    if (action === 'copy') {
      await copyEditorText(editor)
      return
    }

    if (action === 'expand') {
      data.onOpenTextDocument?.(id)
      return
    }

    if (action === 'color') {
      setColorMenuOpen((current) => !current)
      return
    }

    applyTextCommand(action, editor)
    data.onTextContentChange?.(id, normalizeEditorHtml(editor.innerHTML))
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    startTextNodeResize({
      event,
      zoom: data.canvasZoom ?? 1,
      width: data.nodeWidth ?? 296,
      height: data.nodeHeight ?? 378,
      onResize: (next) => data.onResizeNode?.(id, next),
    })
  }

  return (
    <article
      className={`workflow-node workflow-node--text ${selected ? 'is-selected' : ''}`}
      data-status={data.status}
      style={
        {
          '--text-panel-accent': getTextPanelColor(data.panelColor),
        } as CSSProperties
      }
      onMouseDownCapture={() => data.onFocusNode?.(id)}
    >
      {selected ? (
        <div
          className="workflow-node__resize-handle nodrag nopan"
          title="拖拽调整文本节点大小"
          onPointerDown={handleResizePointerDown}
          role="presentation"
        />
      ) : null}

      <Handle className="workflow-node__handle workflow-node__handle--left" type="target" position={Position.Left} />

      <header className="workflow-node__header workflow-node__header--text">
        <span className="workflow-node__badge">{data.badge ?? t('canvas.nodeTypeText')}</span>
        <div className="workflow-node__status" data-tone={getStatusTone(data.status)}>
          <strong>{getStatusLabel(data.status, t)}</strong>
          <span>{t('canvas.timesRun', { count: data.runCount ?? 0 })}</span>
        </div>
      </header>

      <div ref={toolbarRef} className="workflow-node__text-toolbar" role="toolbar" aria-label={t('canvas.textToolbar')}>
        {TEXT_TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.action}
            type="button"
            className={`workflow-node__text-tool nodrag nopan${item.swatch ? ' workflow-node__text-tool--swatch' : ''}`}
            title={t(item.titleKey)}
            aria-label={t(item.titleKey)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void handleToolbar(item.action)}
          >
            {item.swatch ? <span className="workflow-node__text-swatch" /> : <span>{item.label}</span>}
          </button>
        ))}

        {colorMenuOpen ? (
          <div className="workflow-node__text-color-menu nodrag nopan">
            {TEXT_NODE_PANEL_COLORS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`workflow-node__text-color-chip${getTextPanelColor(data.panelColor) === item.value ? ' is-active' : ''}`}
                title={t(item.key)}
                style={{ '--swatch': item.value } as CSSProperties}
                onClick={() => {
                  data.onPanelColorChange?.(id, item.value)
                  setColorMenuOpen(false)
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="workflow-node__text-surface">
        {data.status === 'running' ? (
          <div className="workflow-node__stream-indicator" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <div
          ref={editorRef}
          className="workflow-node__text-editor nodrag nopan nowheel"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder={t('canvas.textNodePlaceholder')}
          onFocus={() => data.onFocusNode?.(id)}
          onInput={(event) =>
            data.onTextContentChange?.(id, normalizeEditorHtml((event.currentTarget as HTMLDivElement).innerHTML))
          }
          onBlur={(event) =>
            data.onTextContentChange?.(id, normalizeEditorHtml((event.currentTarget as HTMLDivElement).innerHTML))
          }
          onPaste={() => {
            window.setTimeout(() => {
              if (!editorRef.current) return
              data.onTextContentChange?.(id, normalizeEditorHtml(editorRef.current.innerHTML))
            }, 0)
          }}
        />
      </div>

      <Handle className="workflow-node__handle workflow-node__handle--right" type="source" position={Position.Right} />
    </article>
  )
}
