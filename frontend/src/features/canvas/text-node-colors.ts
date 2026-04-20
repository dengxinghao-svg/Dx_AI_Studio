export const DEFAULT_TEXT_PANEL_COLOR = 'rgba(255, 255, 255, 0.03)'

export const TEXT_NODE_PANEL_COLORS = [
  { key: 'canvas.colorDefault', value: DEFAULT_TEXT_PANEL_COLOR },
  { key: 'canvas.colorRose', value: 'rgba(185, 84, 93, 0.18)' },
  { key: 'canvas.colorAmber', value: 'rgba(178, 110, 40, 0.18)' },
  { key: 'canvas.colorOlive', value: 'rgba(170, 155, 64, 0.18)' },
  { key: 'canvas.colorForest', value: 'rgba(73, 136, 89, 0.18)' },
  { key: 'canvas.colorLake', value: 'rgba(67, 134, 154, 0.18)' },
  { key: 'canvas.colorCobalt', value: 'rgba(58, 106, 176, 0.18)' },
  { key: 'canvas.colorViolet', value: 'rgba(129, 78, 176, 0.18)' },
] as const

export function getTextPanelColor(color?: string | null) {
  return color || DEFAULT_TEXT_PANEL_COLOR
}
