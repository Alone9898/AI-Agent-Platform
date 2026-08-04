<template>
  <section
    class="chat-input"
    :class="{ 'is-dragging': dragActive }"
    @dragenter.prevent="dragActive = true"
    @dragover.prevent="dragActive = true"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <div class="composer-header">
      <span>消息</span>
      <span v-if="disabled" class="composer-disabled">请先选择一个 Agent</span>
      <span v-else-if="parsingCount" class="composer-status">
        <el-icon class="is-loading"><Loading /></el-icon>正在解析 {{ parsingCount }} 个文件
      </span>
      <span v-else class="composer-support">DOCX 与常见文本文件</span>
    </div>

    <div class="composer-shell">
      <div v-if="attachments.length" class="attachment-list" aria-label="待发送附件">
        <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
          <span class="attachment-icon"><el-icon><Document /></el-icon></span>
          <span class="attachment-copy">
            <strong :title="attachment.name">{{ attachment.name }}</strong>
            <small>
              {{ formatFileSize(attachment.size) }} · {{ formatCharacters(attachment.characterCount) }}
              <template v-if="attachment.truncated"> · 已截断</template>
            </small>
          </span>
          <el-tooltip content="移除附件" placement="top">
            <el-button
              text
              circle
              class="remove-attachment"
              :disabled="sending"
              :aria-label="`移除 ${attachment.name}`"
              @click="removeAttachment(attachment.id)"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <el-input
        v-model="draft"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        :disabled="disabled || sending"
        :placeholder="attachments.length ? '告诉 Agent 如何处理这些文件' : placeholder"
        class="input-box"
        @keydown="handleKeydown"
      />

      <div class="input-footer">
        <div class="input-tools">
          <input
            ref="fileInputRef"
            class="file-input"
            type="file"
            multiple
            :accept="CHAT_FILE_ACCEPT"
            @change="handleFileChange"
          />
          <el-tooltip content="添加文件" placement="top">
            <el-button
              text
              circle
              class="attach-button"
              :disabled="disabled || sending || Boolean(parsingCount)"
              aria-label="添加文件"
              @click="fileInputRef?.click()"
            >
              <el-icon><Paperclip /></el-icon>
            </el-button>
          </el-tooltip>
          <span class="input-tip"><kbd>Enter</kbd> 发送&nbsp;&nbsp;·&nbsp;&nbsp;<kbd>Shift + Enter</kbd> 换行</span>
        </div>
        <el-button
          type="primary"
          class="send-button"
          :loading="sending"
          :disabled="disabled || sending || Boolean(parsingCount) || (!draft.trim() && !attachments.length)"
          @click="handleSend"
        >
          发送 <el-icon v-if="!sending"><ArrowRight /></el-icon>
        </el-button>
      </div>
    </div>

    <div v-if="dragActive" class="drop-hint" aria-hidden="true">
      <el-icon><UploadFilled /></el-icon>
      <span>松开即可解析文件</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Close,
  Document,
  Loading,
  Paperclip,
  UploadFilled,
} from '@element-plus/icons-vue'
import { CHAT_FILE_ACCEPT, parseChatFile } from '@/utils/chat-file-parser'
import {
  CHAT_ATTACHMENT_LIMITS,
  type ChatAttachment,
} from '@/types/chat-attachment'

const props = defineProps<{
  modelValue: string
  attachments: ChatAttachment[]
  disabled?: boolean
  sending?: boolean
  placeholder?: string
}>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'update:attachments', value: ChatAttachment[]): void
  (event: 'send', value: string): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const parsingCount = ref(0)
const dragActive = ref(false)
const draft = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

function handleSend() {
  const text = draft.value.trim()
  if ((!text && !props.attachments.length) || props.disabled || props.sending || parsingCount.value) return
  emit('send', text || '请阅读并分析附件内容。')
  emit('update:modelValue', '')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  handleSend()
}

