<template>
  <div class="home-page">
    <header class="home-header">
      <div>
        <p class="welcome-line">{{ welcomeText }}</p>
        <h1>今天想做什么？</h1>
      </div>
      <el-tooltip content="管理配置" placement="bottom">
        <el-button class="settings-button" circle plain aria-label="管理配置" @click="router.push('/agents')">
          <el-icon><Setting /></el-icon>
        </el-button>
      </el-tooltip>
    </header>

    <form class="demand-form" @submit.prevent="submitDemand">
      <el-input
        v-model="demand"
        class="demand-input"
        placeholder="直接说出你的需求，例如：整理今天的 AI 新闻"
        :disabled="loading || !agents.length"
        @keydown.enter.exact.prevent="submitDemand"
      />
      <el-button
        type="primary"
        class="demand-submit"
        native-type="submit"
        :disabled="!demand.trim() || !agents.length"
        aria-label="开始任务"
      >
        <el-icon><Promotion /></el-icon>
        开始
      </el-button>
    </form>

    <div class="prompt-examples" aria-label="需求示例">
      <span>试试：</span>
      <button v-for="example in promptExamples" :key="example" type="button" @click="startWithPrompt(example)">
        {{ example }}
      </button>
    </div>

    <section class="home-section quick-section">
      <div class="section-heading">
        <div>
          <h2>快速开始</h2>
          <p>选择一个已经准备好的助手。</p>
        </div>
        <span v-if="!loading" class="section-count">{{ agents.length }} 个可用</span>
      </div>

      <div v-if="loading" class="quick-grid" aria-busy="true">
        <div v-for="item in 3" :key="item" class="quick-card skeleton-card">
          <el-skeleton animated :rows="2" />
        </div>
      </div>

      <div v-else class="quick-grid">
        <button
          v-for="(agent, index) in quickAgents"
          :key="agent.id"
          type="button"
          class="quick-card"
          @click="openAgent(agent.id)"
        >
          <span class="quick-icon" :class="`tone-${index + 1}`">
            <el-icon><component :is="getAgentIcon(agent, index)" /></el-icon>
          </span>
          <span class="quick-copy">
            <strong>{{ agent.name }}</strong>
            <span>{{ agent.description || '开始一段新的任务' }}</span>
          </span>
          <el-icon class="quick-arrow"><ArrowRight /></el-icon>
        </button>

        <button
          v-for="slot in emptyQuickSlots"
          :key="`empty-${slot}`"
          type="button"
          class="quick-card empty-quick-card"
          @click="router.push('/agents')"
        >
          <span class="quick-icon empty"><el-icon><Plus /></el-icon></span>
          <span class="quick-copy">
            <strong>添加新的助手</strong>
            <span>配置一个适合当前任务的 Agent</span>
          </span>
          <el-icon class="quick-arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </section>

    <div class="home-lower">
      <section class="home-section capability-section">
        <div class="section-heading compact">
          <div>
            <h2>推荐能力</h2>
            <p>来自当前已配置的助手。</p>
          </div>
        </div>

        <div v-if="capabilities.length" class="capability-grid">
          <div v-for="capability in capabilities" :key="capability" class="capability-item">
            <span class="capability-icon"><el-icon><component :is="getCapabilityIcon(capability)" /></el-icon></span>
            <span>{{ capability }}</span>
          </div>
        </div>
        <button v-else type="button" class="capability-empty" @click="router.push('/agents')">
          <span>还没有可推荐的能力</span>
          <small>为助手绑定能力后会显示在这里</small>
          <el-icon><ArrowRight /></el-icon>
        </button>
      </section>

      <section class="home-section recent-section">
        <div class="section-heading compact">
          <div>
            <h2>继续上次任务</h2>
            <p>接着处理未完成的内容。</p>
          </div>
        </div>

        <button v-if="recentTask" type="button" class="recent-task" @click="openAgent(recentTask.agent.id)">
          <span class="recent-icon"><el-icon><Clock /></el-icon></span>
          <span class="recent-copy">
            <strong>{{ recentTask.title }}</strong>
            <span>{{ recentTask.agent.name }} · {{ formatRelativeTime(recentTask.updatedAt) }}</span>
          </span>
          <el-icon class="recent-arrow"><ArrowRight /></el-icon>
        </button>
        <div v-else class="recent-empty">
          完成一次对话后，最近任务会显示在这里。
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  Clock,
  DataAnalysis,
  Document,
  EditPen,
  Link,
  Monitor,
  Plus,
  Promotion,
  Search,
  Setting,
} from '@element-plus/icons-vue'
import { agentApi } from '@/api'
import { useAuthStore } from '@/stores'

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

const router = useRouter()
const authStore = useAuthStore()
const agents = ref<any[]>([])
const loading = ref(false)
const demand = ref('')

