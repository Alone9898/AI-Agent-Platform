import axios from 'axios'

const API_BASE_URL_STORAGE_KEY = 'app:api-base-url'
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000'

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

function removeStorage(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures in restricted environments.
  }
}

export function getDefaultApiBaseUrl(): string {
  return DEFAULT_API_BASE_URL
}

export function getApiBaseUrl(): string {
  const stored = readStorage(API_BASE_URL_STORAGE_KEY)?.trim()
  return stored ? normalizeBaseUrl(stored) : DEFAULT_API_BASE_URL
}

export function setApiBaseUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl)
  if (!normalized) {
    removeStorage(API_BASE_URL_STORAGE_KEY)
    return getApiBaseUrl()
  }
  writeStorage(API_BASE_URL_STORAGE_KEY, normalized)
  return normalized
}

export function resetApiBaseUrl(): string {
  removeStorage(API_BASE_URL_STORAGE_KEY)
  return getApiBaseUrl()
}

export function getApiErrorMessage(error: any): string {
  const baseUrl = getApiBaseUrl()
  const responseMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.msg

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage.trim()
  }

  if (error?.code === 'ECONNABORTED') {
    return `请求超时，请检查后端是否运行在 ${baseUrl}`
  }

  if (!error?.response) {
    return `无法连接到后端 ${baseUrl}，请确认后端已启动或接口地址是否正确`
  }

  return error?.message || '请求失败'
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000,
})

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()

  const token = readStorage('auth_token')
  if (token) {
    const headers = (config.headers || {}) as Record<string, any>
    headers.Authorization = `Bearer ${token}`
    config.headers = headers as any
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      removeStorage('auth_token')
      removeStorage('auth_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  },
)

export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/auth/password', { oldPassword, newPassword }),
  updateProfile: (data: { nickname?: string; avatar?: string }) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
}

export const systemApi = {
  health: () => api.get('/health'),
}

export const toolSettingsApi = {
  getWebSearchProviders: () => api.get('/tool-settings/web-search/providers'),
  getWebSearch: () => api.get('/tool-settings/web-search'),
  saveWebSearch: (data: { provider: string; apiKey?: string; baseUrl?: string }) =>
    api.put('/tool-settings/web-search', data),
  clearWebSearch: () => api.delete('/tool-settings/web-search'),
}

export const agentApi = {
  findAll: () => api.get('/agents'),
  findOne: (id: number) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: number, data: any) => api.put(`/agents/${id}`, data),
  remove: (id: number) => api.delete(`/agents/${id}`),
  bindSkills: (id: number, skillIds: number[]) => api.post(`/agents/${id}/skills`, { skillIds }),
  bindModel: (id: number, modelId: number | null) =>
    api.post(`/agents/${id}/model`, { modelId }),
}

export const skillApi = {
  findAll: () => api.get('/skills'),
  findPage: (params: {
    page?: number
    pageSize?: number
    keyword?: string
    type?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => api.get('/skills/page', { params }),
  findOne: (id: number) => api.get(`/skills/${id}`),
  create: (data: any) => api.post('/skills', data),
  update: (id: number, data: any) => api.put(`/skills/${id}`, data),
  remove: (id: number) => api.delete(`/skills/${id}`),
  getPresets: () => api.get('/skills/presets'),
}

export const modelApi = {
  findAll: () => api.get('/models'),
  findOne: (id: number) => api.get(`/models/${id}`),
  create: (data: any) => api.post('/models', data),
  update: (id: number, data: any) => api.put(`/models/${id}`, data),
  remove: (id: number) => api.delete(`/models/${id}`),
  getProviderPresets: () => api.get('/models/presets/providers'),
}

export const chatApi = {
  matchSkills: (data: { agentId: number; message: string; includeBoundSkills?: boolean }) =>
    api.post('/chat/match-skills', data),
  confirmSkills: (data: { requestId: string; skillIds: number[] }) =>
    api.post('/chat/skill-consent', data),
  sendMessage: (data: {
    agentId: number
    message: string
    conversationId?: string
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>
    temporarySkillIds?: number[]
    skillConsentToken?: string
  }) => api.post('/chat', data),
}

export default api
