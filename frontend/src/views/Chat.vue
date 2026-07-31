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
          :loading="agentsLoading"
          :sending="sending"
        />

        <ChatInput
          v-model="activeDraft"
          :disabled="!activeAgent"
          :sending="sending"
          :placeholder="activeAgent ? `给 ${activeAgent.name} 发送消息` : '请先选择一个智能体'"
          @send="handleSend"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ChatSidebar from '@/components/chat/ChatSidebar.vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import { agentApi, chatApi } from '@/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  steps?: RuntimeStep[]
}

interface RuntimeStep {
  type: 'memory' | 'llm' | 'tool'
  name: string
  status: 'completed' | 'failed'
  durationMs: number
  input?: unknown
  output?: unknown
  error?: string
}

const agents = ref<any[]>([])
const agentsLoading = ref(false)
const selectedAgentId = ref<number | null>(null)
const sending = ref(false)
const loadError = ref('')

const conversations = reactive<Record<number, ChatMessage[]>>({})
const drafts = reactive<Record<number, string>>({})

const ACTIVE_AGENT_KEY = 'chat:active-agent-id'
const conversationKey = (agentId: number) => `chat:messages:${agentId}`
const conversationIdKey = (agentId: number) => `chat:conversation-id:${agentId}`
const draftKey = (agentId: number) => `chat:draft:${agentId}`

const activeAgent = computed(() =>
  agents.value.find((agent) => agent.id === selectedAgentId.value) || null,
)

const activeMessages = computed(() =>
  selectedAgentId.value ? conversations[selectedAgentId.value] || [] : [],
)

const activeDraft = computed({
  get: () => {
    if (!selectedAgentId.value) return ''
    if (!(selectedAgentId.value in drafts)) {
      drafts[selectedAgentId.value] = loadDraft(selectedAgentId.value)
    }
    return drafts[selectedAgentId.value] || ''
  },
  set: (value: string) => {
    if (!selectedAgentId.value) return
    drafts[selectedAgentId.value] = value
    localStorage.setItem(draftKey(selectedAgentId.value), value)
  },
})

onMounted(async () => {
  await loadAgents()
})

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
    agents.value = data
    syncSelectedAgent()
  } catch (error: any) {
    loadError.value = '加载智能体列表失败，请稍后重试。'
    ElMessage.error(error?.response?.data?.message || '加载智能体列表失败')
  } finally {
    agentsLoading.value = false
  }
}

function syncSelectedAgent() {
  if (agents.value.length === 0) {
    selectedAgentId.value = null
    return
  }

  const savedId = Number(localStorage.getItem(ACTIVE_AGENT_KEY))
  const savedExists = Number.isFinite(savedId) && agents.value.some((agent) => agent.id === savedId)

  if (savedExists) {
    selectedAgentId.value = savedId
    return
  }

  selectedAgentId.value = agents.value[0].id
}

function selectAgent(agentId: number) {
  selectedAgentId.value = agentId
}

function ensureConversationLoaded(agentId: number) {
  if (conversations[agentId]) return
  conversations[agentId] = loadConversation(agentId)
}

function ensureDraftLoaded(agentId: number) {
  if (agentId in drafts) return
  drafts[agentId] = loadDraft(agentId)
}

function loadConversation(agentId: number): ChatMessage[] {
  try {
    const raw = localStorage.getItem(conversationKey(agentId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidMessage)
  } catch {
    return []
  }
}

function loadDraft(agentId: number): string {
  return localStorage.getItem(draftKey(agentId)) || ''
}

function persistConversation(agentId: number) {
  localStorage.setItem(conversationKey(agentId), JSON.stringify(conversations[agentId] || []))
}

function isValidMessage(value: any): value is ChatMessage {
  return (
    value &&
    typeof value === 'object' &&
    (value.role === 'user' || value.role === 'assistant') &&
    typeof value.content === 'string' &&
    typeof value.id === 'string'
  )
}

function createMessage(
  role: 'user' | 'assistant',
  content: string,
  steps: RuntimeStep[] = [],
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    createdAt: Date.now(),
    ...(steps.length ? { steps } : {}),
  }
}

function buildConversationPayload(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

function extractChatResult(data: any): {
  final: string
  steps: RuntimeStep[]
  conversationId?: string
} {
  const candidates = [
    data?.final,
    data?.reply,
    data?.content,
    data?.message,
    data?.data?.reply,
    data?.data?.content,
    data?.data?.message,
    data?.data?.result,
    data?.assistant?.content,
    data?.choices?.[0]?.message?.content,
    data?.output?.content,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return {
        final: candidate.trim(),
        steps: Array.isArray(data?.steps) ? data.steps : [],
        conversationId:
          typeof data?.conversationId === 'string' ? data.conversationId : undefined,
      }
    }
  }

  if (typeof data === 'string' && data.trim()) {
    return { final: data.trim(), steps: [] }
  }

  throw new Error('聊天接口没有返回有效的助手消息。')
}

async function handleSend(text: string) {
  if (!activeAgent.value || sending.value) return

  const agentId = activeAgent.value.id
  ensureConversationLoaded(agentId)
  const history = buildConversationPayload(conversations[agentId])

  const userMessage = createMessage('user', text)
  conversations[agentId].push(userMessage)
  persistConversation(agentId)

  sending.value = true
  try {
    const payload = {
      agentId,
      message: text,
      conversationId: localStorage.getItem(conversationIdKey(agentId)) || undefined,
      messages: history,
    }

    const { data } = await chatApi.sendMessage(payload)
    const result = extractChatResult(data)
    if (result.conversationId) {
      localStorage.setItem(conversationIdKey(agentId), result.conversationId)
    }
    conversations[agentId].push(createMessage('assistant', result.final, result.steps))
    persistConversation(agentId)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '发送失败')
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.chat-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.error-banner {
  flex-shrink: 0;
}

.error-banner :deep(.el-alert) {
  border: 1px solid #f6d5d2;
  border-radius: 12px;
  background: #fff7f6;
}

.chat-layout {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  gap: 14px;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.chat-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgba(224, 226, 235, 0.9);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 3px rgba(31, 35, 60, 0.05);
}

@media (max-width: 1180px) {
  .chat-layout {
    grid-template-columns: 258px minmax(0, 1fr);
  }
}

@media (max-width: 960px) {
  .chat-page {
    height: auto;
    overflow: visible;
  }

  .chat-layout {
    grid-template-columns: 1fr;
    min-height: auto;
    height: auto;
  }

  .chat-stage {
    min-height: 640px;
  }
}

@media (max-width: 620px) {
  .chat-stage {
    min-height: 580px;
    border-radius: 10px;
  }
}
</style>
