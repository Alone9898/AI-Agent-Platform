<template>
  <section class="chat-window">
    <header class="window-header">
      <div class="window-identity">
        <div class="window-agent-mark"><el-icon><ChatDotRound /></el-icon></div>
        <div class="window-heading">
          <h2>{{ props.agent?.name || '选择一个 Agent' }}</h2>
          <p>{{ props.agent?.description || '从左侧选择能力，开始一段新的对话。' }}</p>
        </div>
      </div>
      <div v-if="props.agent" class="capability-list" aria-label="当前能力">
        <span v-for="capability in capabilities" :key="capability" class="capability-tag">{{ capability }}</span>
        <span v-if="!capabilities.length" class="capability-tag muted">基础对话</span>
      </div>
    </header>

    <div ref="scrollRef" class="message-list" @scroll="handleScroll">
      <div v-if="props.agent && props.messages.length" class="message-stack">
        <article v-for="message in props.messages" :key="message.id" class="message-row" :class="message.role">
          <div class="message-avatar"><el-icon><Cpu v-if="message.role === 'assistant'" /><User v-else /></el-icon></div>
          <div class="message-bubble">
            <div class="message-meta">
              <span class="message-role">{{ message.role === 'assistant' ? '星曜助手' : '我' }}</span>
              <span>{{ formatTime(message.createdAt) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div v-if="message.role === 'assistant' && message.steps?.length" class="runtime-steps">
              <div class="steps-heading"><span>处理过程</span><span>{{ message.steps.length }} 个步骤</span></div>
              <div v-for="(step, index) in message.steps" :key="`${message.id}-${index}`" class="runtime-step">
                <span class="timeline-line" aria-hidden="true"></span>
                <span class="step-marker" :class="[step.status, step.type]"><el-icon><CircleCheck v-if="step.status === 'completed'" /><Warning v-else /></el-icon></span>
                <span class="step-copy"><strong>{{ formatStepName(step) }}</strong><small v-if="step.type === 'tool'">{{ toolDescription(step.name) }}</small></span>
                <span class="step-duration">{{ formatDuration(step.durationMs) }}</span>
                <pre v-if="step.error" class="step-error">{{ step.error }}</pre>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="props.agent" class="empty-state">
        <div class="empty-core"><el-icon><ChatDotRound /></el-icon></div>
        <h3>从一个具体目标开始</h3>
        <p>直接输入问题，或选择下面的示例。Agent 会根据已绑定的能力完成任务。</p>
        <div v-if="props.starterPrompts?.length" class="starter-list">
          <button v-for="prompt in props.starterPrompts" :key="prompt" type="button" class="starter-prompt" @click="emit('starter', prompt)">
            <span>{{ prompt }}</span><el-icon><ArrowRight /></el-icon>
          </button>
        </div>
      </div>

      <div v-else class="empty-state muted">
        <div class="empty-core"><el-icon><User /></el-icon></div>
        <h3>选择一个 Agent</h3>
        <p>你可以从左侧切换不同的工作能力。</p>
      </div>
    </div>

    <div v-if="props.sending" class="thinking-bar"><el-icon class="is-loading"><Loading /></el-icon><span>{{ props.activityLabel || '正在整理回答...' }}</span></div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowRight, ChatDotRound, CircleCheck, Cpu, Loading, User, Warning } from '@element-plus/icons-vue'

interface ChatStep { type: 'memory' | 'capability' | 'llm' | 'tool'; name: string; status: 'completed' | 'failed'; durationMs: number; error?: string }
const props = defineProps<{ agent: any | null; messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: number; steps?: ChatStep[] }>; loading?: boolean; sending?: boolean; activityLabel?: string; starterPrompts?: string[] }>()
const emit = defineEmits<{ (event: 'starter', prompt: string): void }>()
const scrollRef = ref<HTMLElement | null>(null)
const stickToBottom = ref(true)

