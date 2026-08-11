// 鉴权 + 业务路由。所有写操作按 user_id 隔离。
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  pool,
  T,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserSettings,
  getCollection,
  putCollection,
  listUsers,
  adminStats,
  COLLECTION_KINDS,
} from './db.js'
import { encrypt, decrypt } from './encrypt.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-jwt-secret'
const DEEPSEEK_BASE = process.env.DEEPSEEK_BASE || 'https://api.deepseek.com'

export const router = express.Router()

// ---------- 鉴权中间件 ----------
function authMiddleware(req, res, next) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : ''
  if (!token) return res.status(401).json({ error: '未登录' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    req.isAdmin = !!payload.is_admin
    next()
  } catch {
    res.status(401).json({ error: '登录已失效' })
  }
}

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: '需要管理员权限' })
  next()
}

// ---------- 注册 / 登录 ----------
router.post('/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const username = req.body.username
    ? String(req.body.username).trim()
    : null
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }
  if (username && !/^[\w一-龥]{2,20}$/.test(username)) {
    return res.status(400).json({ error: '用户名需 2-20 位字母/数字/中文' })
  }
  const exists = await getUserByEmail(email)
  if (exists) return res.status(409).json({ error: '该邮箱已注册' })
  if (username) {
    const byName = await pool.query(
      `SELECT id FROM ${T.users} WHERE username = $1`,
      [username]
    )
    if (byName.rows.length) return res.status(409).json({ error: '该用户名已被占用' })
  }
  const hash = await bcrypt.hash(password, 10)
  const user = await createUser(email, hash, username)
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
    },
  })
})

router.post('/auth/login', async (req, res) => {
  const identifier = String(req.body.identifier || req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  const { rows } = await pool.query(
    `SELECT * FROM ${T.users} WHERE email = $1 OR username = $1`,
    [identifier]
  )
  const user = rows[0]
  if (!user) return res.status(401).json({ error: '账号或密码错误' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: '账号或密码错误' })
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      is_admin: user.is_admin,
    },
  })
})

// ---------- 设置（DeepSeek Key 加密存储） ----------
router.get('/settings', authMiddleware, async (req, res) => {
  const user = await getUserById(req.userId)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  res.json({ model: user.model, hasKey: !!user.api_key_enc })
})

router.put('/settings', authMiddleware, async (req, res) => {
  const { model, apiKey } = req.body || {}
  const patch = {}
  if (typeof model === 'string' && model) patch.model = model
  if (typeof apiKey === 'string' && apiKey) patch.apiKeyEnc = encrypt(apiKey)
  await updateUserSettings(req.userId, patch)
  res.json({ ok: true })
})

// ---------- 资源集合（按用户隔离） ----------
router.get('/collections/:kind', authMiddleware, async (req, res) => {
  const { kind } = req.params
  if (!COLLECTION_KINDS.includes(kind)) {
    return res.status(400).json({ error: '未知集合类型' })
  }
  const data = await getCollection(req.userId, kind)
  res.json({ data })
})

router.put('/collections/:kind', authMiddleware, async (req, res) => {
  const { kind } = req.params
  if (!COLLECTION_KINDS.includes(kind)) {
    return res.status(400).json({ error: '未知集合类型' })
  }
  const data = req.body?.data
  if (data === undefined) return res.status(400).json({ error: '缺少 data' })
  const saved = await putCollection(req.userId, kind, data)
  res.json({ data: saved })
})

// ---------- DeepSeek 代理（使用用户自己的 Key） ----------
router.post('/deepseek', authMiddleware, async (req, res) => {
  const user = await getUserById(req.userId)
  if (!user || !user.api_key_enc) {
    return res.status(400).json({ error: '未配置 DeepSeek API Key（设置页填写）' })
  }
  const { model, messages, json, temperature = 0.8, maxTokens } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages 不能为空' })
  }
  const key = decrypt(user.api_key_enc)
  const body = { model: model || user.model || 'deepseek-chat', messages, temperature }
  if (json) body.response_format = { type: 'json_object' }
  if (maxTokens) body.max_tokens = maxTokens

  try {
    const r = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })
    const text = await r.text()
    res.status(r.status)
    res.set('Content-Type', 'application/json')
    if (!r.ok) {
      if (r.status === 401) return res.json({ error: 'API Key 无效或失效（401）' })
      if (r.status === 429) return res.json({ error: '触发限流（429），稍后重试' })
      return res.json({ error: `DeepSeek 接口错误 ${r.status}：${text.slice(0, 300)}` })
    }
    res.json(JSON.parse(text))
  } catch (e) {
    res.status(502).json({ error: `代理请求失败：${e.message}` })
  }
})

// ---------- 管理后台（仅管理员） ----------
const adminRouter = express.Router()
adminRouter.use(authMiddleware, requireAdmin)

adminRouter.get('/stats', async (req, res) => {
  res.json(await adminStats())
})

adminRouter.get('/users', async (req, res) => {
  const q = String(req.query.q || '')
  const limit = Math.min(parseInt(req.query.limit) || 200, 500)
  res.json({ users: await listUsers({ q, limit }) })
})

router.use('/admin', adminRouter)

export { authMiddleware }
