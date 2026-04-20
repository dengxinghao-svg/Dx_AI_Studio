import type { CanvasNodeType } from '../../shared/types/canvas'
import { useI18n } from '../../shared/i18n/useI18n'

interface QuickAddItem {
  type: CanvasNodeType
  label: string
  short: string
  icon: string
}

interface CanvasContextMenuProps {
  open: boolean
  x: number
  y: number
  hasSelection: boolean
  canPaste: boolean
  canGroup: boolean
  canUngroup: boolean
  canRun: boolean
  items: QuickAddItem[]
  onAddNode: (type: CanvasNodeType) => void
  onDuplicate: () => void
  onDelete: () => void
  onPaste: () => void
  onFitView: () => void
  onResetView: () => void
  onGroup: () => void
  onUngroup: () => void
  onRunSelected: () => void
}

function getItemIcon(type: CanvasNodeType, fallback: string) {
  switch (type) {
    case 'text':
      return '文'
    case 'image':
      return '图'
    case 'video':
      return '视'
    case 'asset':
      return '资'
    case 'audio':
      return '音'
    default:
      return fallback
  }
}

export function CanvasContextMenu({
  open,
  x,
  y,
  hasSelection,
  canPaste,
  canGroup,
  canUngroup,
  canRun,
  items,
  onAddNode,
  onDuplicate,
  onDelete,
  onPaste,
  onFitView,
  onResetView,
  onGroup,
  onUngroup,
  onRunSelected,
}: CanvasContextMenuProps) {
  const { t } = useI18n()

  if (!open) return null

  return (
    <div className="canvas-context-menu" style={{ left: `${x}px`, top: `${y}px` }}>
      <p className="canvas-context-menu__title">{t('canvas.contextMenuTitle')}</p>
      <div className="canvas-context-menu__list">
        {items.map((item) => (
          <button key={item.type} type="button" className="canvas-context-menu__item" onClick={() => onAddNode(item.type)}>
            <span className="canvas-context-menu__icon" aria-hidden="true">
              {getItemIcon(item.type, item.icon)}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="canvas-context-menu__separator" />

      <div className="canvas-context-menu__actions">
        <button type="button" disabled={!hasSelection} onClick={onDuplicate}>
          {t('canvas.duplicate')}
        </button>
        <button type="button" disabled={!canPaste} onClick={onPaste}>
          {t('canvas.paste')}
        </button>
        <button type="button" disabled={!canGroup} onClick={onGroup}>
          {t('canvas.groupSelected')}
        </button>
        <button type="button" disabled={!canUngroup} onClick={onUngroup}>
          {t('canvas.ungroupSelected')}
        </button>
        <button type="button" disabled={!canRun} onClick={onRunSelected}>
          {t('canvas.runSelected')}
        </button>
        <button type="button" disabled={!hasSelection} onClick={onDelete}>
          {t('canvas.delete')}
        </button>
        <button type="button" onClick={onFitView}>
          {t('canvas.fitView')}
        </button>
        <button type="button" onClick={onResetView}>
          {t('canvas.resetView')}
        </button>
      </div>
    </div>
  )
}
