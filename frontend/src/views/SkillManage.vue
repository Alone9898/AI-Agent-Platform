<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">技能库</h2>
        <span class="page-desc">{{ skillStore.total }} 个技能</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="showCreateDialog()" class="add-btn">新增技能</el-button>
    </div>

    <section class="preset-section">
      <div class="section-header">
        <div class="section-heading">
          <h3 class="section-title">推荐模板</h3>
          <span class="section-hint">{{ skillStore.presets.length }} 个可用</span>
        </div>
        <el-button
          v-if="skillStore.presets.length > presetPreviewSize"
          text
          :icon="presetsExpanded ? ArrowUp : ArrowDown"
          @click="presetsExpanded = !presetsExpanded"
        >
          {{ presetsExpanded ? '收起' : '查看全部' }}
        </el-button>
      </div>
      <div v-loading="presetsLoading" class="preset-grid">
        <div
          v-for="preset in visiblePresets"
          :key="preset.key"
          class="preset-card"
          :class="[isImported(preset) ? 'imported' : '', 'preset-type-' + preset.type]"
          role="button"
          :tabindex="isImported(preset) ? -1 : 0"
          :aria-disabled="isImported(preset)"
          @click="handleImportPreset(preset)"
          @keydown.enter="handleImportPreset(preset)"
        >
          <div class="preset-icon" :style="{ background: getPresetColor(preset.key) }">
            <el-icon v-if="preset.type === 'tool'" :size="16"><Setting /></el-icon>
            <template v-else>{{ preset.name.replace('[工具] ', '').charAt(0) }}</template>
          </div>
          <div class="preset-info">
            <div class="preset-name">
              <span class="preset-name-text">{{ preset.name }}</span>
              <el-tag v-if="preset.type === 'tool'" size="small" type="warning" effect="plain" class="type-tag">工具</el-tag>
              <el-tag v-if="isImported(preset)" size="small" type="success" effect="plain" class="imported-tag">已添加</el-tag>
            </div>
            <div class="preset-desc">{{ preset.description }}</div>
          </div>
          <div class="preset-action">
            <el-icon v-if="importingKey === preset.key" class="is-loading" :size="16"><Loading /></el-icon>
            <el-icon v-else-if="isImported(preset)" :size="16" color="#67c23a"><Check /></el-icon>
            <el-icon v-else :size="16" color="#909399"><Plus /></el-icon>
          </div>
        </div>
      </div>
    </section>

    <div class="library-header">
      <div class="section-heading">
        <h3 class="section-title">全部技能</h3>
        <span class="result-count">{{ resultSummary }}</span>
      </div>
      <div class="library-controls">
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          clearable
          class="search-input"
          placeholder="搜索名称、描述或提示词"
          @keyup.enter="submitSearch"
        />
        <el-radio-group v-model="typeFilter" class="type-filter">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button value="prompt">提示词</el-radio-button>
          <el-radio-button value="tool">工具</el-radio-button>
          <el-radio-button value="mixed">混合</el-radio-button>
        </el-radio-group>
        <el-select v-model="sortValue" class="sort-select" aria-label="技能排序">
          <el-option label="最近更新" value="updatedAt:desc" />
          <el-option label="最新创建" value="createdAt:desc" />
          <el-option label="名称 A-Z" value="name:asc" />
        </el-select>
      </div>
    </div>

    <div class="table-card">
      <el-table
        :data="skillStore.pagedSkills"
        :row-key="(row: any) => row.id"
        v-loading="skillStore.pageLoading"
        class="data-table"
      >
        <el-table-column prop="id" label="ID" width="72" />
        <el-table-column prop="name" label="名称" min-width="160">
          <template #default="{ row }">
            <span class="name-cell">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.type === 'tool'" type="warning" size="small" effect="light">工具</el-tag>
            <el-tag v-else-if="row.type === 'mixed'" size="small" effect="light">混合</el-tag>
            <el-tag v-else type="info" size="small" effect="light">提示词</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="内容" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ getContentSummary(row) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
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
        <template #empty>
          <el-empty :description="hasFilters ? '没有匹配的技能' : '暂无技能'" :image-size="72">
            <el-button v-if="hasFilters" @click="clearFilters">清除筛选</el-button>
            <el-button v-else type="primary" :icon="Plus" @click="showCreateDialog()">新增技能</el-button>
          </el-empty>
        </template>
      </el-table>
      <div v-if="skillStore.total > 0" class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="skillStore.total"
          layout="total, sizes, prev, pager, next"
          @current-change="loadSkills()"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑技能' : '新增技能'" width="min(620px, calc(100vw - 32px))" destroy-on-close>
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
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Delete,
  Document,
  Edit,
  Link,
  Loading,
  Plus,
  Search,
  Setting,
} from '@element-plus/icons-vue'
import { useSkillStore } from '@/stores'

const skillStore = useSkillStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const presetsLoading = ref(false)
const presetsExpanded = ref(false)
const presetPreviewSize = 6
const importingKey = ref('')
const saving = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const sortValue = ref('updatedAt:desc')
const currentPage = ref(1)
const pageSize = ref(20)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let resettingFilters = false

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

