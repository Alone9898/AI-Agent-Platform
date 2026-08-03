<template>
  <div class="chat-page">
    <div v-if="loadError" class="error-banner">
      <el-alert :title="loadError" type="error" :closable="false" show-icon />
    </div>

    <div class="chat-layout">
      <ChatSidebar
        :agents="agents"
        :active-agent-id="selectedAgentId"
        :loading="agentsLoading"
        @select="selectAgent"
      />

      <section class="chat-stage">
        <ChatWindow
          :agent="activeAgent"
          :messages="activeMessages"
          :starter-prompts="activeStarterPrompts"
          :loading="agentsLoading"
          :sending="sending"
          :activity-label="activityLabel"
          @starter="useStarterPrompt"
        />

        <ChatInput
          v-model="activeDraft"
          :disabled="!activeAgent"
          :sending="sending"
          :placeholder="activeAgent ? `和 ${activeAgent.name} 说点什么` : '请先选择一个 Agent'"
          @send="handleSend"
        />
      </section>
    </div>

    <el-dialog
      v-model="consentDialogVisible"
      width="min(520px, calc(100vw - 28px))"
      class="skill-consent-dialog"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
      @closed="settleConsent('reject')"
    >
      <template #header>
        <div class="consent-heading">
          <span class="consent-icon"><el-icon><Connection /></el-icon></span>
          <div>
            <h3>{{ pendingConsent?.persistent ? '配置专用任务助手' : '启用匹配到的能力' }}</h3>
            <p>星曜根据当前需求找到了 {{ pendingConsent?.matches.length || 0 }} 项可用能力</p>
          </div>
        </div>
      </template>

      <div class="consent-list">
        <div
          v-for="skill in pendingConsent?.matches || []"
          :key="skill.id"
          class="consent-item"
        >
          <div class="consent-item-main">
            <div class="consent-name-row">
              <strong>{{ skill.name }}</strong>
              <span class="risk-label" :class="skill.risk">{{ skill.riskLabel }}</span>
            </div>
            <p>{{ skill.description || skill.reason }}</p>
            <small>{{ skill.reason }}</small>
          </div>
          <div v-if="skill.capabilities.length" class="consent-capabilities">
            <span v-for="capability in skill.capabilities" :key="capability">{{ capability }}</span>
          </div>
        </div>
      </div>

      <div class="consent-note" :class="{ warning: hasHighRiskMatch || needsWebSearchSetup }">
        <el-icon><WarningFilled v-if="hasHighRiskMatch || needsWebSearchSetup" /><Lock v-else /></el-icon>
        <span v-if="needsWebSearchSetup">联网搜索尚未配置。需要先选择搜索服务商并填写凭据，才能获取今天的新闻。</span>
        <span v-else-if="hasHighRiskMatch">包含可能执行代码或修改文件的能力，请确认这是你当前需要的操作。</span>
        <span v-else-if="pendingConsent?.persistent">确认后会创建或复用专用任务助手，并长期添加这些能力。</span>
        <span v-else>授权仅用于这次请求，不会修改当前 Agent 的长期配置。</span>
      </div>

      <template #footer>
        <el-button @click="settleConsent('reject')">{{ needsWebSearchSetup ? '稍后处理' : '不用，继续对话' }}</el-button>
        <el-button v-if="needsWebSearchSetup" type="primary" @click="settleConsent('settings')">
          {{ pendingConsent?.persistent ? '创建并去配置' : '去配置联网搜索' }}
        </el-button>
        <el-button v-else type="primary" @click="settleConsent('approve')">
          {{ pendingConsent?.persistent ? '创建并开始' : '同意并启用' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Connection, Lock, WarningFilled } from '@element-plus/icons-vue'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { agentApi, chatApi, toolSettingsApi } from '@/api'
import { agentPresetStorageKey, HOTSPOT_RADAR_PRESET } from '@/presets/agent-presets'

interface RuntimeStep {
  type: 'memory' | 'capability' | 'llm' | 'tool'
  name: string
  status: 'completed' | 'failed'
  durationMs: number
  input?: unknown
  output?: unknown
  error?: string
}

type SkillRisk = 'low' | 'medium' | 'high'

interface MatchedSkill {
  id: number
  name: string
  description: string | null
  risk: SkillRisk
  riskLabel: string
  reason: string
  capabilities: string[]
}

type ConsentDecision = 'approve' | 'reject' | 'settings'

interface PendingConsent {
  requestId: string
  matches: MatchedSkill[]
  persistent: boolean
  needsWebSearchSetup: boolean
  resolve: (decision: ConsentDecision) => void
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  steps?: RuntimeStep[]
}

const route = useRoute()
const router = useRouter()
const agents = ref<any[]>([])
const agentsLoading = ref(false)
const selectedAgentId = ref<number | null>(null)
const sending = ref(false)
const activity = ref<'idle' | 'matching' | 'awaiting-consent' | 'enabling' | 'generating'>('idle')
const loadError = ref('')
const consentDialogVisible = ref(false)
const pendingConsent = ref<PendingConsent | null>(null)
const conversations = reactive<Record<number, ChatMessage[]>>({})
const drafts = reactive<Record<number, string>>({})

const ACTIVE_AGENT_KEY = 'chat:active-agent-id'
const conversationKey = (agentId: number) => `chat:messages:${agentId}`
const conversationIdKey = (agentId: number) => `chat:conversation-id:${agentId}`
const draftKey = (agentId: number) => `chat:draft:${agentId}`

const activeAgent = computed(() => agents.value.find((agent) => agent.id === selectedAgentId.value) || null)
const activeMessages = computed(() => selectedAgentId.value ? conversations[selectedAgentId.value] || [] : [])
const activityLabel = computed(() => {
  if (activity.value === 'matching') return '正在理解需求并匹配能力...'
  if (activity.value === 'awaiting-consent') return '等待确认要启用的能力...'
  if (activity.value === 'enabling') return '正在启用能力...'
  return '正在整理回答...'
})
const hasHighRiskMatch = computed(() =>
  pendingConsent.value?.matches.some((skill) => skill.risk === 'high') || false,
)
const needsWebSearchSetup = computed(() => pendingConsent.value?.needsWebSearchSetup || false)
const activeStarterPrompts = computed(() => {
  if (!activeAgent.value || activeMessages.value.length > 0) return []
  const storedId = Number(localStorage.getItem(agentPresetStorageKey(HOTSPOT_RADAR_PRESET.key)))
  const isHotspot = activeAgent.value.name === HOTSPOT_RADAR_PRESET.name
    || (Number.isFinite(storedId) && activeAgent.value.id === storedId)
  return isHotspot ? HOTSPOT_RADAR_PRESET.starterPrompts : []
})

const activeDraft = computed({
  get: () => selectedAgentId.value ? (drafts[selectedAgentId.value] ??= loadDraft(selectedAgentId.value)) : '',
  set: (value: string) => {
    if (!selectedAgentId.value) return
    drafts[selectedAgentId.value] = value
    localStorage.setItem(draftKey(selectedAgentId.value), value)
  },
})

onMounted(loadAgents)

watch(selectedAgentId, (agentId) => {
  if (agentId === null) return
  localStorage.setItem(ACTIVE_AGENT_KEY, String(agentId))
  ensureConversationLoaded(agentId)
  ensureDraftLoaded(agentId)
})

async function loadAgents() {
  agentsLoading.value = true
  loadError.value = ''
  try {
    const { data } = await agentApi.findAll()
    agents.value = Array.isArray(data) ? data : []
    syncSelectedAgent()
  } catch (error: any) {
    loadError.value = '加载 Agent 列表失败，请稍后重试。'
    ElMessage.error(error?.response?.data?.message || loadError.value)
  } finally {
    agentsLoading.value = false
  }
  await consumeRoutedDemand()
}

async function consumeRoutedDemand() {
  if (typeof route.query.send !== 'string' || !selectedAgentId.value) return
  const agentId = selectedAgentId.value
  const configureTaskAgent = route.query.configure === '1'
  ensureConversationLoaded(agentId)
  ensureDraftLoaded(agentId)
  const prompt = (drafts[agentId] || '').trim()

  drafts[agentId] = ''
  localStorage.removeItem(draftKey(agentId))
  await router.replace({ path: '/chat', query: { agentId: String(agentId) } })

  if (prompt) await handleSend(prompt, { configureTaskAgent })
}

function syncSelectedAgent() {
  if (!agents.value.length) {
    selectedAgentId.value = null
    return
  }
  const routeId = Number(route.query.agentId)
  if (Number.isFinite(routeId) && agents.value.some((agent) => agent.id === routeId)) {
    selectedAgentId.value = routeId
    return
  }
  const savedId = Number(localStorage.getItem(ACTIVE_AGENT_KEY))
  selectedAgentId.value = Number.isFinite(savedId) && agents.value.some((agent) => agent.id === savedId)
    ? savedId
    : agents.value[0].id
}

function selectAgent(agentId: number) { selectedAgentId.value = agentId }
function useStarterPrompt(prompt: string) { activeDraft.value = prompt }

function ensureConversationLoaded(agentId: number) {
  if (!conversations[agentId]) conversations[agentId] = loadConversation(agentId)
}

function ensureDraftLoaded(agentId: number) {
  if (!(agentId in drafts)) drafts[agentId] = loadDraft(agentId)
}

function loadConversation(agentId: number): ChatMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(conversationKey(agentId)) || '[]')
    return Array.isArray(parsed) ? parsed.filter(isValidMessage) : []
  } catch { return [] }
}

