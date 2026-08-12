import React, { useState } from 'react'
import { useApp } from '../store'
import { chat } from '../lib/llm'
import {
  buildPainMapMessages,
  buildScriptMessages,
  buildCharacterSceneMessages,
  buildRewriteMessages,
  productFactsText,
} from '../lib/prompts'
import { getBannedForChannel, scanScript, summarizeHits } from '../lib/bannedWords'
import {
  sampleDimensionCombo,
  recentCombosFromScripts,
  recentHooksFromScripts,
} from '../lib/dimensions'
import { EXPORTERS } from '../lib/export'
import VideoExport from './VideoExport'
import { DURATION_STRUCTURES, DIMENSION_LABELS } from '../lib/constants'
import {
  Card,
  Btn,
  Field,
  Input,
  Textarea,
  Select,
  Tag,
  Spinner,
  ErrorBox,
} from './ui'

const splitLines = (s) =>
  (s || '')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)

function blankProduct() {
  return {
    name: '',
    category: '',
    targetAudience: '',
    price: '',
    sellingPoints: '',
    scenarios: '',
    extra: '',
  }
}

function toStored(d) {
  return {
    name: d.name,
    category: d.category,
    targetAudience: d.targetAudience,
    price: d.price,
    sellingPoints: splitLines(d.sellingPoints),
    scenarios: splitLines(d.scenarios),
    extra: d.extra,
  }
}

