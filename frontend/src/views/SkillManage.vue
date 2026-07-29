<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Skill 管理</h2>
        <span class="page-desc">定义可复用的技能提示词和工具，供 Agent 绑定使用</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog()" class="add-btn" round>新增 Skill</el-button>
    </div>

    <!-- 预设技能推荐区 -->
    <div class="section-header">
      <h3 class="section-title">常用技能库</h3>
      <span class="section-hint">点击即可一键添加到你的技能库</span>
    </div>
    <div v-loading="presetsLoading" class="preset-grid">
      <div
        v-for="preset in skillStore.presets"
        :key="preset.key"
        class="preset-card"
        :class="[isImported(preset.key) ? 'imported' : '', 'preset-type-' + preset.type]"
        @click="handleImportPreset(preset)"
      >
        <div class="preset-icon" :style="{ background: getPresetColor(preset.key) }">
          <el-icon v-if="preset.type === 'tool'" :size="16"><Setting /></el-icon>
          <template v-else>{{ preset.name.replace('[工具] ', '').charAt(0) }}</template>
        </div>
        <div class="preset-info">
          <div class="preset-name">
            {{ preset.name }}
            <el-tag v-if="preset.type === 'tool'" size="small" type="warning" effect="plain" round class="type-tag">工具</el-tag>
            <el-tag v-if="isImported(preset.key)" size="small" type="success" effect="plain" round class="imported-tag">已添加</el-tag>
          </div>
          <div class="preset-desc">{{ preset.description }}</div>
        </div>
        <div class="preset-action">
          <el-icon v-if="isImported(preset.key)" :size="16" color="#67c23a"><Check /></el-icon>
          <el-icon v-else :size="16" color="#c0c4cc"><Plus /></el-icon>
        </div>
      </div>
    </div>

    <!-- 已有技能列表 -->
    <div class="section-header" style="margin-top: 28px">
      <h3 class="section-title">我的技能</h3>
      <span class="section-hint">共 {{ skillStore.skills.length }} 个技能</span>
    </div>
    <div class="table-card">
      <el-table :data="skillStore.skills" v-loading="skillStore.loading" class="data-table">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" min-width="140">
          <template #default="{ row }">
            <span class="name-cell">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'tool'" type="warning" size="small" effect="light" round>工具</el-tag>
            <el-tag v-else-if="row.type === 'mixed'" size="small" effect="light" round>混合</el-tag>
            <el-tag v-else type="info" size="small" effect="light" round>提示词</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="160" show-overflow-tooltip />
        <el-table-column prop="prompt" label="提示词" show-overflow-tooltip min-width="200" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showEditDialog(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-popconfirm title="确定删除该技能吗？" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger" link>
                  <el-icon><Delete /></el-icon> 删除
                </el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 Skill' : '新增 Skill'" width="620px" destroy-on-close>
      <!-- 类型选择 -->
      <div class="type-tabs">
        <el-radio-group v-model="form.type" size="default">
          <el-radio-button value="prompt">
            <el-icon :size="14"><Document /></el-icon> 提示词
          </el-radio-button>
          <el-radio-button value="tool">
            <el-icon :size="14"><Setting /></el-icon> 工具
          </el-radio-button>
          <el-radio-button value="mixed">
            <el-icon :size="14"><Link /></el-icon> 混合
          </el-radio-button>
        </el-radio-group>
      </div>

      <el-form :model="form" label-width="80px" class="dialog-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入技能名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>

        <!-- 提示词编辑区（prompt / mixed） -->
        <el-form-item v-if="form.type === 'prompt' || form.type === 'mixed'" label="提示词">
          <el-input v-model="form.prompt" type="textarea" :rows="5" placeholder="请输入 Skill 提示词，描述 AI 的行为和角色" />
        </el-form-item>

        <!-- 工具编辑区（tool / mixed） -->
        <el-form-item v-if="form.type === 'tool' || form.type === 'mixed'" label="工具列表">
          <div class="tool-editor">
            <div v-for="(tool, index) in form.toolList" :key="index" class="tool-card">
              <div class="tool-card-header">
                <span class="tool-index">工具 #{{ index + 1 }}</span>
                <el-button size="small" type="danger" link @click="removeTool(index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
              <el-input
                v-model="tool.name"
                placeholder="函数名，如 web_search"
                class="tool-input"
                size="small"
              />
              <el-input
                v-model="tool.description"
                placeholder="功能描述，如：搜索互联网获取实时信息"
                class="tool-input"
                size="small"
              />
              <el-input
                v-model="tool.parametersJson"
                type="textarea"
                :rows="5"
                placeholder='参数定义 JSON，例如: {"type":"object","properties":{"query":{"type":"string","description":"关键词"}},"required":["query"]}'
                class="tool-input"
                size="small"
                :class="{ 'json-error': tool.jsonError }"
              />
              <span v-if="tool.jsonError" class="json-tip">JSON 格式无效</span>
            </div>
            <el-button type="primary" plain size="small" :icon="Plus" @click="addTool" class="add-tool-btn">
              添加工具
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Check, Setting, Document, Link } from '@element-plus/icons-vue'
import { useSkillStore } from '@/stores'

const skillStore = useSkillStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const presetsLoading = ref(false)

interface ToolItem {
  name: string
  description: string
  parametersJson: string
  jsonError: boolean
}

const emptyForm = () => ({
  name: '',
  description: '',
  type: 'prompt',
  prompt: '',
  toolList: [] as ToolItem[],
})

const form = ref(emptyForm())

const importedKeys = computed(() => {
  const names = new Set(skillStore.skills.map((s: any) => s.name))
  return new Set(
    skillStore.presets
      .filter((p: any) => names.has(p.name))
      .map((p: any) => p.key)
  )
})

