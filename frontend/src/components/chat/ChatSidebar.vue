<template>
  <aside class="chat-sidebar">
    <div class="sidebar-header">
      <div>
        <h2 class="sidebar-title">智能体</h2>
        <p class="sidebar-subtitle">{{ props.agents.length }} 个可用</p>
      </div>
      <el-tag size="small" effect="plain">{{ props.agents.length }}</el-tag>
    </div>

    <div class="sidebar-body" v-loading="props.loading">
      <template v-if="props.agents.length > 0">
        <button
          v-for="agent in props.agents"
          :key="agent.id"
          type="button"
          class="agent-item"
          :class="{ active: agent.id === props.activeAgentId }"
          @click="emit('select', agent.id)"
        >
          <div class="avatar-wrap">
            <div class="agent-avatar" :style="{ background: getAvatarColor(agent.id) }">
              {{ getAvatarChar(agent.name) }}
            </div>
            <div class="status-dot" :class="{ online: agent.model?.name }"></div>
          </div>

          <div class="agent-content">
            <div class="agent-topline">
              <h3 class="agent-name">{{ agent.name }}</h3>
              <el-tag v-if="agent.id === props.activeAgentId" size="small" type="success" effect="light">
                当前
              </el-tag>
            </div>

            <p class="agent-desc">
              {{ agent.description || '暂无描述' }}
            </p>

            <div class="agent-meta">
              <span class="meta-item">
                {{ getModelLabel(agent) }}
              </span>
              <span class="meta-separator">·</span>
              <span class="meta-item">
                {{ getSkillCount(agent) }} 个技能
              </span>
            </div>
          </div>
        </button>
      </template>

      <el-empty
        v-else-if="!props.loading"
        description="未找到智能体"
        :image-size="96"
      />
    </div>
  </aside>
</template>

<script setup lang="ts">
const COLORS = [
  '#667eea', '#f56c6c', '#e6a23c', '#67c23a',
  '#409eff', '#9b59b6', '#1abc9c', '#e74c3c',
  '#3498db', '#2ecc71', '#f39c12', '#8e44ad',
]

const props = defineProps<{
  agents: any[]
  activeAgentId: number | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', agentId: number): void
}>()

function hashId(id: number): number {
  return ((id * 2654435761) >>> 0) % COLORS.length
}

function getAvatarColor(id: number): string {
  return COLORS[hashId(id)]
}

function getAvatarChar(name: string): string {
  if (!name) return '?'
  return name.charAt(name.length - 1)
}

function getModelLabel(agent: any): string {
  const modelName = agent?.model?.name || agent?.model?.modelName
  return modelName ? `模型：${modelName}` : '未绑定模型'
}

function getSkillCount(agent: any): number {
  return Array.isArray(agent?.skills) ? agent.skills.length : 0
}
</script>

<style scoped>
.chat-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, rgba(102, 126, 234, 0.12), transparent 30%),
    radial-gradient(circle at bottom right, rgba(118, 75, 162, 0.10), transparent 28%),
    rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.64);
  box-shadow: 0 18px 40px rgba(26, 31, 54, 0.08);
  color: #1f2a44;
  backdrop-filter: blur(16px);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 20px 18px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.sidebar-subtitle {
  font-size: 12px;
  color: #667085;
  margin-top: 4px;
}

.sidebar-body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  overflow-y: auto;
}

.agent-item {
  width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.56);
  color: inherit;
  text-align: left;
  display: flex;
  gap: 12px;
  padding: 14px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.agent-item + .agent-item {
  margin-top: 10px;
}

.agent-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.84);
  border-color: rgba(102, 126, 234, 0.22);
}

.agent-item.active {
  background:
    linear-gradient(135deg, rgba(102, 126, 234, 0.16) 0%, rgba(118, 75, 162, 0.12) 100%),
    rgba(255, 255, 255, 0.92);
  border-color: rgba(102, 126, 234, 0.34);
  box-shadow: 0 10px 24px rgba(102, 126, 234, 0.10);
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.agent-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  letter-spacing: 0;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #c0c4cc;
  border: 2px solid #fff;
  position: absolute;
  bottom: 2px;
  right: calc(50% - 30px);
}

.status-dot.online {
  background: #67c23a;
}

.agent-content {
  min-width: 0;
  flex: 1;
}

.agent-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-name {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
  color: #1f2a44;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #667085;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #667085;
}

.meta-separator {
  color: rgba(102, 112, 133, 0.45);
}

:deep(.sidebar-body .el-loading-mask) {
  background: rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(4px);
}

:deep(.sidebar-body .el-empty__description p) {
  color: #667085;
}

.sidebar-body::-webkit-scrollbar {
  width: 8px;
}

.sidebar-body::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-body::-webkit-scrollbar-thumb {
  background: rgba(102, 126, 234, 0.28);
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.55);
}

.sidebar-body::-webkit-scrollbar-thumb:hover {
  background: rgba(102, 126, 234, 0.42);
}

@media (max-width: 960px) {
  .chat-sidebar {
    min-height: 320px;
  }
}
</style>
