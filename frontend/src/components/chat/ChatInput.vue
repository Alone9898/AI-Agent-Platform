<template>
  <section class="chat-input">
    <el-input
      v-model="draft"
      type="textarea"
      :autosize="{ minRows: 3, maxRows: 6 }"
      :disabled="disabled || sending"
      :placeholder="placeholder"
      class="input-box"
      @keydown="handleKeydown"
    />

    <div class="input-footer">
      <span class="input-tip">Enter 发送，Shift+Enter 换行</span>
      <el-button
        type="primary"
        :loading="sending"
        :disabled="disabled || sending || !draft.trim()"
        @click="handleSend"
      >
        发送
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: string
  disabled?: boolean
  sending?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'send', value: string): void
}>()

const draft = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

function handleSend() {
  const text = draft.value.trim()
  if (!text || props.disabled || props.sending) return
  emit('send', text)
  emit('update:modelValue', '')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }
  event.preventDefault()
  handleSend()
}
</script>

<style scoped>
.chat-input {
  padding: 16px 18px 18px;
  border-top: 1px solid #eef1f7;
  background: rgba(255, 255, 255, 0.96);
}

.input-footer {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.input-tip {
  font-size: 12px;
  color: #8a94a6;
}

:deep(.input-box .el-textarea__inner) {
  border-radius: 14px;
  padding: 14px 16px;
  resize: none;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
}
</style>
