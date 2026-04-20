import { type CSSProperties, useEffect, useRef, useState } from 'react'
import type { CanvasNode } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'
import { ImageNodeEditorFields } from './ImageNodeEditorFields'

interface FloatingNodeEditorProps {
  node: CanvasNode | null
  upstreamNodes: CanvasNode[]
  open: boolean
  canRun: boolean
  isRunning: boolean
  style?: CSSProperties
  onChange: (fields: Partial<CanvasNode>) => void
  onRun: () => void
}

const TEXT_MODEL_PRESETS = [
  { id: 'gpt', model: 'gpt-5.4', labelZh: 'GPT', labelEn: 'GPT' },
  { id: 'gemini', model: 'gemini-3.1-pro-preview', labelZh: 'Gemini', labelEn: 'Gemini' },
  { id: 'doubao', model: '', labelZh: '豆包', labelEn: 'Doubao' },
  { id: 'custom', model: '', labelZh: '自定义', labelEn: 'Custom' },
] as const

function getTextModelPreset(model?: string | null) {
  const normalized = (model ?? '').trim().toLowerCase()
  if (normalized === 'gpt-5.4') return 'gpt'
  if (normalized === 'gemini-3.1-pro-preview') return 'gemini'
  if (normalized.startsWith('doubao')) return 'doubao'
  return 'custom'
}

function getPresetLabel(id: string, language: 'zh-CN' | 'en-US') {
  const preset = TEXT_MODEL_PRESETS.find((item) => item.id === id)
  if (!preset) return language === 'zh-CN' ? '自定义' : 'Custom'
  return language === 'zh-CN' ? preset.labelZh : preset.labelEn
}

export function FloatingNodeEditor({
  node,
  upstreamNodes,
  open,
  canRun,
  isRunning,
  style,
  onChange,
  onRun,
}: FloatingNodeEditorProps) {
  const { language, t } = useI18n()
  const modelMenuRef = useRef<HTMLDivElement | null>(null)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const activeTextModelPreset = node?.type === 'text' ? getTextModelPreset(node.model) : 'custom'

  useEffect(() => {
    if (!modelMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (modelMenuRef.current?.contains(target)) return
      setModelMenuOpen(false)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [modelMenuOpen])

  if (!open || !node) return null

  return (
    <section className={`node-editor${node.type === 'text' ? ' node-editor--text-mode' : ''}`} style={style}>
      <div className="node-editor__card">
        <div className="node-editor__toolbar">
          <div className="node-editor__status">
            <span className="node-editor__status-badge" data-tone={node.status}>
              {t(`canvas.status${node.status.charAt(0).toUpperCase()}${node.status.slice(1)}`)}
            </span>
            <span className="node-editor__status-meta">{t('canvas.timesRun', { count: node.runCount ?? 0 })}</span>
          </div>
          <div className="node-editor__toolbar-spacer" />
        </div>

        <div className="node-editor__inputs">
          {node.type === 'image' ? (
            <ImageNodeEditorFields node={node} upstreamNodes={upstreamNodes} onChange={onChange} />
          ) : (
            <>
              {node.type === 'text' ? null : (
                <label className="node-editor__field">
                  <span>{t('canvas.nodeTitle')}</span>
                  <input type="text" value={node.title} onChange={(event) => onChange({ title: event.target.value })} />
                </label>
              )}

              <label className="node-editor__field node-editor__field--prompt">
                <span>{t('canvas.nodePrompt')}</span>
                <textarea
                  className="node-editor__prompt"
                  rows={node.type === 'text' ? 4 : 5}
                  value={node.prompt ?? ''}
                  placeholder={t('canvas.nodePrompt')}
                  onChange={(event) => onChange({ prompt: event.target.value, description: event.target.value })}
                />
              </label>
            </>
          )}
        </div>

        <div className="node-editor__footer">
          <div className="node-editor__meta-group">
            {node.type === 'image' ? null : (
              <label className="node-editor__field node-editor__field--meta">
                <span>{t('canvas.nodeModel')}</span>
                {node.type === 'text' ? (
                  <div className="node-editor__model-stack" ref={modelMenuRef}>
                    <div className="node-editor__model-presets">
                      <button
                        type="button"
                        className="node-editor__model-trigger"
                        onClick={() => setModelMenuOpen((current) => !current)}
                      >
                        <span>{getPresetLabel(activeTextModelPreset, language)}</span>
                        <span className={`node-editor__model-chevron${modelMenuOpen ? ' is-open' : ''}`}>⌄</span>
                      </button>
                      {modelMenuOpen ? (
                        <div className="node-editor__model-menu" role="listbox" aria-label={t('canvas.nodeModel')}>
                          {TEXT_MODEL_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              className={`node-editor__model-option${activeTextModelPreset === preset.id ? ' is-active' : ''}`}
                              onClick={() => {
                                onChange({
                                  model:
                                    preset.id === 'doubao'
                                      ? node.model?.trim().toLowerCase().startsWith('doubao')
                                        ? node.model
                                        : ''
                                      : preset.id === 'custom'
                                        ? node.model ?? ''
                                        : preset.model,
                                })
                                setModelMenuOpen(false)
                              }}
                            >
                              {language === 'zh-CN' ? preset.labelZh : preset.labelEn}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <input
                      type="text"
                      value={node.model ?? ''}
                      placeholder={
                        activeTextModelPreset === 'doubao'
                          ? '输入豆包模型名'
                          : activeTextModelPreset === 'custom'
                            ? '输入自定义模型名'
                            : 'gpt-5.4 / gemini-3.1-pro-preview'
                      }
                      onChange={(event) => onChange({ model: event.target.value })}
                    />
                  </div>
                ) : (
                  <input type="text" value={node.model ?? ''} onChange={(event) => onChange({ model: event.target.value })} />
                )}
              </label>
            )}
          </div>

          <div className="node-editor__meta-group node-editor__meta-group--right">
            <button type="button" className="node-editor__send" disabled={!canRun} onClick={onRun}>
              {isRunning ? t('canvas.statusRunning') : t('canvas.runSelected')}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
