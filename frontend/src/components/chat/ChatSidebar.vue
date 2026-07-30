<template>
  <aside class="chat-sidebar">
    <div class="sidebar-header">
      <div class="sidebar-heading">
        <span class="sidebar-eyebrow">AGENT DIRECTORY</span>
        <h2 class="sidebar-title">智能体</h2>
      </div>
      <span class="agent-count">{{ props.agents.length }}</span>
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
              <span v-if="agent.id === props.activeAgentId" class="active-label">
                <i></i> 当前
              </span>
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

    <div class="sidebar-footer">
      <span class="footer-dot"></span>
      <span>选择智能体开始协作</span>
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
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(224, 226, 235, 0.9);
  border-radius: 18px;
  background:
    radial-gradient(circle at 0 0, rgba(116, 102, 239, 0.09), transparent 32%),
    rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 45px rgba(31, 35, 60, 0.055);
  color: #23283b;
  backdrop-filter: blur(14px);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 20px 18px 17px;
  border-bottom: 1px solid #eff0f4;
}

.sidebar-heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-eyebrow {
  color: #9b9faf;
  font-size: 8px;
  font-weight: 650;
  letter-spacing: 1.35px;
}

.sidebar-title {
  margin: 0;
  color: #23283b;
  font-size: 17px;
  font-weight: 680;
  letter-spacing: -0.2px;
}

.agent-count {
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e6e3fb;
  border-radius: 9px;
  color: #6f61dc;
  font-size: 11px;
  font-weight: 700;
  background: #f3f1ff;
}

.sidebar-body {
  flex: 1;
  min-height: 0;
  padding: 10px;
  overflow-y: auto;
}

.agent-item {
  position: relative;
  width: 100%;
  display: flex;
  gap: 11px;
  padding: 12px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 13px;
  color: inherit;
  text-align: left;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.22s ease, background 0.22s ease, transform 0.22s ease;
}

.agent-item + .agent-item {
  margin-top: 4px;
}

.agent-item:hover {
  border-color: #eceaf8;
  background: #faf9ff;
  transform: translateX(2px);
}

.agent-item.active {
  border-color: rgba(120, 103, 238, 0.16);
  background: linear-gradient(110deg, rgba(116, 102, 239, 0.11), rgba(116, 102, 239, 0.035));
  box-shadow: inset 3px 0 0 #7e70ef;
}

.agent-item.active::after {
  position: absolute;
  width: 70px;
  height: 70px;
  right: -46px;
  top: -42px;
  border-radius: 50%;
  content: '';
  background: rgba(126, 112, 239, 0.09);
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 1px;
}

.agent-avatar {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 13px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(35, 39, 64, 0.13);
  letter-spacing: 0;
}

.status-dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #c4c7d1;
  box-shadow: 0 2px 5px rgba(32, 36, 58, 0.12);
}

.status-dot.online {
  background: #4fcc98;
}

.agent-content {
  min-width: 0;
  flex: 1;
  padding-top: 1px;
}

.agent-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-name {
  margin: 0;
  color: #303548;
  font-size: 12px;
  font-weight: 680;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #7466e6;
  font-size: 9px;
  font-weight: 650;
}

.active-label i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7466e6;
  box-shadow: 0 0 0 3px rgba(116, 102, 230, 0.09);
}

.agent-desc {
  min-height: 17px;
  margin-top: 3px;
  color: #8b90a1;
  font-size: 10px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.agent-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  overflow: hidden;
  color: #999dad;
  font-size: 9px;
  white-space: nowrap;
}

.meta-item {
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-separator {
  flex-shrink: 0;
  color: #c1c4cf;
}

.sidebar-footer {
  padding: 12px 17px 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-top: 1px solid #eff0f4;
  color: #a1a5b4;
  font-size: 9px;
  letter-spacing: 0.2px;
}

.footer-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #7c6eed;
  box-shadow: 0 0 0 4px rgba(124, 110, 237, 0.08);
}

:deep(.sidebar-body .el-loading-mask) {
  background: rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(4px);
}

:deep(.sidebar-body .el-empty__description p) {
  color: #999dad;
  font-size: 11px;
}

.sidebar-body::-webkit-scrollbar {
  width: 6px;
}

.sidebar-body::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-body::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(116, 102, 239, 0.3);
  background-clip: padding-box;
}

.sidebar-body::-webkit-scrollbar-thumb:hover {
  background: rgba(116, 102, 239, 0.45);
  background-clip: padding-box;
}

@media (max-width: 960px) {
  .chat-sidebar {
    min-height: 240px;
    max-height: 280px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-item {
    transition: none;
  }
}
</style>
