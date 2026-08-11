// 轻量 localStorage 持久化工具。所有用户数据（配置/商品/脚本/趋势/效果）
// 默认只存在本地浏览器，不上传任何服务器，符合"数据合规、账号闭环"原则。

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    // 存储满或隐私模式，静默失败，不阻断主流程
    console.warn('save failed', key, e)
  }
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`
}
