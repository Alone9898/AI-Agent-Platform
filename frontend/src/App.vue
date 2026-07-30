<template>
  <!-- 登录页不显示侧边栏 -->
  <router-view v-if="isLoginPage" />

  <!-- 主布局 -->
  <el-container v-else class="app-container">
    <el-aside width="248px" class="app-aside">
      <div class="aside-grid"></div>
      <div class="aside-glow"></div>

      <div class="logo-area">
        <div class="logo-icon">
          <el-icon :size="22"><Cpu /></el-icon>
        </div>
        <div class="logo-copy">
          <strong class="logo-text">AI Agent</strong>
          <span class="logo-subtitle">PLATFORM</span>
        </div>
      </div>

      <div class="workspace-badge">
        <span class="workspace-dot"></span>
        <div>
          <strong>LOCAL WORKSPACE</strong>
          <span>桌面智能工作台</span>
        </div>
      </div>

      <div class="menu-label">工作台</div>
      <el-menu
        :default-active="currentRoute"
        background-color="transparent"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
        router
        class="sidebar-menu"
      >
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <span>对话系统</span>
        </el-menu-item>
        <el-menu-item index="/agents">
          <el-icon><User /></el-icon>
          <span>Agent 管理</span>
        </el-menu-item>
        <el-menu-item index="/skills">
          <el-icon><MagicStick /></el-icon>
          <span>Skill 管理</span>
        </el-menu-item>
        <el-menu-item index="/models">
          <el-icon><Cpu /></el-icon>
          <span>Model 管理</span>
        </el-menu-item>
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <span>系统设置</span>
        </el-menu-item>
      </el-menu>

      <!-- 底部用户信息 -->
      <div class="user-area">
        <span class="user-area-label">当前账号</span>
        <el-dropdown trigger="click" @command="handleUserCommand" class="user-dropdown">
          <div class="user-info">
            <div class="user-avatar">{{ avatarChar }}</div>
            <div class="user-detail">
              <span class="user-name">{{ authStore.user?.username || '用户' }}</span>
              <span class="user-role">{{ authStore.user?.nickname || roleLabel }}</span>
            </div>
            <div class="dropdown-trigger">
              <el-icon><ArrowDown /></el-icon>
            </div>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon> 个人信息
              </el-dropdown-item>
              <el-dropdown-item command="password">
                <el-icon><Lock /></el-icon> 修改密码
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <el-container class="workspace-container">
      <el-header height="78px" class="app-header">
        <div class="header-context">
          <span class="header-eyebrow">AI AGENT OPERATING SYSTEM</span>
          <strong>智能工作台</strong>
        </div>
        <div class="runtime-status">
          <span class="runtime-dot"></span>
          <div>
            <strong>本地模式</strong>
            <span>数据与服务运行于本机</span>
          </div>
        </div>
      </el-header>

      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 个人信息对话框 -->
    <el-dialog v-model="profileDialogVisible" title="个人信息" width="440px" destroy-on-close>
      <div class="profile-header">
        <div class="profile-avatar">{{ avatarChar }}</div>
        <div class="profile-info">
          <h3>{{ authStore.user?.nickname || authStore.user?.username }}</h3>
          <span>{{ roleLabel }}</span>
        </div>
      </div>
      <el-form :model="profileForm" label-width="80px" style="margin-top: 20px">
        <el-form-item label="用户名">
          <el-input :model-value="authStore.user?.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" placeholder="设置一个昵称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveProfile">保存</el-button>
      </template>
    </el-dialog>

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="440px" destroy-on-close>
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="100px">
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input v-model="pwdForm.oldPassword" type="password" placeholder="请输入当前密码" show-password />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Cpu, User, MagicStick, Setting, Lock, ArrowDown, SwitchButton, ChatDotRound } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentRoute = computed(() => route.path)
const isLoginPage = computed(() => route.path === '/login')

const avatarChar = computed(() => {
  const name = authStore.user?.nickname || authStore.user?.username || ''
  return name.charAt(name.length - 1) || '?'
})

const roleLabel = computed(() => {
  const role = authStore.user?.role
  if (role === 'admin') return '管理员'
  if (role === 'editor') return '编辑者'
  return '普通用户'
})

