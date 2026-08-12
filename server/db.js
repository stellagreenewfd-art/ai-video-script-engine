// Postgres 连接、建表、每用户默认数据种子。
// 生产环境连接串来自环境变量 DATABASE_URL（Render Postgres 自动注入）。
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import {
  DEFAULT_DIMENSION_POOL,
  DEFAULT_CHANNELS,
  DEFAULT_REGIONS,
} from '../src/lib/constants.js'
import { BANNED_WORDS } from '../src/lib/bannedWords.js'

const connectionString = process.env.DATABASE_URL
const isRemote = !!connectionString && /render\.com|amazonaws\.com/.test(connectionString)

export const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
  max: 10,
})

// 用户级集合的默认值（与前端 constants 保持一致，单一数据源）
const DEFAULT_COLLECTIONS = {
  dimensionPool: DEFAULT_DIMENSION_POOL,
  channels: DEFAULT_CHANNELS,
  regions: DEFAULT_REGIONS,
  products: [],
  scripts: [],
  trendSignals: [],
  records: [],
}

export const COLLECTION_KINDS = Object.keys(DEFAULT_COLLECTIONS)

// 表名加 se_ 前缀，避免与复用数据库中的旧表冲突
export const T = {
  users: 'se_users',
  resources: 'se_resources',
  banned: 'se_banned_words',
}

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${T.users} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      api_key_enc text,
      model text NOT NULL DEFAULT 'deepseek-chat',
      username text UNIQUE,
      is_admin boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ${T.resources} (
      user_id uuid NOT NULL REFERENCES ${T.users}(id) ON DELETE CASCADE,
      kind text NOT NULL,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, kind)
    );

    CREATE INDEX IF NOT EXISTS idx_${T.resources}_user ON ${T.resources}(user_id);

    CREATE TABLE IF NOT EXISTS ${T.banned} (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      word text NOT NULL,
      category text NOT NULL DEFAULT '其他',
      severity text NOT NULL DEFAULT 'medium',
      suggestion text NOT NULL DEFAULT '',
      platforms jsonb NOT NULL DEFAULT '["all"]',
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `)
  // 兼容老表：补齐新增列
  await pool.query(
    `ALTER TABLE ${T.users} ADD COLUMN IF NOT EXISTS username text UNIQUE`
  )
  await pool.query(
    `ALTER TABLE ${T.users} ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false`
  )
}

// 启动时确保管理员账户存在（凭据来自环境变量，绝不写入代码/提交）
export async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD
  if (!username || !password) return
  const email = process.env.ADMIN_EMAIL || `${username}@admin.local`
  const { rows } = await pool.query(
    `SELECT id FROM ${T.users} WHERE username = $1 OR email = $2`,
    [username, email]
  )
  if (rows.length > 0) {
    console.log(`[admin] 管理员账户已存在: ${username}`)
    return
  }
  const hash = await bcrypt.hash(password, 10)
  await pool.query(
    `INSERT INTO ${T.users} (email, username, password_hash, is_admin)
     VALUES ($1, $2, $3, true)`,
    [email, username, hash]
  )
  console.log(`[admin] 已创建管理员账户: ${username}`)
}

export async function createUser(email, passwordHash, username) {
  const { rows } = await pool.query(
    `INSERT INTO ${T.users} (email, password_hash, username) VALUES ($1, $2, $3)
     RETURNING id, email, username, model, is_admin, created_at`,
    [email, passwordHash, username || null]
  )
  const user = rows[0]
  // 种子：为该用户写入默认配置集合
  for (const [kind, data] of Object.entries(DEFAULT_COLLECTIONS)) {
    await pool.query(
      `INSERT INTO ${T.resources} (user_id, kind, data) VALUES ($1, $2, $3)`,
      [user.id, kind, JSON.stringify(data)]
    )
  }
  return user
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query(`SELECT * FROM ${T.users} WHERE email = $1`, [
    email,
  ])
  return rows[0] || null
}

export async function getUserById(id) {
  const { rows } = await pool.query(`SELECT * FROM ${T.users} WHERE id = $1`, [id])
  return rows[0] || null
}

export async function updateUserSettings(id, { model, apiKeyEnc }) {
  if (apiKeyEnc !== undefined && model !== undefined) {
    await pool.query(
      `UPDATE ${T.users} SET model = $2, api_key_enc = $3 WHERE id = $1`,
      [id, model, apiKeyEnc]
    )
  } else if (apiKeyEnc !== undefined) {
    await pool.query(`UPDATE ${T.users} SET api_key_enc = $2 WHERE id = $1`, [
      id,
      apiKeyEnc,
    ])
  } else if (model !== undefined) {
    await pool.query(`UPDATE ${T.users} SET model = $2 WHERE id = $1`, [id, model])
  }
}

export async function getCollection(userId, kind) {
  const { rows } = await pool.query(
    `SELECT data FROM ${T.resources} WHERE user_id = $1 AND kind = $2`,
    [userId, kind]
  )
  if (rows.length === 0) {
    const fallback = DEFAULT_COLLECTIONS[kind]
    return fallback !== undefined ? fallback : null
  }
  return rows[0].data
}

export async function putCollection(userId, kind, data) {
  await pool.query(
    `INSERT INTO ${T.resources} (user_id, kind, data, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, kind)
     DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [userId, kind, JSON.stringify(data)]
  )
  return data
}

