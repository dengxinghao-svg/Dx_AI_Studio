import { useEffect } from 'react'
import type { CanvasNode } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'
import { ensureImageSettings, getImageModelLabel, getImageRatioLabel, getImageVersionLabel } from './image-node-config'

interface ImageNodeOverlaysProps {
  node: CanvasNode | null
  openMode: 'viewer' | 'crop' | 'repaint' | 'expand' | 'split' | null
  onClose: () => void
}

export function ImageNodeOverlays({ node, openMode, onClose }: ImageNodeOverlaysProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (!openMode) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, openMode])

  if (!openMode || !node) return null

  const settings = ensureImageSettings(node.settings)
  const isViewer = openMode === 'viewer'

  return (
    <div className={`image-overlay image-overlay--${openMode}`}>
      <div className="image-overlay__backdrop" onClick={onClose} />
      <div className="image-overlay__shell">
        <header className="image-overlay__header">
          <div>
            <p className="image-overlay__eyebrow">{t('canvas.nodeTypeImage')}</p>
            <h2>{node.title}</h2>
          </div>
          <button type="button" className="image-overlay__close" onClick={onClose}>
            {t('canvas.closeDocument')}
          </button>
        </header>

        <div className="image-overlay__content">
          <div className="image-overlay__stage">
            <div className="image-overlay__image-shell">
              <div className="image-overlay__image-placeholder">
                <strong>{node.outputText ? t('canvas.imageGeneratedPreview') : t('canvas.imageNodeEmpty')}</strong>
                <span>{isViewer ? t('canvas.imageViewerHint') : t(`canvas.imageMode${openMode.charAt(0).toUpperCase()}${openMode.slice(1)}`)}</span>
              </div>
            </div>
          </div>

          <aside className="image-overlay__sidebar">
            <div className="image-overlay__meta-card">
              <h3>{t('canvas.nodeInfo')}</h3>
              <ul>
                <li>{getImageModelLabel(settings.imageModel)}</li>
                <li>{getImageVersionLabel(settings.imageModel, settings.imageModelVersion)}</li>
                <li>{getImageRatioLabel(settings.imageRatio)}</li>
              </ul>
            </div>
            <div className="image-overlay__meta-card">
              <h3>{t('canvas.nodePrompt')}</h3>
              <p>{node.prompt || t('canvas.noDraftYet')}</p>
            </div>
            <div className="image-overlay__meta-card">
              <h3>{t('canvas.imageOverlayMode')}</h3>
              <p>{t(`canvas.imageMode${openMode.charAt(0).toUpperCase()}${openMode.slice(1)}`)}</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