// ===== 用户菜单 =====
const profileDialogVisible = ref(false)
const passwordDialogVisible = ref(false)
const profileForm = reactive({ nickname: '' })

function handleUserCommand(cmd: string) {
  if (cmd === 'profile') {
    profileForm.nickname = authStore.user?.nickname || ''
    profileDialogVisible.value = true
  } else if (cmd === 'password') {
    pwdForm.oldPassword = ''
    pwdForm.newPassword = ''
    pwdForm.confirmPassword = ''
    passwordDialogVisible.value = true
  } else if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      authStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
    }).catch(() => {})
  }
}

async function handleSaveProfile() {
  try {
    await authStore.updateProfile({ nickname: profileForm.nickname })
    ElMessage.success('昵称已更新')
    profileDialogVisible.value = false
  } catch {
    ElMessage.error('保存失败')
  }
}

// ===== 修改密码 =====
const pwdFormRef = ref()
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const pwdRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== pwdForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function handleChangePassword() {
  const valid = await pwdFormRef.value?.validate().catch(() => false)
  if (!valid) return

  try {
    await authStore.changePassword(pwdForm.oldPassword, pwdForm.newPassword)
    ElMessage.success('密码修改成功')
    passwordDialogVisible.value = false
  } catch (err: any) {
    ElMessage.error(err.message || '密码修改失败')
  }
}
</script>

<style>
:root {
  --app-accent: #7466ef;
  --app-accent-deep: #6352d2;
  --app-ink: #171b2d;
  --app-muted: #8b90a3;
  --app-border: #e6e8ef;
  --app-surface: #ffffff;
  --app-canvas: #f3f5f9;
  --el-color-primary: #7466ef;
  --el-color-primary-light-3: #978cf4;
  --el-color-primary-light-5: #b9b1f7;
  --el-color-primary-light-7: #d8d4fb;
  --el-color-primary-light-8: #e7e4fd;
  --el-color-primary-light-9: #f2f0fe;
  --el-color-primary-dark-2: #5d52bf;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
}

body {
  color: var(--app-ink);
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: var(--app-canvas);
  -webkit-font-smoothing: antialiased;
}

.app-container {
  height: 100vh;
  overflow: hidden;
  background: var(--app-canvas);
}

.app-aside {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.055);
  background:
    radial-gradient(circle at 14% 2%, rgba(122, 103, 246, 0.16), transparent 30%),
    linear-gradient(165deg, #151a2f 0%, #181e35 60%, #1d233e 100%);
  box-shadow: 10px 0 36px rgba(29, 33, 56, 0.08);
  transition: width 0.25s ease;
}

