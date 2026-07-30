<template>
  <!-- 登录页不显示侧边栏 -->
  <router-view v-if="isLoginPage" />

  <!-- 主布局 -->
  <el-container v-else class="app-container">
    <el-aside width="220px" class="app-aside">
      <div class="logo-area">
        <div class="logo-icon">
          <el-icon :size="26"><Cpu /></el-icon>
        </div>
        <span class="logo-text">AI Agent</span>
      </div>
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
        <el-dropdown trigger="click" @command="handleUserCommand" class="user-dropdown">
          <div class="user-info">
            <div class="user-avatar">{{ avatarChar }}</div>
            <div class="user-detail">
              <span class="user-name">{{ authStore.user?.username || '用户' }}</span>
              <span class="user-role">{{ authStore.user?.nickname || roleLabel }}</span>
            </div>
            <el-icon class="dropdown-arrow"><ArrowDown /></el-icon>
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
    <el-main class="app-main">
      <router-view />
    </el-main>

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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  background: #f0f2f5;
}

.app-container {
  height: 100vh;
}

.app-aside {
  background: linear-gradient(180deg, #1a1f36 0%, #242b45 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 8px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.sidebar-menu {
  border-right: none !important;
  flex: 1;
}

.sidebar-menu .el-menu-item {
  height: 46px;
  line-height: 46px;
  margin: 2px 8px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.25s ease;
}

.sidebar-menu .el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.08) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%) !important;
  color: #fff !important;
  font-weight: 600;
}

.sidebar-menu .el-menu-item .el-icon {
  font-size: 18px;
  margin-right: 8px;
}

/* ========== 底部用户区域 ========== */
.user-area {
  padding: 10px 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.user-dropdown {
  width: 100%;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.25s ease;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.08);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}

.user-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.dropdown-arrow {
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
}

/* ========== 主内容区 ========== */
.app-main {
  padding: 24px 28px;
  background: #f0f2f5;
  overflow-y: auto;
}

.el-table {
  border-radius: 8px;
  overflow: hidden;
}

.el-table th.el-table__cell {
  background-color: #fafbfc !important;
  font-weight: 600;
  color: #303133;
  font-size: 13px;
}

.el-table .el-table__row:hover > td {
  background-color: #f5f7ff !important;
}

.el-dialog {
  border-radius: 12px !important;
  overflow: hidden;
}

.el-dialog__header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px !important;
  margin-right: 0 !important;
}

.el-dialog__footer {
  border-top: 1px solid #f0f0f0;
  padding-top: 16px !important;
}

.app-main > div {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.app-main::-webkit-scrollbar {
  width: 6px;
}
.app-main::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}
.app-main::-webkit-scrollbar-track {
  background: transparent;
}

/* ========== 个人信息对话框 ========== */
.profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}

.profile-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1f36;
  margin: 0 0 4px;
}

.profile-info span {
  font-size: 12px;
  color: #909399;
}
</style>
