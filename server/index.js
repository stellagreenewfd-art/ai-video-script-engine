// 后端入口：Express 提供 API + 托管构建后的前端（同一端口，便于 Render 部署）。
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrate, pool, ensureAdmin } from './db.js'
import { router } from './routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json({ limit: '2mb' }))

// API 路由
app.use('/api', router)

// 健康检查（Render 用）
app.get('/healthz', (req, res) => res.json({ ok: true }))

// 托管前端静态资源与生产单页回退
const distDir = path.resolve(__dirname, '../dist')
app.use(express.static(distDir))
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

async function start() {
  // 兼容 postgresql:// → postgres://（pg 库只认后者）
  let dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('postgresql://')) {
    dbUrl = dbUrl.replace('postgresql://', 'postgres://')
  }
  // 外部连接强制 SSL
  if (!dbUrl.includes('?') && !dbUrl.includes('sslmode')) {
    dbUrl += '?sslmode=require'
  } else if (dbUrl.includes('?') && !dbUrl.includes('sslmode')) {
    dbUrl += '&sslmode=require'
  }
  process.env.DATABASE_URL = dbUrl

  try {
    await pool.query('SELECT 1')
    console.log('[db] 连接成功')
  } catch (e) {
    console.error('[db] 连接失败：', e.message)
    console.error('[db] code:', e.code)
    console.error('[db] DATABASE_URL 前20字符:', dbUrl.slice(0, 20))
    process.exit(1)
  }
  await migrate()
  console.log('[db] 表结构就绪')
  await ensureAdmin()
  app.listen(PORT, () => {
    console.log(`[server] 监听 http://localhost:${PORT}`)
  })
}

start()
