import { DIMENSIONS } from './constants'

// 维度选项的 scope 匹配：category_scope / region_scope 为空表示通用；
// 否则必须命中目标类目/地区才纳入候选。未命中则退回到通用项。
function scopeMatch(opt, category, region) {
  const cs = opt.category_scope
  const rs = opt.region_scope
  if (cs && category && cs !== category) return false
  if (rs && region && rs !== region) return false
  return true
}

// 加权随机抽一个选项值；exclude 为需要排除的值（如最近用过的钩子类型）
export function weightedPick(options, exclude = []) {
  const pool = (options || []).filter((o) => !exclude.includes(o.value))
  const use = pool.length ? pool : options || []
  const total = use.reduce((s, o) => s + (o.weight ?? 1), 0)
  if (total <= 0 || use.length === 0) return null
  let r = Math.random() * total
  for (const o of use) {
    r -= o.weight ?? 1
    if (r <= 0) return o.value
  }
  return use[use.length - 1].value
}

// 维度重合度：与"最近用过的组合"相比，最多有几个维度取值相同（越高越套路）
export function dimensionOverlap(combo, recentCombos) {
  if (!recentCombos || recentCombos.length === 0) return 0
  let maxSame = 0
  for (const rc of recentCombos) {
    let same = 0
    for (const d of DIMENSIONS) {
      if (rc[d] != null && rc[d] === combo[d]) same += 1
    }
    if (same > maxSame) maxSame = same
  }
  return maxSame
}

// 采样一组维度组合（模块三 4.3 / 4.4）
// - 依据维度池权重加权随机
// - 若提供趋势聚合的加权分布，则按其覆盖的维度分布再加权（可选）
// - 多样性约束：在 k 个候选里选与最近记录重合度最低的一组
// - 显式避开最近 N 次已用过的 hook_type
export function sampleDimensionCombo(pool, opts = {}) {
  const {
    category,
    region,
    recentCombos = [],
    avoidHooks = [],
    trendBias = null, // { hook_type: {value: weight}, ... } 趋势聚合加权
    k = 6,
  } = opts

  const candidates = []
  for (let i = 0; i < k; i++) {
    const combo = {}
    for (const d of DIMENSIONS) {
      let opts2 = (pool[d] || []).filter((o) => scopeMatch(o, category, region))
      if (opts2.length === 0) opts2 = pool[d] || []
      const biased = applyTrendBias(opts2, trendBias && trendBias[d])
      combo[d] = weightedPick(biased, d === 'hook_type' ? avoidHooks : [])
    }
    candidates.push(combo)
  }

  candidates.sort(
    (a, b) =>
      dimensionOverlap(a, recentCombos) - dimensionOverlap(b, recentCombos)
  )
  return candidates[0]
}

// 把趋势聚合分布叠加到选项权重上（趋势情报引擎增强时启用）
function applyTrendBias(options, bias) {
  if (!bias) return options
  return options.map((o) => {
    const w = bias[o.value]
    if (w == null) return o
    return { ...o, weight: (o.weight ?? 1) * (1 + w) }
  })
}

// 从已保存脚本里取某商品/账号最近 N 次用过的维度组合（用于多样性约束）
export function recentCombosFromScripts(scripts, { productId, n = 10 } = {}) {
  const filtered = productId
    ? scripts.filter((s) => s.productId === productId)
    : scripts
  return filtered
    .slice(0, n)
    .map((s) => s.dimensionCombo)
    .filter(Boolean)
}

// 从已保存脚本里取最近 N 次用过的 hook_type（用于 Prompt 显式避重）
export function recentHooksFromScripts(scripts, { productId, n = 8 } = {}) {
  return recentCombosFromScripts(scripts, { productId, n }).map(
    (c) => c.hook_type
  )
}