const ACTIVE_AGENT_KEY = 'chat:active-agent-id'
const promptExamples = ['总结一个网页', '查今天的 AI 新闻', '写一篇产品介绍']

const welcomeText = computed(() => {
  const name = authStore.user?.nickname || authStore.user?.username
  return name ? `${name}，欢迎回来` : '欢迎回来'
})

const recentAgent = computed(() => {
  const id = Number(localStorage.getItem(ACTIVE_AGENT_KEY))
  return Number.isFinite(id) ? agents.value.find((agent) => agent.id === id) || null : null
})

const quickAgents = computed(() => {
  const recentId = recentAgent.value?.id
  return [...agents.value]
    .sort((a, b) => Number(b.id === recentId) - Number(a.id === recentId))
    .slice(0, 3)
})

const emptyQuickSlots = computed(() => Math.max(0, 3 - quickAgents.value.length))

const capabilities = computed(() => {
  const result: string[] = []
  for (const agent of agents.value) {
    for (const relation of agent?.skills || []) {
      const skill = relation?.skill || relation
      const toolNames = parseToolNames(skill?.tools)
      if (toolNames.length) {
        for (const name of toolNames) addUnique(result, getToolLabel(name))
      } else if (skill?.name) {
        addUnique(result, skill.name)
      }
    }
  }
  return result.slice(0, 6)
})

const recentTask = computed(() => {
  const agent = recentAgent.value
  if (!agent) return null
  const messages = loadMessages(agent.id)
  const lastMessage = [...messages].reverse().find((message) => message.role === 'user')
    || messages[messages.length - 1]
  if (!lastMessage) return null
  return {
    agent,
    title: truncate(lastMessage.content, 42),
    updatedAt: lastMessage.createdAt,
  }
})

onMounted(loadAgents)

async function loadAgents() {
  loading.value = true
  try {
    const { data } = await agentApi.findAll()
    agents.value = Array.isArray(data) ? data : []
  } catch {
    ElMessage.error('加载助手失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function submitDemand() {
  const prompt = demand.value.trim()
  const agent = recentAgent.value || agents.value[0]
  if (!prompt || !agent) return
  localStorage.setItem(`chat:draft:${agent.id}`, prompt)
  openAgent(agent.id, true)
}

function startWithPrompt(prompt: string) {
  demand.value = prompt
  submitDemand()
}

function openAgent(id: number, sendDraft = false) {
  localStorage.setItem(ACTIVE_AGENT_KEY, String(id))
  router.push({
    path: '/chat',
    query: {
      agentId: String(id),
      ...(sendDraft ? { send: String(Date.now()), configure: '1' } : {}),
    },
  })
}

function loadMessages(agentId: number): StoredMessage[] {
  try {
    const value = JSON.parse(localStorage.getItem(`chat:messages:${agentId}`) || '[]')
    return Array.isArray(value) ? value.filter((message) => message?.content && message?.createdAt) : []
  } catch {
    return []
  }
}

function parseToolNames(raw: unknown): string[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(value)
      ? value.map((tool) => tool?.name).filter((name): name is string => typeof name === 'string')
      : []
  } catch {
    return []
  }
}

function addUnique(items: string[], value: string) {
  if (value && !items.includes(value)) items.push(value)
}

function getToolLabel(name: string): string {
  const key = name.toLowerCase()
  if (key.includes('search')) return '联网搜索'
  if (key.includes('fetch') || key.includes('read')) return '网页阅读'
  if (key.includes('time') || key.includes('date')) return '时间查询'
  if (key.includes('calcul')) return '数据计算'
  if (key.includes('http') || key.includes('request')) return '网络请求'
  return name.replace(/[_-]+/g, ' ')
}

function getAgentIcon(agent: any, index: number) {
  const value = `${agent?.name || ''} ${agent?.description || ''}`.toLowerCase()
  if (value.includes('热点') || value.includes('新闻') || value.includes('搜索')) return Search
  if (value.includes('写作') || value.includes('文案')) return EditPen
  if (value.includes('编程') || value.includes('代码')) return Monitor
  return [Search, EditPen, Monitor][index % 3]
}

function getCapabilityIcon(label: string) {
  if (label.includes('搜索')) return Search
  if (label.includes('网页') || label.includes('网络')) return Link
  if (label.includes('计算') || label.includes('数据')) return DataAnalysis
  return Document
}

function truncate(value: string, maxLength: number): string {
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function formatRelativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp
  const minutes = Math.max(1, Math.floor(elapsed / 60000))
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  return `${days} 天前`
}
</script>

<style scoped>
.home-page {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 6px 4px 32px;
}

.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}

.welcome-line {
  margin: 0 0 6px;
  color: #7c8992;
  font-size: 12px;
  font-weight: 600;
}