// ---------- 管理后台查询 ----------
export async function listUsers({ q = '', limit = 200 } = {}) {
  const like = `%${q}%`
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.username, u.is_admin, u.model, u.created_at,
            (u.api_key_enc IS NOT NULL) AS has_key,
            COALESCE(s.cnt, 0) AS scripts_count,
            COALESCE(p.cnt, 0) AS products_count
     FROM ${T.users} u
     LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM ${T.resources} WHERE kind='scripts' GROUP BY user_id) s ON s.user_id = u.id
     LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM ${T.resources} WHERE kind='products' GROUP BY user_id) p ON p.user_id = u.id
     WHERE ($1 = '%%' OR u.email ILIKE $1 OR u.username ILIKE $1)
     ORDER BY u.created_at DESC
     LIMIT $2`,
    [like, limit]
  )
  return rows
}

export async function adminStats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM ${T.users}) AS total_users,
      (SELECT COUNT(*) FROM ${T.users} WHERE api_key_enc IS NOT NULL) AS with_key,
      (SELECT COUNT(*) FROM ${T.users} WHERE is_admin) AS admins,
      (SELECT COUNT(*) FROM ${T.resources} WHERE kind='scripts') AS total_scripts,
      (SELECT COUNT(*) FROM ${T.resources} WHERE kind='products') AS total_products
  `)
  return rows[0] || {}
}

// ---------- 违禁词库（全局，管理员维护） ----------
// 首次启动用内置默认词库播种；之后以数据库为准，管理员可增删。
export async function ensureBannedSeed() {
  const { rows } = await pool.query(`SELECT COUNT(*) AS c FROM ${T.banned}`)
  if (Number(rows[0]?.c) > 0) return
  for (const b of BANNED_WORDS) {
    await pool.query(
      `INSERT INTO ${T.banned} (word, category, severity, suggestion, platforms)
       VALUES ($1, $2, $3, $4, $5)`,
      [b.word, b.category, b.severity, b.suggestion, JSON.stringify(b.platforms || ['all'])]
    )
  }
  console.log(`[banned] 已用默认词库播种 ${BANNED_WORDS.length} 条违禁词`)
}

export async function listBannedWords() {
  const { rows } = await pool.query(
    `SELECT id, word, category, severity, suggestion, platforms, created_at
     FROM ${T.banned} ORDER BY severity DESC, category, word`
  )
  return rows
}

export async function addBannedWord({ word, category, severity, suggestion, platforms }) {
  const w = String(word || '').trim()
  if (!w) throw new Error('违禁词不能为空')
  const cat = String(category || '其他').trim() || '其他'
  const sev = ['high', 'medium', 'low'].includes(severity) ? severity : 'medium'
  const sug = String(suggestion || '').trim()
  const plats = Array.isArray(platforms) && platforms.length ? platforms : ['all']
  const { rows } = await pool.query(
    `INSERT INTO ${T.banned} (word, category, severity, suggestion, platforms)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, word, category, severity, suggestion, platforms, created_at`,
    [w, cat, sev, sug, JSON.stringify(plats)]
  )
  return rows[0]
}

export async function deleteBannedWord(id) {
  await pool.query(`DELETE FROM ${T.banned} WHERE id = $1`, [id])
}
