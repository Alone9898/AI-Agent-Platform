<template>
  <div class="chat-page">
    <div v-if="loadError" class="error-banner">
      <el-alert :title="loadError" type="error" :closable="false" show-icon />
    </div>

    <div class="chat-layout">
      <ChatSidebar
        :agents="agents"
        :active-agent-id="selectedAgentId"
        :conversations="conversationItems"
        :active-conversation-id="activeConversationId"
        :loading="agentsLoading"
        :conversations-loading="conversationListLoading"
        @select-agent="selectAgent"
        @new-conversation="requestNewConversation"
        @select-conversation="openConversation"
        @rename="renameConversation"
        @remove="removeConversation"
        @search="searchConversations"
      />

      <section
        class="chat-stage"
        :class="{ 'is-file-dragging': stageDragActive }"
        @dragenter.prevent="handleStageDragEnter"
        @dragover.prevent="handleStageDragOver"
        @dragleave.prevent="handleStageDragLeave"
        @drop.prevent="handleStageDrop"
      >
        <ChatWindow
          :agent="activeAgent"
          :messages="activeMessages"
          :starter-prompts="activeStarterPrompts"
          :loading="agentsLoading || conversationLoading"
          :sending="sending"
          :activity-label="activityLabel"
          @starter="useStarterPrompt"
        />

        <ChatInput
          ref="chatInputRef"
          v-model="activeDraft"
          v-model:attachments="pendingAttachments"
          :disabled="!activeAgent"
          :sending="sending"
          :placeholder="activeAgent ? `和 ${activeAgent.name} 说点什么` : '请先选择一个 Agent'"
          @send="handleSend"
        />

        <div v-if="stageDragActive" class="stage-drop-hint" aria-hidden="true">
          <el-icon><UploadFilled /></el-icon>
          <strong>拖到这里交给当前 Agent</strong>
          <span>文件会在本机解析后随本次消息发送</span>
        </div>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Lock, UploadFilled, WarningFilled } from '@element-plus/icons-vue'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { agentApi, chatApi, toolSettingsApi } from '@/api'
import { findLocalAgentPreset } from '@/presets/agent-presets'
import type { ChatAttachment, ChatAttachmentMetadata } from '@/types/chat-attachment'

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
  attachments?: ChatAttachmentMetadata[]
}

interface ConversationSummary {
  id: string
  title: string
  agentId: number
  preview: string
  messageCount: number
  createdAt: string
  updatedAt: string
  agent: { id: number; name: string; description?: string | null }
}

const route = useRoute()
const router = useRouter()
const agents = ref<any[]>([])
const agentsLoading = ref(false)
const conversationLoading = ref(false)
const conversationListLoading = ref(false)
const selectedAgentId = ref<number | null>(null)
const activeConversationId = ref<string | null>(null)
const activeMessages = ref<ChatMessage[]>([])
const conversationItems = ref<ConversationSummary[]>([])
const conversationKeyword = ref('')
const sending = ref(false)
const activity = ref<'idle' | 'matching' | 'awaiting-consent' | 'enabling' | 'generating'>('idle')
const loadError = ref('')
const consentDialogVisible = ref(false)
const pendingConsent = ref<PendingConsent | null>(null)
const pendingAttachments = ref<ChatAttachment[]>([])
const chatInputRef = ref<InstanceType<typeof ChatInput> | null>(null)
const stageDragActive = ref(false)
const drafts = reactive<Record<number, string>>({})

const ACTIVE_AGENT_KEY = 'chat:active-agent-id'
const draftKey = (agentId: number) => `chat:draft:${agentId}`

const activeAgent = computed(() => agents.value.find((agent) => agent.id === selectedAgentId.value) || null)
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
  return findLocalAgentPreset(activeAgent.value)?.starterPrompts || []
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
  ensureDraftLoaded(agentId)
})

async function loadAgents() {
  agentsLoading.value = true
  loadError.value = ''
  try {
    const { data } = await agentApi.findAll()
    agents.value = Array.isArray(data) ? data : []
    syncSelectedAgent()
    try {
      await loadConversationList()
    } catch {
      ElMessage.warning('历史对话暂时无法加载，仍可开始新对话')
    }
    if (typeof route.query.send === 'string') await consumeRoutedDemand()
    else await restoreInitialConversation()
  } catch (error: any) {
    loadError.value = '加载 Agent 列表失败，请稍后重试。'
    ElMessage.error(error?.response?.data?.message || loadError.value)
  } finally {
    agentsLoading.value = false
  }
}

