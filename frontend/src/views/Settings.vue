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

      <div class="settings-card search-settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><Search /></el-icon>
          <div class="card-heading">
            <h3 class="card-title">联网搜索</h3>
            <span class="card-subtitle">由用户选择服务商，凭据仅保存在本机</span>
          </div>
          <el-tag
            class="config-status"
            :type="webSearchConfig.configured ? 'success' : 'warning'"
            effect="plain"
          >
            {{ webSearchConfig.configured ? '已配置' : '未配置' }}
          </el-tag>
        </div>
        <div v-loading="loadingWebSearch" class="card-body">
          <el-form label-position="top" class="search-form">
            <div class="search-form-grid">
              <el-form-item label="搜索服务商">
                <el-select
                  v-model="webSearchForm.provider"
                  placeholder="选择搜索服务商"
                  style="width: 100%"
                  @change="handleSearchProviderChange"
                >
                  <el-option
                    v-for="provider in webSearchProviders"
                    :key="provider.key"
                    :label="provider.name"
                    :value="provider.key"
                  >
                    <div class="provider-option">
                      <span>{{ provider.name }}</span>
                      <small>{{ provider.region }}</small>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>

              <el-form-item
                v-if="selectedSearchProvider?.requiresApiKey || selectedSearchProvider?.key === 'searxng'"
                :label="selectedSearchProvider?.key === 'searxng' ? '访问令牌（可选）' : 'API Key'"
              >
                <el-input
                  v-model="webSearchForm.apiKey"
                  show-password
                  autocomplete="off"
                  :placeholder="webSearchConfig.hasApiKey && webSearchConfig.provider === webSearchForm.provider
                    ? '已配置，留空则保持不变'
                    : selectedSearchProvider?.key === 'searxng'
                      ? '仅在服务要求 Bearer Token 时填写'
                      : '输入你自己的 API Key'"
                />
              </el-form-item>

              <el-form-item v-if="selectedSearchProvider?.requiresBaseUrl" label="SearXNG 服务地址">
                <el-input
                  v-model="webSearchForm.baseUrl"
                  placeholder="例如：http://127.0.0.1:8080"
                />
              </el-form-item>
            </div>

            <div v-if="selectedSearchProvider" class="provider-detail">
              <div>
                <strong>{{ selectedSearchProvider.region }}</strong>
                <span>{{ selectedSearchProvider.description }}</span>
              </div>
              <a :href="selectedSearchProvider.apiKeyUrl" target="_blank" rel="noreferrer">
                {{ selectedSearchProvider.key === 'searxng' ? '部署文档' : '获取 API Key' }}
              </a>
            </div>

            <el-alert
              title="API Key 会在本机加密保存，不上传星曜云端，也不会写入 Agent 或 Skill。"
              type="info"
              :closable="false"
              show-icon
            />

            <div class="setting-actions search-actions">
              <el-popconfirm
                v-if="webSearchConfig.configured"
                title="确定清除本机联网搜索配置吗？"
                @confirm="clearWebSearchConfig"
              >
                <template #reference>
                  <el-button :loading="savingWebSearch">清除配置</el-button>
                </template>
              </el-popconfirm>
              <el-button
                type="primary"
                :loading="savingWebSearch"
                :disabled="!webSearchForm.provider"
                @click="saveWebSearchConfig"
              >
                保存联网配置
              </el-button>
            </div>
          </el-form>
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
import {
  getApiBaseUrl,
  getApiErrorMessage,
  resetApiBaseUrl,
  setApiBaseUrl,
  systemApi,
  toolSettingsApi,
} from '@/api'

interface WebSearchProvider {
  key: string
  name: string
  description: string
  region: string
  requiresApiKey: boolean
  requiresBaseUrl: boolean
  apiKeyUrl: string
}