async function addFiles(files: File[] | FileList) {
  if (props.disabled || props.sending) return
  const incoming = Array.from(files)
  const remainingSlots = CHAT_ATTACHMENT_LIMITS.maxFiles - props.attachments.length
  if (remainingSlots <= 0) {
    ElMessage.warning(`每次最多添加 ${CHAT_ATTACHMENT_LIMITS.maxFiles} 个文件`)
    return
  }
  if (incoming.length > remainingSlots) {
    ElMessage.warning(`本次只会处理前 ${remainingSlots} 个文件`)
  }

  const next = [...props.attachments]
  parsingCount.value += Math.min(incoming.length, remainingSlots)
  try {
    for (const file of incoming.slice(0, remainingSlots)) {
      try {
        const duplicate = next.some((item) => item.name === file.name && item.size === file.size)
        if (duplicate) {
          ElMessage.warning(`${file.name} 已经添加`)
          continue
        }
        const parsed = await parseChatFile(file)
        const usedCharacters = next.reduce((sum, item) => sum + item.characterCount, 0)
        const remainingCharacters = CHAT_ATTACHMENT_LIMITS.maxCharactersTotal - usedCharacters
        if (remainingCharacters <= 0) {
          ElMessage.warning('附件解析内容已达到本次上限')
          break
        }
        if (parsed.characterCount > remainingCharacters) {
          parsed.content = parsed.content.slice(0, remainingCharacters)
          parsed.characterCount = parsed.content.length
          parsed.truncated = true
        }
        next.push(parsed)
      } catch (error: any) {
        ElMessage.error(error?.message || `${file.name} 解析失败`)
      } finally {
        parsingCount.value -= 1
      }
    }
    emit('update:attachments', next)
  } finally {
    parsingCount.value = 0
  }
}

function removeAttachment(id: string) {
  emit('update:attachments', props.attachments.filter((attachment) => attachment.id !== id))
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length) void addFiles(input.files)
  input.value = ''
}

function handleDrop(event: DragEvent) {
  dragActive.value = false
  if (event.dataTransfer?.files.length) void addFiles(event.dataTransfer.files)
}

function handleDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement
  const related = event.relatedTarget as Node | null
  if (!related || !current.contains(related)) dragActive.value = false
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatCharacters(value: number): string {
  return value >= 10_000 ? `${(value / 10_000).toFixed(1)} 万字` : `${value} 字`
}

defineExpose({ addFiles })
</script>

<style scoped>
.chat-input {
  position: relative;
  padding: 12px 18px 16px;
  border-top: 1px solid #edf0f3;
  background: #fff;
}

.composer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 16px;
  margin-bottom: 7px;
}

.composer-header > span:first-child {
  color: #7c8796;
  font-size: 10px;
  font-weight: 650;
}

.composer-disabled,
.composer-support,
.composer-status {
  color: #a0a9b5;
  font-size: 9px;
}

.composer-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #61788c;
}

.composer-shell {
  padding: 9px 10px 8px;
  border: 1px solid #dfe5eb;
  border-radius: 9px;
  background: #fafcfd;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.composer-shell:focus-within,
.is-dragging .composer-shell {
  border-color: #8da0b4;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(100, 124, 148, 0.1);
}

.attachment-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.attachment-item {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  padding: 7px 7px 7px 9px;
  border: 1px solid #e0e6eb;
  border-radius: 7px;
  background: #fff;
}

.attachment-icon {
  color: #5d768c;
  font-size: 15px;
}

.attachment-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attachment-copy strong {
  overflow: hidden;
  color: #3e4a5a;
  font-size: 10px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-copy small {
  color: #98a2ae;
  font-size: 8px;
}

.remove-attachment,
.attach-button {
  width: 28px;
  height: 28px;
  color: #7b8795;
}

.input-footer,
.input-tools {
  display: flex;
  align-items: center;
}

.input-footer {
  justify-content: space-between;
  gap: 12px;
  margin-top: 7px;
}

.input-tools {
  min-width: 0;
  gap: 6px;
}

.file-input {
  display: none;
}

.input-tip {
  color: #a0a9b5;
  font-size: 9px;
}

.input-tip kbd {
  padding: 2px 5px;
  border: 1px solid #dfe4ea;
  border-radius: 4px;
  color: #778392;
  font-family: inherit;
  font-size: 8px;
  background: #fff;
}

.send-button {
  min-width: 78px;
  height: 32px;
  gap: 5px;
  border-radius: 7px;
  font-size: 11px;
}

.drop-hint {
  position: absolute;
  inset: 5px 10px 9px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed #779189;
  border-radius: 9px;
  color: #416a64;
  font-size: 12px;
  font-weight: 650;
  background: rgba(246, 250, 249, 0.96);
  pointer-events: none;
}

:deep(.input-box .el-textarea__inner) {
  min-height: 46px !important;
  padding: 3px 5px;
  border: none;
  border-radius: 0;
  color: #354153;
  font-size: 12px;
  line-height: 1.65;
  resize: none;
  background: transparent;
  box-shadow: none;
}

:deep(.input-box .el-textarea__inner::placeholder) {
  color: #aeb6c0;
}

@media (max-width: 620px) {
  .chat-input { padding: 11px 12px 13px; }
  .input-tip, .composer-support { display: none; }
  .input-footer { justify-content: space-between; }
  .attachment-list { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .composer-shell { transition: none; }
}
</style>
