import type { CSSProperties } from 'react'
import { useI18n } from '../../shared/i18n/useI18n'
import { ensureImageSettings } from './image-node-config'

interface ImageNodeToolbarProps {
  open: boolean
  style?: CSSProperties
  settings?: Record<string, string> | null
  onModeChange: (mode: string) => void
  onOpenViewer: () => void
  onDownload: () => void
}

const QUICK_SPLIT_OPTIONS = ['2x2', '3x3', '4x4']

export function ImageNodeToolbar({
  open,
  style,
  settings,
  onModeChange,
  onOpenViewer,
  onDownload,
}: ImageNodeToolbarProps) {
  const { t } = useI18n()
  const imageSettings = ensureImageSettings(settings)

  if (!open) return null

  return (
    <div className="image-node-toolbar" style={style}>
      <button type="button" className="image-node-toolbar__button" onClick={() => onModeChange('crop')}>
        {t('canvas.imageToolbarCrop')}
      </button>
      <button type="button" className="image-node-toolbar__button" onClick={() => onModeChange('repaint')}>
        {t('canvas.imageToolbarRepaint')}
      </button>
      <button type="button" className="image-node-toolbar__button" onClick={() => onModeChange('expand')}>
        {t('canvas.imageToolbarExpand')}
      </button>
      <div className="image-node-toolbar__split-group">
        {QUICK_SPLIT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`image-node-toolbar__button${imageSettings.quickSplit === option ? ' is-active' : ''}`}
            onClick={() => onModeChange(`split:${option}`)}
          >
            {option}
          </button>
        ))}
      </div>
      <button type="button" className="image-node-toolbar__button" onClick={onDownload}>
        {t('canvas.imageToolbarDownload')}
      </button>
      <button type="button" className="image-node-toolbar__button image-node-toolbar__button--primary" onClick={onOpenViewer}>
        {t('canvas.imageToolbarFullscreen')}
      </button>
    </div>
  )
}
