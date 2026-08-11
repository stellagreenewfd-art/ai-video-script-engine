import React, { useState, useMemo } from 'react'
import {
  PROVIDERS,
  buildProvider,
  curlTemplate,
} from '../lib/videoModels'
import { Card, Btn, Field, Input, Select, Tag } from './ui'

export default function VideoExport({ script, channel }) {
  const [provider, setProvider] = useState('seedance')
  const [mode, setMode] = useState('shots')
  const [endpoint, setEndpoint] = useState('')
  const [apiKey, setApiKey] = useState('')

  const cfg = PROVIDERS[provider]
  const defaultRatio =
    channel && channel.aspect_ratio && cfg.ratioOptions?.includes(channel.aspect_ratio)
      ? channel.aspect_ratio
      : cfg.ratioOptions?.[0] || '9:16'
  const [ratio, setRatio] = useState(defaultRatio)
  const [resolution, setResolution] = useState(cfg.defaultResolution)

  // provider 切换时重置分辨率默认值
  function switchProvider(p) {
    setProvider(p)
    setResolution(PROVIDERS[p].defaultResolution)
    if (PROVIDERS[p].ratioOptions) {
      const r =
        channel && channel.aspect_ratio && PROVIDERS[p].ratioOptions.includes(channel.aspect_ratio)
          ? channel.aspect_ratio
          : PROVIDERS[p].ratioOptions[0]
      setRatio(r)
    }
  }

  const built = useMemo(
    () =>
      buildProvider(provider, script, {
        mode,
        ratio: cfg.ratioOptions ? ratio : undefined,
        resolution,
      }),
    [provider, script, mode, ratio, resolution, cfg]
  )

  const isShots = mode === 'shots'
  const bodyForCurl = isShots ? built.payloads[0] : built.payload

  function copy(text) {
    navigator.clipboard.writeText(text).then(
      () => {},
      () => {}
    )
  }

  return (
    <Card title="视频模型精确导出（模块六 · 对接官方 API）">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="模型">
          <Select value={provider} onChange={(e) => switchProvider(e.target.value)}>
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="模式">
          <Select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="shots">逐镜生成（每镜一个片段）</option>
            <option value="combined">整片合成（单调用）</option>
          </Select>
        </Field>
        {cfg.ratioOptions && (
          <Field label="画幅 ratio">
            <Select value={ratio} onChange={(e) => setRatio(e.target.value)}>
              {cfg.ratioOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="分辨率">
          <Select value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {cfg.resolutions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {built.note && (
        <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800 rounded-lg px-3 py-2 mb-2">
          {built.note}
        </div>
      )}

      <div className="text-xs text-slate-500 mb-2">
        {isShots
          ? `共 ${built.payloads?.length || 0} 个片段请求体（生成后自行剪辑拼接）。`
          : '整片单个请求体（受模型时长上限约束）。'}
      </div>

      <div className="flex gap-2 mb-2">
        <Btn
          variant="ghost"
          onClick={() =>
            copy(isShots ? JSON.stringify(built.payloads, null, 2) : JSON.stringify(built.payload, null, 2))
          }
        >
          复制{isShots ? '全部片段 JSON' : '请求体 JSON'}
        </Btn>
        <Btn
          variant="ghost"
          onClick={() => copy(curlTemplate(provider, bodyForCurl, endpoint, apiKey))}
        >
          复制 curl 模板
        </Btn>
        <a
          href={cfg.doc}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-400 hover:underline self-center ml-auto"
        >
          官方文档 ↗
        </a>
      </div>

      <pre className="text-xs text-slate-200 bg-slate-950/70 rounded-lg p-3 overflow-auto max-h-72 whitespace-pre">
        {isShots
          ? JSON.stringify(built.payloads, null, 2)
          : JSON.stringify(built.payload, null, 2)}
      </pre>

      <div className="mt-3">
        <div className="text-xs text-slate-400 mb-1">接入端点 / Key（仅用于生成本地 curl，不存储、不发送）</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            className="md:col-span-2"
            placeholder="端点 URL，如 https://api.minimax.io/v1/video_generation"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />
          <Input
            type="password"
            placeholder="API Key（可选）"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>
        <pre className="text-xs text-emerald-200 bg-slate-950/70 rounded-lg p-3 overflow-auto max-h-56 whitespace-pre mt-2">
          {curlTemplate(provider, bodyForCurl, endpoint, apiKey)}
        </pre>
      </div>

      <div className="text-[11px] text-slate-500 mt-2 space-y-1">
        <div>
          · 视频模型均为<strong>异步</strong>：发起后返回 task_id / requestId，需轮询查询状态拿到视频 URL。
        </div>
        <div>
          · 浏览器直连通常有 CORS 且会暴露 Key，生产请用你自己的后端代理转发
          （本项目 dev 环境的 DeepSeek 代理同理）。
        </div>
        <div>
          · 多镜头人物一致性：优先用 Seedance 的
          <code> @Image </code>多模态参考（传入人物参考图）而非纯文案描述。
        </div>
      </div>
    </Card>
  )
}