const capabilities = computed(() => {
  const result: string[] = []
  for (const relation of props.agent?.skills || []) {
    const skill = relation?.skill || relation
    const names = parseTools(skill?.tools)
    for (const name of names) {
      const label = toolLabel(name)
      if (label && !result.includes(label)) result.push(label)
    }
    if (!names.length && skill?.name && !result.includes(skill.name)) result.push(skill.name)
  }
  return result.slice(0, 5)
})

watch(() => props.agent?.id, () => { stickToBottom.value = true; nextTick(scrollToBottom) }, { immediate: true })
watch(() => props.messages.length, () => nextTick(() => { if (stickToBottom.value) scrollToBottom() }))

function parseTools(raw: unknown): string[] {
  try { const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(parsed) ? parsed.map((item) => item?.name).filter((name): name is string => typeof name === 'string') : [] } catch { return [] }
}
function toolLabel(name: string): string { const key = name.toLowerCase(); if (key.includes('search')) return '联网搜索'; if (key.includes('fetch') || key.includes('read')) return '网页阅读'; if (key.includes('time') || key.includes('date')) return '时间查询'; if (key.includes('calcul')) return '数据计算'; if (key.includes('http') || key.includes('request')) return 'HTTP 请求'; return name.replace(/[_-]+/g, ' ') }
function toolDescription(name: string): string { return toolLabel(name) }
function formatStepName(step: ChatStep): string { if (step.type === 'tool') return `调用 ${toolLabel(step.name)}`; if (step.type === 'capability') return '已启用临时能力'; if (step.type === 'llm') return '整理回答'; if (step.type === 'memory') return '读取上下文'; return step.name }
function formatDuration(value: number): string { return value ? (value < 1000 ? `${value} ms` : `${(value / 1000).toFixed(1)} s`) : '' }
function formatTime(timestamp: number): string { return timestamp ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp)) : '' }
function scrollToBottom() { if (scrollRef.value) { scrollRef.value.scrollTop = scrollRef.value.scrollHeight; stickToBottom.value = true } }
function handleScroll() { if (!scrollRef.value) return; const { scrollTop, scrollHeight, clientHeight } = scrollRef.value; stickToBottom.value = scrollHeight - clientHeight - scrollTop <= 48 }

defineExpose({ scrollToBottom })
</script>

