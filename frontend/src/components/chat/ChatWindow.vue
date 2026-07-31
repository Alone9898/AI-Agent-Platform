<template>
  <section class="chat-window">
    <div class="window-header">
      <div class="window-identity">
        <div class="window-agent-mark">
          <el-icon><ChatDotRound /></el-icon>
        </div>
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
            <el-icon>
              <Cpu v-if="message.role === 'assistant'" />
              <User v-else />
            </el-icon>
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

      <div v-else-if="props.agent && !props.loading" class="empty-state">
        <div class="empty-core standalone">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <h3>和 {{ props.agent.name }} 开始协作</h3>
        <p>发送一条消息，智能体会结合已绑定的模型与技能为你工作。</p>
      </div>

      <div v-else class="empty-state muted">
        <div class="empty-core standalone">
          <el-icon><ChatDotRound /></el-icon>
        </div>
        <h3>{{ props.loading ? '正在加载智能体' : '选择一位智能体' }}</h3>
        <p>{{ props.loading ? '工作台正在准备你的智能团队。' : '从左侧目录选择成员后开始对话。' }}</p>
      </div>
    </div>

    <div v-if="props.sending" class="thinking-bar">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>智能体正在生成回复...</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ChatDotRound, Cpu, Loading, User } from '@element-plus/icons-vue'

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
  overflow: hidden;
  background: #fff;
}

.window-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 17px 20px;
  border-bottom: 1px solid #eff0f4;
  background: rgba(255, 255, 255, 0.96);
}

.window-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.window-agent-mark {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3dffb;
  border-radius: 9px;
  color: #7364e5;
  font-size: 17px;
  background: #f0edff;
}

.window-identity > div:last-child {
  min-width: 0;
}

.window-title {
  margin: 0;
  color: #282d40;
  font-size: 15px;
  font-weight: 680;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-subtitle {
  max-width: 500px;
  margin-top: 2px;
  overflow: hidden;
  color: #8e92a3;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.window-badges :deep(.el-tag) {
  height: 25px;
  border-color: #e5e2f8;
  border-radius: 8px;
  color: #77718f;
  font-size: 9px;
  background: #faf9ff;
}

.message-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 24px clamp(18px, 3vw, 34px);
  overflow-y: auto;
  background: #f8f9fc;
}

.message-stack {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.message-stack::before {
  content: '';
  margin-top: auto;
}

.message-row {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2defb;
  border-radius: 11px;
  color: #7162df;
  font-size: 14px;
  background: #eeebff;
}

.message-row.user .message-avatar {
  border-color: transparent;
  color: #fff;
  background: #6d60d9;
}

.message-bubble {
  max-width: min(760px, calc(100% - 52px));
  padding: 13px 15px 14px;
  border: 1px solid #e9eaf0;
  border-radius: 5px 15px 15px 15px;
  color: #3a3f52;
  background: #fff;
  box-shadow: 0 1px 2px rgba(33, 37, 61, 0.04);
}

.message-row.user .message-bubble {
  border-color: transparent;
  border-radius: 15px 5px 15px 15px;
  color: #fff;
  background: #6d60d9;
  box-shadow: none;
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 7px;
  color: #999dad;
  font-size: 9px;
}

.message-role {
  color: #6a6f82;
  font-weight: 650;
}

.message-row.user .message-meta,
.message-row.user .message-role {
  color: rgba(255, 255, 255, 0.68);
}

.message-content {
  white-space: pre-wrap;
  line-height: 1.75;
  font-size: 13px;
  word-break: break-word;
}

.runtime-steps {
  margin-top: 12px;
  padding: 10px 11px;
  border: 1px solid #edebf7;
  border-radius: 10px;
  color: #787d90;
  font-size: 10px;
  background: #faf9fe;
}

.runtime-steps summary {
  color: #6c627f;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}

.runtime-step {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 7px;
  align-items: center;
  margin-top: 9px;
}

.runtime-step pre {
  grid-column: 1 / -1;
  margin: 0;
  white-space: pre-wrap;
  color: #b44840;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
}

.step-status {
  padding: 2px 6px;
  border-radius: 999px;
  color: #248760;
  background: #eaf9f2;
}

.step-status.failed {
  color: #b44840;
  background: #fff0ef;
}

.step-duration {
  color: #a6aab8;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 9px;
}

.thinking-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-top: 1px solid #eff0f4;
  color: #777c8f;
  font-size: 10px;
  background: #fcfcfe;
}

.thinking-bar .el-icon {
  color: #7466e8;
  font-size: 14px;
}

.empty-state {
  width: 100%;
  max-width: 420px;
  margin: auto;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-core {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e3dffb;
  border-radius: 10px;
  color: #7263df;
  font-size: 20px;
  background: #eeebff;
}

.empty-core.standalone {
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 7px;
  color: #313649;
  font-size: 17px;
  font-weight: 680;
}

.empty-state p {
  max-width: 350px;
  margin: 0;
  color: #969aab;
  font-size: 11px;
  line-height: 1.7;
}

.empty-state.muted .empty-core {
  filter: grayscale(0.25);
  opacity: 0.72;
}

.message-list::-webkit-scrollbar {
  width: 7px;
}

.message-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(116, 102, 239, 0.3);
  background-clip: padding-box;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: rgba(116, 102, 239, 0.45);
  background-clip: padding-box;
}

@media (max-width: 960px) {
  .message-bubble {
    max-width: calc(100% - 46px);
  }
}

@media (max-width: 620px) {
  .window-header {
    align-items: flex-start;
    padding: 14px 15px;
  }

  .window-agent-mark {
    width: 36px;
    height: 36px;
  }

  .window-badges {
    display: none;
  }

  .message-list {
    padding: 18px 14px;
  }

  .message-avatar {
    width: 30px;
    height: 30px;
    border-radius: 9px;
  }

  .message-bubble {
    padding: 11px 13px 12px;
  }
}

</style>
