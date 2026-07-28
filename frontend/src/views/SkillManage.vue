<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Skill 管理</h2>
        <span class="page-desc">定义可复用的技能提示词，供 Agent 绑定使用</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="showDialog()" class="add-btn" round>新增 Skill</el-button>
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
        :class="{ imported: isImported(preset.key) }"
        @click="handleImportPreset(preset)"
      >
        <div class="preset-icon" :style="{ background: getPresetColor(preset.key) }">
          {{ preset.name.charAt(0) }}
        </div>
        <div class="preset-info">
          <div class="preset-name">
            {{ preset.name }}
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
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="prompt" label="提示词" show-overflow-tooltip min-width="280" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="showDialog(row)">
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 Skill' : '新增 Skill'" width="540px" destroy-on-close>
      <el-form :model="form" label-width="80px" class="dialog-form">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="请输入技能名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="提示词">
          <el-input v-model="form.prompt" type="textarea" :rows="5" placeholder="请输入 Skill 提示词" />
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
import { Plus, Edit, Delete, Check } from '@element-plus/icons-vue'
import { useSkillStore } from '@/stores'

const skillStore = useSkillStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const presetsLoading = ref(false)
const form = ref({ name: '', description: '', prompt: '' })

// 已导入的预设 key 集合（根据名称匹配）
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

onMounted(async () => {
  skillStore.fetchSkills()
  presetsLoading.value = true
  try {
    await skillStore.fetchPresets()
  } finally {
    presetsLoading.value = false
  }
})

function showDialog(row?: any) {
  isEdit.value = !!row
  editId.value = row?.id || 0
  form.value = row
    ? { name: row.name, description: row.description, prompt: row.prompt }
    : { name: '', description: '', prompt: '' }
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

async function handleSave() {
  try {
    if (isEdit.value) {
      await skillStore.updateSkill(editId.value, form.value)
      ElMessage.success('更新成功')
    } else {
      await skillStore.createSkill(form.value)
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

.dialog-form {
  padding: 8px 0;
}

:deep(.data-table) {
  --el-table-border-color: #f0f0f0;
}
</style>