async function consumeRoutedDemand() {
  if (typeof route.query.send !== 'string' || !selectedAgentId.value) return
  const agentId = selectedAgentId.value
  const configureTaskAgent = route.query.configure === '1'
  ensureDraftLoaded(agentId)
  const prompt = (drafts[agentId] || '').trim()

  drafts[agentId] = ''
  localStorage.removeItem(draftKey(agentId))
  await startNewConversation(agentId, false)
  await router.replace({ path: '/chat', query: { agentId: String(agentId) } })

  if (prompt) await handleSend(prompt, { configureTaskAgent })
}

async function restoreInitialConversation() {
  const routeConversationId = typeof route.query.conversationId === 'string'
    ? route.query.conversationId
    : ''
  if (routeConversationId) {
    await openConversation(routeConversationId, false)
    return
  }
  const latest = conversationItems.value.find(
    (conversation) => conversation.agentId === selectedAgentId.value,
  )
  if (latest) await openConversation(latest.id, false)
  else await startNewConversation(selectedAgentId.value, false)
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

async function selectAgent(agentId: number) {
  if (sending.value || agentId === selectedAgentId.value) return
  pendingAttachments.value = []
  selectedAgentId.value = agentId
  const latest = conversationItems.value.find((conversation) => conversation.agentId === agentId)
  if (latest) await openConversation(latest.id)
  else await startNewConversation(agentId)
}

function useStarterPrompt(prompt: string) { activeDraft.value = prompt }
function requestNewConversation() {
  if (!sending.value) void startNewConversation()
}

async function loadConversationList() {
  conversationListLoading.value = true
  try {
    const { data } = await chatApi.findConversations({
      limit: 100,
      ...(conversationKeyword.value ? { keyword: conversationKeyword.value } : {}),
    })
    conversationItems.value = Array.isArray(data) ? data : []
  } finally {
    conversationListLoading.value = false
  }
}

async function searchConversations(keyword: string) {
  conversationKeyword.value = keyword
  try {
    await loadConversationList()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '搜索对话失败')
  }
}

async function openConversation(conversationId: string, updateRoute = true) {
  if (!conversationId || sending.value) return
  pendingAttachments.value = []
  conversationLoading.value = true
  try {
    const { data } = await chatApi.findConversation(conversationId)
    selectedAgentId.value = Number(data.agentId)
    activeConversationId.value = data.id
    activeMessages.value = Array.isArray(data.messages)
      ? data.messages.map(mapStoredMessage).filter((message: ChatMessage | null): message is ChatMessage => Boolean(message))
      : []
    if (updateRoute) await syncChatRoute()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '加载对话失败')
    await startNewConversation(selectedAgentId.value, updateRoute)
  } finally {
    conversationLoading.value = false
  }
}

async function startNewConversation(agentId = selectedAgentId.value, updateRoute = true) {
  if (!agentId) return
  pendingAttachments.value = []
  selectedAgentId.value = agentId
  activeConversationId.value = null
  activeMessages.value = []
  if (updateRoute) await syncChatRoute()
}

async function syncChatRoute() {
  if (!selectedAgentId.value) return
  await router.replace({
    path: '/chat',
    query: {
      agentId: String(selectedAgentId.value),
      ...(activeConversationId.value ? { conversationId: activeConversationId.value } : {}),
    },
  })
}

async function renameConversation(conversation: Pick<ConversationSummary, 'id' | 'title'>) {
  try {
    const { value } = await ElMessageBox.prompt('输入新的会话名称', '重命名会话', {
      inputValue: conversation.title,
      inputPlaceholder: '会话名称',
      inputValidator: (input) => {
        const title = input.trim()
        if (!title) return '会话名称不能为空'
        if (title.length > 80) return '会话名称不能超过 80 个字符'
        return true
      },
      confirmButtonText: '保存',
      cancelButtonText: '取消',
    })
    await chatApi.renameConversation(conversation.id, value.trim())
    await loadConversationList()
    ElMessage.success('会话已重命名')
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error?.response?.data?.message || '重命名失败')
  }
}

async function removeConversation(conversation: Pick<ConversationSummary, 'id' | 'title' | 'agentId'>) {
  try {
    await ElMessageBox.confirm(`删除“${conversation.title}”？该操作无法撤销。`, '删除会话', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await chatApi.removeConversation(conversation.id)
    if (activeConversationId.value === conversation.id) {
      await startNewConversation(conversation.agentId)
    }
    await loadConversationList()
    ElMessage.success('会话已删除')
  } catch (error: any) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error?.response?.data?.message || '删除失败')
  }
}

