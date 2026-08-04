export interface ChatAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  content: string
  characterCount: number
  truncated: boolean
}

export type ChatAttachmentPayload = Omit<ChatAttachment, 'id'>
export type ChatAttachmentMetadata = Omit<ChatAttachment, 'id' | 'content'>

export const CHAT_ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxFileBytes: 10 * 1024 * 1024,
  maxCharactersPerFile: 50_000,
  maxCharactersTotal: 120_000,
} as const
