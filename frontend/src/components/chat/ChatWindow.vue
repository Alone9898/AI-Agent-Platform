<template>
  <section class="chat-window">
    <div class="window-header">
      <div>
        <h2 class="window-title">{{ props.agent?.name || '请选择智能体' }}</h2>
        <p class="window-subtitle">
          {{
            props.agent
              ? getAgentSubtitle(props.agent)
              : '请从左侧选择一个智能体开始对话。'
          }}
        </p>
      </div>

      <div v-if="props.agent" class="window-badges">
        <el-tag size="small" effect="plain">{{ getModelLabel(props.agent) }}</el-tag>
        <el-tag size="small" type="info" effect="plain">
          {{ getSkillCount(props.agent) }} 个技能
        </el-tag>
      </div>
    </div>

    <div ref="scrollRef" class="message-list" @scroll="handleScroll">
      <div v-if="props.agent && props.messages.length > 0" class="message-stack">
        <article
          v-for="message in props.messages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div class="message-avatar">
            {{ message.role === 'assistant' ? '助' : '我' }}
          </div>
          <div class="message-bubble">
            <div class="message-meta">
              <span class="message-role">
                {{ message.role === 'assistant' ? '助手' : '我' }}
              </span>
              <span class="message-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
            <details
              v-if="message.role === 'assistant' && message.steps?.length"
              class="runtime-steps"
            >
              <summary>运行步骤（{{ message.steps.length }}）</summary>
              <div
                v-for="(step, index) in message.steps"
                :key="`${message.id}-step-${index}`"
                class="runtime-step"
              >
                <span class="step-status" :class="step.status">{{ formatStepStatus(step.status) }}</span>
                <span>{{ step.name }}</span>
                <span class="step-duration">{{ step.durationMs }} ms</span>
                <pre v-if="step.error">{{ step.error }}</pre>
              </div>
            </details>
          </div>
        </article>
      </div>

      <el-empty
        v-else-if="props.agent && !props.loading"
        description="暂无消息"
        :image-size="120"
      >
        <template #description>
          <div class="empty-hint">
            请在下方发送消息开始对话。
          </div>
        </template>
      </el-empty>

      <el-empty
        v-else
        description="尚未选择智能体"
        :image-size="120"
      />
    </div>

    <div v-if="props.sending" class="thinking-bar">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>智能体正在生成回复...</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const props = defineProps<{
  agent: any | null
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: number
    steps?: Array<{
      type: 'memory' | 'llm' | 'tool'
      name: string
      status: 'completed' | 'failed'
      durationMs: number
      error?: string
    }>
  }>
  loading?: boolean
  sending?: boolean
}>()

const scrollRef = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)
const bottomThreshold = 48

watch(
  () => props.agent?.id,
  () => {
    stickToBottom.value = true
    nextTick(scrollToBottom)
  },
  { immediate: true },
)

watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      if (stickToBottom.value) {
        scrollToBottom()
      }
    })
  },
)

function scrollToBottom() {
  if (!scrollRef.value) return
  scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  stickToBottom.value = true
}

function handleScroll() {
  if (!scrollRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.value
  const distanceToBottom = scrollHeight - clientHeight - scrollTop
  stickToBottom.value = distanceToBottom <= bottomThreshold
}

function formatTime(timestamp: number): string {
  if (!timestamp) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function getAgentSubtitle(agent: any): string {
  return agent?.description || '当前对话仅属于这个智能体。'
}

function getModelLabel(agent: any): string {
  return agent?.model?.name || agent?.model?.modelName || '未绑定模型'
}

function getSkillCount(agent: any): number {
  return Array.isArray(agent?.skills) ? agent.skills.length : 0
}

function formatStepStatus(status: 'completed' | 'failed'): string {
  return status === 'completed' ? '已完成' : '失败'
}

defineExpose({
  scrollToBottom,
})
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 18px 40px rgba(26, 31, 54, 0.1);
  backdrop-filter: blur(14px);
  overflow: hidden;
}

.window-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #eef1f7;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 255, 0.96));
}

.window-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1a1f36;
}

.window-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.window-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.message-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 20px;
  overflow-y: auto;
  background:
    radial-gradient(circle at top left, rgba(102, 126, 234, 0.06), transparent 28%),
    radial-gradient(circle at bottom right, rgba(118, 75, 162, 0.05), transparent 32%),
    #f8fafc;
}

.message-stack {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, #dbe4ff 0%, #c4b5fd 100%);
  color: #1f2a44;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.message-row.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.message-bubble {
  max-width: min(720px, calc(100% - 60px));
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid #e7eaf0;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
}

.message-row.user .message-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-color: transparent;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 11px;
  opacity: 0.85;
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: 14px;
  word-break: break-word;
}

.runtime-steps {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #edf0f5;
  font-size: 12px;
  color: #667085;
}

.runtime-steps summary {
  cursor: pointer;
  user-select: none;
}

.runtime-step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.runtime-step pre {
  grid-column: 1 / -1;
  margin: 0;
  white-space: pre-wrap;
  color: #b42318;
}

.step-status {
  padding: 1px 6px;
  border-radius: 999px;
  background: #ecfdf3;
  color: #027a48;
}

.step-status.failed {
  background: #fef3f2;
  color: #b42318;
}

.step-duration {
  color: #98a2b3;
}

.thinking-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px 18px;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid #eef1f7;
  background: rgba(255, 255, 255, 0.92);
}

.empty-hint {
  font-size: 13px;
  color: #8a94a6;
}

.message-list::-webkit-scrollbar {
  width: 8px;
}

.message-list::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.28);
  border-radius: 999px;
  border: 2px solid rgba(248, 250, 252, 0.8);
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.42);
}

@media (max-width: 960px) {
  .message-bubble {
    max-width: calc(100% - 52px);
  }
}
</style>
