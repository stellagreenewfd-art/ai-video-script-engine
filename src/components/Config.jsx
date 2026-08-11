import React, { useState } from 'react'
import { useApp } from '../store'
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  DEFAULT_DIMENSION_POOL,
  DEFAULT_CHANNELS,
  DEFAULT_REGIONS,
} from '../lib/constants'
import { Card, Btn, Field, Input, Textarea, Tag } from './ui'

export default function Config() {
  const { dimensionPool, setDimensionPool, channels, setChannels, regions, setRegions } =
    useApp()
  const [tab, setTab] = useState('dim')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-white">配置中心</h2>
        <div className="flex gap-1 ml-3">
          {[
            { k: 'dim', label: '维度池' },
            { k: 'channel', label: '渠道规范' },
            { k: 'region', label: '地区人设' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                tab === t.k
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dim' && (
        <DimensionPoolEditor pool={dimensionPool} setPool={setDimensionPool} />
      )}
      {tab === 'channel' && (
        <ChannelEditor channels={channels} setChannels={setChannels} />
      )}
      {tab === 'region' && (
        <RegionEditor regions={regions} setRegions={setRegions} />
      )}
    </div>
  )
}

function DimensionPoolEditor({ pool, setPool }) {
  const [local, setLocal] = useState(pool)

  // 本地编辑，保存时写回 store
  function updateOpt(dim, idx, patch) {
    setLocal((p) => {
      const next = { ...p }
      next[dim] = p[dim].map((o, i) => (i === idx ? { ...o, ...patch } : o))
      return next
    })
  }
  function addOpt(dim) {
    setLocal((p) => ({
      ...p,
      [dim]: [...(p[dim] || []), { value: '新选项', weight: 1 }],
    }))
  }
  function removeOpt(dim, idx) {
    setLocal((p) => ({
      ...p,
      [dim]: p[dim].filter((_, i) => i !== idx),
    }))
  }
  function save() {
    setPool(local)
  }
  function reset() {
    if (confirm('恢复默认维度池？当前编辑将丢失')) {
      setLocal(DEFAULT_DIMENSION_POOL)
      setPool(DEFAULT_DIMENSION_POOL)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        五个相互独立的维度，每个维护一个带权重的选项池。理论组合数上千种，
        是"千篇一律"的工程解法。权重会被效果回流动态更新。
      </div>
      {DIMENSIONS.map((dim) => (
        <Card key={dim} title={DIMENSION_LABELS[dim] || dim}>
          <div className="space-y-2">
            {(local[dim] || []).map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={o.value}
                  onChange={(e) => updateOpt(dim, i, { value: e.target.value })}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  权重
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={o.weight}
                    onChange={(e) =>
                      updateOpt(dim, i, {
                        weight: Number(e.target.value) || 0,
                      })
                    }
                    className="w-16 bg-slate-950/60 border border-slate-700 rounded px-2 py-1 text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>
                <Btn
                  variant="subtle"
                  className="!px-2 !py-1"
                  onClick={() => removeOpt(dim, i)}
                >
                  删
                </Btn>
              </div>
            ))}
            <Btn variant="ghost" onClick={() => addOpt(dim)}>
              + 新增选项
            </Btn>
          </div>
        </Card>
      ))}
      <div className="flex gap-2">
        <Btn variant="primary" onClick={save}>
          保存维度池
        </Btn>
        <Btn variant="subtle" onClick={reset}>
          恢复默认
        </Btn>
      </div>
    </div>
  )
}

function ChannelEditor({ channels, setChannels }) {
  const list = Object.values(channels)
  const [draft, setDraft] = useState(
    channels['douyin'] ? { ...channels['douyin'] } : null
  )

  function edit(code, patch) {
    setChannels((c) => ({ ...c, [code]: { ...c[code], ...patch } }))
  }
  function remove(code) {
    if (Object.keys(channels).length <= 1) return
    setChannels((c) => {
      const n = { ...c }
      delete n[code]
      return n
    })
  }
  function add() {
    const code = 'ch_' + Date.now().toString(36)
    setChannels((c) => ({
      ...c,
      [code]: {
        code,
        name: '新渠道',
        aspect_ratio: '9:16',
        duration_range: '15-60s',
        caption_style: '',
        algorithm_bias: '',
        cta_convention: '',
      },
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button
            key={c.code}
            onClick={() => setDraft(c)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition ${
              draft && draft.code === c.code
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {c.name}
          </button>
        ))}
        <Btn variant="ghost" onClick={add}>
          + 新增渠道
        </Btn>
      </div>

      {draft && (
        <Card title={`编辑：${draft.name}`}>
          <Field label="渠道名称">
            <Input
              value={draft.name}
              onChange={(e) => edit(draft.code, { name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="画幅">
              <Input
                value={draft.aspect_ratio}
                onChange={(e) =>
                  edit(draft.code, { aspect_ratio: e.target.value })
                }
              />
            </Field>
            <Field label="建议时长">
              <Input
                value={draft.duration_range}
                onChange={(e) =>
                  edit(draft.code, { duration_range: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="字幕风格">
            <Input
              value={draft.caption_style}
              onChange={(e) => edit(draft.code, { caption_style: e.target.value })}
            />
          </Field>
          <Field label="算法偏好">
            <Input
              value={draft.algorithm_bias}
              onChange={(e) => edit(draft.code, { algorithm_bias: e.target.value })}
            />
          </Field>
          <Field label="结尾引导惯例">
            <Input
              value={draft.cta_convention}
              onChange={(e) =>
                edit(draft.code, { cta_convention: e.target.value })
              }
            />
          </Field>
          {Object.keys(channels).length > 1 && (
            <Btn variant="danger" onClick={() => remove(draft.code)}>
              删除该渠道
            </Btn>
          )}
        </Card>
      )}
      <div className="text-xs text-slate-500">
        渠道 Profile 是数据库表，应定期核实更新（各平台推荐时长、算法偏好会变）。
      </div>
    </div>
  )
}

function RegionEditor({ regions, setRegions }) {
  const list = Object.values(regions)
  const [draft, setDraft] = useState(regions['cn'] ? { ...regions['cn'] } : null)

  function edit(code, patch) {
    setRegions((r) => ({ ...r, [code]: { ...r[code], ...patch } }))
  }
  function remove(code) {
    if (Object.keys(regions).length <= 1) return
    setRegions((r) => {
      const n = { ...r }
      delete n[code]
      return n
    })
  }
  function add() {
    const code = 'rg_' + Date.now().toString(36)
    setRegions((r) => ({
      ...r,
      [code]: { code, name: '新地区', persona: '' },
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {list.map((r) => (
          <button
            key={r.code}
            onClick={() => setDraft(r)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition ${
              draft && draft.code === r.code
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {r.name}
          </button>
        ))}
        <Btn variant="ghost" onClick={add}>
          + 新增地区
        </Btn>
      </div>

      {draft && (
        <Card title={`编辑：${draft.name}`}>
          <Field label="地区名称">
            <Input
              value={draft.name}
              onChange={(e) => edit(draft.code, { name: e.target.value })}
            />
          </Field>
          <Field label="人设包（用于生成 Prompt 的地区人设注入）">
            <Textarea
              rows={3}
              value={draft.persona}
              onChange={(e) => edit(draft.code, { persona: e.target.value })}
            />
          </Field>
          {Object.keys(regions).length > 1 && (
            <Btn variant="danger" onClick={() => remove(draft.code)}>
              删除该地区
            </Btn>
          )}
        </Card>
      )}
    </div>
  )
}
