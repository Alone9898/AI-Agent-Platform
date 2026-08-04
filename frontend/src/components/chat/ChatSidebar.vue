<template>
  <aside class="chat-sidebar">
    <header class="sidebar-header">
      <div>
        <h2>对话</h2>
        <p>继续任务或开始新的工作</p>
      </div>
      <el-tooltip content="新对话" placement="bottom">
        <el-button
          class="new-chat-button"
          circle
          plain
          aria-label="新对话"
          :disabled="!props.activeAgentId"
          @click="emit('new-conversation')"
        >
          <el-icon><EditPen /></el-icon>
        </el-button>
      </el-tooltip>
    </header>

    <div class="agent-picker">
      <label for="chat-agent-select">当前助手</label>
      <el-select
        id="chat-agent-select"
        :model-value="props.activeAgentId"
        placeholder="选择助手"
        :disabled="props.loading || !props.agents.length"
        @change="emit('select-agent', Number($event))"
      >
        <el-option
          v-for="agent in props.agents"
          :key="agent.id"
          :label="agent.name"
          :value="agent.id"
        >
          <span class="agent-option">
            <span>{{ agent.name }}</span>
            <small>{{ getCapabilityCount(agent) }} 项能力</small>
          </span>
        </el-option>
      </el-select>
    </div>

    <div class="conversation-search">
      <el-input v-model="keyword" clearable placeholder="搜索历史对话">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <div class="conversation-body" v-loading="props.loading || props.conversationsLoading">
      <div v-if="props.conversations.length" class="conversation-list">
        <div
          v-for="conversation in props.conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === props.activeConversationId }"
        >
          <button type="button" class="conversation-main" @click="emit('select-conversation', conversation.id)">
            <span class="conversation-title">{{ conversation.title || '未命名对话' }}</span>
            <span class="conversation-meta">
              {{ conversation.agent?.name || '未知助手' }} · {{ formatRelativeTime(conversation.updatedAt) }}
            </span>
          </button>
          <el-dropdown trigger="click" @command="handleCommand($event, conversation)">
            <button type="button" class="conversation-menu" aria-label="会话操作" @click.stop>
              <el-icon><MoreFilled /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="remove" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div v-else-if="!props.loading && !props.conversationsLoading" class="conversation-empty">
        <el-icon><ChatLineSquare /></el-icon>
        <strong>{{ keyword ? '没有匹配的对话' : '还没有历史对话' }}</strong>
        <span>{{ keyword ? '换个关键词试试' : '发送第一条消息后会自动保存' }}</span>
      </div>
    </div>

    <footer class="sidebar-footer">历史记录仅保存在当前设备</footer>
  </aside>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { ChatLineSquare, EditPen, MoreFilled, Search } from '@element-plus/icons-vue'

interface ConversationSummary {
  id: string
  title: string
  agentId: number
  updatedAt: string
  agent?: { id: number; name: string }
}

const props = defineProps<{
  agents: any[]
  activeAgentId: number | null
  conversations: ConversationSummary[]
  activeConversationId: string | null
  loading?: boolean
  conversationsLoading?: boolean
}>()

const emit = defineEmits<{
  (event: 'select-agent', agentId: number): void
  (event: 'new-conversation'): void
  (event: 'select-conversation', conversationId: string): void
  (event: 'rename', conversation: ConversationSummary): void
  (event: 'remove', conversation: ConversationSummary): void
  (event: 'search', keyword: string): void
}>()

const keyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(keyword, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', value.trim()), 250)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

function handleCommand(command: string, conversation: ConversationSummary) {
  if (command === 'rename') emit('rename', conversation)
  if (command === 'remove') emit('remove', conversation)
}

function getCapabilityCount(agent: any): number {
  return Array.isArray(agent?.skills) ? agent.skills.length : 0
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return '刚刚'
  const elapsed = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(elapsed / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(timestamp)
}
</script>

<style scoped>
.chat-sidebar { display: flex; flex-direction: column; min-height: 0; overflow: hidden; border: 1px solid #e0e4eb; border-radius: 10px; color: #293448; background: #fff; }
.sidebar-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 17px 15px 13px; }
.sidebar-header h2 { margin: 0; color: #2c374a; font-size: 16px; font-weight: 700; }
.sidebar-header p { margin: 4px 0 0; color: #919aa7; font-size: 10px; }
.new-chat-button { width: 30px; height: 30px; border-color: #dce2e7; color: #61748b; }
.agent-picker { padding: 0 14px 12px; border-bottom: 1px solid #edf0f3; }
.agent-picker label { display: block; margin-bottom: 6px; color: #8c96a2; font-size: 9px; font-weight: 650; }
.agent-picker :deep(.el-select) { width: 100%; }
.agent-picker :deep(.el-select__wrapper) { min-height: 34px; border-radius: 7px; box-shadow: 0 0 0 1px #e1e5ea inset; }
.agent-option { display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; }
.agent-option small { color: #a0a8b1; }
.conversation-search { padding: 12px 12px 8px; }
.conversation-search :deep(.el-input__wrapper) { border-radius: 7px; background: #f7f8fa; box-shadow: none; }
.conversation-search :deep(.el-input__inner) { font-size: 11px; }
.conversation-body { flex: 1; min-height: 0; padding: 0 8px 9px; overflow-y: auto; }
.conversation-list { display: flex; flex-direction: column; gap: 2px; }
.conversation-item { position: relative; display: flex; align-items: center; min-width: 0; border: 1px solid transparent; border-radius: 7px; }
.conversation-item:hover { border-color: #e6eaee; background: #fafbfd; }
.conversation-item.active { border-color: #dbe3e8; background: #f2f6f8; box-shadow: inset 3px 0 0 #617991; }
.conversation-main { min-width: 0; flex: 1; padding: 10px 30px 10px 11px; border: 0; color: inherit; text-align: left; background: transparent; cursor: pointer; }
.conversation-title { display: block; overflow: hidden; color: #3a4655; font-size: 11px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.conversation-meta { display: block; margin-top: 4px; overflow: hidden; color: #9aa3ad; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.conversation-menu { position: absolute; top: 50%; right: 6px; display: none; align-items: center; justify-content: center; width: 25px; height: 25px; padding: 0; border: 0; border-radius: 5px; color: #7e8995; background: transparent; transform: translateY(-50%); cursor: pointer; }
.conversation-item:hover .conversation-menu, .conversation-item.active .conversation-menu { display: inline-flex; }
.conversation-menu:hover { background: #e7ebef; }
.conversation-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; padding: 24px; color: #9aa4ae; text-align: center; }
.conversation-empty .el-icon { margin-bottom: 10px; font-size: 22px; }
.conversation-empty strong { color: #6d7884; font-size: 11px; font-weight: 650; }
.conversation-empty span { margin-top: 5px; font-size: 9px; }
.sidebar-footer { padding: 10px 14px 12px; border-top: 1px solid #edf0f3; color: #9da6b2; font-size: 9px; }
.conversation-body::-webkit-scrollbar { width: 6px; }
.conversation-body::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: rgba(95,112,136,.3); background-clip: padding-box; }
@media (max-width: 960px) { .chat-sidebar { min-height: 280px; max-height: 330px; } }
</style>