.aside-grid {
  position: absolute;
  inset: 0;
  opacity: 0.18;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 38px 38px;
  mask-image: linear-gradient(to bottom, #000, transparent 62%);
}

.aside-glow {
  position: absolute;
  width: 220px;
  height: 220px;
  right: -140px;
  top: 28%;
  border-radius: 50%;
  pointer-events: none;
  background: rgba(116, 102, 239, 0.13);
  box-shadow: 0 0 70px rgba(116, 102, 239, 0.16);
}

.logo-area {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 28px 22px 22px;
}

.logo-icon {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 13px;
  color: #fff;
  background: linear-gradient(145deg, #8b7df8 0%, #6654d5 100%);
  box-shadow: 0 12px 25px rgba(93, 75, 200, 0.3), inset 0 1px rgba(255, 255, 255, 0.24);
}

.logo-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-text {
  color: rgba(255, 255, 255, 0.96);
  font-size: 16px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.logo-subtitle {
  color: rgba(255, 255, 255, 0.3);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 2.5px;
}

.workspace-badge {
  position: relative;
  z-index: 1;
  margin: 2px 14px 30px;
  padding: 12px 13px;
  display: flex;
  align-items: center;
  gap: 11px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.035);
}

.workspace-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #61dcad;
  box-shadow: 0 0 0 5px rgba(97, 220, 173, 0.08), 0 0 14px rgba(97, 220, 173, 0.55);
}

.workspace-badge > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.workspace-badge strong {
  color: rgba(255, 255, 255, 0.62);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 1.1px;
}

.workspace-badge span:last-child {
  color: rgba(255, 255, 255, 0.3);
  font-size: 10px;
}

.menu-label {
  position: relative;
  z-index: 1;
  margin: 0 24px 9px;
  color: rgba(255, 255, 255, 0.24);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.6px;
}

.sidebar-menu {
  position: relative;
  z-index: 1;
  border-right: none !important;
  flex: 1;
}

.sidebar-menu .el-menu-item {
  height: 48px;
  margin: 4px 12px;
  padding: 0 12px !important;
  gap: 11px;
  border: 1px solid transparent;
  border-radius: 11px;
  color: rgba(231, 234, 249, 0.55) !important;
  font-size: 13px;
  transition: color 0.22s ease, background 0.22s ease, border-color 0.22s ease, transform 0.22s ease;
}

.sidebar-menu .el-menu-item:hover {
  color: rgba(255, 255, 255, 0.9) !important;
  background: rgba(255, 255, 255, 0.045) !important;
  transform: translateX(2px);
}

.sidebar-menu .el-menu-item.is-active {
  border-color: rgba(151, 137, 255, 0.16);
  background: linear-gradient(100deg, rgba(116, 102, 239, 0.2), rgba(116, 102, 239, 0.07)) !important;
  color: #fff !important;
  font-weight: 600;
  box-shadow: inset 3px 0 0 #8f82fa;
}

.sidebar-menu .el-menu-item .el-icon {
  width: 30px;
  height: 30px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 16px;
  transition: color 0.22s ease, background 0.22s ease;
}

.sidebar-menu .el-menu-item.is-active .el-icon {
  color: #b8afff;
  background: rgba(137, 120, 255, 0.13);
}

/* ========== 底部用户区域 ========== */
.user-area {
  position: relative;
  z-index: 1;
  padding: 14px 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-area-label {
  display: block;
  margin: 0 10px 8px;
  color: rgba(255, 255, 255, 0.22);
  font-size: 9px;
  letter-spacing: 1.2px;
}

.user-dropdown {
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.065);
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.035);
  transition: border-color 0.22s ease, background 0.22s ease;
}

.user-info:hover {
  border-color: rgba(149, 135, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
}

.user-avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 11px;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(145deg, #8173f2, #5f50c9);
  box-shadow: 0 8px 16px rgba(83, 67, 181, 0.22);
}

.user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  color: rgba(255, 255, 255, 0.88);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  color: rgba(255, 255, 255, 0.34);
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-trigger {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.3);
  font-size: 11px;
  background: rgba(255, 255, 255, 0.04);
}

/* ========== 主内容区 ========== */
.workspace-container {
  min-width: 0;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 100% 0%, rgba(116, 102, 239, 0.055), transparent 26%),
    var(--app-canvas);
}

.app-header {
  flex-shrink: 0;
  padding: 17px 28px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
}

.header-context {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.header-eyebrow {
  color: #a4a8b8;
  font-size: 8px;
  font-weight: 650;
  letter-spacing: 1.5px;
}

.header-context strong {
  color: #262b3e;
  font-size: 13px;
  font-weight: 650;
}

.runtime-status {
  padding: 8px 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(222, 225, 234, 0.9);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 6px 18px rgba(40, 44, 68, 0.035);
  backdrop-filter: blur(10px);
}

.runtime-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ecb98;
  box-shadow: 0 0 0 5px rgba(78, 203, 152, 0.09), 0 0 10px rgba(78, 203, 152, 0.45);
}

.runtime-status > div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.runtime-status strong {
  color: #52576a;
  font-size: 10px;
  font-weight: 650;
}

.runtime-status span:last-child {
  color: #a1a5b5;
  font-size: 8px;
}

.app-main {
  min-width: 0;
  padding: 18px 28px 28px;
  overflow-y: auto;
  background: transparent;
}

.el-table {
  --el-table-border-color: #eceef3;
  --el-table-row-hover-bg-color: #f7f6ff;
  border-radius: 12px;
  overflow: hidden;
}

.el-table th.el-table__cell {
  background-color: #f8f9fc !important;
  font-weight: 600;
  color: #575c70;
  font-size: 12px;
}

.el-table .el-table__row:hover > td {
  background-color: #f7f6ff !important;
}

.el-button {
  border-radius: 9px;
  font-weight: 550;
}

