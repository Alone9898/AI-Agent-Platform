<template>
  <div class="login-page">
    <section class="brand-panel">
      <header class="brand-header">
        <div class="brand-logo">
          <img :src="logoMark" alt="星曜 Agent Platform" />
        </div>
        <div class="brand-name">
          <strong>星曜</strong>
          <span>Agent Platform</span>
        </div>
      </header>

      <div class="brand-content">
        <h1>
          把每个智能体，
          <span>变成你的团队成员。</span>
        </h1>
        <p class="brand-description">
          在一个本地工作台中，统一组织模型、技能与 Agent，搭建真正属于你的 AI 工作流。
        </p>

        <div class="capability-grid">
          <div class="capability-card">
            <div class="capability-icon agent-icon">
              <el-icon><ChatDotRound /></el-icon>
            </div>
            <div>
              <strong>Agent</strong>
              <span>组建智能团队</span>
            </div>
          </div>
          <div class="capability-card">
            <div class="capability-icon skill-icon">
              <el-icon><MagicStick /></el-icon>
            </div>
            <div>
              <strong>Skill</strong>
              <span>沉淀可复用能力</span>
            </div>
          </div>
          <div class="capability-card">
            <div class="capability-icon model-icon">
              <el-icon><Cpu /></el-icon>
            </div>
            <div>
              <strong>Model</strong>
              <span>自由连接多种模型</span>
            </div>
          </div>
        </div>
      </div>

      <footer class="brand-footer">
        本地部署，数据存储于当前设备
      </footer>
    </section>

    <main class="login-panel">
      <div class="login-shell">
        <div class="mobile-brand">
          <div class="brand-logo">
            <img :src="logoMark" alt="星曜 Agent Platform" />
          </div>
          <strong>星曜 Agent Platform</strong>
        </div>

        <div class="login-header">
          <h2>欢迎回来</h2>
          <p>登录后管理你的智能体、技能与模型</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <div class="field-label">用户名</div>
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              size="large"
              autocomplete="username"
            />
          </el-form-item>

          <div class="field-label">密码</div>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item class="submit-item">
            <el-button
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              @click="handleLogin"
            >
              <span>{{ loading ? '正在进入...' : '进入工作台' }}</span>
              <el-icon v-if="!loading"><Right /></el-icon>
            </el-button>
          </el-form-item>
        </el-form>

        <div class="account-tip">
          <div class="account-tip-icon">
            <el-icon><Lock /></el-icon>
          </div>
          <div>
            <span>首次使用默认管理员账号</span>
            <strong>admin&nbsp;&nbsp;/&nbsp;&nbsp;123456</strong>
          </div>
        </div>
      </div>

      <footer class="login-footer">星曜 Agent Platform · 本地智能工作台</footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Cpu, Lock, MagicStick, Right, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores'
import { getApiErrorMessage } from '@/api'
import logoMark from '@/assets/logo-mark.svg'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/home')
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  --brand-bg: #17202a;
  --brand-bg-light: #25333a;
  --accent: #4d857f;
  --accent-light: #9cc1bc;
  --ink: #17202a;
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(520px, 1.15fr) minmax(420px, 0.85fr);
  overflow: hidden;
  background: #f4f6f5;
}

.brand-panel {
  position: relative;
  min-height: 100vh;
  padding: 44px clamp(44px, 6vw, 92px) 36px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  background: var(--brand-bg);
}

.brand-header,
.brand-content,
.brand-footer {
  position: relative;
  z-index: 1;
}

.brand-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-logo {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo img {
  width: 44px;
  height: 44px;
  display: block;
}

.brand-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name strong {
  font-size: 17px;
  line-height: 1;
  letter-spacing: 0;
}

.brand-name span {
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
  line-height: 1;
  font-weight: 600;
}

.brand-content {
  width: 100%;
  max-width: 690px;
  margin: auto 0;
  padding: 60px 0;
  animation: content-in 0.35s ease both;
}

.brand-content h1 {
  margin: 0;
  font-size: clamp(34px, 3.6vw, 52px);
  line-height: 1.18;
  font-weight: 720;
  letter-spacing: -1.5px;
}

.brand-content h1 span {
  display: block;
  color: rgba(255, 255, 255, 0.72);
}

.brand-description {
  max-width: 570px;
  margin: 26px 0 38px;
  color: rgba(230, 233, 250, 0.62);
  font-size: 15px;
  line-height: 1.85;
  letter-spacing: 0.2px;
}

.capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.capability-card {
  min-width: 0;
  padding: 15px 14px;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: #25333a;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.capability-card:hover {
  border-color: rgba(156, 193, 188, 0.32);
  background: #2b3d43;
}

.capability-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
}