const visiblePresets = computed(() =>
  presetsExpanded.value ? skillStore.presets : skillStore.presets.slice(0, presetPreviewSize)
)
const hasFilters = computed(() => Boolean(keyword.value.trim() || typeFilter.value))
const resultSummary = computed(() =>
  hasFilters.value ? `找到 ${skillStore.total} 个` : `共 ${skillStore.total} 个`
)

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

function isImported(preset: any): boolean {
  return Boolean(preset.imported)
}

async function loadSkills(resetPage = false) {
  if (resetPage) currentPage.value = 1
  const [sortBy, sortOrder] = sortValue.value.split(':')
  await skillStore.fetchSkillPage({
    page: currentPage.value,
    pageSize: pageSize.value,
    keyword: keyword.value.trim() || undefined,
    type: typeFilter.value || undefined,
    sortBy,
    sortOrder: sortOrder as 'asc' | 'desc',
  })
}

function clearFilters() {
  resettingFilters = true
  if (searchTimer) clearTimeout(searchTimer)
  keyword.value = ''
  typeFilter.value = ''
  nextTick(() => {
    resettingFilters = false
    loadSkills(true)
  })
}

function submitSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  loadSkills(true)
}

function handlePageSizeChange() {
  loadSkills(true)
}

function getContentSummary(skill: any): string {
  if (skill.type !== 'tool') return skill.prompt || '-'
  if (!skill.tools) return '-'
  try {
    const tools = JSON.parse(skill.tools)
    if (!Array.isArray(tools) || tools.length === 0) return '-'
    const names = tools.map((tool: any) => tool.name).filter(Boolean)
    return names.length ? names.join('、') : `${tools.length} 个工具`
  } catch {
    return '工具配置格式异常'
  }
}

function formatDate(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
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
  loadSkills()
  presetsLoading.value = true
  try {
    await skillStore.fetchPresets()
  } finally {
    presetsLoading.value = false
  }
})

watch(keyword, () => {
  if (resettingFilters) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadSkills(true), 300)
})

watch([typeFilter, sortValue], () => {
  if (resettingFilters) return
  if (searchTimer) clearTimeout(searchTimer)
  loadSkills(true)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
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
  if (isImported(preset) || importingKey.value) {
    if (!isImported(preset)) return
    ElMessage.info('该技能已存在')
    return
  }
  importingKey.value = preset.key
  try {
    await skillStore.importPreset(preset)
    await Promise.allSettled([loadSkills(true), skillStore.fetchPresets()])
    ElMessage.success(`已添加「${preset.name}」`)
  } catch {
    ElMessage.error('添加失败')
  } finally {
    importingKey.value = ''
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
  const name = form.value.name.trim()
  if (!name) {
    ElMessage.warning('请输入技能名称')
    return
  }

  saving.value = true
  try {
    const payload: any = {
      name,
      description: form.value.description.trim(),
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
    await Promise.allSettled([loadSkills(!isEdit.value), skillStore.fetchPresets()])
  } catch {
    ElMessage.error('操作失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  try {
    const shouldGoBack = skillStore.pagedSkills.length === 1 && currentPage.value > 1
    await skillStore.deleteSkill(id)
    if (shouldGoBack) currentPage.value -= 1
    await Promise.allSettled([loadSkills(), skillStore.fetchPresets()])
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
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

.preset-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
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

.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  min-height: 68px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7ed;
  cursor: pointer;
  min-width: 0;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.preset-card:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: 2px;
}

.preset-card:hover {
  border-color: #9e94e8;
  background: #faf9ff;
}

.preset-card.preset-type-tool:hover {
  border-color: #e6a23c;
}

.preset-card.imported {
  background: #f6ffed;
  border-color: #b7eb8f;
  cursor: default;
}

.preset-card.imported:hover {
  background: #f6ffed;
}

.preset-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
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

.preset-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.library-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 14px;
}

.result-count {
  font-size: 12px;
  color: #909399;
}

.library-controls {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto 132px;
  align-items: center;
  gap: 12px;
}

.search-input {
  max-width: 460px;
}

.sort-select {
  width: 132px;
}

.table-card {
  background: #fff;
  border: 1px solid #e5e7ed;
  border-radius: 8px;
  padding: 4px 0;
  box-shadow: 0 1px 3px rgba(31, 36, 61, 0.04);
  overflow: hidden;
}

.name-cell {
  font-weight: 500;
  color: #303133;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 16px 12px;
  border-top: 1px solid #f2f3f5;
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

:deep(.data-table .el-table__row) {
  height: 54px;
}

@media (max-width: 900px) {
  .library-controls {
    grid-template-columns: 1fr 132px;
  }

  .search-input {
    max-width: none;
  }

  .type-filter {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

@media (max-width: 640px) {
  .page-header {
    align-items: center;
    margin-bottom: 20px;
  }

  .page-desc {
    display: none;
  }

  .preset-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .library-controls {
    grid-template-columns: minmax(0, 1fr) 124px;
    gap: 10px;
  }

  .type-filter {
    display: flex;
    width: 100%;
  }

  :deep(.type-filter .el-radio-button) {
    flex: 1;
  }

  :deep(.type-filter .el-radio-button__inner) {
    width: 100%;
    padding-inline: 8px;
  }

  .pagination-wrap {
    justify-content: flex-start;
    overflow-x: auto;
  }
}
</style>
