// DeepSeek 聊天封装。
// 经后端 /api/deepseek 代理转发——用户 Key 加密存于服务端，前端不再持有明文 Key，
// 也规避浏览器直连 DeepSeek 的 CORS 问题。无需传入 apiKey。
import { api } from './api'

export async function chat({
  model = 'deepseek-chat',
  messages,
  json = false,
  temperature = 0.8,
  maxTokens,
}) {
  const data = await api.deepseek({
    model,
    messages,
    json,
    temperature,
    maxTokens,
  })

  const content = data?.choices?.[0]?.message?.content ?? ''
  if (json) {
    try {
      return JSON.parse(content)
    } catch {
      // 模型未按 JSON 返回时，把原文透出，便于上层诊断
      return { _raw: content }
    }
  }
  return content
}

export function isAbort(err) {
  return err && (err.name === 'AbortError' || err.message === 'AbortError')
}
