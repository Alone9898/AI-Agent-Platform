import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 10000,
})

// 请求拦截器：自动附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 自动跳转登录
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

// Auth APIs (预留接口，当前使用 localStorage 模拟)
export const authApi = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  getMe: () => api.get('/auth/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.put('/auth/password', { oldPassword, newPassword }),
  updateProfile: (data: { nickname?: string; avatar?: string }) => api.put('/auth/profile', data),
  logout: () => api.post('/auth/logout'),
}

// Agent APIs
export const agentApi = {
  findAll: () => api.get('/agents'),
  findOne: (id: number) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: number, data: any) => api.put(`/agents/${id}`, data),
  remove: (id: number) => api.delete(`/agents/${id}`),
  bindSkills: (id: number, skillIds: number[]) => api.post(`/agents/${id}/skills`, { skillIds }),
  bindModel: (id: number, modelId: number) =>
    api.post(`/agents/${id}/model`, { modelId }),
}

// Skill APIs
export const skillApi = {
  findAll: () => api.get('/skills'),
  findOne: (id: number) => api.get(`/skills/${id}`),
  create: (data: any) => api.post('/skills', data),
  update: (id: number, data: any) => api.put(`/skills/${id}`, data),
  remove: (id: number) => api.delete(`/skills/${id}`),
  getPresets: () => api.get('/skills/presets'),
}

// Model APIs
export const modelApi = {
  findAll: () => api.get('/models'),
  findOne: (id: number) => api.get(`/models/${id}`),
  create: (data: any) => api.post('/models', data),
  update: (id: number, data: any) => api.put(`/models/${id}`, data),
  remove: (id: number) => api.delete(`/models/${id}`),
  getProviderPresets: () => api.get('/models/presets/providers'),
}

export default api
