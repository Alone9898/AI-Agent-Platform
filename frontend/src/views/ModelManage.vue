<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">Model 管理</h2>
        <span class="page-desc">配置 AI 模型服务商，选择厂商后自动填充接口地址与模型列表</span>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog()" class="add-btn">新增 Model</el-button>
    </div>

    <!-- 模型列表 -->
    <div class="table-card">
      <el-table :data="modelStore.models" v-loading="modelStore.loading" class="data-table">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" min-width="120">
          <template #default="{ row }">
            <span class="name-cell">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="provider" label="服务商" width="160">
          <template #default="{ row }">
            <el-tag v-if="row.provider" size="small" effect="plain" type="info">
              {{ getProviderName(row.providerKey || row.provider) }}
            </el-tag>
            <el-tag v-else size="small" effect="plain" type="warning">自定义</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modelName" label="模型" min-width="140">
          <template #default="{ row }">
            <code class="model-name">{{ row.modelName }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="baseUrl" label="Base URL" show-overflow-tooltip min-width="200" />
        <el-table-column label="API Key" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.apiKeyValue" size="small" type="success" effect="light">已配置</el-tag>
            <span v-else class="unbound-text">未配置</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="openEditDialog(row)">
              <el-icon><Edit /></el-icon> 编辑
            </el-button>
            <el-popconfirm title="确定删除该模型吗？" @confirm="handleDelete(row.id)">
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑 Model' : '新增 Model'" width="560px" destroy-on-close>
      <el-tabs v-model="configMode" class="model-tabs">
        <!-- Tab 1: 模型服务商 -->
        <el-tab-pane label="模型服务商" name="provider">
          <el-form :model="form" label-width="90px" class="dialog-form">
            <el-form-item label="服务商" required>
              <el-select v-model="form.providerKey" placeholder="选择服务商" style="width: 100%" @change="onProviderChange">
                <el-option v-for="p in modelStore.providerPresets" :key="p.key" :label="p.name" :value="p.key" />
              </el-select>
            </el-form-item>
            <el-form-item label="模型" required>
              <el-select v-model="form.modelName" placeholder="选择模型" style="width: 100%" :disabled="!form.providerKey">
                <el-option v-for="m in currentProviderModels" :key="m.key" :label="m.name" :value="m.key" />
              </el-select>
            </el-form-item>
            <el-form-item label="API 密钥">
              <div class="apikey-row">
                <el-input v-model="form.apiKeyValue" placeholder="输入 API 密钥" show-password style="flex: 1" />
                <a v-if="currentProvider?.apiKeyUrl" :href="currentProvider.apiKeyUrl" target="_blank" class="apikey-link">
                  获取 API 密钥
                </a>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Tab 2: 自定义配置 -->
        <el-tab-pane label="自定义配置" name="custom">
          <el-form :model="form" label-width="90px" class="dialog-form">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" placeholder="如：GPT-4o" />
            </el-form-item>
            <el-form-item label="服务商">
              <el-input v-model="form.provider" placeholder="如：OpenAI" />
            </el-form-item>
            <el-form-item label="模型名称" required>
              <el-input v-model="form.modelName" placeholder="如：gpt-4o" />
            </el-form-item>
            <el-form-item label="Base URL">
              <el-input v-model="form.baseUrl" placeholder="如：https://api.openai.com/v1" />
            </el-form-item>
            <el-form-item label="API 密钥">
              <el-input v-model="form.apiKeyValue" placeholder="输入 API 密钥（可选）" show-password />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { useModelStore } from '@/stores'

const modelStore = useModelStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const configMode = ref<'provider' | 'custom'>('provider')

const form = ref({
  name: '',
  provider: '',
  providerKey: '',
  modelName: '',
  baseUrl: '',
  apiKeyValue: '',
})

const currentProvider = computed(() =>
  modelStore.providerPresets.find(p => p.key === form.value.providerKey) || null
)

const currentProviderModels = computed(() => currentProvider.value?.models || [])

onMounted(() => {
  modelStore.fetchModels()
  modelStore.fetchProviderPresets()
})

function getProviderName(key: string) {
  const p = modelStore.providerPresets.find(x => x.key === key)
  return p?.name || key
}

function onProviderChange() {
  const p = currentProvider.value
  if (p) {
    form.value.baseUrl = p.baseUrl
    form.value.provider = p.name
    form.value.modelName = ''
    // 自动用服务商名作为名称
    if (!isEdit.value) {
      form.value.name = p.name
    }
  }
}

function openCreateDialog() {
  isEdit.value = false
  editId.value = 0
  configMode.value = 'provider'
  form.value = { name: '', provider: '', providerKey: '', modelName: '', baseUrl: '', apiKeyValue: '' }
  dialogVisible.value = true
}

function openEditDialog(row: any) {
  isEdit.value = true
  editId.value = row.id
  configMode.value = row.providerKey ? 'provider' : 'custom'
  form.value = {
    name: row.name,
    provider: row.provider || '',
    providerKey: row.providerKey || '',
    modelName: row.modelName,
    baseUrl: row.baseUrl || '',
    apiKeyValue: row.apiKeyValue || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  try {
    const payload = {
      name: form.value.name || form.value.provider || '未命名',
      provider: form.value.provider || undefined,
      providerKey: form.value.providerKey || undefined,
      modelName: form.value.modelName,
      baseUrl: form.value.baseUrl || undefined,
      apiKeyValue: form.value.apiKeyValue || undefined,
    }
    if (isEdit.value) {
      await modelStore.updateModel(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await modelStore.createModel(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
  } catch {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(id: number) {
  try {
    await modelStore.deleteModel(id)
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
  margin-bottom: 20px;
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
  height: 38px;
  border-radius: 8px;
  font-weight: 500;
}

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

.model-name {
  background: #f4f5f7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
}

.unbound-text {
  color: #c0c4cc;
  font-size: 13px;
}

.dialog-form {
  padding: 12px 0 4px;
}

.model-tabs {
  margin-top: 4px;
}

.model-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.model-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
}

.apikey-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.apikey-link {
  color: #667eea;
  font-size: 13px;
  white-space: nowrap;
  text-decoration: none;
  flex-shrink: 0;
}

.apikey-link:hover {
  text-decoration: underline;
}

:deep(.data-table) {
  --el-table-border-color: #f0f0f0;
}
</style>
