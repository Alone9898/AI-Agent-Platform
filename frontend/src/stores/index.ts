import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi, skillApi, modelApi, authApi } from '@/api'

// 默认用户（客户端模拟用）
const DEFAULT_USER = { username: 'admin', password: '123456', nickname: '管理员', role: 'admin' }

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || '')
  const user = ref<any>(JSON.parse(localStorage.getItem('auth_user') || 'null'))

  function isLoggedIn() {
    return !!token.value
  }

  async function login(username: string, password: string) {
    // TODO: 后端就绪后取消注释，删除模拟逻辑
    // const { data } = await authApi.login(username, password)
    // token.value = data.token
    // user.value = data.user
    // localStorage.setItem('auth_token', data.token)
    // localStorage.setItem('auth_user', JSON.stringify(data.user))

    // 客户端模拟
    if (username === DEFAULT_USER.username && password === DEFAULT_USER.password) {
      const mockToken = 'mock-jwt-token-' + Date.now()
      const mockUser = { id: 1, username: DEFAULT_USER.username, nickname: DEFAULT_USER.nickname, role: DEFAULT_USER.role, avatar: null }
      token.value = mockToken
      user.value = mockUser
      localStorage.setItem('auth_token', mockToken)
      localStorage.setItem('auth_user', JSON.stringify(mockUser))
      return { token: mockToken, user: mockUser }
    }
    throw new Error('用户名或密码错误')
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    // TODO: 后端就绪后取消注释
    // await authApi.changePassword(oldPassword, newPassword)
    if (oldPassword !== DEFAULT_USER.password) {
      throw new Error('原密码错误')
    }
    DEFAULT_USER.password = newPassword
    return { message: '密码修改成功' }
  }

  async function updateProfile(data: { nickname?: string; avatar?: string }) {
    // TODO: 后端就绪后取消注释
    // const { data: updated } = await authApi.updateProfile(data)
    // user.value = updated
    if (data.nickname) {
      user.value = { ...user.value, nickname: data.nickname }
      localStorage.setItem('auth_user', JSON.stringify(user.value))
    }
    return user.value
  }

  return { token, user, isLoggedIn, login, logout, changePassword, updateProfile }
})

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<any[]>([])
  const loading = ref(false)

  async function fetchAgents() {
    loading.value = true
    try {
      const { data } = await agentApi.findAll()
      agents.value = data
    } finally {
      loading.value = false
    }
  }

  async function createAgent(payload: any) {
    const { data } = await agentApi.create(payload)
    await fetchAgents()
    return data
  }

  async function updateAgent(id: number, payload: any) {
    const { data } = await agentApi.update(id, payload)
    await fetchAgents()
    return data
  }

  async function deleteAgent(id: number) {
    await agentApi.remove(id)
    await fetchAgents()
  }

  async function bindSkills(id: number, skillIds: number[]) {
    await agentApi.bindSkills(id, skillIds)
    await fetchAgents()
  }

  async function bindModel(id: number, modelId: number) {
    await agentApi.bindModel(id, modelId)
    await fetchAgents()
  }

  return { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent, bindSkills, bindModel }
})

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<any[]>([])
  const loading = ref(false)
  const presets = ref<any[]>([])

  async function fetchSkills() {
    loading.value = true
    try {
      const { data } = await skillApi.findAll()
      skills.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchPresets() {
    const { data } = await skillApi.getPresets()
    presets.value = data
    return data
  }

  async function importPreset(preset: any) {
    const { data } = await skillApi.create({
      name: preset.name,
      description: preset.description,
      prompt: preset.prompt,
    })
    await fetchSkills()
    return data
  }

  async function createSkill(payload: any) {
    const { data } = await skillApi.create(payload)
    await fetchSkills()
    return data
  }

  async function updateSkill(id: number, payload: any) {
    const { data } = await skillApi.update(id, payload)
    await fetchSkills()
    return data
  }

  async function deleteSkill(id: number) {
    await skillApi.remove(id)
    await fetchSkills()
  }

  return { skills, loading, presets, fetchSkills, fetchPresets, importPreset, createSkill, updateSkill, deleteSkill }
})

export const useModelStore = defineStore('model', () => {
  const models = ref<any[]>([])
  const loading = ref(false)
  const providerPresets = ref<any[]>([])

  async function fetchModels() {
    loading.value = true
    try {
      const { data } = await modelApi.findAll()
      models.value = data
    } finally {
      loading.value = false
    }
  }

  async function fetchProviderPresets() {
    const { data } = await modelApi.getProviderPresets()
    providerPresets.value = data
    return data
  }

  async function createModel(payload: any) {
    const { data } = await modelApi.create(payload)
    await fetchModels()
    return data
  }

  async function updateModel(id: number, payload: any) {
    const { data } = await modelApi.update(id, payload)
    await fetchModels()
    return data
  }

  async function deleteModel(id: number) {
    await modelApi.remove(id)
    await fetchModels()
  }

  return { models, loading, providerPresets, fetchModels, fetchProviderPresets, createModel, updateModel, deleteModel }
})