.el-button--primary:not(.is-link):not(.is-text) {
  border-color: transparent;
  background: linear-gradient(135deg, #796bf1 0%, #6654d5 100%);
  box-shadow: 0 7px 16px rgba(102, 84, 213, 0.15);
}

.el-button--primary:not(.is-link):not(.is-text):hover {
  border-color: transparent;
  filter: brightness(1.04);
  box-shadow: 0 9px 20px rgba(102, 84, 213, 0.22);
}

.el-input__wrapper,
.el-select__wrapper,
.el-textarea__inner {
  border-radius: 9px;
}

.el-card,
.table-card,
.settings-card {
  border-color: var(--app-border) !important;
  box-shadow: 0 10px 28px rgba(31, 36, 61, 0.045) !important;
}

.el-dialog {
  border: 1px solid rgba(230, 232, 239, 0.9);
  border-radius: 18px !important;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(28, 32, 54, 0.18) !important;
}

.el-dialog__header {
  padding: 22px 24px 18px !important;
  border-bottom: 1px solid #eff0f4;
  margin-right: 0 !important;
}

.el-dialog__title {
  color: #24283a;
  font-size: 16px;
  font-weight: 680;
}

.el-dialog__body {
  padding: 22px 24px !important;
}

.el-dialog__footer {
  padding: 16px 24px 20px !important;
  border-top: 1px solid #eff0f4;
  background: #fbfbfd;
}

.app-main > div {
  animation: fadeIn 0.32s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(7px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.app-main::-webkit-scrollbar {
  width: 7px;
}

.app-main::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 8px;
  background: #c8cbd6;
  background-clip: padding-box;
}

.app-main::-webkit-scrollbar-track {
  background: transparent;
}

/* ========== 个人信息对话框 ========== */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 17px;
  border: 1px solid #e9e6fd;
  border-radius: 14px;
  background:
    radial-gradient(circle at 100% 0%, rgba(116, 102, 239, 0.12), transparent 42%),
    #f7f6fe;
}

.profile-avatar {
  width: 54px;
  height: 54px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 15px;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(145deg, #8375f2, #6251cf);
  box-shadow: 0 10px 20px rgba(101, 83, 210, 0.22);
}

.profile-info h3 {
  margin: 0 0 5px;
  color: #292d40;
  font-size: 17px;
  font-weight: 680;
}

.profile-info span {
  color: #9498a9;
  font-size: 11px;
}

@media (max-width: 1080px) {
  .app-aside {
    width: 218px !important;
  }

  .logo-area {
    padding-left: 18px;
    padding-right: 18px;
  }

  .workspace-badge {
    margin-left: 12px;
    margin-right: 12px;
  }

  .app-header,
  .app-main {
    padding-left: 22px;
    padding-right: 22px;
  }
}

@media (max-width: 820px) {
  .app-aside {
    width: 76px !important;
  }

  .logo-area {
    justify-content: center;
    padding: 24px 10px 30px;
  }

  .logo-copy,
  .workspace-badge,
  .menu-label,
  .sidebar-menu .el-menu-item span,
  .user-area-label,
  .user-detail,
  .dropdown-trigger {
    display: none;
  }

  .sidebar-menu .el-menu-item {
    padding: 0 !important;
    justify-content: center;
    gap: 0;
    margin-left: 10px;
    margin-right: 10px;
  }

  .sidebar-menu .el-menu-item:hover {
    transform: none;
  }

  .sidebar-menu .el-menu-item.is-active {
    box-shadow: none;
  }

  .user-area {
    padding: 12px 9px 16px;
  }

  .user-info {
    justify-content: center;
    padding: 8px;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
  }

  .app-header {
    padding-left: 18px;
    padding-right: 18px;
  }

  .app-main {
    padding-left: 18px;
    padding-right: 18px;
  }
}

@media (max-width: 560px) {
  .app-header {
    height: 66px !important;
  }

  .header-eyebrow,
  .runtime-status span:last-child {
    display: none;
  }

  .runtime-status {
    padding: 8px 10px;
  }

  .app-main {
    padding-top: 12px;
    padding-left: 14px;
    padding-right: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-main > div {
    animation: none;
  }

  .app-aside,
  .sidebar-menu .el-menu-item {
    transition: none;
  }
}
</style>
