import { type ReactNode, useState } from 'react'
import { useI18n } from '../../shared/i18n/useI18n'

interface CanvasMinimapDockProps {
  minimapVisible: boolean
  snapToGrid: boolean
  viewportZoom: number
  onToggleMinimap: () => void
  onToggleSnap: () => void
  onFitView: () => void
}

function DockIcon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

export function CanvasMinimapDock({
  minimapVisible,
  snapToGrid,
  viewportZoom,
  onToggleMinimap,
  onToggleSnap,
  onFitView,
}: CanvasMinimapDockProps) {
  const { t } = useI18n()
  const [helpOpen, setHelpOpen] = useState(false)

  return (
    <div className="canvas-minimap-dock">
      <div className="canvas-minimap-dock__footer">
        <div className="canvas-minimap-dock__controls">
          <button
            type="button"
            className={`canvas-minimap-dock__icon-button${minimapVisible ? ' is-active' : ''}`}
            aria-label={minimapVisible ? t('canvas.minimapHide') : t('canvas.minimapShow')}
            title={minimapVisible ? t('canvas.minimapHide') : t('canvas.minimapShow')}
            onClick={onToggleMinimap}
          >
            <DockIcon>
              <rect x="4.5" y="6" width="15" height="12" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 9.5h10M7 12h10M7 14.5h7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </DockIcon>
          </button>
          <button
            type="button"
            className={`canvas-minimap-dock__icon-button${snapToGrid ? ' is-active' : ''}`}
            aria-label={snapToGrid ? t('canvas.snapOn') : t('canvas.snapOff')}
            title={snapToGrid ? t('canvas.snapOn') : t('canvas.snapOff')}
            onClick={onToggleSnap}
          >
            <DockIcon>
              <path d="M7 7h3v3H7zm7 0h3v3h-3zM7 14h3v3H7zm7 0h3v3h-3z" fill="currentColor" />
            </DockIcon>
          </button>
          <button
            type="button"
            className="canvas-minimap-dock__icon-button"
            aria-label={t('canvas.fitView')}
            title={t('canvas.fitView')}
            onClick={onFitView}
          >
            <DockIcon>
              <path d="M8 5H5v3M16 5h3v3M8 19H5v-3M19 16v3h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </DockIcon>
          </button>
        </div>

        <div
          className={`canvas-help${helpOpen ? ' is-open' : ''}`}
          onMouseEnter={() => setHelpOpen(true)}
          onMouseLeave={() => setHelpOpen(false)}
        >
          <button
            type="button"
            className="canvas-minimap-dock__help-button"
            title={t('canvas.shortcutsTitle')}
            aria-label={t('canvas.shortcutsTitle')}
            onClick={() => setHelpOpen((current) => !current)}
          >
            ?
          </button>
          <div className="shortcut-query">
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">SP</span>
              <span>{t('canvas.shortcutPan')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">DEL</span>
              <span>{t('canvas.delete')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">C</span>
              <span>{t('canvas.shortcutCopy')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">V</span>
              <span>{t('canvas.shortcutPaste')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">Z</span>
              <span>{t('canvas.shortcutUndo')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">SZ</span>
              <span>{t('canvas.shortcutRedo')}</span>
            </button>
            <button type="button" className="shortcut-query__item">
              <span className="shortcut-query__icon">F5</span>
              <span>{t('canvas.shortcutRun')}</span>
            </button>
          </div>
        </div>

        <div className="canvas-minimap-dock__zoom">{viewportZoom}%</div>
      </div>
    </div>
  )
}