function loadDraft(agentId: number): string { return localStorage.getItem(draftKey(agentId)) || '' }
function persistConversation(agentId: number) { localStorage.setItem(conversationKey(agentId), JSON.stringify(conversations[agentId] || [])) }
function isValidMessage(value: any): value is ChatMessage {
  return value && typeof value === 'object' && (value.role === 'user' || value.role === 'assistant')
    && typeof value.content === 'string' && typeof value.id === 'string'
}

function createMessage(role: 'user' | 'assistant', content: string, steps: RuntimeStep[] = []): ChatMessage {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, role, content, createdAt: Date.now(), ...(steps.length ? { steps } : {}) }
}

function buildConversationPayload(messages: ChatMessage[]) {
  return messages.map((message) => ({ role: message.role, content: message.content }))
}

function requestSkillConsent(
  requestId: string,
  matches: MatchedSkill[],
  options: { persistent: boolean; needsWebSearchSetup: boolean },
): Promise<ConsentDecision> {
  activity.value = 'awaiting-consent'
  return new Promise((resolve) => {
    pendingConsent.value = { requestId, matches, ...options, resolve }
    consentDialogVisible.value = true
  })
}

function settleConsent(decision: ConsentDecision) {
  const pending = pendingConsent.value
  if (!pending) return
  pendingConsent.value = null
  consentDialogVisible.value = false
  pending.resolve(decision)
}

