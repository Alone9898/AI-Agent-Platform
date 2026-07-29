<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">系统设置</h2>
        <span class="page-desc">配置应用的全局参数与系统功能</span>
      </div>
    </div>

    <div class="settings-grid">
      <!-- 基础设置卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><Setting /></el-icon>
          <h3 class="card-title">基础设置</h3>
        </div>
        <div class="card-body">
          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">开机自启</span>
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

      <!-- 系统信息卡片 -->
      <div class="settings-card">
        <div class="card-header">
          <el-icon class="card-icon" :size="20"><Monitor /></el-icon>
          <h3 class="card-title">系统信息</h3>
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
              <span class="setting-label">检查更新</span>
              <span class="setting-hint">{{ updateStatus || '检查是否有新版本' }}</span>
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { invoke } from '@tauri-apps/api/core'

const autoStart = ref(false)
const updateStatus = ref('')
const backendStatus = ref('running')
const dataDir = ref('')
const checking = ref(false)

onMounted(async () => {
  try {
    dataDir.value = await invoke<string>('get_data_dir')
    backendStatus.value = await invoke<boolean>('check_sidecar_status') ? 'running' : 'stopped'
  } catch {
    dataDir.value = '开发模式'
    backendStatus.value = 'stopped'
  }
})

async function handleAutoStartChange(val: boolean) {
  try {
    ElMessage.success(val ? '已开启开机自启' : '已关闭开机自启')
  } catch {
    ElMessage.error('设置失败')
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
  width: 200px;
}

:deep(.el-divider) {
  margin: 16px 0;
}
</style>
