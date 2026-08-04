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

    <section class="preset-section" aria-labelledby="official-agent-heading">
      <div class="section-header">
        <div>
          <h3 id="official-agent-heading" class="section-title">官方推荐</h3>
          <p class="section-desc">已配置工作方式与所需技能，可直接加入团队</p>
        </div>
        <el-tag size="small" effect="plain">本地模板</el-tag>
      </div>

      <div class="preset-grid">
        <article v-for="item in presetAgents" :key="item.preset.key" class="featured-agent">
          <div class="preset-mark" aria-hidden="true">
            <el-icon :size="22"><component :is="getPresetIcon(item.preset.key)" /></el-icon>
          </div>
          <div class="preset-copy">
            <div class="preset-title-row">
              <h4>{{ item.preset.name }}</h4>
              <el-tag v-if="item.agent" size="small" type="success" effect="plain">已启用</el-tag>
              <el-tag v-else size="small" effect="plain">官方</el-tag>
            </div>
            <p>{{ item.preset.description }}</p>
            <div class="preset-capabilities">
              <span v-for="capability in item.preset.capabilities" :key="capability">
                {{ capability }}
              </span>
            </div>
          </div>
          <div class="preset-actions">
            <el-button
              v-if="item.agent"
              type="primary"
              :icon="ArrowRight"
              @click="openPresetAgent(item.preset, item.agent.id)"
            >
              开始对话
            </el-button>
            <el-button
              v-else
              type="primary"
              :icon="Plus"
              :loading="presetCreating && selectedPreset?.key === item.preset.key"
              @click="showPresetDialog(item.preset)"
            >
              添加到团队
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <div class="library-heading">
      <div>
        <h3 class="section-title">我的团队</h3>
        <p class="section-desc">{{ agentStore.agents.length }} 位成员</p>
      </div>
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

    <el-dialog
      v-model="presetDialogVisible"
      :title="selectedPreset ? `启用${selectedPreset.name}` : '启用助手'"
      width="480px"
      destroy-on-close
    >
      <div v-if="selectedPreset" class="preset-dialog-intro">
        <div class="preset-dialog-mark">
          <el-icon><component :is="getPresetIcon(selectedPreset.key)" /></el-icon>
        </div>
        <div>
          <h4>{{ selectedPreset.name }}</h4>
          <p>{{ selectedPreset.description }}</p>
        </div>
      </div>
      <el-form label-position="top" class="dialog-form preset-form">
        <el-form-item label="选择模型">
          <el-select v-model="presetModelId" placeholder="选择助手使用的模型" style="width: 100%">
            <el-option v-for="model in modelStore.models" :key="model.id" :label="model.name" :value="model.id" />
          </el-select>
        </el-form-item>
        <div class="required-tools">
          <span class="required-tools-label">自动配置</span>
          <span>{{ getPresetToolSummary(selectedPreset) }}</span>
        </div>
        <el-alert
          v-if="selectedPreset?.setupNotice"
          :title="selectedPreset.setupNotice"
          type="info"
          :closable="false"
          show-icon
          class="preset-notice"
        />
        <el-alert
          v-if="selectedPresetNeedsWebSearch"
          :title="webSearchConfig.configured
            ? `已配置 ${webSearchProviderName}，助手可以使用联网搜索`
            : '请先在系统设置中配置联网搜索服务'"
          :type="webSearchConfig.configured ? 'success' : 'warning'"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="presetDialogVisible = false">取消</el-button>
        <el-button
          v-if="selectedPresetNeedsWebSearch && !webSearchConfig.configured"
          @click="goToSearchSettings"
        >
          配置联网搜索
        </el-button>
        <el-button
          type="primary"
          :loading="presetCreating"
          :disabled="selectedPresetNeedsWebSearch && !webSearchConfig.configured"
          @click="createSelectedPreset"
        >
          添加并开始对话
        </el-button>
      </template>
    </el-dialog>

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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  ChatLineSquare,
  Cpu,
  Delete,
  Document,
  Edit,
  EditPen,
  Link,
  Location,
  MagicStick,
  Plus,
  Search,
  ShoppingCart,
} from '@element-plus/icons-vue'
import { useAgentStore, useSkillStore, useModelStore } from '@/stores'
import {
  getPresetToolSummary,
  LOCAL_AGENT_PRESETS,
  presetRequiresWebSearch,
  type LocalAgentPreset,
} from '@/presets/agent-presets'
import {
  createAgentFromPreset,
  findPresetAgent,
  forgetPresetAgent,
  rememberPresetAgent,
} from '@/services/agent-preset'
import { toolSettingsApi } from '@/api'

const router = useRouter()
const agentStore = useAgentStore()
const skillStore = useSkillStore()
const modelStore = useModelStore()

const dialogVisible = ref(false)
const bindDialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const currentAgent = ref<any>(null)
const presetDialogVisible = ref(false)
const presetModelId = ref<number | null>(null)
const presetCreating = ref(false)
const selectedPreset = ref<LocalAgentPreset | null>(null)
const webSearchConfig = ref({
  provider: null as string | null,
  configured: false,
})
const webSearchProviderName = computed(() => ({
  exa_mcp: 'Exa MCP',
  bing: 'Bing 公共搜索',
  duckduckgo: 'DuckDuckGo',
  bocha: '博查 Web Search',
  tavily: 'Tavily',
  serpapi: 'SerpAPI',
  searxng: 'SearXNG',
}[webSearchConfig.value.provider || ''] || '联网搜索'))