export default function Studio() {
  const {
    settings,
    products,
    addProduct,
    scripts,
    saveScript,
    updateScript,
    deleteScript,
    dimensionPool,
    channels,
    regions,
    bannedWords,
  } = useApp()

  const [step, setStep] = useState('product')
  const [productId, setProductId] = useState(null)
  const [draft, setDraft] = useState(blankProduct())
  const [painMap, setPainMap] = useState(null)
  const [combo, setCombo] = useState(null)
  const [script, setScript] = useState(null)
  const [charScene, setCharScene] = useState(null)
  const [savedId, setSavedId] = useState(null)
  const [violations, setViolations] = useState([])
  const [loading, setLoading] = useState(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [gen, setGen] = useState({
    duration: 30,
    channelCode: 'douyin',
    regionCode: 'cn',
    diversity: true,
  })
  const [exportFmt, setExportFmt] = useState('human_readable')

  const hasKey = !!settings.hasKey
  const patchDraft = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const patchGen = (k, v) => setGen((g) => ({ ...g, [k]: v }))

  const activeProduct = productId
    ? products.find((p) => p.id === productId) || toStored(draft)
    : toStored(draft)

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  function selectProduct(id) {
    const p = products.find((x) => x.id === id)
    if (!p) return
    setProductId(id)
    setDraft({
      name: p.name,
      category: p.category,
      targetAudience: p.targetAudience,
      price: p.price,
      sellingPoints: (p.sellingPoints || []).join('\n'),
      scenarios: (p.scenarios || []).join('\n'),
      extra: p.extra || '',
    })
    setStep('product')
  }

  function newProduct() {
    setProductId(null)
    setDraft(blankProduct())
    setPainMap(null)
    setScript(null)
    setCharScene(null)
    setCombo(null)
    setSavedId(null)
    setViolations([])
    setStep('product')
  }

  async function saveProduct() {
    if (!draft.name.trim()) {
      setErr('请至少填写商品名称')
      return
    }
    setErr('')
    const stored = toStored(draft)
    if (productId) {
      const { id, ...rest } = stored
      updateProduct(productId, stored)
      flash('已更新商品')
    } else {
      const np = addProduct(stored)
      setProductId(np.id)
      flash('已新建商品')
    }
  }

  // ---------- 模块二：痛点地图 ----------
  async function generatePain() {
    if (!hasKey) return setErr('请先在设置页配置 DeepSeek Key')
    setLoading('pain')
    setErr('')
    try {
      const msgs = buildPainMapMessages(activeProduct)
      const res = await chat({
        model: settings.model,
        messages: msgs,
        json: true,
      })
      if (res._raw) throw new Error('模型未返回有效 JSON，请重试')
      setPainMap(res)
      setStep('pain')
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(null)
    }
  }

  // ---------- 模块三 + 四：脚本生成 + 人物场景 ----------
  function sampleCombo(pid) {
    const recentCombos = recentCombosFromScripts(scripts, {
      productId: pid,
      n: 10,
    })
    const avoidHooks = gen.diversity
      ? recentHooksFromScripts(scripts, { productId: pid, n: 8 })
      : []
    return {
      combo: sampleDimensionCombo(dimensionPool, {
        category: activeProduct.category,
        region: gen.regionCode,
        recentCombos,
        avoidHooks,
        k: 6,
      }),
      avoidHooks,
    }
  }

  async function generateScript() {
    if (!hasKey) return setErr('请先在设置页配置 DeepSeek Key')
    setErr('')
    setLoading('script')
    try {
      // 确保商品已落库
      let pid = productId
      if (!pid) {
        const np = addProduct(toStored(draft))
        pid = np.id
        setProductId(pid)
      }
      const { combo: c, avoidHooks } = sampleCombo(pid)
      setCombo(c)

      const region = regions[gen.regionCode]
      const channel = channels[gen.channelCode]
      const banned = getBannedForChannel(bannedWords, gen.channelCode)
      const msgs = buildScriptMessages({
        p: activeProduct,
        combo: c,
        region,
        channel,
        durationKey: gen.duration,
        painMap,
        avoidHooks,
        charScene,
        bannedWords: banned,
      })
      const res = await chat({
        model: settings.model,
        messages: msgs,
        json: true,
      })
      if (res._raw) throw new Error('模型未返回有效 JSON，请重试')
      const full = {
        ...res,
        dimensionCombo: c,
        productId: pid,
        channelCode: gen.channelCode,
        regionCode: gen.regionCode,
      }
      setScript(full)
      const hits = scanScript(full, { channelCode: gen.channelCode, words: banned })
      setViolations(hits)
      full.audit = { hits, bannedCount: banned.length, channelCode: gen.channelCode }
      const ns = saveScript(full)
      setSavedId(ns.id)
      setStep('result')
      // 自动补人物场景（若尚未生成）
      if (!charScene) {
        await generateChar(ns.id, full, region)
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function generateChar(sid, baseScript, region) {
    if (!hasKey) return
    setLoading('char')
    try {
      const msgs = buildCharacterSceneMessages({
        p: activeProduct,
        region,
        painMap,
      })
      const res = await chat({
        model: settings.model,
        messages: msgs,
        json: true,
      })
      if (res._raw) throw new Error('人物场景生成失败')
      setCharScene(res)
      const merged = { ...(baseScript || script), characterScene: res }
      setScript(merged)
      if (sid) updateScript(sid, { characterScene: res })
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function regenerateWithNewCombo() {
    // 重新采样维度组合并生成（多样性约束下会得到不同组合）
    await generateScript()
  }

  // ---------- 模块三附：违禁词一键规避改写 ----------
  async function rewriteAvoidingBanned() {
    if (!hasKey) return setErr('请先在设置页配置 DeepSeek Key')
    if (!violations.length) return
    setErr('')
    setLoading('rewrite')
    try {
      const banned = getBannedForChannel(bannedWords, gen.channelCode)
      const msgs = buildRewriteMessages({
        script,
        hits: violations,
        bannedWords: banned,
      })
      const res = await chat({
        model: settings.model,
        messages: msgs,
        json: true,
      })
      if (res._raw) throw new Error('改写失败，请重试')
      const merged = {
        ...res,
        dimensionCombo: script.dimensionCombo,
        productId: script.productId,
        channelCode: script.channelCode,
        regionCode: script.regionCode,
        characterScene: script.characterScene,
      }
      setScript(merged)
      const hits = scanScript(merged, { channelCode: gen.channelCode, words: banned })
      setViolations(hits)
      merged.audit = { hits, bannedCount: banned.length, channelCode: gen.channelCode }
      const sid = savedId || (saveScript(merged).id)
      if (savedId) updateScript(savedId, merged)
      else setSavedId(sid)
      if (hits.length === 0) flash('已规避全部违禁词 ✓')
      else flash(`改写完成，剩余 ${hits.length} 处待处理`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(null)
    }
  }

  function copyScript() {
    if (!script) return
    const text = EXPORTERS[exportFmt].fn(script)
    navigator.clipboard.writeText(text).then(
      () => flash(`已复制：${EXPORTERS[exportFmt].label}`),
      () => setErr('复制失败，请手动选择文本复制')
    )
  }

  function loadScript(s) {
    setScript(s)
    setCharScene(s.characterScene || null)
    setCombo(s.dimensionCombo || null)
    setViolations(s.audit?.hits || [])
    setProductId(s.productId)
    const p = products.find((x) => x.id === s.productId)
    if (p)
      setDraft({
        name: p.name,
        category: p.category,
        targetAudience: p.targetAudience,
        price: p.price,
        sellingPoints: (p.sellingPoints || []).join('\n'),
        scenarios: (p.scenarios || []).join('\n'),
        extra: p.extra || '',
      })
    setGen((g) => ({
      ...g,
      duration: s.duration_sec || 30,
      channelCode: s.channelCode || 'douyin',
      regionCode: s.regionCode || 'cn',
    }))
    setStep('result')
  }

  // ---------- 渲染 ----------
  return (
    <div className="space-y-5">
      {/* 步骤指示 */}
      <StepBar step={step} onJump={setStep} />

      <ErrorBox msg={err} />
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      {step === 'product' && (
        <ProductStep
          products={products}
          productId={productId}
          draft={draft}
          patchDraft={patchDraft}
          onSelect={selectProduct}
          onNew={newProduct}
          onSave={saveProduct}
          onNext={() => setStep(painMap ? 'pain' : 'pain')}
          disabled={!hasKey}
        />
      )}

      {step === 'pain' && (
        <PainStep
          product={activeProduct}
          painMap={painMap}
          loading={loading === 'pain'}
          onGenerate={generatePain}
          onBack={() => setStep('product')}
          onNext={() => setStep('generate')}
        />
      )}

      {step === 'generate' && (
        <GenerateStep
          gen={gen}
          patchGen={patchGen}
          durationStruct={DURATION_STRUCTURES[gen.duration]}
          channels={channels}
          regions={regions}
          combo={combo}
          loading={loading === 'script'}
          onBack={() => setStep('pain')}
          onGenerate={generateScript}
          onRegen={regenerateWithNewCombo}
          samplePreview={() => sampleCombo(productId).combo}
        />
      )}

      {step === 'result' && script && (
        <ResultStep
          script={script}
          charScene={charScene}
          combo={combo || script.dimensionCombo}
          violations={violations}
          loading={loading === 'char'}
          rewriting={loading === 'rewrite'}
          exportFmt={exportFmt}
          setExportFmt={setExportFmt}
          onCopy={copyScript}
          onGenChar={() => generateChar(savedId, script, regions[gen.regionCode])}
          onRegen={regenerateWithNewCombo}
          onRewrite={rewriteAvoidingBanned}
          onBack={() => setStep('generate')}
          channel={channels[gen.channelCode]}
        />
      )}

      {/* 历史脚本 */}
      <Card title={`历史脚本（${scripts.length}）`}>
        {scripts.length === 0 ? (
          <div className="text-sm text-slate-500">暂无生成记录</div>
        ) : (
          <div className="space-y-2">
            {scripts.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm bg-slate-950/40 rounded-lg px-3 py-2"
              >
                <button
                  className="text-left flex-1 truncate text-slate-200 hover:text-indigo-300"
                  onClick={() => loadScript(s)}
                >
                  {s.title || '未命名'} · {s.duration_sec}s ·{' '}
                  <span className="text-slate-500">
                    {comboText(s.dimensionCombo)}
                  </span>
                </button>
                <Btn
                  variant="subtle"
                  className="!px-2 !py-1"
                  onClick={() => deleteScript(s.id)}
                >
                  删除
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function comboText(c) {
  if (!c) return '—'
  return Object.values(c).join(' · ')
}

const SEVERITY_COLOR = {
  high: 'rose',
  medium: 'amber',
  low: 'slate',
}
const SEVERITY_LABEL = {
  high: '高危',
  medium: '中危',
  low: '低危',
}

// 平台违禁词合规审核面板
function ComplianceCard({ summary, violations, onRewrite, rewriting, channelName }) {
  const clean = summary.level === 'clean'
  const banner = clean
    ? {
        cls: 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200',
        icon: '✓',
        title: '合规通过',
        sub: `已通过${channelName ? `「${channelName}」` : ''}平台违禁词审核，可直接使用`,
      }
    : {
        cls:
          summary.level === 'high'
            ? 'bg-rose-950/40 border-rose-800/50 text-rose-200'
            : 'bg-amber-950/40 border-amber-800/50 text-amber-200',
        icon: '⚠',
        title: `发现 ${summary.total} 处违禁/限用词风险`,
        sub: `高危 ${summary.high} · 中危 ${summary.mid} · 低危 ${summary.low}（点击「一键规避改写」自动替换为合规表达）`,
      }

  return (
    <Card title="平台违禁词审核（自动合规）">
      <div className={`rounded-lg border px-4 py-3 ${banner.cls}`}>
        <div className="flex items-center gap-2 font-medium">
          <span className="text-lg leading-none">{banner.icon}</span>
          {banner.title}
        </div>
        <div className="text-xs opacity-80 mt-1">{banner.sub}</div>
      </div>

      {!clean && (
        <>
          <div className="mt-3 space-y-2 max-h-72 overflow-auto pr-1">
            {violations.map((h, i) => (
              <div
                key={i}
                className="bg-slate-950/50 rounded-lg p-3 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
              >
                <div className="row-span-2">
                  <Tag color={SEVERITY_COLOR[h.severity]}>
                    {SEVERITY_LABEL[h.severity]}
                  </Tag>
                </div>
                <div className="text-slate-200">
                  <span className="text-rose-300 font-medium">{h.word}</span>
                  <span className="text-slate-500 text-xs"> · {h.field} · {h.category}</span>
                </div>
                <div className="text-slate-400 text-xs">
                  原文：{h.snippet}
                  <div className="text-emerald-300/90 mt-0.5">
                    → 建议替换：{h.suggestion}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Btn
              variant="primary"
              onClick={onRewrite}
              disabled={rewriting}
            >
              {rewriting ? '改写中…' : '一键规避改写'}
            </Btn>
          </div>
        </>
      )}
    </Card>
  )
}

function StepBar({ step, onJump }) {
  const steps = [
    { k: 'product', label: '1 商品' },
    { k: 'pain', label: '2 痛点地图' },
    { k: 'generate', label: '3 生成配置' },
    { k: 'result', label: '4 脚本结果' },
  ]
  const order = steps.map((s) => s.k)
  const cur = order.indexOf(step)
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <button
          key={s.k}
          onClick={() => onJump(s.k)}
          className={`px-3 py-1.5 rounded-full border transition ${
            i === cur
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : i < cur
              ? 'border-slate-700 text-slate-400 hover:text-slate-200'
              : 'border-slate-800 text-slate-600'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function ProductStep({
  products,
  productId,
  draft,
  patchDraft,
  onSelect,
  onNew,
  onSave,
  onNext,
  disabled,
}) {
  return (
    <div className="space-y-4">
      <Card title="选择商品">
        <div className="flex flex-wrap gap-2 mb-3">
          <Btn variant="ghost" onClick={onNew}>
            + 新建商品
          </Btn>
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                productId === p.id
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {disabled && (
          <div className="text-xs text-amber-400">
            未配置 API Key，生成功能不可用（设置页填写）
          </div>
        )}
      </Card>

      <Card title={productId ? '编辑商品' : '新建商品'}>
        <Field label="商品名称">
          <Input
            value={draft.name}
            onChange={(e) => patchDraft('name', e.target.value)}
            placeholder="如：USB 静音桌面加湿器"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="类目">
            <Input
              value={draft.category}
              onChange={(e) => patchDraft('category', e.target.value)}
              placeholder="如：家居日用"
            />
          </Field>
          <Field label="价格/客单">
            <Input
              value={draft.price}
              onChange={(e) => patchDraft('price', e.target.value)}
              placeholder="如：¥89"
            />
          </Field>
        </div>
        <Field label="目标人群">
          <Input
            value={draft.targetAudience}
            onChange={(e) => patchDraft('targetAudience', e.target.value)}
            placeholder="如：住宿舍/合租的年轻女性"
          />
        </Field>
        <Field label="已知卖点" hint="每行一条">
          <Textarea
            rows={3}
            value={draft.sellingPoints}
            onChange={(e) => patchDraft('sellingPoints', e.target.value)}
            placeholder={'USB 5V 供电\n静音 ≤30dB\n续航 8 小时'}
          />
        </Field>
        <Field label="典型使用场景" hint="每行一条">
          <Textarea
            rows={2}
            value={draft.scenarios}
            onChange={(e) => patchDraft('scenarios', e.target.value)}
            placeholder={'冬季卧室开暖气后\n办公室桌面'}
          />
        </Field>
        <Field label="补充信息" hint="竞品差异、品牌调性等（可不填）">
          <Textarea
            rows={2}
            value={draft.extra}
            onChange={(e) => patchDraft('extra', e.target.value)}
          />
        </Field>
        <div className="flex gap-2">
          <Btn onClick={onSave}>保存商品</Btn>
          <Btn variant="primary" onClick={onNext}>
            下一步：痛点地图 →
          </Btn>
        </div>
      </Card>
    </div>
  )
}

function PainStep({ product, painMap, loading, onGenerate, onBack, onNext }) {
  return (
    <div className="space-y-4">
      <Card title="商品事实">
        <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-950/50 rounded-lg p-3">
          {productFactsText(product)}
        </pre>
      </Card>

      <Card
        title="痛点地图（模块二）"
        right={
          <Btn variant="ghost" onClick={onGenerate} disabled={loading}>
            {painMap ? '重新生成' : '生成痛点地图'}
          </Btn>
        }
      >
        {loading && <Spinner text="正在深挖痛点…" />}
        {!loading && !painMap && (
          <div className="text-sm text-slate-500">
            点击「生成痛点地图」，引擎会从功能性/情绪性/场景性/社交性多角度拆解，
            并让每条卖点对应到具体场景痛点（不编造功效）。
          </div>
        )}
        {painMap && (
          <div className="space-y-2">
            {(painMap.pain_points || []).map((x) => (
              <div
                key={x.pain_id}
                className="bg-slate-950/50 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Tag
                    color={
                      x.intensity === '高'
                        ? 'rose'
                        : x.intensity === '中'
                        ? 'amber'
                        : 'slate'
                    }
                  >
                    {x.type} · {x.intensity}
                  </Tag>
                  <span className="text-slate-400 text-xs">{x.scenario}</span>
                </div>
                <div className="text-slate-200">{x.description}</div>
                <div className="text-emerald-300/90 text-xs mt-1">
                  → 卖点回应：{x.matched_capability}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">
                  情绪钩子：{x.emotional_hook}
                </div>
              </div>
            ))}
            {painMap.differentiation_note && (
              <div className="text-xs text-slate-500 mt-1">
                差异化说明：{painMap.differentiation_note}
              </div>
            )}
          </div>
        )}
        {painMap && (
          <div className="flex gap-2 mt-3">
            <Btn variant="subtle" onClick={onBack}>
              ← 返回
            </Btn>
            <Btn variant="primary" onClick={onNext}>
              下一步：生成配置 →
            </Btn>
          </div>
        )}
      </Card>
    </div>
  )
}

function GenerateStep({
  gen,
  patchGen,
  durationStruct,
  channels,
  regions,
  combo,
  loading,
  onBack,
  onGenerate,
  samplePreview,
}) {
  return (
    <div className="space-y-4">
      <Card title="生成配置（模块三：维度组合式）">
        <div className="grid grid-cols-2 gap-3">
          <Field label="时长（自适应结构）">
            <Select
              value={gen.duration}
              onChange={(e) => patchGen('duration', Number(e.target.value))}
            >
              {Object.entries(DURATION_STRUCTURES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="渠道规范">
            <Select
              value={gen.channelCode}
              onChange={(e) => patchGen('channelCode', e.target.value)}
            >
              {Object.values(channels).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="地区人设">
            <Select
              value={gen.regionCode}
              onChange={(e) => patchGen('regionCode', e.target.value)}
            >
              {Object.values(regions).map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="多样性控制">
            <label className="flex items-center gap-2 h-[38px] text-sm text-slate-300">
              <input
                type="checkbox"
                checked={gen.diversity}
                onChange={(e) => patchGen('diversity', e.target.checked)}
                className="w-4 h-4"
              />
              避开最近用过的钩子组合
            </label>
          </Field>
        </div>

        <div className="text-xs text-slate-500 bg-slate-950/40 rounded-lg p-3 mt-1">
          <div className="mb-1 font-medium text-slate-400">
            本时长结构建议：{durationStruct.label}
          </div>
          <div>{durationStruct.beats.join(' / ')} — {durationStruct.note}</div>
        </div>

        {combo && (
          <div className="mt-3">
            <div className="text-xs text-slate-400 mb-1">
              本次将使用的维度组合：
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(combo).map(([k, v]) => (
                <Tag key={k} color="indigo">
                  {DIMENSION_LABELS[k] || k}：{v}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Btn variant="subtle" onClick={onBack}>
          ← 返回
        </Btn>
        <Btn variant="primary" onClick={onGenerate} disabled={loading}>
          {loading ? '生成中…' : '生成脚本 →'}
        </Btn>
        {!combo && (
          <Btn variant="ghost" onClick={samplePreview} disabled={loading}>
            预览维度组合
          </Btn>
        )}
      </div>
    </div>
  )
}

function ResultStep({
  script,
  charScene,
  combo,
  violations,
  loading,
  rewriting,
  exportFmt,
  setExportFmt,
  onCopy,
  onGenChar,
  onRegen,
  onRewrite,
  onBack,
  channel,
}) {
  const summary = summarizeHits(violations || [])
  return (
    <div className="space-y-4">
      <ComplianceCard
        summary={summary}
        violations={violations || []}
        onRewrite={onRewrite}
        rewriting={rewriting}
        channelName={channel?.name}
      />

      <Card>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="text-lg font-semibold text-white">
              {script.title}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              时长 {script.duration_sec}s
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {combo &&
              Object.entries(combo).map(([k, v]) => (
                <Tag key={k} color="indigo">
                  {DIMENSION_LABELS[k] || k}：{v}
                </Tag>
              ))}
          </div>
        </div>
      </Card>

      {script.hook && (
        <Card title="开场钩子">
          <div className="text-slate-200">{script.hook}</div>
        </Card>
      )}

      <Card title="分镜脚本">
        <div className="space-y-2">
          {(script.shots || []).map((s) => (
            <div
              key={s.index}
              className="bg-slate-950/50 rounded-lg p-3 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-1"
            >
              <div className="text-indigo-300 font-medium whitespace-nowrap">
                镜头{s.index}
                <div className="text-[11px] text-slate-500 font-normal">
                  {s.time}
                </div>
                <div className="text-[11px] text-slate-400 font-normal">
                  {s.shot_type}
                </div>
              </div>
              <div>
                {s.visual_desc && (
                  <div className="text-slate-300">画面：{s.visual_desc}</div>
                )}
                {s.camera && (
                  <div className="text-slate-500 text-xs">运镜：{s.camera}</div>
                )}
                {s.dialogue && (
                  <div className="text-slate-200 mt-0.5">台词：{s.dialogue}</div>
                )}
                {s.subtitle && (
                  <div className="text-amber-300/90 text-xs">
                    字幕：{s.subtitle}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {script.cta && (
          <div className="mt-3 bg-indigo-950/40 border border-indigo-800/50 rounded-lg p-3">
            <div className="text-xs text-indigo-300 mb-1">结尾 CTA</div>
            <div className="text-slate-200">{script.cta}</div>
          </div>
        )}
        {script.notes && (
          <div className="mt-2 text-xs text-slate-500">备注：{script.notes}</div>
        )}
      </Card>

      {charScene && (
        <Card title="人物与场景设定（模块四 · 跨镜头一致性）">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-950/50 rounded-lg p-3">
              <div className="text-indigo-300 mb-1">人物</div>
              <div className="text-slate-300">
                {charScene.character_sheet?.gender_age_range} ·{' '}
                {charScene.character_sheet?.wardrobe}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                {charScene.character_sheet?.appearance_desc}
              </div>
              <div className="text-slate-500 text-xs mt-1">
                气质：{charScene.character_sheet?.personality_cue}
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3">
              <div className="text-indigo-300 mb-1">场景</div>
              <div className="text-slate-300">
                {charScene.scene_sheet?.primary_location} ·{' '}
                {charScene.scene_sheet?.lighting_mood}
              </div>
              <div className="text-slate-400 text-xs mt-1">
                道具：{(charScene.scene_sheet?.prop_list || []).join('、')}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="一键复制 / 导出（模块六）">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={exportFmt}
            onChange={(e) => setExportFmt(e.target.value)}
            className="!w-auto"
          >
            {Object.entries(EXPORTERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Btn variant="primary" onClick={onCopy}>
            复制
          </Btn>
          {!charScene && (
            <Btn variant="ghost" onClick={onGenChar} disabled={loading}>
              {loading ? '生成中…' : '生成人物场景'}
            </Btn>
          )}
          <Btn variant="ghost" onClick={onRegen} disabled={loading}>
            换维度重生成
          </Btn>
          <Btn variant="subtle" onClick={onBack}>
            ← 返回配置
          </Btn>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          复制内容可直接粘贴进视频模型创作界面（通用文本）。精确 API 请求体见下方「视频模型精确导出」。
        </div>
      </Card>

      <VideoExport script={script} channel={channel} />
    </div>
  )
}
