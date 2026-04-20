export type TextToolbarAction =
  | 'color'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'quote'
  | 'bold'
  | 'italic'
  | 'list'
  | 'ordered'
  | 'divider'
  | 'copy'
  | 'expand'

export interface TextToolbarItem {
  action: TextToolbarAction
  label: string
  titleKey: string
  swatch?: boolean
}

export const TEXT_TOOLBAR_ITEMS: TextToolbarItem[] = [
  { action: 'color', label: '', titleKey: 'canvas.textToolbarColor', swatch: true },
  { action: 'h1', label: 'H1', titleKey: 'canvas.textToolbarH1' },
  { action: 'h2', label: 'H2', titleKey: 'canvas.textToolbarH2' },
  { action: 'h3', label: 'H3', titleKey: 'canvas.textToolbarH3' },
  { action: 'quote', label: 'Q', titleKey: 'canvas.textToolbarQuote' },
  { action: 'bold', label: 'B', titleKey: 'canvas.textToolbarBold' },
  { action: 'italic', label: 'I', titleKey: 'canvas.textToolbarItalic' },
  { action: 'list', label: 'L', titleKey: 'canvas.textToolbarList' },
  { action: 'ordered', label: '1.', titleKey: 'canvas.textToolbarOrdered' },
  { action: 'divider', label: '/', titleKey: 'canvas.textToolbarDivider' },
  { action: 'copy', label: 'CP', titleKey: 'canvas.textToolbarCopy' },
  { action: 'expand', label: '[]', titleKey: 'canvas.textToolbarExpand' },
] as const

const TEXT_BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI', 'HR', 'PRE'])
const TEXT_ALLOWED_INLINE_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'BR', 'SPAN', 'CODE'])

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatInlineMarkdown(text = '') {
  let formatted = escapeHtml(text)
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>')
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return formatted
}

export function parsePlainTextToRichHtml(text = '') {
  const normalized = (text || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''

  const lines = normalized.split('\n')
  const blocks: string[] = []
  let paragraphBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []
  let inCodeBlock = false
  let codeBuffer: string[] = []

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    blocks.push(`<p>${paragraphBuffer.map((line) => formatInlineMarkdown(line.trim())).join('<br>')}</p>`)
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) return
    blocks.push(`<${listType}>${listItems.map((item) => `<li>${formatInlineMarkdown(item)}</li>`).join('')}</${listType}>`)
    listType = null
    listItems = []
  }

  const flushCodeBlock = () => {
    if (!codeBuffer.length) return
    blocks.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
    codeBuffer = []
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim()

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      if (inCodeBlock) {
        flushCodeBlock()
      }
      inCodeBlock = !inCodeBlock
      return
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      return
    }

    if (!line) {
      flushParagraph()
      flushList()
      return
    }

    if (/^(---+|___+)$/.test(line)) {
      flushParagraph()
      flushList()
      blocks.push('<hr>')
      return
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`)
      return
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      blocks.push(`<blockquote><p>${formatInlineMarkdown(quoteMatch[1])}</p></blockquote>`)
      return
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(unorderedMatch[1])
      return
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(orderedMatch[1])
      return
    }

    flushList()
    paragraphBuffer.push(rawLine)
  })

  flushParagraph()
  flushList()
  flushCodeBlock()
  return blocks.join('')
}

export function sanitizeRichHtml(input = '') {
  if (!input) return ''

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${input}</div>`, 'text/html')

  const sanitizeNode = (node: ChildNode, inlineContext = false): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent || ''
      if (!value.trim() && !inlineContext) return ''
      return escapeHtml(value)
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const element = node as HTMLElement
    const tag = element.tagName.toUpperCase()
    const children = [...element.childNodes]
      .map((child) => sanitizeNode(child, TEXT_ALLOWED_INLINE_TAGS.has(tag)))
      .join('')

    if (TEXT_ALLOWED_INLINE_TAGS.has(tag)) {
      if (tag === 'BR') return '<br>'
      if (tag === 'CODE') return `<code>${children}</code>`
      const normalizedTag = tag === 'B' ? 'strong' : tag === 'I' ? 'em' : tag.toLowerCase()
      return `<${normalizedTag}>${children}</${normalizedTag}>`
    }

    if (['P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'UL', 'OL', 'LI'].includes(tag)) {
      const inner = children.trim() || (tag === 'LI' ? '&nbsp;' : '<br>')
      return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`
    }

    if (tag === 'HR') return '<hr>'
    if (tag === 'PRE') return `<pre>${children}</pre>`

    if (['DIV', 'SECTION', 'ARTICLE'].includes(tag)) {
      const collapsed = children.trim()
      if (!collapsed) return ''
      const firstChildTag = element.firstElementChild?.tagName.toUpperCase() || ''
      return TEXT_BLOCK_TAGS.has(firstChildTag) ? collapsed : `<p>${collapsed}</p>`
    }

    return children
  }

  const container = doc.body.firstElementChild
  const sanitized = container
    ? [...container.childNodes].map((child) => sanitizeNode(child)).join('').trim()
    : ''

  return sanitized || parsePlainTextToRichHtml(doc.body.textContent || '')
}

export function normalizeTextContent(content = '') {
  const trimmed = content.trim()
  if (!trimmed) return ''
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeRichHtml(trimmed)
  }
  return parsePlainTextToRichHtml(trimmed)
}

export function normalizeEditorHtml(html = '') {
  const normalized = sanitizeRichHtml(html)
  return normalized
    .replace(/^(?:<p><br><\/p>|<p>&nbsp;<\/p>)+|(?:<p><br><\/p>|<p>&nbsp;<\/p>)+$/g, '')
    .trim()
}

export function setEditableHtml(editor: HTMLElement | null, html: string) {
  if (!editor) return
  editor.innerHTML = html || ''
}

export function insertRichHtml(html: string) {
  if (document.queryCommandSupported?.('insertHTML')) {
    document.execCommand('insertHTML', false, html)
    return
  }

  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const fragment = range.createContextualFragment(html)
  range.insertNode(fragment)
  range.collapse(false)
}

export function applyTextCommand(action: TextToolbarAction, editor: HTMLElement) {
  editor.focus()
  switch (action) {
    case 'divider':
      insertRichHtml('<hr><p><br></p>')
      return
    case 'bold':
      document.execCommand('bold')
      return
    case 'italic':
      document.execCommand('italic')
      return
    case 'list':
      document.execCommand('insertUnorderedList')
      return
    case 'ordered':
      document.execCommand('insertOrderedList')
      return
    case 'quote':
      document.execCommand('formatBlock', false, 'blockquote')
      return
    case 'h1':
    case 'h2':
    case 'h3':
      document.execCommand('formatBlock', false, action)
      return
    default:
      return
  }
}

export async function copyEditorText(editor: HTMLElement) {
  const text = editor.innerText || ''
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    // Ignore clipboard failures in unsupported contexts.
  }
}

export function summarizeTextContent(html = '', maxLength = 88) {
  const plain = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!plain) return ''
  return plain.length > maxLength ? `${plain.slice(0, maxLength)}...` : plain
}
