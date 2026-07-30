<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-circle c1"></div>
      <div class="bg-circle c2"></div>
      <div class="bg-circle c3"></div>
    </div>

    <div class="login-card">
      <div class="login-header">
        <div class="login-logo">
          <el-icon :size="28"><Cpu /></el-icon>
        </div>
        <h1 class="login-title">AI Agent Platform</h1>
        <p class="login-subtitle">智能体管理平台</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-divider content-position="center">连接设置</el-divider>

        <el-form-item class="connection-item">
          <el-input
            v-model="backendUrl"
            placeholder="后端地址，例如 http://localhost:3000"
            size="large"
          >
            <template #prefix>
              <el-icon><Link /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <div class="connection-actions">
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

        <p class="backend-hint">
          当前后端地址：{{ currentBackendUrl }}
          <span v-if="backendUrl !== currentBackendUrl" class="backend-hint-ghost">
            · 未保存的修改会在登录时自动应用
          </span>
        </p>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="handleLogin"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span>默认账号：admin / 123456</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Cpu, Link } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores'
import {
  getApiBaseUrl,
  getDefaultApiBaseUrl,
  getApiErrorMessage,
  resetApiBaseUrl,
  setApiBaseUrl,
  systemApi,
} from '@/api'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)
const testingBackend = ref(false)
const savingBackendUrl = ref(false)
const backendUrl = ref(getApiBaseUrl())
const currentBackendUrl = ref(getApiBaseUrl())

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function syncBackendUrl(value: string) {
  backendUrl.value = value
  currentBackendUrl.value = value
}

function persistBackendUrl() {
  const url = backendUrl.value.trim()
  if (!url) {
    const fallback = resetApiBaseUrl()
    syncBackendUrl(fallback)
    return fallback
  }
  const saved = setApiBaseUrl(url)
  syncBackendUrl(saved)
  return saved
}

async function saveBackendUrl() {
  savingBackendUrl.value = true
  try {
    persistBackendUrl()
    ElMessage.success('已保存后端地址')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存后端地址失败')
  } finally {
    savingBackendUrl.value = false
  }
}

async function resetBackendUrl() {
  const fallback = resetApiBaseUrl()
  syncBackendUrl(fallback)
  ElMessage.success('已恢复默认地址')
}

async function testBackendConnection() {
  testingBackend.value = true
  try {
    persistBackendUrl()
    await systemApi.health()
    ElMessage.success('后端连接正常')
  } catch (error: any) {
    const shouldFallback = !error?.response && getApiBaseUrl() !== getDefaultApiBaseUrl()

    if (shouldFallback) {
      const fallback = resetApiBaseUrl()
      syncBackendUrl(fallback)
      try {
        await systemApi.health()
        ElMessage.success('后端连接正常，已切换到本地默认地址')
        return
      } catch (fallbackError: any) {
        ElMessage.error(getApiErrorMessage(fallbackError))
        return
      }
    }

    ElMessage.error(getApiErrorMessage(error))
  } finally {
    testingBackend.value = false
  }
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  persistBackendUrl()

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/agents')
  } catch (error: any) {
    const shouldFallback = !error?.response && getApiBaseUrl() !== getDefaultApiBaseUrl()

    if (shouldFallback) {
      const fallback = resetApiBaseUrl()
      syncBackendUrl(fallback)
      try {
        await authStore.login(form.username, form.password)
        ElMessage.success('登录成功，已切换到本地默认地址')
        router.push('/agents')
        return
      } catch (fallbackError: any) {
        ElMessage.error(getApiErrorMessage(fallbackError))
        return
      }
    }

    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  syncBackendUrl(getApiBaseUrl())
})
</script>

<style scoped>
.login-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.15;
  animation: float 20s infinite ease-in-out;
}

.c1 {
  width: 600px;
  height: 600px;
  background: #fff;
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}

.c2 {
  width: 400px;
  height: 400px;
  background: #fff;
  bottom: -100px;
  right: -50px;
  animation-delay: -7s;
}

.c3 {
  width: 300px;
  height: 300px;
  background: #fff;
  top: 50%;
  left: 60%;
  animation-delay: -14s;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.05);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.95);
  }
}

.login-card {
  width: 440px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 36px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin: 0 auto 16px;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.login-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1f36;
  margin: 0 0 6px;
}

.login-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

.login-form {
  margin-top: 24px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  padding: 4px 12px;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.25s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #667eea inset;
}

.connection-item {
  margin-bottom: 10px;
}

.connection-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.connection-actions .el-button {
  flex: 1;
}

.backend-hint {
  margin: 0 0 18px;
  font-size: 12px;
  color: #8a94a6;
  line-height: 1.5;
}

.backend-hint-ghost {
  color: #a0a6b8;
}

.login-btn {
  width: 100%;
  height: 44px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.25s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.login-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.login-footer span {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
