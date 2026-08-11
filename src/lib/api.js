// 前端 API 客户端：所有请求经同源 /api 转发到后端（后端再代理 DeepSeek）。
// Token 仅存本机 localStorage，登录后附在 Authorization 头。
const TOKEN_KEY = 'avs_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

export class AuthError extends Error {}

async function req(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) headers.Authorization = `Bearer ${t}`
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    setToken(null)
    throw new AuthError('登录已失效，请重新登录')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`)
  return data
}

export const api = {
  register: (email, password, username) =>
    req('/auth/register', { method: 'POST', body: { email, password, username } }),
  login: (identifier, password) =>
    req('/auth/login', { method: 'POST', body: { identifier, password } }),
  getSettings: () => req('/settings'),
  putSettings: (s) => req('/settings', { method: 'PUT', body: s }),
  getCollection: (kind) => req(`/collections/${kind}`),
  putCollection: (kind, data) =>
    req(`/collections/${kind}`, { method: 'PUT', body: { data } }),
  deepseek: (payload) => req('/deepseek', { method: 'POST', body: payload }),
  adminStats: () => req('/admin/stats'),
  adminUsers: (q) => req(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
}