const PRESET_COLORS = [
  '#667eea', '#f56c6c', '#e6a23c', '#67c23a',
  '#409eff', '#9b59b6', '#1abc9c', '#e74c3c',
  '#3498db', '#2ecc71', '#f39c12', '#8e44ad',
  '#e67e22', '#1abc9c', '#d35400', '#7f8c8d',
  '#f1c40f', '#2980b9',
]

function hashKey(key: string): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % PRESET_COLORS.length
}

function getPresetColor(key: string): string {
  return PRESET_COLORS[hashKey(key)]
}

function isImported(key: string): boolean {
  return importedKeys.value.has(key)
}

function parseToolsFromJson(toolsStr: string): ToolItem[] {
  if (!toolsStr) return []
  try {
    const arr = JSON.parse(toolsStr)
    if (!Array.isArray(arr)) return []
    return arr.map((t: any) => ({
      name: t.name || '',
      description: t.description || '',
      parametersJson: JSON.stringify(t.parameters || {}, null, 2),
      jsonError: false,
    }))
  } catch {
    return []
  }
}

function toolListToJson(toolList: ToolItem[]): { json: string; ok: boolean } {
  const tools: any[] = []
  let ok = true
  for (const t of toolList) {
    t.jsonError = false
    if (!t.name) continue
    let params = {}
    if (t.parametersJson.trim()) {
      try {
        params = JSON.parse(t.parametersJson)
      } catch {
        t.jsonError = true
        ok = false
        continue
      }
    }
    tools.push({
      name: t.name,
      description: t.description,
      parameters: params,
    })
  }
  return { json: JSON.stringify(tools), ok }
}

onMounted(async () => {
  skillStore.fetchSkills()
  presetsLoading.value = true
  try {
    await skillStore.fetchPresets()
  } finally {
    presetsLoading.value = false
  }
})

function showCreateDialog() {
  isEdit.value = false
  editId.value = 0
  form.value = emptyForm()
  dialogVisible.value = true
}

function showEditDialog(row: any) {
  isEdit.value = true
  editId.value = row.id
  form.value = {
    name: row.name || '',
    description: row.description || '',
    type: row.type || 'prompt',
    prompt: row.prompt || '',
    toolList: parseToolsFromJson(row.tools),
  }
  dialogVisible.value = true
}

async function handleImportPreset(preset: any) {
  if (isImported(preset.key)) {
    ElMessage.info('该技能已存在')
    return
  }
  try {
    await skillStore.importPreset(preset)
    ElMessage.success(`已添加「${preset.name}」`)
  } catch {
    ElMessage.error('添加失败')
  }
}

function addTool() {
  form.value.toolList.push({
    name: '',
    description: '',
    parametersJson: `{\n  "type": "object",\n  "properties": {\n    \n  },\n  "required": []\n}`,
    jsonError: false,
  })
}

function removeTool(index: number) {
  form.value.toolList.splice(index, 1)
}

async function handleSave() {
  try {
    const payload: any = {
      name: form.value.name,
      description: form.value.description,
      type: form.value.type,
    }

    if (form.value.type === 'prompt' || form.value.type === 'mixed') {
      payload.prompt = form.value.prompt
    } else {
      payload.prompt = null
    }

    if (form.value.type === 'tool' || form.value.type === 'mixed') {
      const { json, ok } = toolListToJson(form.value.toolList)
      if (!ok) {
        ElMessage.error('请修复工具参数 JSON 格式错误后再保存')
        return
      }
      payload.tools = json
    } else {
      payload.tools = null
    }

    if (isEdit.value) {
      await skillStore.updateSkill(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await skillStore.createSkill(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(id: number) {
  try {
    await skillStore.deleteSkill(id)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.page-container {
  max-width: 1400px;
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

/* ========== 分区标题 ========== */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1f36;
  margin: 0;
}

.section-hint {
  font-size: 12px;
  color: #b0b0b0;
}

/* ========== 预设技能网格 ========== */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.25s ease;
}

.preset-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.12);
  transform: translateY(-2px);
}

.preset-card.preset-type-tool:hover {
  border-color: #e6a23c;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.15);
}

.preset-card.imported {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.preset-card.imported:hover {
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.15);
}

.preset-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
  min-width: 0;
}

.preset-name {
  font-size: 14px;
  font-weight: 600;
  color: #1a1f36;
  display: flex;
  align-items: center;
  gap: 6px;
}

.type-tag {
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
}

.imported-tag {
  font-size: 10px;
  padding: 0 6px;
  height: 18px;
  line-height: 18px;
}

.preset-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-action {
  flex-shrink: 0;
}

/* ========== 已有技能表格 ========== */
.table-card {
  background: #fff;
  border-radius: 10px;
  padding: 4px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.name-cell {
  font-weight: 500;
  color: #303133;
}

/* ========== 对话框 ========== */
.type-tabs {
  margin-bottom: 18px;
  display: flex;
  justify-content: center;
}

.dialog-form {
  padding: 8px 0;
}

/* ========== 工具编辑器 ========== */
.tool-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.tool-card {
  background: #fafbfc;
  border: 1px solid #e8eaed;
  border-radius: 8px;
  padding: 12px;
}

.tool-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tool-index {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
}

.tool-input {
  margin-bottom: 8px;
}

.tool-input:last-child {
  margin-bottom: 0;
}

.json-error textarea,
.json-error input {
  border-color: #f56c6c !important;
}

.json-tip {
  font-size: 11px;
  color: #f56c6c;
}

.add-tool-btn {
  margin-top: 4px;
}

:deep(.data-table) {
  --el-table-border-color: #f0f0f0;
}
</style>