<style scoped>
.chat-window { display: flex; flex-direction: column; flex: 1; height: 100%; min-height: 0; overflow: hidden; background: #fff; }
.window-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 16px 20px; border-bottom: 1px solid #edf0f3; }
.window-identity { display: flex; align-items: center; gap: 11px; min-width: 0; }
.window-agent-mark { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex: 0 0 auto; border-radius: 9px; color: #536c88; background: #edf1f5; font-size: 17px; }
.window-heading { min-width: 0; }
.window-heading h2 { margin: 0; overflow: hidden; color: #293448; font-size: 15px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.window-heading p { max-width: 540px; margin: 3px 0 0; overflow: hidden; color: #8c96a5; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.capability-list { display: flex; justify-content: flex-end; gap: 6px; flex-wrap: wrap; }
.capability-tag { padding: 4px 8px; border: 1px solid #dce4ec; border-radius: 6px; color: #61738a; font-size: 10px; background: #f8fafc; white-space: nowrap; }
.capability-tag.muted { color: #939eac; }
.message-list { display: flex; flex: 1; flex-direction: column; min-height: 0; padding: 24px clamp(16px, 3vw, 34px); overflow-y: auto; background: #f8fafc; }
.message-stack { width: 100%; max-width: 920px; min-height: 100%; margin: 0 auto; display: flex; flex-direction: column; }
.message-stack::before { content: ''; margin-top: auto; }
.message-row { display: flex; gap: 10px; margin-bottom: 18px; }
.message-row.user { flex-direction: row-reverse; }
.message-avatar { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 9px; color: #566d86; background: #e9eef4; font-size: 14px; }
.message-row.user .message-avatar { color: #fff; background: #5e7088; }
.message-bubble { max-width: min(760px, calc(100% - 50px)); padding: 12px 14px 13px; border: 1px solid #e4e8ed; border-radius: 5px 12px 12px 12px; color: #3b4657; background: #fff; box-shadow: 0 1px 2px rgba(33, 37, 61, .03); }
.message-row.user .message-bubble { border-color: transparent; border-radius: 12px 5px 12px 12px; color: #fff; background: #5e7088; }
.message-meta { display: flex; justify-content: space-between; gap: 14px; margin-bottom: 7px; color: #9aa3af; font-size: 9px; }
.message-role { color: #657184; font-weight: 650; }
.message-row.user .message-meta, .message-row.user .message-role { color: rgba(255,255,255,.7); }
.message-content { white-space: pre-wrap; line-height: 1.75; font-size: 13px; word-break: break-word; }
.runtime-steps { margin-top: 12px; padding: 11px 12px; border: 1px solid #e3e9ef; border-radius: 8px; color: #657184; background: #fafcfd; }
.steps-heading { display: flex; justify-content: space-between; color: #69798b; font-size: 10px; font-weight: 650; }
.steps-heading span:last-child { color: #9ca7b3; font-weight: 500; }
.runtime-step { position: relative; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; gap: 8px; align-items: center; margin-top: 11px; min-height: 26px; }
.timeline-line { position: absolute; top: -10px; left: 8px; width: 1px; height: 10px; background: #d9e1e8; }
.runtime-step:first-of-type .timeline-line { display: none; }
.step-marker { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; color: #3f9671; background: #e9f6f0; font-size: 11px; }
.step-marker.failed { color: #b4534b; background: #fff0ee; }
.step-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.step-copy strong { overflow: hidden; color: #506074; font-size: 10px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.step-copy small { overflow: hidden; color: #9aa5b1; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.step-duration { color: #a0aab5; font-family: Consolas, monospace; font-size: 9px; }
.step-error { grid-column: 2 / -1; margin: 0; white-space: pre-wrap; color: #ad4c45; font-family: Consolas, monospace; font-size: 9px; }
.thinking-bar { display: flex; align-items: center; gap: 8px; padding: 9px 20px; border-top: 1px solid #edf0f3; color: #788596; font-size: 10px; background: #fcfdfd; }
.thinking-bar .el-icon { color: #657e99; font-size: 14px; }
.empty-state { width: 100%; max-width: 430px; margin: auto; padding: 32px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }
.empty-core { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; margin-bottom: 18px; border-radius: 10px; color: #5e718b; background: #e9eef4; font-size: 20px; }
.empty-state h3 { margin: 0 0 7px; color: #303b4e; font-size: 17px; font-weight: 700; }
.empty-state p { max-width: 350px; margin: 0; color: #929dab; font-size: 11px; line-height: 1.7; }
.starter-list { width: min(100%, 390px); margin-top: 20px; display: grid; gap: 8px; }
.starter-prompt { width: 100%; min-height: 40px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 12px; border: 1px solid #dfe5eb; border-radius: 8px; color: #5a687a; font: inherit; font-size: 11px; line-height: 1.5; text-align: left; background: #fff; cursor: pointer; }
.starter-prompt:hover { border-color: #afbdca; color: #3f5167; background: #fbfcfd; }
.starter-prompt .el-icon { color: #8293a6; }
.message-list::-webkit-scrollbar { width: 7px; }
.message-list::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: rgba(95, 112, 136, .32); background-clip: padding-box; }
.message-list::-webkit-scrollbar-track { background: transparent; }
@media (max-width: 620px) { .window-header { align-items: flex-start; padding: 14px 15px; } .capability-list { display: none; } .message-list { padding: 18px 14px; } .message-bubble { max-width: calc(100% - 44px); } }
</style>