function extractChatResult(data: any): { final: string; steps: RuntimeStep[]; conversationId?: string } {
  const candidates = [data?.final, data?.reply, data?.content, data?.message, data?.data?.reply, data?.data?.content, data?.data?.message, data?.data?.result, data?.assistant?.content, data?.choices?.[0]?.message?.content, data?.output?.content]
  const final = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())
  if (typeof final === 'string') {
    return { final: final.trim(), steps: Array.isArray(data?.steps) ? data.steps : [], conversationId: typeof data?.conversationId === 'string' ? data.conversationId : undefined }
  }
  if (typeof data === 'string' && data.trim()) return { final: data.trim(), steps: [] }
  throw new Error('对话接口没有返回有效的助手消息')
}

async function handleSend(text: string, options: { configureTaskAgent?: boolean } = {}) {
  if (!activeAgent.value || sending.value) return
  const baseAgent = activeAgent.value
  let targetAgent = baseAgent
  sending.value = true
  activity.value = 'matching'
  try {
    let temporarySkillIds: number[] | undefined
    let skillConsentToken: string | undefined

    try {
      const { data: matchResult } = await chatApi.matchSkills({
        agentId: baseAgent.id,
        message: text,
        includeBoundSkills: options.configureTaskAgent,
      })
      const matches: MatchedSkill[] = Array.isArray(matchResult?.matches) ? matchResult.matches : []
      if (options.configureTaskAgent && matches.length === 0) {
        throw new Error('没有找到适合当前需求的已安装能力，请先在能力库中添加对应 Skill')
      }
      if (matches.length && typeof matchResult?.requestId === 'string') {
        const needsSearchSetup = await checkWebSearchSetup(matches)
        const decision = await requestSkillConsent(matchResult.requestId, matches, {
          persistent: Boolean(options.configureTaskAgent),
          needsWebSearchSetup: needsSearchSetup,
        })
        if (decision === 'settings') {
          if (options.configureTaskAgent) {
            activity.value = 'enabling'
            targetAgent = await ensureTaskAgent(baseAgent, matches)
            selectedAgentId.value = targetAgent.id
            preserveDraft(targetAgent.id, text)
          } else {
            preserveDraft(baseAgent.id, text)
          }
          await router.push('/settings')
          return
        }
        if (needsSearchSetup) {
          preserveDraft(baseAgent.id, text)
          return
        }
        if (decision === 'approve') {
          activity.value = 'enabling'
          if (options.configureTaskAgent) {
            targetAgent = await ensureTaskAgent(baseAgent, matches)
            selectedAgentId.value = targetAgent.id
            await router.replace({ path: '/chat', query: { agentId: String(targetAgent.id) } })
          } else {
            const { data: consentResult } = await chatApi.confirmSkills({
              requestId: matchResult.requestId,
              skillIds: matches.map((skill) => skill.id),
            })
            temporarySkillIds = Array.isArray(consentResult?.skillIds) ? consentResult.skillIds : undefined
            skillConsentToken = typeof consentResult?.token === 'string' ? consentResult.token : undefined
          }
        }
      }
    } catch (error: any) {
      if (options.configureTaskAgent) throw error
      ElMessage.warning(error?.response?.data?.message || '能力匹配暂不可用，已使用当前能力继续')
      temporarySkillIds = undefined
      skillConsentToken = undefined
    }

    const agentId = targetAgent.id
    ensureConversationLoaded(agentId)
    const history = buildConversationPayload(conversations[agentId])
    conversations[agentId].push(createMessage('user', text))
    persistConversation(agentId)
    activity.value = 'generating'
    const { data } = await chatApi.sendMessage({
      agentId,
      message: text,
      conversationId: localStorage.getItem(conversationIdKey(agentId)) || undefined,
      messages: history,
      temporarySkillIds,
      skillConsentToken,
    })
    const result = extractChatResult(data)
    if (result.conversationId) localStorage.setItem(conversationIdKey(agentId), result.conversationId)
    conversations[agentId].push(createMessage('assistant', result.final, result.steps))
    persistConversation(agentId)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '发送失败，请稍后重试')
  } finally {
    activity.value = 'idle'
    sending.value = false
  }
}

