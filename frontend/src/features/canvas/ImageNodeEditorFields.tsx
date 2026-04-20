import { useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasNode } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'
import {
  IMAGE_MODEL_OPTIONS,
  IMAGE_RATIO_OPTIONS,
  ensureImageSettings,
  getImageModel,
  getImageModelLabel,
  getImageRatioLabel,
  getImageVersionLabel,
} from './image-node-config'
import {
  buildImageMentionItems,
  filterImageMentionItems,
  getMentionContext,
  insertMentionIntoPrompt,
} from './image-node-mentions'

interface ImageNodeEditorFieldsProps {
  node: CanvasNode
  upstreamNodes: CanvasNode[]
  onChange: (fields: Partial<CanvasNode>) => void
}

type MenuType = 'model' | 'version' | 'ratio' | null

export function ImageNodeEditorFields({ node, upstreamNodes, onChange }: ImageNodeEditorFieldsProps) {
  const { language, t } = useI18n()
  const [openMenu, setOpenMenu] = useState<MenuType>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [caretIndex, setCaretIndex] = useState((node.prompt ?? '').length)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const mentionContext = useMemo(() => getMentionContext(node.prompt ?? '', caretIndex), [caretIndex, node.prompt])
  const mentionItems = useMemo(
    () => filterImageMentionItems(buildImageMentionItems(upstreamNodes), mentionContext?.query ?? ''),
    [mentionContext?.query, upstreamNodes],
  )
  const imageSettings = ensureImageSettings(node.settings)
  const activeModel = getImageModel(imageSettings.imageModel)

  useEffect(() => {
    if (!openMenu) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null
      if (menuRef.current?.contains(target)) return
      setOpenMenu(null)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [openMenu])

  function patchSettings(fields: Record<string, string>) {
    onChange({
      settings: {
        ...imageSettings,
        ...fields,
      },
    })
  }

  function renderMenu() {
    if (!openMenu) return null

    if (openMenu === 'model') {
      return (
        <div className="node-editor__option-menu" role="listbox">
          {IMAGE_MODEL_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`node-editor__option-button${option.value === imageSettings.imageModel ? ' is-active' : ''}${option.available ? '' : ' is-disabled'}`}
              disabled={!option.available}
              onClick={() => {
                const nextVersion = option.versions[0]?.value ?? ''
                patchSettings({
                  imageModel: option.value,
                  imageModelVersion: nextVersion,
                })
                onChange({ model: option.value })
                setOpenMenu(null)
              }}
            >
              <span>{option.label}</span>
              {!option.available ? <small>{language === 'zh-CN' ? '未开放' : 'Unavailable'}</small> : null}
            </button>
          ))}
        </div>
      )
    }

    if (openMenu === 'version') {
      return (
        <div className="node-editor__option-menu" role="listbox">
          {activeModel.versions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`node-editor__option-button${option.value === imageSettings.imageModelVersion ? ' is-active' : ''}${option.available ? '' : ' is-disabled'}`}
              disabled={!option.available}
              onClick={() => {
                patchSettings({ imageModelVersion: option.value })
                setOpenMenu(null)
              }}
            >
              <span>{option.label}</span>
              {!option.available ? <small>{language === 'zh-CN' ? '未开放' : 'Unavailable'}</small> : null}
            </button>
          ))}
        </div>
      )
    }

    return (
      <div className="node-editor__option-menu node-editor__option-menu--ratio" role="listbox">
        {IMAGE_RATIO_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`node-editor__option-button${option.value === imageSettings.imageRatio ? ' is-active' : ''}`}
            onClick={() => {
              patchSettings({ imageRatio: option.value })
              setOpenMenu(null)
            }}
          >
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    )
  }

  function applyMention(index: number) {
    if (!mentionContext) return
    const mention = mentionItems[index]
    if (!mention) return

    const { value, caret } = insertMentionIntoPrompt(node.prompt ?? '', mentionContext, mention)
    onChange({ prompt: value, description: value })
    setMentionIndex(0)
    setCaretIndex(caret)

    window.requestAnimationFrame(() => {
      promptRef.current?.focus()
      promptRef.current?.setSelectionRange(caret, caret)
    })
  }

  return (
    <>
      <label className="node-editor__field">
        <span>{t('canvas.nodeTitle')}</span>
        <input type="text" value={node.title} onChange={(event) => onChange({ title: event.target.value })} />
      </label>

      <div className="node-editor__image-config" ref={menuRef}>
        <label className="node-editor__field node-editor__field--meta">
          <span>{t('canvas.imageModel')}</span>
          <button type="button" className="node-editor__option-trigger" onClick={() => setOpenMenu((current) => (current === 'model' ? null : 'model'))}>
            <span>{getImageModelLabel(imageSettings.imageModel)}</span>
            <span className={`node-editor__model-chevron${openMenu === 'model' ? ' is-open' : ''}`}>⌄</span>
          </button>
        </label>

        <label className="node-editor__field node-editor__field--meta">
          <span>{t('canvas.imageVersion')}</span>
          <button type="button" className="node-editor__option-trigger" onClick={() => setOpenMenu((current) => (current === 'version' ? null : 'version'))}>
            <span>{getImageVersionLabel(imageSettings.imageModel, imageSettings.imageModelVersion)}</span>
            <span className={`node-editor__model-chevron${openMenu === 'version' ? ' is-open' : ''}`}>⌄</span>
          </button>
        </label>

        <label className="node-editor__field node-editor__field--meta">
          <span>{t('canvas.imageRatio')}</span>
          <button type="button" className="node-editor__option-trigger" onClick={() => setOpenMenu((current) => (current === 'ratio' ? null : 'ratio'))}>
            <span>{getImageRatioLabel(imageSettings.imageRatio)}</span>
            <span className={`node-editor__model-chevron${openMenu === 'ratio' ? ' is-open' : ''}`}>⌄</span>
          </button>
        </label>

        {renderMenu()}
      </div>

      <label className="node-editor__field node-editor__field--prompt node-editor__field--image-prompt">
        <span>{t('canvas.nodePrompt')}</span>
        <textarea
          ref={promptRef}
          className="node-editor__prompt"
          rows={5}
          value={node.prompt ?? ''}
          placeholder={t('canvas.imagePromptPlaceholder')}
          onChange={(event) => {
            setCaretIndex(event.target.selectionStart ?? event.target.value.length)
            setMentionIndex(0)
            onChange({ prompt: event.target.value, description: event.target.value })
          }}
          onClick={(event) => setCaretIndex(event.currentTarget.selectionStart ?? (node.prompt ?? '').length)}
          onKeyUp={(event) => setCaretIndex(event.currentTarget.selectionStart ?? (node.prompt ?? '').length)}
          onKeyDown={(event) => {
            if (!mentionContext || !mentionItems.length) return
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setMentionIndex((current) => (current + 1) % mentionItems.length)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setMentionIndex((current) => (current - 1 + mentionItems.length) % mentionItems.length)
            } else if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault()
              applyMention(mentionIndex)
            } else if (event.key === 'Escape') {
              event.preventDefault()
            }
          }}
        />

        {mentionContext && mentionItems.length ? (
          <div className="node-editor__mention-menu">
            <div className="node-editor__mention-title">{t('canvas.upstreamAssets')}</div>
            <div className="node-editor__mention-list">
              {mentionItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`node-editor__mention-option${index === mentionIndex ? ' is-active' : ''}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyMention(index)}
                >
                  <span className="node-editor__mention-thumb">{item.title}</span>
                  <span className="node-editor__mention-body">
                    <strong>{item.title}</strong>
                    <small>{item.sourceTitle}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </label>
    </>
  )
}
