import type { CanvasNode } from '../../shared/types/canvas'

export type ImageMentionItem = {
  id: string
  title: string
  sourceTitle: string
  type: CanvasNode['type']
}

export type ImageMentionContext = {
  query: string
  start: number
  end: number
}

export function getMentionContext(text: string, caretIndex: number): ImageMentionContext | null {
  const beforeCaret = text.slice(0, caretIndex)
  const triggerIndex = beforeCaret.lastIndexOf('@')
  if (triggerIndex < 0) return null

  const between = beforeCaret.slice(triggerIndex + 1)
  if (between.includes('\n')) return null

  const hasBoundary = triggerIndex === 0 || /\s/.test(beforeCaret[triggerIndex - 1] ?? '')
  if (!hasBoundary || /\s/.test(between)) return null

  return {
    query: between.toLowerCase(),
    start: triggerIndex,
    end: caretIndex,
  }
}

export function buildImageMentionItems(upstreamNodes: CanvasNode[]) {
  return upstreamNodes.slice(0, 7).map((node, index) => ({
    id: node.id,
    title: `Image${index + 1}`,
    sourceTitle: node.title,
    type: node.type,
  }))
}

export function filterImageMentionItems(items: ImageMentionItem[], query: string) {
  if (!query) return items
  return items.filter((item) => item.title.toLowerCase().includes(query) || item.sourceTitle.toLowerCase().includes(query))
}

export function insertMentionIntoPrompt(prompt: string, context: ImageMentionContext, mention: ImageMentionItem) {
  const nextValue = `${prompt.slice(0, context.start)}@${mention.title} ${prompt.slice(context.end)}`
  const caret = context.start + mention.title.length + 2
  return {
    value: nextValue,
    caret,
  }
}