async function checkWebSearchSetup(matches: MatchedSkill[]): Promise<boolean> {
  if (!matches.some((skill) => skill.capabilities.includes('联网搜索'))) return false
  try {
    const { data } = await toolSettingsApi.getWebSearch()
    return data?.configured !== true
  } catch {
    return true
  }
}

function preserveDraft(agentId: number, text: string) {
  drafts[agentId] = text
  localStorage.setItem(draftKey(agentId), text)
}

async function ensureTaskAgent(baseAgent: any, matches: MatchedSkill[]) {
  const skillIds = matches.map((skill) => skill.id).sort((left, right) => left - right)
  const storageKey = `chat:task-agent:${skillIds.join('-')}`
  const storedId = Number(localStorage.getItem(storageKey))
  let taskAgent = Number.isFinite(storedId)
    ? agents.value.find((agent) => agent.id === storedId) || null
    : null
  const baseModelId = baseAgent.modelId || baseAgent.model?.id

  if (!taskAgent && !baseModelId) {
    throw new Error('当前助手没有可继承的模型，请先配置模型')
  }

  let createdAgent: any = null
  try {
    if (!taskAgent) {
      const { data } = await agentApi.create({
        name: suggestTaskAgentName(matches),
        description: '根据任务目标自动组合能力，专注完成当前类型的工作。',
        systemPrompt: '先理解用户目标，再使用已启用的能力完成任务。信息不足时明确说明，不编造工具结果。',
      })
      createdAgent = data
      await agentApi.bindModel(createdAgent.id, baseModelId)
      await agentApi.bindSkills(createdAgent.id, skillIds)
      localStorage.setItem(storageKey, String(createdAgent.id))
      ElMessage.success('已创建专用任务助手')
    } else {
      const existingIds = (taskAgent.skills || [])
        .map((relation: any) => relation?.skill?.id || relation?.skillId)
        .filter((id: unknown): id is number => Number.isInteger(id))
      const mergedIds = [...new Set([...existingIds, ...skillIds])]
      if (mergedIds.length !== existingIds.length) {
        await agentApi.bindSkills(taskAgent.id, mergedIds)
      }
      if (!taskAgent.modelId && baseModelId) {
        await agentApi.bindModel(taskAgent.id, baseModelId)
      }
    }

    const targetId = taskAgent?.id || createdAgent.id
    const { data: refreshedAgent } = await agentApi.findOne(targetId)
    const index = agents.value.findIndex((agent) => agent.id === targetId)
    if (index >= 0) agents.value[index] = refreshedAgent
    else agents.value.push(refreshedAgent)
    return refreshedAgent
  } catch (error) {
    if (createdAgent?.id) {
      try {
        await agentApi.remove(createdAgent.id)
        localStorage.removeItem(storageKey)
      } catch {
        // Keep the original configuration error visible.
      }
    }
    throw error
  }
}

