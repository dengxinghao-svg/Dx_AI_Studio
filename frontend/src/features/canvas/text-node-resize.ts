export function startTextNodeResize(options: {
  event: React.PointerEvent<HTMLElement>
  zoom: number
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  onResize: (next: { width: number; height: number }) => void
}) {
  const {
    event,
    zoom,
    width,
    height,
    minWidth = 260,
    minHeight = 320,
    onResize,
  } = options

  event.preventDefault()
  event.stopPropagation()

  const startClientX = event.clientX
  const startClientY = event.clientY

  function handlePointerMove(moveEvent: PointerEvent) {
    const deltaX = (moveEvent.clientX - startClientX) / zoom
    const deltaY = (moveEvent.clientY - startClientY) / zoom

    onResize({
      width: Math.max(minWidth, width + deltaX),
      height: Math.max(minHeight, height + deltaY),
    })
  }

  function handlePointerUp() {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
}
