<template>
  <div class="login-page">
    <section class="brand-panel">
      <div class="brand-glow brand-glow-primary"></div>
      <div class="brand-glow brand-glow-secondary"></div>
      <div class="brand-grid"></div>

      <header class="brand-header">
        <div class="brand-logo">
          <el-icon :size="22"><Cpu /></el-icon>
        </div>
        <div class="brand-name">
          <strong>AI Agent</strong>
          <span>PLATFORM</span>
        </div>
      </header>

      <div class="brand-content">
        <div class="eyebrow">
          <span class="eyebrow-dot"></span>
          DESKTOP AI WORKSPACE
        </div>
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
        <span><i class="status-light"></i> Local workspace ready</span>
        <span>TAURI · VUE · NESTJS</span>
      </footer>
    </section>

    <main class="login-panel">
      <div class="login-shell">
        <div class="mobile-brand">
          <div class="brand-logo">
            <el-icon :size="20"><Cpu /></el-icon>
          </div>
          <strong>AI Agent</strong>
        </div>

        <div class="login-header">
          <span class="login-kicker">WELCOME BACK</span>
          <h2>欢迎回来</h2>
          <p>登录账号，继续构建你的 AI 团队</p>
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

      <footer class="login-footer">AI Agent Platform · 本地智能工作台</footer>
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
    router.push('/agents')
  } catch (error: any) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  --brand-bg: #151a2f;
  --brand-bg-light: #202745;
  --accent: #7667f5;
  --accent-light: #9f94ff;
  --ink: #171b2d;
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(520px, 1.15fr) minmax(420px, 0.85fr);
  overflow: hidden;
  background: #f6f7fb;
}

.brand-panel {
  position: relative;
  min-height: 100vh;
  padding: 44px clamp(44px, 6vw, 92px) 36px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  background:
    radial-gradient(circle at 12% 10%, rgba(124, 105, 255, 0.18), transparent 30%),
    linear-gradient(145deg, var(--brand-bg) 0%, #181e36 52%, var(--brand-bg-light) 100%);
}

.brand-grid {
  position: absolute;
  inset: 0;
  opacity: 0.28;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom right, #000 0%, transparent 70%);
}

.brand-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(4px);
  pointer-events: none;
}

.brand-glow-primary {
  width: 420px;
  height: 420px;
  right: -170px;
  top: 15%;
  background: rgba(118, 103, 245, 0.2);
  box-shadow: 0 0 100px rgba(118, 103, 245, 0.24);
}

.brand-glow-secondary {
  width: 260px;
  height: 260px;
  left: 18%;
  bottom: -170px;
  background: rgba(49, 201, 190, 0.12);
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
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, rgba(144, 128, 255, 0.95), rgba(103, 83, 220, 0.9));
  box-shadow: 0 12px 30px rgba(83, 66, 190, 0.32), inset 0 1px rgba(255, 255, 255, 0.25);
}

.brand-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name strong {
  font-size: 17px;
  line-height: 1;
  letter-spacing: 0.2px;
}

.brand-name span {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.42);
  letter-spacing: 2.6px;
}

.brand-content {
  width: 100%;
  max-width: 690px;
  margin: auto 0;
  padding: 60px 0;
  animation: content-in 0.7s ease both;
}

.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 24px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 2.1px;
}

.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #72e3d5;
  box-shadow: 0 0 0 5px rgba(114, 227, 213, 0.1), 0 0 16px rgba(114, 227, 213, 0.75);
}

.brand-content h1 {
  margin: 0;
  font-size: clamp(38px, 4.1vw, 62px);
  line-height: 1.18;
  font-weight: 720;
  letter-spacing: -2.2px;
}

.brand-content h1 span {
  display: block;
  color: var(--accent-light);
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
  backdrop-filter: blur(10px);
  transition: transform 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.capability-card:hover {
  transform: translateY(-3px);
  border-color: rgba(159, 148, 255, 0.28);
  background: rgba(255, 255, 255, 0.07);
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
  color: #a99eff;
  background: rgba(137, 119, 255, 0.14);
}

.skill-icon {
  color: #72e3d5;
  background: rgba(73, 203, 190, 0.12);
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.3);
  font-size: 9px;
  letter-spacing: 1.4px;
}

.brand-footer span:first-child {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.status-light {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #55d8a7;
  box-shadow: 0 0 10px rgba(85, 216, 167, 0.8);
}

.login-panel {
  position: relative;
  min-height: 100vh;
  padding: 48px clamp(42px, 5vw, 76px) 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 100% 0%, rgba(118, 103, 245, 0.07), transparent 28%),
    #f7f8fc;
}

.login-shell {
  width: 100%;
  max-width: 390px;
  animation: login-in 0.65s 0.08s ease both;
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

.mobile-brand strong {
  font-size: 17px;
}

.login-header {
  margin-bottom: 34px;
}

.login-kicker {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2.1px;
}

.login-header h2 {
  margin: 12px 0 9px;
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
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 0 0 1px #e3e5ed inset, 0 4px 12px rgba(38, 43, 72, 0.025);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cfd2df inset, 0 5px 14px rgba(38, 43, 72, 0.04);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1.5px var(--accent) inset, 0 0 0 4px rgba(118, 103, 245, 0.08);
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
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #7163ed 0%, #6754d6 100%);
  border: none;
  box-shadow: 0 12px 24px rgba(103, 84, 214, 0.2);
  transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
}

.login-btn:hover {
  transform: translateY(-2px);
  filter: brightness(1.04);
  box-shadow: 0 16px 28px rgba(103, 84, 214, 0.28);
}

.login-btn:active {
  transform: translateY(0);
}

.account-tip {
  margin-top: 28px;
  padding: 13px 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #e9eaf1;
  border-radius: 12px;
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
  color: #7566e8;
  font-size: 14px;
  background: #efedff;
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
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes login-in {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
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
    background: #f7f8fc;
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

  .eyebrow {
    margin-bottom: 16px;
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
