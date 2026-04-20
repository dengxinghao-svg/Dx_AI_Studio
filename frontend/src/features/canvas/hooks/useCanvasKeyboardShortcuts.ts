import { useEffect } from 'react'

interface UseCanvasKeyboardShortcutsArgs {
  canRunSelectedNode: boolean
  copySelectionToClipboard: () => void
  cutSelection: () => void
  deleteSelection: () => void
  getStageCenterPosition: () => { x: number; y: number }
  groupSelection: () => void
  handleRunSelectedNode: () => Promise<void>
  onEscape: () => void
  pasteClipboard: (anchor?: { x: number; y: number }) => void
  redoHistory: () => void
  selectedNodeIds: string[]
  setIsSpacePressed: (value: boolean) => void
  ungroupSelection?: () => void
  undoHistory: () => void
  fitView?: () => void
  resetView?: () => void
  zoomIn: () => void
  zoomOut: () => void
}

export function useCanvasKeyboardShortcuts({
  canRunSelectedNode,
  copySelectionToClipboard,
  cutSelection,
  deleteSelection,
  getStageCenterPosition,
  groupSelection,
  handleRunSelectedNode,
  onEscape,
  pasteClipboard,
  redoHistory,
  selectedNodeIds,
  setIsSpacePressed,
  ungroupSelection,
  undoHistory,
  fitView,
  resetView,
  zoomIn,
  zoomOut,
}: UseCanvasKeyboardShortcutsArgs) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const editable =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (event.code === 'Space' && !editable) {
        event.preventDefault()
        setIsSpacePressed(true)
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && !editable) {
        event.preventDefault()
        deleteSelection()
        return
      }

      if (event.key === 'Escape') {
        onEscape()
        return
      }

      if (event.key === 'F5' && !editable) {
        event.preventDefault()
        if (canRunSelectedNode) void handleRunSelectedNode()
        return
      }

      if ((event.key === '0' || event.code === 'Digit0') && !editable) {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          resetView?.()
          return
        }
      }

      if ((event.key.toLowerCase() === 'f' || event.code === 'KeyF') && !editable && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        fitView?.()
        return
      }

      const modifier = event.ctrlKey || event.metaKey
      if (!modifier || editable) return

      const lowerKey = event.key.toLowerCase()
      if (lowerKey === 'c') {
        event.preventDefault()
        copySelectionToClipboard()
      } else if (lowerKey === 'x') {
        event.preventDefault()
        cutSelection()
      } else if (lowerKey === 'v') {
        event.preventDefault()
        pasteClipboard(getStageCenterPosition())
      } else if (lowerKey === 'g') {
        event.preventDefault()
        if (event.shiftKey) {
          ungroupSelection?.()
        } else if (selectedNodeIds.length > 1) {
          groupSelection()
        }
      } else if (lowerKey === 'z' && event.shiftKey) {
        event.preventDefault()
        redoHistory()
      } else if (lowerKey === 'z') {
        event.preventDefault()
        undoHistory()
      } else if (event.key === '+' || event.key === '=' || event.code === 'NumpadAdd') {
        event.preventDefault()
        zoomIn()
      } else if (event.key === '-' || event.code === 'NumpadSubtract') {
        event.preventDefault()
        zoomOut()
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    canRunSelectedNode,
    copySelectionToClipboard,
    cutSelection,
    deleteSelection,
    getStageCenterPosition,
    groupSelection,
    handleRunSelectedNode,
    onEscape,
    pasteClipboard,
    redoHistory,
    selectedNodeIds,
    setIsSpacePressed,
    ungroupSelection,
    undoHistory,
    fitView,
    resetView,
    zoomIn,
    zoomOut,
  ])
}
