import mammoth from 'mammoth'
import {
  CHAT_ATTACHMENT_LIMITS,
  type ChatAttachment,
} from '@/types/chat-attachment'

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm',
  'log', 'yaml', 'yml', 'ini', 'conf', 'sql',
  'js', 'jsx', 'ts', 'tsx', 'vue', 'css', 'scss', 'less',
  'py', 'java', 'go', 'rs', 'c', 'h', 'cpp', 'hpp', 'cs', 'php', 'rb', 'sh', 'bat', 'ps1',
])

export const CHAT_FILE_ACCEPT = [
  '.docx',
  ...Array.from(TEXT_EXTENSIONS, (extension) => `.${extension}`),
].join(',')

export async function parseChatFile(file: File): Promise<ChatAttachment> {
  const extension = getExtension(file.name)
  if (file.size > CHAT_ATTACHMENT_LIMITS.maxFileBytes) {
    throw new Error(`${file.name} 超过 10 MB，无法添加`)
  }
  if (extension !== 'docx' && !TEXT_EXTENSIONS.has(extension)) {
    throw new Error(`${file.name} 暂不支持解析`)
  }

  const rawContent = extension === 'docx'
    ? await parseDocx(file)
    : await parseTextFile(file, extension)
  const normalized = normalizeContent(rawContent)
  if (!normalized) throw new Error(`${file.name} 没有可读取的文本内容`)

  const content = normalized.slice(0, CHAT_ATTACHMENT_LIMITS.maxCharactersPerFile)
  return {
    id: createAttachmentId(),
    name: sanitizeFileName(file.name),
    mimeType: file.type || inferMimeType(extension),
    size: file.size,
    content,
    characterCount: content.length,
    truncated: normalized.length > content.length,
  }
}

function getExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    { includeDefaultStyleMap: true, ignoreEmptyParagraphs: false },
  )
  return htmlToStructuredText(result.value)
}

async function parseTextFile(file: File, extension: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let content = new TextDecoder('utf-8').decode(bytes)
  if (replacementRatio(content) > 0.005) {
    try {
      const fallback = new TextDecoder('gb18030').decode(bytes)
      if (replacementRatio(fallback) < replacementRatio(content)) content = fallback
    } catch {
      // UTF-8 remains the safest fallback when the runtime lacks GB18030.
    }
  }

  if (extension === 'json') {
    try {
      return JSON.stringify(JSON.parse(content), null, 2)
    } catch {
      return content
    }
  }
  if (extension === 'html' || extension === 'htm') return htmlToStructuredText(content)
  return content
}

function htmlToStructuredText(html: string): string {
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  documentNode.querySelectorAll('script, style, noscript').forEach((node) => node.remove())
  const blocks: string[] = []

  const visit = (element: Element) => {
    const tag = element.tagName.toLowerCase()
    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1))
      pushBlock(blocks, `${'#'.repeat(level)} ${element.textContent || ''}`)
      return
    }
    if (tag === 'table') {
      const rows = Array.from(element.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr'))
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll(':scope > th, :scope > td'))
          .map((cell) => cleanInlineText(cell.textContent || ''))
        if (cells.some(Boolean)) pushBlock(blocks, cells.join(' | '))
      }
      return
    }
    if (tag === 'li') {
      pushBlock(blocks, `- ${element.textContent || ''}`)
      return
    }
    if (tag === 'p' || tag === 'blockquote' || tag === 'pre') {
      pushBlock(blocks, element.textContent || '')
      return
    }
    for (const child of Array.from(element.children)) visit(child)
  }

  for (const child of Array.from(documentNode.body.children)) visit(child)
  return blocks.length ? blocks.join('\n\n') : documentNode.body.textContent || ''
}

function pushBlock(blocks: string[], value: string) {
  const text = cleanInlineText(value)
  if (text) blocks.push(text)
}

function cleanInlineText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function normalizeContent(value: string): string {
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

function replacementRatio(value: string): number {
  if (!value.length) return 0
  return (value.match(/\ufffd/g)?.length || 0) / value.length
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').slice(0, 180) || '未命名文件'
}

function inferMimeType(extension: string): string {
  if (extension === 'docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (extension === 'json') return 'application/json'
  if (extension === 'csv') return 'text/csv'
  if (extension === 'html' || extension === 'htm') return 'text/html'
  if (extension === 'xml') return 'application/xml'
  return 'text/plain'
}

function createAttachmentId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
