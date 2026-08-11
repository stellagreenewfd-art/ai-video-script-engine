import React, { useState, useMemo } from 'react'
import { useApp } from '../store'
import { Card, Btn, Field, Input, Select, Tag, ErrorBox } from './ui'

// 结构指纹字段（只学结构，不存原文 —— 模块一 2.2）
const HOOK_TYPES = [
  '痛点提问式',
  '反差展示式',
  '悬念式',
  '数据震撼式',
  '第一人称吐槽式',
  '场景代入式',
  '争议观点式',
]
const CTA_STYLES = ['限时话术', '对比总结式', '悬念延续式', '软性种草式']
const VISUAL_STYLES = ['素人实拍', '精致棚拍', '图文混剪', '剧情演绎']

export default function Trend() {
  const { trendSignals, addTrend, deleteTrend, products } = useApp()
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  )
  const [form, setForm] = useState(blank())
  const [err, setErr] = useState('')

  function blank() {
    return {
      category: categories[0] || '',
      region: 'cn',
      source: 'TikTok Creative Center',
      title: '',
      tags: '',
      duration: '',
      metrics: '',
      hook_type: HOOK_TYPES[0],
      pacing_curve: '前3秒即高潮',
      emotional_arc: '焦虑→惊喜→信任→紧迫',
      beat_count_estimate: '',
      cta_style: CTA_STYLES[0],
      visual_style: VISUAL_STYLES[0],
      performance_tier: '高',
    }
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function submit() {
    if (!form.category) return setErr('请选择/填写类目')
    if (!form.title.trim()) return setErr('请填写视频标题（仅作索引，不存储原文）')
    setErr('')
    addTrend({
      category: form.category,
      region: form.region,
      source: form.source,
      video_meta: {
        title: form.title,
        tags: form.tags,
        duration: form.duration,
        metrics: form.metrics,
      },
      hook_type: form.hook_type,
      pacing_curve: form.pacing_curve,
      emotional_arc: form.emotional_arc,
      beat_count_estimate: form.beat_count_estimate
        ? Number(form.beat_count_estimate)
        : null,
      cta_style: form.cta_style,
      visual_style: form.visual_style,
      performance_tier: form.performance_tier,
    })
    setForm(blank())
  }

  // 聚合洞察（模块一 2.3）：按 类目 × 地区
  const aggregates = useMemo(() => buildAggregates(trendSignals), [trendSignals])

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        模块一（骨架版）：结构指纹库。只录入"结构信号"、不存原文，规避版权与原创度风险。
        数据源应走合规渠道（TikTok Creative Center / 蝉妈妈等 API），本页为人工录入入口。
        聚合洞察会动态影响脚本生成的维度加权（接 trendBias 后生效）。
      </div>

      <ErrorBox msg={err} />

      <Card title="录入结构指纹">
        <div className="grid grid-cols-2 gap-3">
          <Field label="类目">
            <Input
              list="cat-list"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              placeholder="如：家居日用"
            />
            <datalist id="cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="地区">
            <Input
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="cn / us / jp ..."
            />
          </Field>
          <Field label="数据源">
            <Input
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
            />
          </Field>
          <Field label="视频标题（索引用）">
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label="话题标签">
            <Input value={form.tags} onChange={(e) => set('tags', e.target.value)} />
          </Field>
          <Field label="时长 / 数据指标">
            <Input
              value={form.duration}
              onChange={(e) => set('duration', e.target.value)}
              placeholder="21s / 完播率38%"
            />
          </Field>
          <Field label="开场钩子类型">
            <Select
              value={form.hook_type}
              onChange={(e) => set('hook_type', e.target.value)}
            >
              {HOOK_TYPES.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </Select>
          </Field>
          <Field label="CTA 风格">
            <Select
              value={form.cta_style}
              onChange={(e) => set('cta_style', e.target.value)}
            >
              {CTA_STYLES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="视觉风格">
            <Select
              value={form.visual_style}
              onChange={(e) => set('visual_style', e.target.value)}
            >
              {VISUAL_STYLES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </Select>
          </Field>
          <Field label="热度分级">
            <Select
              value={form.performance_tier}
              onChange={(e) => set('performance_tier', e.target.value)}
            >
              {['高', '中', '低'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="节奏曲线">
            <Input
              value={form.pacing_curve}
              onChange={(e) => set('pacing_curve', e.target.value)}
            />
          </Field>
          <Field label="情绪曲线">
            <Input
              value={form.emotional_arc}
              onChange={(e) => set('emotional_arc', e.target.value)}
            />
          </Field>
          <Field label="分镜数估计">
            <Input
              type="number"
              value={form.beat_count_estimate}
              onChange={(e) => set('beat_count_estimate', e.target.value)}
            />
          </Field>
        </div>
        <Btn variant="primary" onClick={submit}>
          录入指纹
        </Btn>
      </Card>

      <Card title={`聚合洞察（${aggregates.length} 个 类目×地区 分组）`}>
        {aggregates.length === 0 ? (
          <div className="text-sm text-slate-500">
            暂无指纹数据。录入后可看到"当下流行什么"的分布。
          </div>
        ) : (
          <div className="space-y-3">
            {aggregates.map((a) => (
              <div key={a.key} className="bg-slate-950/50 rounded-lg p-3 text-sm">
                <div className="font-medium text-slate-200 mb-2">
                  {a.category} · {a.region}（{a.count} 条）
                </div>
                <div className="text-xs text-slate-400 mb-1">
                  开场钩子分布：
                  <span className="ml-2">
                    {Object.entries(a.hookDist).map(([k, v]) => (
                      <Tag key={k} color="indigo">
                        {k} {Math.round((v / a.count) * 100)}%
                      </Tag>
                    ))}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-1">
                  CTA 分布：
                  <span className="ml-2">
                    {Object.entries(a.ctaDist).map(([k, v]) => (
                      <Tag key={k} color="emerald">
                        {k} {Math.round((v / a.count) * 100)}%
                      </Tag>
                    ))}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  平均分镜数：{a.avgBeats} ｜ 主流情绪曲线：
                  {a.topArc}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title={`已录入指纹（${trendSignals.length}）`}>
        {trendSignals.length === 0 ? (
          <div className="text-sm text-slate-500">空</div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-auto">
            {trendSignals.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between text-xs bg-slate-950/40 rounded px-2 py-1.5"
              >
                <span className="truncate text-slate-300">
                  [{t.category}/{t.region}] {t.video_meta?.title} ·{' '}
                  <Tag color="slate">{t.hook_type}</Tag>
                </span>
                <Btn
                  variant="subtle"
                  className="!px-2 !py-0.5 !text-xs"
                  onClick={() => deleteTrend(t.id)}
                >
                  删
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function buildAggregates(signals) {
  const groups = {}
  for (const s of signals) {
    const key = `${s.category}__${s.region}`
    if (!groups[key])
      groups[key] = {
        key,
        category: s.category,
        region: s.region,
        count: 0,
        hookDist: {},
        ctaDist: {},
        beats: [],
        arcs: {},
      }
    const g = groups[key]
    g.count += 1
    g.hookDist[s.hook_type] = (g.hookDist[s.hook_type] || 0) + 1
    g.ctaDist[s.cta_style] = (g.ctaDist[s.cta_style] || 0) + 1
    if (s.beat_count_estimate) g.beats.push(s.beat_count_estimate)
    g.arcs[s.emotional_arc] = (g.arcs[s.emotional_arc] || 0) + 1
  }
  return Object.values(groups).map((g) => {
    const topArc = Object.entries(g.arcs).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    const avgBeats = g.beats.length
      ? (g.beats.reduce((s, x) => s + x, 0) / g.beats.length).toFixed(1)
      : '—'
    return { ...g, topArc, avgBeats }
  })
}