.agent-icon {
  color: #b2d6d0;
  background: rgba(100, 182, 172, 0.14);
}

.skill-icon {
  color: #72e3d5;
  background: rgba(100, 182, 172, 0.12);
}

.model-icon {
  color: #7fb6ff;
  background: rgba(85, 151, 255, 0.12);
}

.capability-card > div:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.capability-card strong {
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
  font-weight: 650;
}

.capability-card span {
  overflow: hidden;
  color: rgba(255, 255, 255, 0.4);
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.brand-footer {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.login-panel {
  position: relative;
  min-height: 100vh;
  padding: 48px clamp(42px, 5vw, 76px) 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f4f6f5;
}

.login-shell {
  width: 100%;
  max-width: 390px;
  animation: login-in 0.35s 0.05s ease both;
}

.mobile-brand {
  display: none;
  align-items: center;
  gap: 11px;
  margin-bottom: 58px;
  color: var(--ink);
}

.mobile-brand .brand-logo {
  width: 40px;
  height: 40px;
}

.mobile-brand .brand-logo img {
  width: 40px;
  height: 40px;
}

.mobile-brand strong {
  font-size: 17px;
}

.login-header {
  margin-bottom: 34px;
}

.login-header h2 {
  margin: 0 0 9px;
  color: var(--ink);
  font-size: 32px;
  line-height: 1.2;
  font-weight: 720;
  letter-spacing: -0.8px;
}

.login-header p {
  margin: 0;
  color: #8a8fa3;
  font-size: 13px;
  line-height: 1.6;
}

.login-form {
  width: 100%;
}

.field-label {
  margin: 0 0 9px 2px;
  color: #4e5367;
  font-size: 12px;
  font-weight: 600;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 22px;
}

.login-form :deep(.el-input__wrapper) {
  min-height: 52px;
  padding: 0 16px;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 0 0 1px #e0e2e9 inset;
  transition: box-shadow 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c9ccd7 inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--accent) inset, 0 0 0 4px rgba(77, 133, 127, 0.12);
}

.login-form :deep(.el-input__inner) {
  color: #282d40;
  font-size: 13px;
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #b4b8c7;
}

.login-form :deep(.el-input__prefix) {
  margin-right: 7px;
  color: #a2a6b6;
}

.login-form :deep(.el-form-item__error) {
  padding-top: 5px;
  font-size: 11px;
}

.login-form :deep(.submit-item) {
  margin-top: 30px;
  margin-bottom: 0;
}

.login-btn {
  width: 100%;
  height: 52px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.3px;
  background: var(--accent);
  border: none;
  box-shadow: none;
  transition: background 0.2s ease;
}

.login-btn:hover {
  background: #356e69;
}

.account-tip {
  margin-top: 28px;
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e9eaf1;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.62);
}

.account-tip-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4d857f;
  font-size: 14px;
  background: #e7f1ef;
}

.account-tip > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.account-tip span {
  color: #9a9eae;
  font-size: 10px;
}

.account-tip strong {
  color: #53586c;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.login-footer {
  position: absolute;
  bottom: 24px;
  color: #b1b4c1;
  font-size: 9px;
  letter-spacing: 0.5px;
}

@keyframes content-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes login-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1020px) {
  .login-page {
    grid-template-columns: minmax(430px, 1fr) minmax(390px, 0.86fr);
  }

  .brand-panel {
    padding-left: 42px;
    padding-right: 42px;
  }

  .capability-grid {
    grid-template-columns: 1fr;
    max-width: 300px;
  }

  .capability-card {
    padding: 11px 13px;
  }
}

@media (max-width: 860px) {
  .login-page {
    display: block;
    background: #f4f6f5;
  }

  .brand-panel {
    display: none;
  }

  .login-panel {
    min-height: 100vh;
    padding: 36px 28px 72px;
  }

  .login-shell {
    max-width: 410px;
  }

  .mobile-brand {
    display: flex;
  }
}

@media (max-height: 720px) and (min-width: 861px) {
  .brand-panel {
    padding-top: 30px;
    padding-bottom: 26px;
  }

  .brand-content {
    padding: 28px 0;
  }

  .brand-description {
    margin: 18px 0 24px;
  }

  .login-panel {
    padding-top: 30px;
    padding-bottom: 30px;
  }

  .login-header {
    margin-bottom: 24px;
  }

  .login-form :deep(.el-form-item) {
    margin-bottom: 18px;
  }

  .login-form :deep(.submit-item) {
    margin-top: 22px;
  }

  .account-tip {
    margin-top: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-content,
  .login-shell {
    animation: none;
  }

  .capability-card,
  .login-btn {
    transition: none;
  }
}
</style>
