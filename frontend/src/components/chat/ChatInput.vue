<template>
  <section class="chat-input">
    <div class="composer-header"><span>消息</span><span v-if="disabled" class="composer-disabled">请先选择一个 Agent</span></div>
    <div class="composer-shell">
      <el-input v-model="draft" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" :disabled="disabled || sending" :placeholder="placeholder" class="input-box" @keydown="handleKeydown" />
      <div class="input-footer">
        <span class="input-tip"><kbd>Enter</kbd> 发送&nbsp;&nbsp;·&nbsp;&nbsp;<kbd>Shift + Enter</kbd> 换行</span>
        <el-button type="primary" class="send-button" :loading="sending" :disabled="disabled || sending || !draft.trim()" @click="handleSend">发送 <el-icon v-if="!sending"><ArrowRight /></el-icon></el-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
const props = defineProps<{ modelValue: string; disabled?: boolean; sending?: boolean; placeholder?: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void; (event: 'send', value: string): void }>()
const draft = computed({ get: () => props.modelValue, set: (value: string) => emit('update:modelValue', value) })
function handleSend() { const text = draft.value.trim(); if (!text || props.disabled || props.sending) return; emit('send', text); emit('update:modelValue', '') }
function handleKeydown(event: KeyboardEvent) { if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return; event.preventDefault(); handleSend() }
</script>

<style scoped>
.chat-input { padding: 12px 18px 16px; border-top: 1px solid #edf0f3; background: #fff; }
.composer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; }
.composer-header > span:first-child { color: #7c8796; font-size: 10px; font-weight: 650; }
.composer-disabled { color: #aeb6c0; font-size: 9px; }
.composer-shell { padding: 10px 11px 8px; border: 1px solid #dfe5eb; border-radius: 9px; background: #fafcfd; transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
.composer-shell:focus-within { border-color: #8da0b4; background: #fff; box-shadow: 0 0 0 3px rgba(100, 124, 148, .1); }
.input-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 7px; }
.input-tip { color: #a0a9b5; font-size: 9px; }
.input-tip kbd { padding: 2px 5px; border: 1px solid #dfe4ea; border-radius: 4px; color: #778392; font-family: inherit; font-size: 8px; background: #fff; }
.send-button { min-width: 78px; height: 32px; gap: 5px; border-radius: 7px; font-size: 11px; }
:deep(.input-box .el-textarea__inner) { min-height: 46px !important; padding: 3px 5px; border: none; border-radius: 0; color: #354153; font-size: 12px; line-height: 1.65; resize: none; background: transparent; box-shadow: none; }
:deep(.input-box .el-textarea__inner::placeholder) { color: #aeb6c0; }
@media (max-width: 620px) { .chat-input { padding: 11px 12px 13px; } .input-tip { display: none; } .input-footer { justify-content: flex-end; } }
</style>