function ensureDraftLoaded(agentId: number) {
  if (!(agentId in drafts)) drafts[agentId] = loadDraft(agentId)
}

function loadDraft(agentId: number): string { return localStorage.getItem(draftKey(agentId)) || '' }

function mapStoredMessage(value: any): ChatMessage | null {
  if (!value || (value.role !== 'user' && value.role !== 'assistant') || typeof value.content !== 'string') {
    return null
  }
  const timestamp = new Date(value.createdAt).getTime()
  return {
    id: String(value.id),
    role: value.role,
    content: value.content,
    createdAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
    ...(Array.isArray(value.steps) && value.steps.length ? { steps: value.steps } : {}),
    ...(Array.isArray(value.attachments) && value.attachments.length
      ? { attachments: value.attachments.map(mapAttachmentMetadata).filter(Boolean) as ChatAttachmentMetadata[] }
      : {}),
  }
}

function createMessage(
  role: 'user' | 'assistant',
  content: string,
  steps: RuntimeStep[] = [],
  attachments: ChatAttachmentMetadata[] = [],
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    createdAt: Date.now(),
    ...(steps.length ? { steps } : {}),
    ...(attachments.length ? { attachments } : {}),
  }
}

function mapAttachmentMetadata(value: any): ChatAttachmentMetadata | null {
  if (!value || typeof value.name !== 'string' || typeof value.mimeType !== 'string') return null
  if (!Number.isFinite(value.size) || !Number.isFinite(value.characterCount)) return null
  return {
    name: value.name,
    mimeType: value.mimeType,
    size: value.size,
    characterCount: value.characterCount,
    truncated: value.truncated === true,
  }
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
  const attachments = pendingAttachments.value.map((attachment) => ({ ...attachment }))
  const attachmentMetadata: ChatAttachmentMetadata[] = attachments.map(({ id: _id, content: _content, ...metadata }) => metadata)
  let targetAgent = baseAgent
  let optimisticMessage: ChatMessage | null = null
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
            await startNewConversation(targetAgent.id)
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
            await startNewConversation(targetAgent.id)
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
    const history = buildConversationPayload(activeMessages.value)
    optimisticMessage = createMessage('user', text, [], attachmentMetadata)
    activeMessages.value.push(optimisticMessage)
    activity.value = 'generating'
    const { data } = await chatApi.sendMessage({
      agentId,
      message: text,
      conversationId: activeConversationId.value || undefined,
      messages: history,
      temporarySkillIds,
      skillConsentToken,
      attachments: attachments.map(({ id: _id, ...attachment }) => attachment),
    })
    const result = extractChatResult(data)
    if (result.conversationId) activeConversationId.value = result.conversationId
    activeMessages.value.push(createMessage('assistant', result.final, result.steps))
    pendingAttachments.value = []
    await syncChatRoute()
    try {
      await loadConversationList()
    } catch {
      ElMessage.warning('回答已完成，但历史列表刷新失败')
    }
  } catch (error: any) {
    if (optimisticMessage) {
      activeMessages.value = activeMessages.value.filter((message) => message.id !== optimisticMessage?.id)
    }
    pendingAttachments.value = attachments
    activeDraft.value = text
    ElMessage.error(error?.response?.data?.message || error?.message || '发送失败，请稍后重试')
  } finally {
    activity.value = 'idle'
    sending.value = false
  }
}

function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function handleStageDragEnter(event: DragEvent) {
  if (activeAgent.value && !sending.value && hasDraggedFiles(event)) stageDragActive.value = true
}

function handleStageDragOver(event: DragEvent) {
  if (!activeAgent.value || sending.value || !hasDraggedFiles(event)) return
  stageDragActive.value = true
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function handleStageDragLeave(event: DragEvent) {
  const current = event.currentTarget as HTMLElement
  const related = event.relatedTarget as Node | null
  if (!related || !current.contains(related)) stageDragActive.value = false
}

function handleStageDrop(event: DragEvent) {
  stageDragActive.value = false
  if ((event.target as Element | null)?.closest('.chat-input')) return
  if (event.dataTransfer?.files.length) void chatInputRef.value?.addFiles(event.dataTransfer.files)
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
.stage-drop-hint { position: absolute; inset: 12px; z-index: 12; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 1px dashed #6f8d86; border-radius: 9px; color: #3d665f; background: rgba(247, 250, 249, .97); pointer-events: none; }
.stage-drop-hint .el-icon { margin-bottom: 4px; font-size: 28px; }
.stage-drop-hint strong { font-size: 14px; font-weight: 680; }
.stage-drop-hint span { color: #7b8d89; font-size: 10px; }
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