interface WebSearchConfig {
  provider: string | null
  baseUrl: string | null
  hasApiKey: boolean
  configured: boolean
  source: 'local' | 'environment' | 'none'
}

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
const webSearchProviders = ref<WebSearchProvider[]>([])
const webSearchConfig = ref<WebSearchConfig>({
  provider: null,
  baseUrl: null,
  hasApiKey: false,
  configured: false,
  source: 'none',
})
const webSearchForm = ref({ provider: '', apiKey: '', baseUrl: '' })
const loadingWebSearch = ref(false)
const savingWebSearch = ref(false)
const selectedSearchProvider = computed(() =>
  webSearchProviders.value.find((provider) => provider.key === webSearchForm.value.provider) || null,
)

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
  await Promise.allSettled([checkBackendHealth(), loadWebSearchConfig()])
})

async function loadWebSearchConfig() {
  loadingWebSearch.value = true
  try {
    const [providersResponse, configResponse] = await Promise.all([
      toolSettingsApi.getWebSearchProviders(),
      toolSettingsApi.getWebSearch(),
    ])
    webSearchProviders.value = providersResponse.data
    webSearchConfig.value = configResponse.data
    webSearchForm.value = {
      provider: configResponse.data.provider || providersResponse.data[0]?.key || '',
      apiKey: '',
      baseUrl: configResponse.data.baseUrl || '',
    }
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loadingWebSearch.value = false
  }
}

function handleSearchProviderChange(provider: string) {
  webSearchForm.value.apiKey = ''
  webSearchForm.value.baseUrl =
    webSearchConfig.value.provider === provider ? webSearchConfig.value.baseUrl || '' : ''
}

async function saveWebSearchConfig() {
  savingWebSearch.value = true
  try {
    const { data } = await toolSettingsApi.saveWebSearch({
      provider: webSearchForm.value.provider,
      apiKey: webSearchForm.value.apiKey.trim() || undefined,
      baseUrl: webSearchForm.value.baseUrl.trim() || undefined,
    })
    webSearchConfig.value = data
    webSearchForm.value.apiKey = ''
    ElMessage.success('联网搜索配置已保存在本机')
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    savingWebSearch.value = false
  }
}

async function clearWebSearchConfig() {
  savingWebSearch.value = true
  try {
    const { data } = await toolSettingsApi.clearWebSearch()
    webSearchConfig.value = data
    webSearchForm.value.apiKey = ''
    webSearchForm.value.baseUrl = data.baseUrl || ''
    ElMessage.success('已清除本机联网搜索配置')
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    savingWebSearch.value = false
  }
}

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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  grid-auto-flow: dense;
  gap: 20px;
}

.settings-card {
  background: #fff;
  border: 1px solid #e5e7ed;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(31, 36, 61, 0.04);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.settings-card:hover {
  border-color: #d7d9e2;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 22px 14px;
  border-bottom: 1px solid #f5f5f5;
}

.card-heading {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-subtitle {
  color: #969aaa;
  font-size: 11px;
}

.config-status {
  margin-left: auto;
}

.card-icon {
  color: #4d857f;
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

.search-settings-card {
  grid-column: 1 / -1;
}

.search-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 18px;
}

.provider-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.provider-option small {
  color: #9a9ead;
}

.provider-detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: -2px 0 16px;
  padding: 10px 12px;
  border: 1px solid #e8e9ee;
  border-radius: 8px;
  background: #fafbfc;
}

.provider-detail > div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.provider-detail strong {
  flex-shrink: 0;
  color: #44495b;
  font-size: 12px;
}

.provider-detail span {
  color: #808596;
  font-size: 11px;
}

.provider-detail a {
  flex-shrink: 0;
  color: #3f756f;
  font-size: 12px;
  text-decoration: none;
}

.provider-detail a:hover {
  text-decoration: underline;
}

.search-actions {
  justify-content: flex-end;
}

.search-actions .el-button {
  flex: 0 0 auto;
  min-width: 120px;
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

  .search-form-grid {
    grid-template-columns: 1fr;
  }

  .provider-detail,
  .provider-detail > div {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-actions .el-button {
    width: 100%;
  }
}
</style>
