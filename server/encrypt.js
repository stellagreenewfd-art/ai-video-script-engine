// 用户 DeepSeek Key 的对称加密（AES-256-GCM）。
// 密钥由环境变量 API_KEY_SECRET 派生为 32 字节；未配置时使用开发默认（仅在本地演示）。
import crypto from 'crypto'

const DEV_SECRET = 'dev-only-insecure-secret-change-me'

function key() {
  const secret = process.env.API_KEY_SECRET || DEV_SECRET
  return crypto.createHash('sha256').update(secret).digest()
}

export function encrypt(plain) {
  if (!plain) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([
    cipher.update(String(plain), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  // 存储格式：iv:tag:ciphertext（均 hex）
  return [iv.toString('hex'), tag.toString('hex'), enc.toString('hex')].join(':')
}

export function decrypt(payload) {
  if (!payload) return ''
  const [ivHex, tagHex, dataHex] = payload.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key(),
    Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return dec.toString('utf8')
}
