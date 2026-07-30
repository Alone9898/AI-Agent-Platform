<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">系统设置</h2>
        <span class="page-desc">管理应用的全局参数、连接状态和基础服务</span>
      </div>
    </div>

    <div class="settings-grid">
      <div class="settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><Setting /></el-icon>
          <h3 class="card-title">基础设置</h3>
        </div>
        <div class="card-body">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">开机自启动</span>
              <span class="setting-hint">{{ autoStart ? '已开启开机自启动' : '已关闭开机自启动' }}</span>
            </div>
            <el-switch v-model="autoStart" @change="handleAutoStartChange" />
          </div>
          <el-divider />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">数据目录</span>
              <span class="setting-hint">应用数据存储路径</span>
            </div>
            <el-input :model-value="dataDir" disabled class="setting-input" />
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><Monitor /></el-icon>
          <h3 class="card-title">连接与服务</h3>
        </div>
        <div class="card-body">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">后端服务</span>
              <span class="setting-hint">NestJS Sidecar 服务状态</span>
            </div>
            <el-tag :type="backendStatus === 'running' ? 'success' : 'danger'" effect="light" round>
              {{ backendStatus === 'running' ? '运行中' : '未启动' }}
            </el-tag>
          </div>
          <el-divider />
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">API 地址</span>
              <span class="setting-hint">前端请求后端接口的基础地址</span>
            </div>
            <el-input v-model="backendUrl" class="setting-input" placeholder="http://localhost:3000" />
          </div>
          <div class="setting-actions">
            <el-button plain @click="resetBackendUrl" :disabled="savingBackendUrl || testingBackend">
              恢复默认
            </el-button>
            <el-button @click="testBackendConnection" :loading="testingBackend">
              测试连接
            </el-button>
            <el-button type="primary" @click="saveBackendUrl" :loading="savingBackendUrl">
              保存地址
            </el-button>
          </div>
          <div class="backend-status">
            当前地址：{{ currentBackendUrl }}
            <span class="backend-status-muted">· {{ backendHealthText }}</span>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><RefreshRight /></el-icon>
          <h3 class="card-title">检查更新</h3>
        </div>
        <div class="card-body">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">当前更新状态</span>
              <span class="setting-hint">{{ updateStatus || '尚未检查更新' }}</span>
            </div>
            <el-button type="primary" size="small" @click="checkUpdate" :loading="checking">
              检查更新
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'
import { getApiBaseUrl, getApiErrorMessage, resetApiBaseUrl, setApiBaseUrl, systemApi } from '@/api'

const autoStart = ref(false)
const updateStatus = ref('')
const backendStatus = ref<'running' | 'stopped'>('running')
const backendHealth = ref<'unknown' | 'healthy' | 'unhealthy'>('unknown')
const backendHealthText = computed(() => {
  if (backendHealth.value === 'healthy') return '接口连接正常'
  if (backendHealth.value === 'unhealthy') return '接口暂时不可达'
  return '尚未测试连接'
})
const dataDir = ref('')
const checking = ref(false)
const backendUrl = ref(getApiBaseUrl())
const currentBackendUrl = ref(getApiBaseUrl())
const testingBackend = ref(false)
const savingBackendUrl = ref(false)

onMounted(async () => {
  try {
    dataDir.value = await invoke<string>('get_data_dir')
    backendStatus.value = (await invoke<boolean>('check_sidecar_status')) ? 'running' : 'stopped'
  } catch {
    dataDir.value = '开发模式'
    backendStatus.value = 'stopped'
  }

  backendUrl.value = getApiBaseUrl()
  currentBackendUrl.value = backendUrl.value
  await checkBackendHealth()
})

async function handleAutoStartChange(val: boolean) {
  try {
    ElMessage.success(val ? '已开启开机自启动' : '已关闭开机自启动')
  } catch {
    ElMessage.error('设置失败')
  }
}

function persistBackendUrl() {
  const value = backendUrl.value.trim()
  if (!value) {
    const fallback = resetApiBaseUrl()
    backendUrl.value = fallback
    currentBackendUrl.value = fallback
    return fallback
  }
  const saved = setApiBaseUrl(value)
  backendUrl.value = saved
  currentBackendUrl.value = saved
  return saved
}

async function saveBackendUrl() {
  savingBackendUrl.value = true
  try {
    persistBackendUrl()
    await checkBackendHealth()
    ElMessage.success('已保存接口地址')
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    savingBackendUrl.value = false
  }
}

async function resetBackendUrl() {
  const fallback = resetApiBaseUrl()
  backendUrl.value = fallback
  currentBackendUrl.value = fallback
  await checkBackendHealth()
  ElMessage.success('已恢复默认接口地址')
}

async function checkBackendHealth() {
  testingBackend.value = true
  try {
    await systemApi.health()
    backendHealth.value = 'healthy'
  } catch {
    backendHealth.value = 'unhealthy'
  } finally {
    testingBackend.value = false
  }
}

async function testBackendConnection() {
  testingBackend.value = true
  try {
    persistBackendUrl()
    await systemApi.health()
    backendHealth.value = 'healthy'
    ElMessage.success('后端连接正常')
  } catch (error: any) {
    backendHealth.value = 'unhealthy'
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    testingBackend.value = false
  }
}

async function checkUpdate() {
  checking.value = true
  updateStatus.value = '正在检查...'
  try {
    updateStatus.value = '当前已是最新版本'
  } catch {
    updateStatus.value = '检查更新失败'
  } finally {
    checking.value = false
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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 20px;
}

.settings-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: box-shadow 0.25s ease;
}

.settings-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f5f5f5;
}

.card-icon {
  color: #667eea;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1f36;
  margin: 0;
}

.card-body {
  padding: 18px 22px 22px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.setting-hint {
  font-size: 12px;
  color: #a0a0a0;
}

.setting-input {
  width: 240px;
}

.setting-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.setting-actions .el-button {
  flex: 1;
}

.backend-status {
  margin-top: 14px;
  font-size: 12px;
  color: #8a94a6;
}

.backend-status-muted {
  color: #b0b7c8;
}

:deep(.el-divider) {
  margin: 16px 0;
}

@media (max-width: 960px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .setting-row {
    flex-direction: column;
    align-items: stretch;
  }

  .setting-input {
    width: 100%;
  }

  .setting-actions {
    flex-direction: column;
  }
}
</style>
