<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">我的团队</h2>
        <span class="page-desc">管理你的 AI 成员，为每个成员配置模型与技能</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="showDialog()" class="add-btn" round>
        招募新成员
      </el-button>
    </div>

    <!-- 卡片网格 -->
    <div v-loading="agentStore.loading" class="agent-grid">
      <!-- 每个 Agent 一张名片 -->
      <div v-for="agent in agentStore.agents" :key="agent.id" class="agent-card">
        <!-- 卡片顶部彩带 -->
        <div class="card-banner" :style="{ background: getBannerColor(agent.id) }"></div>

        <!-- 头像 -->
        <div class="avatar-wrap">
          <div class="avatar" :style="{ background: getAvatarColor(agent.id) }">
            {{ getAvatarChar(agent.name) }}
          </div>
          <div class="status-dot" :class="{ online: agent.model?.name }"></div>
        </div>

        <!-- 名字 & 描述 -->
        <div class="card-info">
          <h3 class="agent-name">{{ agent.name }}</h3>
          <p class="agent-bio">{{ agent.description || '这个人很懒，什么都没写~' }}</p>
        </div>

        <!-- 能力标签 -->
        <div class="card-skills">
          <div class="skill-row" v-if="agent.model?.name">
            <el-icon :size="13"><Cpu /></el-icon>
            <el-tag size="small" type="success" effect="plain" round>{{ agent.model.name }}</el-tag>
          </div>
          <div class="skill-row" v-if="agent.skills?.length">
            <el-icon :size="13"><MagicStick /></el-icon>
            <el-tag
              v-for="s in agent.skills"
              :key="s.skill.id"
              size="small"
              effect="plain"
              round
              class="skill-tag"
            >{{ s.skill.name }}</el-tag>
          </div>
          <div class="skill-row empty-hint" v-if="!agent.model?.name && !agent.skills?.length">
            <span>还没有任何能力，快去绑定吧</span>
          </div>
        </div>

        <!-- 系统提示词预览 -->
        <div class="card-prompt" v-if="agent.systemPrompt">
          <el-icon :size="12"><ChatLineSquare /></el-icon>
          <span class="prompt-text">{{ agent.systemPrompt }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="card-actions">
          <el-button text size="small" @click="showBindDialog(agent)" class="action-btn">
            <el-icon><Link /></el-icon> 绑定
          </el-button>
          <el-button text size="small" @click="showDialog(agent)" class="action-btn">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-popconfirm title="确定要移除这位成员吗？" @confirm="handleDelete(agent.id)">
            <template #reference>
              <el-button text size="small" class="action-btn danger-btn">
                <el-icon><Delete /></el-icon> 移除
              </el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>

      <!-- 新增卡片 -->
      <div class="agent-card add-card" @click="showDialog()">
        <div class="add-card-inner">
          <el-icon :size="36" color="#c0c4cc"><Plus /></el-icon>
          <span class="add-text">招募新成员</span>
        </div>
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑成员' : '招募新成员'" width="500px" destroy-on-close>
      <el-form :model="form" label-width="90px" class="dialog-form">
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="给 TA 起个名字吧，比如「小王」" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="简单介绍一下 TA 的职责" />
        </el-form-item>
        <el-form-item label="系统提示词">
          <el-input v-model="form.systemPrompt" type="textarea" :rows="4" placeholder="告诉 TA 应该如何行动..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存' : '招募' }}</el-button>
      </template>
    </el-dialog>

    <!-- 绑定对话框 -->
    <el-dialog v-model="bindDialogVisible" title="配置能力" width="500px" destroy-on-close>
      <div class="bind-header">
        <div class="bind-avatar" :style="{ background: getAvatarColor(currentAgent?.id) }">
          {{ currentAgent ? getAvatarChar(currentAgent.name) : '' }}
        </div>
        <div class="bind-info">
          <h4>{{ currentAgent?.name }}</h4>
          <span>为 TA 配置模型和技能</span>
        </div>
      </div>
      <el-form label-width="80px" class="dialog-form" style="margin-top: 16px">
        <el-form-item label="大脑">
          <el-select v-model="bindForm.modelId" placeholder="选择一个模型作为 TA 的大脑" clearable style="width: 100%">
            <el-option v-for="m in modelStore.models" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="技能">
          <el-select v-model="bindForm.skillIds" multiple placeholder="选择 TA 掌握的技能" style="width: 100%">
            <el-option v-for="s in skillStore.skills" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBind">确认配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Link, Cpu, MagicStick, ChatLineSquare } from '@element-plus/icons-vue'
import { useAgentStore, useSkillStore, useModelStore } from '@/stores'

const agentStore = useAgentStore()
const skillStore = useSkillStore()
const modelStore = useModelStore()

const dialogVisible = ref(false)
const bindDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const currentAgent = ref<any>(null)

const form = ref({ name: '', description: '', systemPrompt: '' })
const bindForm = ref({ modelId: null as number | null, skillIds: [] as number[] })

// 根据 id 生成稳定的彩色值
const COLORS = [
  '#667eea', '#f56c6c', '#e6a23c', '#67c23a',
  '#409eff', '#9b59b6', '#1abc9c', '#e74c3c',
  '#3498db', '#2ecc71', '#f39c12', '#8e44ad',
]

function hashId(id: number): number {
  return ((id * 2654435761) >>> 0) % COLORS.length
}

function getAvatarColor(id: number): string {
  return COLORS[hashId(id)]
}

function getBannerColor(id: number): string {
  const c = COLORS[hashId(id)]
  return `${c}18`
}

function getAvatarChar(name: string): string {
  if (!name) return '?'
  // 取名字最后一个字作为头像字符，更有"昵称"感
  return name.charAt(name.length - 1)
}

onMounted(() => {
  agentStore.fetchAgents()
  skillStore.fetchSkills()
  modelStore.fetchModels()
})

function showDialog(row?: any) {
  isEdit.value = !!row
  editId.value = row?.id || 0
  form.value = row
    ? { name: row.name, description: row.description, systemPrompt: row.systemPrompt }
    : { name: '', description: '', systemPrompt: '' }
  dialogVisible.value = true
}

function showBindDialog(row: any) {
  currentAgent.value = row
  bindForm.value = {
    modelId: row.modelId || null,
    skillIds: row.skills?.map((s: any) => s.skill.id) || [],
  }
  bindDialogVisible.value = true
}

async function handleSave() {
  try {
    if (isEdit.value) {
      await agentStore.updateAgent(editId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await agentStore.createAgent(form.value)
      ElMessage.success('新成员加入成功！')
    }
    dialogVisible.value = false
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(id: number) {
  try {
    await agentStore.deleteAgent(id)
    ElMessage.success('已移除该成员')
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleBind() {
  try {
    const id = currentAgent.value.id
    await agentStore.bindModel(id, bindForm.value.modelId)
    await agentStore.bindSkills(id, bindForm.value.skillIds)
    ElMessage.success('配置成功')
    bindDialogVisible.value = false
    agentStore.fetchAgents()
  } catch {
    ElMessage.error('配置失败')
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1f36;
  margin: 0;
}

.page-desc {
  font-size: 13px;
  color: #8c8c8c;
}

.add-btn {
  font-weight: 500;
}

/* ========== 卡片网格 ========== */
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  min-height: 200px;
}

/* ========== 单张名片 ========== */
.agent-card {
  background: #fff;
  border: 1px solid #e5e7ed;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(31, 36, 61, 0.04);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  position: relative;
}

.agent-card:hover {
  border-color: #cfc9f5;
  box-shadow: 0 4px 12px rgba(31, 36, 61, 0.07);
}

/* 顶部彩带 */
.card-banner {
  height: 48px;
}

/* 头像 */
.avatar-wrap {
  display: flex;
  justify-content: center;
  margin-top: -24px;
  position: relative;
  z-index: 1;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  border: 3px solid #fff;
  box-shadow: 0 2px 5px rgba(31, 36, 61, 0.14);
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

/* 名字 & 简介 */
.card-info {
  text-align: center;
  padding: 10px 20px 0;
}

.agent-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a1f36;
  margin: 0 0 4px;
}

.agent-bio {
  font-size: 13px;
  color: #909399;
  margin: 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 能力标签 */
.card-skills {
  padding: 12px 18px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  color: #909399;
  font-size: 12px;
}

.skill-row .el-icon {
  color: #b0b0b0;
  flex-shrink: 0;
}

.skill-tag {
  margin: 2px 0;
}

.empty-hint span {
  font-size: 12px;
  color: #c0c4cc;
  font-style: italic;
}

/* 提示词预览 */
.card-prompt {
  margin: 10px 18px 0;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.card-prompt .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #b0b0b0;
}

.prompt-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* 操作按钮 */
.card-actions {
  display: flex;
  justify-content: space-around;
  padding: 14px 10px 16px;
  margin-top: auto;
  border-top: 1px solid #f5f5f5;
}

.action-btn {
  font-size: 13px;
  color: #606266;
}

.action-btn:hover {
  color: #409eff;
}

.danger-btn:hover {
  color: #f56c6c !important;
}

/* ========== 新增卡片 ========== */
.add-card {
  border: 2px dashed #dcdfe6;
  box-shadow: none;
  cursor: pointer;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: transparent;
}

.add-card:hover {
  border-color: #409eff;
  transform: none;
  box-shadow: none;
}

.add-card-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.add-text {
  font-size: 14px;
  color: #c0c4cc;
  font-weight: 500;
}

.add-card:hover .add-text {
  color: #409eff;
}

/* ========== 绑定对话框头像 ========== */
.bind-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 10px;
}

.bind-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.bind-info h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1f36;
}

.bind-info span {
  font-size: 12px;
  color: #909399;
}

/* ========== 对话框 ========== */
.dialog-form {
  padding: 8px 0;
}
</style>