function suggestTaskAgentName(matches: MatchedSkill[]): string {
  const text = matches
    .flatMap((skill) => [skill.name, ...skill.capabilities])
    .join(' ')
    .toLowerCase()
  if (text.includes('联网搜索') || text.includes('网页阅读')) return '热点研究助手'
  if (text.includes('代码') || text.includes('编程')) return '编程任务助手'
  if (text.includes('写作') || text.includes('文案')) return '写作任务助手'
  if (text.includes('总结') || text.includes('摘要')) return '内容总结助手'
  if (text.includes('数据') || text.includes('计算')) return '数据任务助手'
  return '星曜任务助手'
}
</script>

<style scoped>
.chat-page { position: relative; display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow: hidden; }
.error-banner { flex-shrink: 0; }
.error-banner :deep(.el-alert) { border: 1px solid #f0d4d1; border-radius: 10px; background: #fff8f7; }
.chat-layout { display: grid; grid-template-columns: 276px minmax(0, 1fr); gap: 14px; flex: 1; min-height: 0; height: 100%; }
.chat-stage { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; overflow: hidden; border: 1px solid #e0e4eb; border-radius: 10px; background: #fff; box-shadow: 0 1px 3px rgba(31, 35, 60, .04); }
@media (max-width: 1180px) { .chat-layout { grid-template-columns: 248px minmax(0, 1fr); } }
@media (max-width: 960px) { .chat-page { height: auto; overflow: visible; } .chat-layout { grid-template-columns: 1fr; min-height: auto; height: auto; } .chat-stage { min-height: 640px; } }
@media (max-width: 620px) { .chat-stage { min-height: 580px; border-radius: 8px; } }
.consent-heading { display: flex; align-items: center; gap: 12px; }
.consent-icon { display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex: 0 0 auto; border-radius: 8px; color: #197354; background: #e8f4ef; font-size: 18px; }
.consent-heading h3 { margin: 0; color: #263443; font-size: 16px; font-weight: 700; }
.consent-heading p { margin: 4px 0 0; color: #8a96a3; font-size: 11px; }
.consent-list { border-top: 1px solid #e8ecef; }
.consent-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 15px 2px; border-bottom: 1px solid #e8ecef; }
.consent-item-main { min-width: 0; }
.consent-name-row { display: flex; align-items: center; gap: 8px; }
.consent-name-row strong { color: #344251; font-size: 13px; font-weight: 680; }
.risk-label { padding: 2px 6px; border-radius: 4px; color: #39765f; background: #eaf5f0; font-size: 9px; white-space: nowrap; }
.risk-label.medium { color: #8a641a; background: #fbf3df; }
.risk-label.high { color: #a5453f; background: #fcebea; }
.consent-item p { margin: 5px 0 0; color: #687585; font-size: 11px; line-height: 1.55; }
.consent-item small { display: block; margin-top: 4px; color: #9aa4ae; font-size: 9px; }
.consent-capabilities { display: flex; justify-content: flex-end; gap: 5px; flex-wrap: wrap; max-width: 170px; }
.consent-capabilities span { padding: 4px 6px; border: 1px solid #dfe6e9; border-radius: 5px; color: #657683; background: #f8faf9; font-size: 9px; white-space: nowrap; }
.consent-note { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; padding: 10px 11px; border-radius: 7px; color: #5d7169; background: #f0f7f4; font-size: 10px; line-height: 1.6; }
.consent-note .el-icon { margin-top: 2px; flex: 0 0 auto; color: #2f8163; }
.consent-note.warning { color: #87534d; background: #fff3f1; }
.consent-note.warning .el-icon { color: #bd554b; }
:deep(.skill-consent-dialog .el-dialog__body) { padding-top: 6px; }
@media (max-width: 620px) { .consent-item { flex-direction: column; gap: 9px; } .consent-capabilities { justify-content: flex-start; max-width: none; } }
</style>