const form = ref({ name: '', description: '', systemPrompt: '' })
const bindForm = ref({ modelId: null as number | null, skillIds: [] as number[] })
const presetAgents = computed(() => LOCAL_AGENT_PRESETS.map((preset) => ({
  preset,
  agent: findPresetAgent(preset, agentStore.agents),
})))
const selectedPresetNeedsWebSearch = computed(() => presetRequiresWebSearch(selectedPreset.value))

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

onMounted(async () => {
  await Promise.allSettled([
    agentStore.fetchAgents(),
    skillStore.fetchSkills(),
    skillStore.fetchPresets(),
    modelStore.fetchModels(),
    refreshWebSearchConfig(),
  ])
})

async function showPresetDialog(preset: LocalAgentPreset) {
  const existingAgent = findPresetAgent(preset, agentStore.agents)
  if (existingAgent) {
    openPresetAgent(preset, existingAgent.id)
    return
  }
  selectedPreset.value = preset
  if (modelStore.models.length === 0) {
    ElMessage.warning('请先添加一个可用模型')
    router.push('/models')
    return
  }
  presetModelId.value = modelStore.models.find((model: any) => model.hasApiKey)?.id
    || modelStore.models[0]?.id
    || null
  if (presetRequiresWebSearch(preset)) await refreshWebSearchConfig()
  presetDialogVisible.value = true
}

async function refreshWebSearchConfig() {
  try {
    const { data } = await toolSettingsApi.getWebSearch()
    webSearchConfig.value = data
  } catch {
    webSearchConfig.value = { provider: null, configured: false }
  }
}

function goToSearchSettings() {
  presetDialogVisible.value = false
  router.push('/settings')
}

function openPresetAgent(preset: LocalAgentPreset, agentId: number) {
  rememberPresetAgent(preset, agentId)
  router.push({ path: '/chat', query: { agentId: String(agentId) } })
}

function getPresetIcon(key: string) {
  if (key === 'ai-intelligence') return Cpu
  if (key === 'content-topic-radar') return EditPen
  if (key === 'document-organizer') return Document
  if (key === 'purchase-comparison') return ShoppingCart
  if (key === 'travel-planner') return Location
  return Search
}

async function createSelectedPreset() {
  const preset = selectedPreset.value
  if (!preset) return
  if (presetRequiresWebSearch(preset) && !webSearchConfig.value.configured) {
    ElMessage.warning('请先配置联网搜索服务')
    goToSearchSettings()
    return
  }
  if (!presetModelId.value || presetCreating.value) {
    if (!presetModelId.value) ElMessage.warning('请选择一个模型')
    return
  }

  presetCreating.value = true
  try {
    const createdAgent = await createAgentFromPreset(preset, presetModelId.value)
    await Promise.all([
      agentStore.fetchAgents(),
      skillStore.fetchSkills(),
      skillStore.fetchPresets(),
    ])
    presetDialogVisible.value = false
    ElMessage.success(`${preset.name}已加入团队`)
    openPresetAgent(preset, createdAgent.id)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || `${preset.name}创建失败`)
  } finally {
    presetCreating.value = false
  }
}

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
    forgetPresetAgent(id)
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

/* ========== 官方 Agent 模板 ========== */
.preset-section {
  margin-bottom: 28px;
}

.section-header,
.library-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.section-header {
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  color: #303548;
  font-size: 15px;
  font-weight: 680;
}

.section-desc {
  margin: 3px 0 0;
  color: #9498a8;
  font-size: 12px;
  line-height: 1.5;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.featured-agent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e4e5eb;
  border-left: 3px solid #4d857f;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(31, 36, 61, 0.04);
}

.preset-mark,
.preset-dialog-mark {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: #3f756f;
  background: #eaf3f1;
}

.preset-mark {
  width: 48px;
  height: 48px;
  border: 1px solid #d6e8e4;
  border-radius: 9px;
}

.preset-copy {
  min-width: 0;
}

.preset-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preset-title-row h4,
.preset-dialog-intro h4 {
  margin: 0;
  color: #282d40;
  font-size: 16px;
  font-weight: 680;
}

.preset-copy > p,
.preset-dialog-intro p {
  margin: 4px 0 0;
  color: #7f8495;
  font-size: 12px;
  line-height: 1.6;
}

.preset-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 10px;
}

.preset-capabilities span {
  position: relative;
  padding-left: 10px;
  color: #656a7c;
  font-size: 11px;
}

.preset-capabilities span::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #8b80df;
  transform: translateY(-50%);
}

.preset-actions {
  display: flex;
  grid-column: 1 / -1;
  justify-content: flex-end;
  padding-top: 2px;
}

.library-heading {
  margin-bottom: 12px;
  padding-top: 2px;
}

.preset-dialog-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 16px;
  border-bottom: 1px solid #eff0f4;
}

.preset-dialog-mark {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.preset-form {
  padding-top: 18px;
}

.required-tools {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px;
  margin: -2px 0 16px;
  padding: 10px 12px;
  border: 1px solid #e9eaf0;
  border-radius: 8px;
  color: #74798b;
  font-size: 12px;
  line-height: 1.6;
  background: #fafbfc;
}

.required-tools-label {
  color: #3d4255;
  font-weight: 650;
}

.preset-notice {
  margin-bottom: 10px;
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
  border-color: #c4dcd8;
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

@media (max-width: 960px) {
  .preset-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .preset-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .page-header {
    gap: 16px;
  }

  .page-desc {
    display: none;
  }

  .featured-agent {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .preset-mark {
    width: 42px;
    height: 42px;
  }

  .preset-actions {
    grid-column: 1 / -1;
  }

  .preset-actions :deep(.el-button) {
    width: 100%;
  }

  .agent-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
