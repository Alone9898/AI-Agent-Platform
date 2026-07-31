import { defineStore } from 'pinia'
import { ref } from 'vue'
import { agentApi, skillApi, modelApi, authApi } from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || '')
  const user = ref<any>(JSON.parse(localStorage.getItem('auth_user') || 'null'))

  function isLoggedIn() {
    return !!token.value
  }

  async function login(username: string, password: string) {
    const { data } = await authApi.login(username, password)
    token.value = data.token
    user.value = data.user
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('auth_user', JSON.stringify(data.user))
    return data
  }

  async function loadCurrentUser() {
    if (!token.value) return null
    const { data } = await authApi.getMe()
    user.value = data
    localStorage.setItem('auth_user', JSON.stringify(data))
    return data
  }

  async function logout() {
    try {
      if (token.value) {
        await authApi.logout()
      }
    } catch {
      // Logout should always clear local state even if the backend session endpoint fails.
    } finally {
      token.value = ''
      user.value = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    }
  }

  async function changePassword(oldPassword: string, newPassword: string) {
    const { data } = await authApi.changePassword(oldPassword, newPassword)
    return data
  }

  async function updateProfile(data: { nickname?: string; avatar?: string }) {
    const { data: updated } = await authApi.updateProfile(data)
    user.value = updated
    localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  return {
    token,
    user,
    isLoggedIn,
    login,
    loadCurrentUser,
    logout,
    changePassword,
    updateProfile,
  }
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

  async function bindModel(id: number, modelId: number | null) {
    await agentApi.bindModel(id, modelId)
    await fetchAgents()
  }

  return { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent, bindSkills, bindModel }
})

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<any[]>([])
  const pagedSkills = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)
  const pageLoading = ref(false)
  const presets = ref<any[]>([])
  let pageRequestId = 0

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

  async function fetchSkillPage(params: {
    page?: number
    pageSize?: number
    keyword?: string
    type?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}) {
    const requestId = ++pageRequestId
    pageLoading.value = true
    try {
      const { data } = await skillApi.findPage(params)
      if (requestId === pageRequestId) {
        pagedSkills.value = data.items
        total.value = data.total
      }
      return data
    } finally {
      if (requestId === pageRequestId) {
        pageLoading.value = false
      }
    }
  }

  async function importPreset(preset: any) {
    const { data } = await skillApi.create({
      name: preset.name,
      description: preset.description,
      type: preset.type || 'prompt',
      prompt: preset.prompt,
      tools: preset.tools,
    })
    skills.value.unshift(data)
    const importedPreset = presets.value.find((item: any) => item.key === preset.key)
    if (importedPreset) importedPreset.imported = true
    return data
  }

  async function createSkill(payload: any) {
    const { data } = await skillApi.create(payload)
    skills.value.unshift(data)
    return data
  }

  async function updateSkill(id: number, payload: any) {
    const { data } = await skillApi.update(id, payload)
    const index = skills.value.findIndex((skill: any) => skill.id === id)
    if (index !== -1) skills.value[index] = data
    return data
  }

  async function deleteSkill(id: number) {
    await skillApi.remove(id)
    skills.value = skills.value.filter((skill: any) => skill.id !== id)
  }

  return {
    skills,
    pagedSkills,
    total,
    loading,
    pageLoading,
    presets,
    fetchSkills,
    fetchSkillPage,
    fetchPresets,
    importPreset,
    createSkill,
    updateSkill,
    deleteSkill,
  }
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
