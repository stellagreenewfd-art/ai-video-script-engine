import React, { useState, useMemo } from 'react'
import { useApp } from '../store'
import { DIMENSIONS, DIMENSION_LABELS } from '../lib/constants'
import { Card, Btn, Field, Input, Tag } from './ui'

const METRICS = [
  { k: 'play_count', label: '播放' },
  { k: 'like_count', label: '点赞' },
  { k: 'comment_count', label: '评论' },
  { k: 'share_count', label: '分享' },
  { k: 'completion_rate', label: '完播率%' },
  { k: 'conversion_count', label: '转化(下单)' },
]

export default function Effect() {
  const { scripts, records, addRecord, updateRecord, deleteRecord, dimensionPool, setDimensionPool } =
    useApp()
  const [draft, setDraft] = useState({}) // scriptId -> metrics

  function setMetric(scriptId, k, v) {
    setDraft((d) => ({
      ...d,
      [scriptId]: { ...(d[scriptId] || {}), [k]: v },
    }))
  }

  function upsert(scriptId) {
    const m = draft[scriptId] || {}
    const existing = records.find((r) => r.scriptId === scriptId)
    const payload = {
      scriptId,
      dimension_combo: scripts.find((s) => s.id === scriptId)?.dimensionCombo || null,
      play_count: num(m.play_count),
      like_count: num(m.like_count),
      comment_count: num(m.comment_count),
      share_count: num(m.share_count),
      completion_rate: num(m.completion_rate),
      conversion_count: num(m.conversion_count),
    }
    if (existing) updateRecord(existing.id, payload)
    else addRecord(payload)
  }

  function num(v) {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  // 维度权重更新预览（模块七）
  const preview = useMemo(
    () => computeWeightUpdate(records, dimensionPool),
    [records, dimensionPool]
  )

  function applyWeights() {
    if (!preview) return
    const next = { ...dimensionPool }
    for (const d of DIMENSIONS) {
      next[d] = (next[d] || []).map((o) => {
        const f = preview[d]?.[o.value]
        return f ? { ...o, weight: round(clamp(o.weight * f, 0.1, 3)) } : o
      })
    }
    setDimensionPool(next)
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        模块七（效果回流闭环）：给每条已生成脚本回填投放数据，系统按维度组合统计表现，
        自动调高表现好的维度取值权重、降低差的。长期让"骨架库"自我进化。
        建议上线第一天就埋点收集这些字段。
      </div>

      <Card title={`分发记录录入（${scripts.length} 条脚本可回填）`}>
        {scripts.length === 0 ? (
          <div className="text-sm text-slate-500">
            还没有生成脚本。去脚本工作台生成并投放后，再来回填数据。
          </div>
        ) : (
          <div className="space-y-3">
            {scripts.map((s) => {
              const rec = records.find((r) => r.scriptId === s.id)
              const dm = draft[s.id] || {}
              return (
                <div
                  key={s.id}
                  className="bg-slate-950/40 rounded-lg p-3 text-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-200">
                      {s.title} · {s.duration_sec}s
                    </span>
                    {rec && (
                      <span className="text-[11px] text-emerald-400">
                        已记录 ✓
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {METRICS.map((mt) => (
                      <div key={mt.k}>
                        <div className="text-[11px] text-slate-500 mb-0.5">
                          {mt.label}
                        </div>
                        <Input
                          type="number"
                          className="!py-1 !text-xs"
                          placeholder="0"
                          value={dm[mt.k] ?? (rec ? rec[mt.k] : '')}
                          onChange={(e) => setMetric(s.id, mt.k, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Btn
                      variant="ghost"
                      className="!py-1 !text-xs"
                      onClick={() => upsert(s.id)}
                    >
                      {rec ? '更新记录' : '保存记录'}
                    </Btn>
                    {rec && (
                      <Btn
                        variant="subtle"
                        className="!py-1 !text-xs ml-2"
                        onClick={() => deleteRecord(rec.id)}
                      >
                        删除
                      </Btn>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="维度权重更新预览">
        {!preview ? (
          <div className="text-sm text-slate-500">
            至少需要 1 条带维度组合的分发记录才能计算权重更新。
          </div>
        ) : (
          <div className="space-y-3">
            {DIMENSIONS.map((d) => (
              <div key={d}>
                <div className="text-xs text-slate-400 mb-1">
                  {DIMENSION_LABELS[d]}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(preview[d] || {}).map(([v, f]) => (
                    <Tag key={v} color={f > 1 ? 'emerald' : f < 1 ? 'rose' : 'slate'}>
                      {v} ×{f.toFixed(2)}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
            <Btn variant="primary" onClick={applyWeights}>
              应用权重更新到维度池
            </Btn>
            <div className="text-[11px] text-slate-500">
              因子 = 该取值的平均表现 / 同维度平均表现（完播率+转化归一）。
              &gt;1 调高权重，&lt;1 调低。权重范围限制在 0.1~3。
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function round(n) {
  return Math.round(n * 100) / 100
}
function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

// 计算权重更新因子：按维度取值聚合表现
function computeWeightUpdate(records, pool) {
  const recs = records.filter((r) => r.dimension_combo)
  if (recs.length === 0) return null
  const result = {}
  for (const d of DIMENSIONS) {
    const byVal = {}
    for (const r of recs) {
      const v = r.dimension_combo[d]
      if (!v) continue
      const comp = r.completion_rate || 0
      // 转化用相对量（避免绝对量级差异，用有无转化+数量综合）
      const conv = r.conversion_count || 0
      const score = comp * 0.6 + Math.min(conv, 100) * 0.4
      if (!byVal[v]) byVal[v] = { sum: 0, n: 0 }
      byVal[v].sum += score
      byVal[v].n += 1
    }
    const avg = {}
    let total = 0
    let count = 0
    for (const [v, o] of Object.entries(byVal)) {
      avg[v] = o.sum / o.n
      total += avg[v]
      count += 1
    }
    const mean = count ? total / count : 1
    result[d] = {}
    for (const [v, a] of Object.entries(avg)) {
      result[d][v] = mean ? clamp(a / mean, 0.3, 3) : 1
    }
  }
  return result
}
