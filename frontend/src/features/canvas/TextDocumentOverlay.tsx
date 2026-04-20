import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasNode } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'
import { getTextPanelColor, TEXT_NODE_PANEL_COLORS } from './text-node-colors'
import {
  applyTextCommand,
  copyEditorText,
  normalizeEditorHtml,
  normalizeTextContent,
  setEditableHtml,
  summarizeTextContent,
  TEXT_TOOLBAR_ITEMS,
  type TextToolbarAction,
} from './text-format'

interface TextDocumentOverlayProps {
  node: CanvasNode | null
  upstreamNodes: CanvasNode[]
  open: boolean
  onClose: () => void
  onChange: (nodeId: string, content: string) => void
  onPanelColorChange: (nodeId: string, color: string | null) => void
}

export function TextDocumentOverlay({
  node,
  upstreamNodes,
  open,
  onClose,
  onChange,
  onPanelColorChange,
}: TextDocumentOverlayProps) {
  const { t } = useI18n()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const [colorMenuOpen, setColorMenuOpen] = useState(false)

  useEffect(() => {
    if (!open || !node || !editorRef.current) return
    setEditableHtml(editorRef.current, normalizeTextContent(node.content || ''))
  }, [node, open])

  useEffect(() => {
    if (!open) return

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [onClose, open])

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

  const summary = useMemo(() => summarizeTextContent(node?.content || '', 120), [node?.content])

  async function handleToolbar(action: TextToolbarAction) {
    const editor = editorRef.current
    if (!editor || !node) return

    if (action === 'copy') {
      await copyEditorText(editor)
      return
    }

    if (action === 'expand') return

    if (action === 'color') {
      setColorMenuOpen((current) => !current)
      return
    }

    applyTextCommand(action, editor)
    onChange(node.id, normalizeEditorHtml(editor.innerHTML))
  }

  if (!open || !node) return null

  return (
    <section className="text-doc-overlay">
      <div className="text-doc-overlay__backdrop" onClick={onClose} />
      <div className="text-doc-overlay__shell" role="dialog" aria-modal="true" aria-label={t('canvas.textDocument')}>
        <button className="text-doc-overlay__close" type="button" title={t('canvas.closeDocument')} onClick={onClose}>
          x
        </button>
        <div className="text-doc-overlay__main">
          <div ref={toolbarRef} className="text-doc-overlay__toolbar">
            {TEXT_TOOLBAR_ITEMS.filter((item) => item.action !== 'expand').map((item) => (
              <button
                key={item.action}
                type="button"
                className={`workflow-node__text-tool${item.swatch ? ' workflow-node__text-tool--swatch' : ''}`}
                title={t(item.titleKey)}
                aria-label={t(item.titleKey)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void handleToolbar(item.action)}
              >
                {item.swatch ? <span className="workflow-node__text-swatch" /> : <span>{item.label}</span>}
              </button>
            ))}

            {colorMenuOpen ? (
              <div className="workflow-node__text-color-menu workflow-node__text-color-menu--overlay">
                {TEXT_NODE_PANEL_COLORS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`workflow-node__text-color-chip${getTextPanelColor(node.panelColor) === item.value ? ' is-active' : ''}`}
                    title={t(item.key)}
                    style={{ '--swatch': item.value } as CSSProperties}
                    onClick={() => {
                      onPanelColorChange(node.id, item.value)
                      setColorMenuOpen(false)
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <article
            className="text-doc-overlay__card"
            style={
              {
                '--text-panel-accent': getTextPanelColor(node.panelColor),
              } as CSSProperties
            }
          >
            <header className="text-doc-overlay__header">
              <span className="text-doc-overlay__badge">{node.badge ?? t('canvas.nodeTypeText')}</span>
              <h2 className="text-doc-overlay__title">{node.title}</h2>
            </header>
            <div
              ref={editorRef}
              className="text-doc-overlay__editor"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              data-placeholder={t('canvas.textNodePlaceholder')}
              onInput={(event) => onChange(node.id, normalizeEditorHtml((event.currentTarget as HTMLDivElement).innerHTML))}
            />
          </article>
        </div>

        <aside className="text-doc-overlay__sidebar">
          <section className="text-doc-overlay__sidebar-card">
            <h3>{t('canvas.documentSummary')}</h3>
            <p>{summary || t('canvas.documentSummaryEmpty')}</p>
          </section>
          <section className="text-doc-overlay__sidebar-card">
            <h3>{t('canvas.nodeInfo')}</h3>
            <ul className="text-doc-overlay__meta-list">
              <li>
                <strong>{t('canvas.nodeTitle')}</strong>
                <span>{node.title}</span>
              </li>
              <li>
                <strong>{t('canvas.nodeModel')}</strong>
                <span>{node.model || '-'}</span>
              </li>
              <li>
                <strong>{t('canvas.nodeStatus')}</strong>
                <span>{t(`canvas.status${node.status.charAt(0).toUpperCase()}${node.status.slice(1)}`)}</span>
              </li>
            </ul>
          </section>
          <section className="text-doc-overlay__sidebar-card">
            <h3>{t('canvas.upstreamAssets')}</h3>
            <div className="text-doc-overlay__assets">
              {upstreamNodes.length ? (
                upstreamNodes.map((item) => (
                  <article className="text-doc-overlay__asset" key={item.id} title={item.title}>
                    <div className="text-doc-overlay__asset-preview">
                      <span>{item.badge ?? item.type}</span>
                    </div>
                    <span>{item.title}</span>
                  </article>
                ))
              ) : (
                <p className="text-doc-overlay__empty">{t('canvas.noUpstreamAssets')}</p>
              )}
            </div>
          </section>
          <section className="text-doc-overlay__sidebar-card">
            <h3>{t('canvas.generationTips')}</h3>
            <ul className="text-doc-overlay__tips">
              <li>{t('canvas.textSuggestion1')}</li>
              <li>{t('canvas.textSuggestion2')}</li>
              <li>{t('canvas.textSuggestion3')}</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  )
}
