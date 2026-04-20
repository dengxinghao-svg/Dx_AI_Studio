// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { normalizeTextContent, parsePlainTextToRichHtml } from './text-format'

describe('text-format smoke', () => {
  it('parses headings, lists, and inline formatting', () => {
    const html = parsePlainTextToRichHtml(`# 标题

- 第一项
- **加粗**

这里有 \`code\`。`)

    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('<ul><li>第一项</li><li><strong>加粗</strong></li></ul>')
    expect(html).toContain('<p>这里有 <code>code</code>。</p>')
  })

  it('normalizes plain text into readable rich html', () => {
    const html = normalizeTextContent(`## 小节

> 引用

\`\`\`
const x = 1
\`\`\``)

    expect(html).toContain('<h2>小节</h2>')
    expect(html).toContain('<blockquote><p>引用</p></blockquote>')
    expect(html).toContain('<pre><code>const x = 1</code></pre>')
  })
})
