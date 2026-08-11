import React from 'react'
import { useApp } from '../store'
import { SCRIPT_MODELS } from '../lib/constants'
import { Card, Field, Input, Select, Btn, ErrorBox } from './ui'

export default function Settings() {
  const { settings, setSettings } = useApp()

  const patch = (k, v) => setSettings((s) => ({ ...s, [k]: v }))

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">设置</h2>

      <Card title="DeepSeek API">
        <Field
          label="API Key"
          hint="加密存储于服务端（按账号隔离），仅在你调用 DeepSeek 时由后端代理使用，前端不持有明文"
        >
          <Input
            type="password"
            value={settings.apiKey || ''}
            placeholder={settings.hasKey ? '已配置（留空则不修改）' : 'sk-...'}
            onChange={(e) => patch('apiKey', e.target.value)}
          />
        </Field>
        <Field label="模型">
          <Select
            value={settings.model || 'deepseek-chat'}
            onChange={(e) => patch('model', e.target.value)}
          >
            {SCRIPT_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
        <ErrorBox msg={!settings.hasKey ? '未填写 Key 前，所有生成功能不可用' : ''} />
        <div className="text-xs text-slate-500 mt-2">
          本系统为多人部署：每个用户自带 DeepSeek Key，服务端加密存储，互不可见。
        </div>
      </Card>

      <Card title="关于本系统">
        <ul className="text-sm text-slate-400 list-disc pl-5 space-y-1">
          <li>模块一 趋势情报引擎：结构指纹库 + 聚合（本工程为可用骨架）</li>
          <li>模块二 商品深度分析：痛点地图（LLM）</li>
          <li>模块三 脚本生成：维度组合式 + 时长/渠道参数化 + 多样性控制</li>
          <li>模块四 人物与场景生成器：跨镜头一致性设定（LLM）</li>
          <li>一键复制 / 导出：人类可读 · JSON · Seedance2 · MiniMax H3</li>
          <li>效果数据回流：分发记录 → 维度权重动态更新</li>
        </ul>
      </Card>
    </div>
  )
}
