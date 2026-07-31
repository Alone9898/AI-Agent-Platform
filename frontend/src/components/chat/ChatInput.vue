<template>
  <section class="chat-input">
    <div class="composer-header">
      <span>消息</span>
      <span v-if="disabled" class="composer-disabled">等待选择智能体</span>
    </div>

    <div class="composer-shell">
      <el-input
        v-model="draft"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        :disabled="disabled || sending"
        :placeholder="placeholder"
        class="input-box"
        @keydown="handleKeydown"
      />

      <div class="input-footer">
        <span class="input-tip"><kbd>Enter</kbd> 发送&nbsp;&nbsp;·&nbsp;&nbsp;<kbd>Shift + Enter</kbd> 换行</span>
        <el-button
          type="primary"
          class="send-button"
          :loading="sending"
          :disabled="disabled || sending || !draft.trim()"
          @click="handleSend"
        >
          <span>发送消息</span>
          <span v-if="!sending" class="send-arrow">↗</span>
        </el-button>
      </div>
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
  padding: 12px 18px 17px;
  border-top: 1px solid #eff0f4;
  background: #fff;
}

.composer-header {
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.composer-header > span:first-child {
  color: #7b8092;
  font-size: 10px;
  font-weight: 600;
}

.composer-disabled {
  color: #b0b3c0;
  font-size: 9px;
}

.composer-shell {
  padding: 11px 11px 9px;
  border: 1px solid #e3e5ec;
  border-radius: 10px;
  background: #fafbfe;
  box-shadow: none;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.composer-shell:focus-within {
  border-color: rgba(116, 102, 239, 0.5);
  background: #fff;
  box-shadow: 0 0 0 4px rgba(116, 102, 239, 0.07);
}

.input-footer {
  margin-top: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.input-tip {
  color: #a2a6b5;
  font-size: 9px;
}

.input-tip kbd {
  padding: 2px 5px;
  border: 1px solid #e2e4eb;
  border-bottom-color: #d6d9e3;
  border-radius: 5px;
  color: #777c8f;
  font-family: inherit;
  font-size: 8px;
  background: #fff;
  box-shadow: 0 1px 0 #e3e5eb;
}

.send-button {
  min-width: 106px;
  height: 34px;
  gap: 6px;
  border-radius: 9px;
  font-size: 11px;
}

.send-arrow {
  font-size: 14px;
  line-height: 1;
}

:deep(.input-box .el-textarea__inner) {
  min-height: 48px !important;
  padding: 3px 5px;
  border: none;
  border-radius: 0;
  color: #33384b;
  font-size: 12px;
  line-height: 1.65;
  resize: none;
  background: transparent;
  box-shadow: none;
}

:deep(.input-box .el-textarea__inner::placeholder) {
  color: #b0b4c2;
}

:deep(.input-box.is-disabled .el-textarea__inner) {
  color: #b0b4c2;
  background: transparent;
}

@media (max-width: 620px) {
  .chat-input {
    padding: 11px 12px 13px;
  }

  .input-tip {
    display: none;
  }

  .input-footer {
    justify-content: flex-end;
  }
}
</style>