.home-header h1 {
  margin: 0;
  color: #1f2a33;
  font-size: 30px;
  line-height: 1.25;
  font-weight: 720;
  letter-spacing: 0;
}

.settings-button {
  width: 36px;
  height: 36px;
  border-color: #dce3e5;
  color: #62717b;
}

.demand-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px 10px 10px 16px;
  border: 1px solid #d8e0e2;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(32, 45, 52, 0.05);
}

.demand-form:focus-within {
  border-color: #8eb3ae;
  box-shadow: 0 0 0 3px rgba(77, 133, 127, 0.1);
}

.demand-input :deep(.el-input__wrapper) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.demand-input :deep(.el-input__inner) {
  height: 38px;
  color: #2d3a43;
  font-size: 14px;
}

.demand-submit {
  min-width: 88px;
  height: 38px;
  gap: 5px;
  border-radius: 7px;
}

.prompt-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 14px;
  margin: 10px 4px 34px;
  color: #98a2a9;
  font-size: 11px;
}

.prompt-examples button {
  padding: 0;
  border: 0;
  color: #687a84;
  font: inherit;
  background: transparent;
  cursor: pointer;
}

.prompt-examples button:hover {
  color: #356e69;
}

.home-section {
  min-width: 0;
}

.quick-section {
  margin-bottom: 32px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.section-heading.compact {
  align-items: flex-start;
}

.section-heading h2 {
  margin: 0;
  color: #2b3740;
  font-size: 16px;
  font-weight: 700;
}

.section-heading p {
  margin: 4px 0 0;
  color: #8c989f;
  font-size: 11px;
}

.section-count {
  color: #929da4;
  font-size: 11px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.quick-card {
  min-height: 112px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 17px;
  border: 1px solid #dde4e6;
  border-radius: 9px;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.quick-card:hover {
  border-color: #a8c2be;
  box-shadow: 0 5px 14px rgba(34, 52, 58, 0.06);
}

.quick-icon {
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
}

.quick-icon.tone-1 {
  color: #356e69;
  background: #e6f1ef;
}

.quick-icon.tone-2 {
  color: #9b6b27;
  background: #f7efde;
}

.quick-icon.tone-3 {
  color: #526f88;
  background: #e9eef3;
}

.quick-icon.empty {
  color: #89959c;
  background: #f0f3f4;
}

.quick-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.quick-copy strong {
  overflow: hidden;
  color: #2e3a43;
  font-size: 14px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-copy span {
  overflow: hidden;
  color: #8a969e;
  font-size: 11px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-arrow {
  color: #a0aab0;
}

.empty-quick-card {
  border-style: dashed;
  background: #fafbfb;
}

.skeleton-card {
  display: block;
  cursor: default;
}

.home-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 28px;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.capability-item {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px;
  border: 1px solid #e1e6e8;
  border-radius: 8px;
  color: #596872;
  font-size: 11px;
  background: #fff;
}

.capability-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: #4d857f;
  background: #eaf3f1;
  font-size: 14px;
}

.capability-item > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capability-empty {
  width: 100%;
  min-height: 62px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px dashed #d7dfe1;
  border-radius: 8px;
  color: #68767f;
  text-align: left;
  background: #fafbfb;
  cursor: pointer;
}

.capability-empty small {
  color: #9aa4aa;
}

.capability-empty .el-icon {
  grid-column: 2;
  grid-row: 1 / 3;
}

.recent-task {
  width: 100%;
  min-height: 76px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 14px;
  border: 1px solid #dde4e6;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: #fff;
  cursor: pointer;
}

.recent-task:hover {
  border-color: #a8c2be;
}

.recent-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #8d6a32;
  background: #f7efde;
}

.recent-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.recent-copy strong {
  overflow: hidden;
  color: #334049;
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-copy span,
.recent-empty {
  color: #929da4;
  font-size: 10px;
}

.recent-arrow {
  color: #a0aab0;
}

.recent-empty {
  min-height: 76px;
  display: flex;
  align-items: center;
  padding: 14px;
  border: 1px dashed #d7dfe1;
  border-radius: 8px;
  background: #fafbfb;
}

@media (max-width: 980px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .home-lower {
    grid-template-columns: 1fr;
    gap: 28px;
  }
}

@media (max-width: 680px) {
  .home-page {
    padding: 0 0 24px;
  }

  .home-header h1 {
    font-size: 26px;
  }

  .demand-form {
    grid-template-columns: minmax(0, 1fr) 40px;
    padding-right: 8px;
  }

  .demand-submit {
    min-width: 40px;
    width: 40px;
    padding: 0;
    font-size: 0;
  }

  .demand-submit .el-icon {
    margin: 0;
    font-size: 15px;
  }

  .prompt-examples {
    margin-bottom: 28px;
  }

  .quick-grid,
  .capability-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .quick-card {
    transition: none;
  }
}
</style>
