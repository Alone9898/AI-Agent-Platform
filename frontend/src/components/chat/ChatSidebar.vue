<template>
  <aside class="chat-sidebar">
    <header class="sidebar-header">
      <div>
        <h2>你的 Agent</h2>
        <p>选择一个目标开始工作</p>
      </div>
      <span class="agent-count">{{ props.agents.length }}</span>
    </header>

    <div class="sidebar-body" v-loading="props.loading">
      <template v-if="props.agents.length">
        <button v-for="agent in props.agents" :key="agent.id" type="button" class="agent-item" :class="{ active: agent.id === props.activeAgentId }" @click="emit('select', agent.id)">
          <span class="agent-avatar" :style="{ background: getAvatarColor(agent.id) }">{{ getAvatarChar(agent.name) }}</span>
          <span class="agent-content">
            <span class="agent-topline"><strong>{{ agent.name }}</strong><span v-if="agent.id === props.activeAgentId" class="active-label">当前</span></span>
            <span class="agent-desc">{{ agent.description || '暂无描述' }}</span>
            <span class="agent-meta">{{ getCapabilityCount(agent) }} 项能力<span aria-hidden="true">·</span>{{ getModelStatus(agent) }}</span>
          </span>
        </button>
      </template>
      <el-empty v-else-if="!props.loading" description="还没有 Agent" :image-size="84" />
    </div>

    <footer class="sidebar-footer">Agent 的能力来自已绑定的本地配置</footer>
  </aside>
</template>

<script setup lang="ts">
const props = defineProps<{ agents: any[]; activeAgentId: number | null; loading?: boolean }>()
const emit = defineEmits<{ (event: 'select', agentId: number): void }>()
const COLORS = ['#5f6f8f', '#7c6bb2', '#387d79', '#a76a4f', '#4c7898', '#756b55']
function getAvatarColor(id: number): string { return COLORS[Math.abs(Number(id) || 0) % COLORS.length] }
function getAvatarChar(name: string): string { const value = name?.trim() || ''; return value.charAt(value.length - 1) || '?' }
function getCapabilityCount(agent: any): number { return Array.isArray(agent?.skills) ? agent.skills.length : 0 }
function getModelStatus(agent: any): string { return agent?.model?.name || agent?.model?.modelName ? '已准备' : '待配置' }
</script>

<style scoped>
.chat-sidebar { display: flex; flex-direction: column; min-height: 0; overflow: hidden; border: 1px solid #e0e4eb; border-radius: 10px; color: #293448; background: #fff; }
.sidebar-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 18px 16px 15px; border-bottom: 1px solid #edf0f3; }
.sidebar-header h2 { margin: 0; color: #2c374a; font-size: 16px; font-weight: 700; }
.sidebar-header p { margin: 4px 0 0; color: #919aa7; font-size: 10px; }
.agent-count { display: inline-flex; align-items: center; justify-content: center; min-width: 27px; height: 27px; padding: 0 8px; border-radius: 7px; color: #60718a; font-size: 11px; font-weight: 700; background: #edf1f5; }
.sidebar-body { flex: 1; min-height: 0; padding: 9px; overflow-y: auto; }
.agent-item { width: 100%; display: flex; align-items: flex-start; gap: 10px; padding: 11px; border: 1px solid transparent; border-radius: 8px; color: inherit; text-align: left; background: transparent; cursor: pointer; }
.agent-item + .agent-item { margin-top: 3px; }
.agent-item:hover { border-color: #e3e8ee; background: #fafbfd; }
.agent-item.active { border-color: #d7e0e8; background: #f2f6f9; box-shadow: inset 3px 0 0 #617991; }
.agent-avatar { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex: 0 0 auto; border-radius: 8px; color: #fff; font-size: 15px; font-weight: 700; }
.agent-content { min-width: 0; flex: 1; padding-top: 1px; }
.agent-topline { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.agent-topline strong { overflow: hidden; color: #344054; font-size: 12px; font-weight: 680; text-overflow: ellipsis; white-space: nowrap; }
.active-label { color: #607991; font-size: 9px; }
.agent-desc { display: block; margin-top: 4px; overflow: hidden; color: #8d97a4; font-size: 10px; line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.agent-meta { display: flex; gap: 6px; margin-top: 6px; color: #a0a9b5; font-size: 9px; }
.sidebar-footer { padding: 11px 15px 13px; border-top: 1px solid #edf0f3; color: #9da6b2; font-size: 9px; }
.sidebar-body::-webkit-scrollbar { width: 6px; }
.sidebar-body::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: rgba(95,112,136,.3); background-clip: padding-box; }
@media (max-width: 960px) { .chat-sidebar { min-height: 220px; max-height: 260px; } }
</style>
