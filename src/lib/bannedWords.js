// 平台违禁词 / 限用词库（带货短视频脚本审核）
// 用途：
//  1) 生成时把词库注入 Prompt，引导模型主动规避；
//  2) 生成后扫描脚本，标记命中项（含字段/严重度/合规替换建议）；
//  3) 配合「一键规避改写」让模型在不改变原意的前提下替换掉违禁词。
//
// 词条字段：
//  word      违禁/限用词（短语，2+ 字以降低误报）
//  category  分类（用于分组展示）
//  severity  高/中/低（高=直接限流/下架风险，中=可能被判导流/夸大，低=建议替换）
//  suggestion 合规替换建议
//  platforms 适用的渠道 code 列表，'all' 表示全平台通用
//
// 说明：词库为通用电商/直播带货高频风险词，需随各平台规则更新。管理员可在配置中心维护。

export const BANNED_WORDS = [
  // —— 绝对化 / 极限词（高）——
  { word: '最佳', category: '极限词', severity: 'high', suggestion: '改为"很合适 / 比较推荐"', platforms: ['all'] },
  { word: '最好', category: '极限词', severity: 'high', suggestion: '改为"我用着不错 / 个人很推荐"', platforms: ['all'] },
  { word: '最强', category: '极限词', severity: 'high', suggestion: '改为"很有竞争力"', platforms: ['all'] },
  { word: '最优', category: '极限词', severity: 'high', suggestion: '改为"挺划算"', platforms: ['all'] },
  { word: '顶级', category: '极限词', severity: 'high', suggestion: '改为"品质在线"', platforms: ['all'] },
  { word: '第一', category: '极限词', severity: 'high', suggestion: '去掉或改为"我个人觉得靠前"', platforms: ['all'] },
  { word: '唯一', category: '极限词', severity: 'high', suggestion: '去掉绝对化表述', platforms: ['all'] },
  { word: '国家级', category: '极限词', severity: 'high', suggestion: '去掉，避免虚假资质暗示', platforms: ['all'] },
  { word: '世界级', category: '极限词', severity: 'high', suggestion: '去掉，避免虚假资质暗示', platforms: ['all'] },
  { word: '绝无仅有', category: '极限词', severity: 'high', suggestion: '改为"比较少见"', platforms: ['all'] },
  { word: '史无前例', category: '极限词', severity: 'high', suggestion: '改为"近期挺火"', platforms: ['all'] },
  { word: '万能', category: '极限词', severity: 'high', suggestion: '改为"适用场景多"', platforms: ['all'] },
  { word: '100%', category: '极限词', severity: 'high', suggestion: '改为"基本 / 大多"', platforms: ['all'] },
  { word: '百分百', category: '极限词', severity: 'high', suggestion: '改为"基本 / 大多"', platforms: ['all'] },
  { word: '全网最低', category: '极限词', severity: 'high', suggestion: '改为"目前价格挺友好"', platforms: ['all'] },
  { word: '最低价', category: '极限词', severity: 'high', suggestion: '改为"价格挺划算"', platforms: ['all'] },
  { word: '绝对', category: '极限词', severity: 'medium', suggestion: '去掉绝对化表述', platforms: ['all'] },
  { word: '王牌', category: '极限词', severity: 'medium', suggestion: '改为"主打款"', platforms: ['all'] },
  { word: '销量第一', category: '极限词', severity: 'high', suggestion: '去掉，避免虚假宣传', platforms: ['all'] },
  { word: '领先', category: '极限词', severity: 'medium', suggestion: '加限定语如"在同类里表现靠前"', platforms: ['all'] },
  { word: '极致', category: '极限词', severity: 'medium', suggestion: '改为"做得挺到位"', platforms: ['all'] },

  // —— 虚假承诺 / 强诱导（高）——
  { word: '立即下单', category: '强诱导', severity: 'high', suggestion: '改为"有需要可以看看"', platforms: ['all'] },
  { word: '马上下单', category: '强诱导', severity: 'high', suggestion: '改为"喜欢的可以了解一下"', platforms: ['all'] },
  { word: '抢购', category: '强诱导', severity: 'high', suggestion: '改为"感兴趣可入手"', platforms: ['all'] },
  { word: '秒杀', category: '强诱导', severity: 'medium', suggestion: '确认是否真实活动，否则改为"限时优惠"', platforms: ['all'] },
  { word: '最后一天', category: '强诱导', severity: 'high', suggestion: '仅限真实活动，否则去掉', platforms: ['all'] },
  { word: '错过再无', category: '强诱导', severity: 'high', suggestion: '去掉制造稀缺的虚假表述', platforms: ['all'] },
  { word: '限时免费', category: '强诱导', severity: 'high', suggestion: '仅限真实活动，否则去掉', platforms: ['all'] },
  { word: '免费领取', category: '强诱导', severity: 'high', suggestion: '仅限真实活动，否则改为"有试用装可询"', platforms: ['all'] },
  { word: ' Guarantee', category: '强诱导', severity: 'medium', suggestion: '去掉无条件承诺', platforms: ['all'] },

  // —— 医疗 / 功效违规（高，全品类高敏）——
  { word: '治疗', category: '医疗功效', severity: 'high', suggestion: '非药品不得宣称治疗，改为"日常护理"', platforms: ['all'] },
  { word: '治愈', category: '医疗功效', severity: 'high', suggestion: '非药品不得宣称治愈', platforms: ['all'] },
  { word: '疗效', category: '医疗功效', severity: 'high', suggestion: '非药品不得宣称疗效', platforms: ['all'] },
  { word: '抗癌', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '防癌', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '排毒', category: '医疗功效', severity: 'high', suggestion: '去掉伪科学表述', platforms: ['all'] },
  { word: '解毒', category: '医疗功效', severity: 'high', suggestion: '去掉伪科学表述', platforms: ['all'] },
  { word: '消炎', category: '医疗功效', severity: 'high', suggestion: '非药品不得宣称，去掉', platforms: ['all'] },
  { word: '瘦身', category: '医疗功效', severity: 'high', suggestion: '改为"轻盈感 / 日常搭配"', platforms: ['all'] },
  { word: '减肥', category: '医疗功效', severity: 'high', suggestion: '改为"健康饮食搭配"', platforms: ['all'] },
  { word: '燃脂', category: '医疗功效', severity: 'high', suggestion: '非特殊食品不得宣称，去掉', platforms: ['all'] },
  { word: '助眠', category: '医疗功效', severity: 'medium', suggestion: '改为"放松氛围"', platforms: ['all'] },
  { word: '增高', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '降血糖', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '降血压', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '药到病除', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '根治', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },
  { word: '包治', category: '医疗功效', severity: 'high', suggestion: '禁止宣称，去掉', platforms: ['all'] },

  // —— 平台导流 / 外链违规（中，按渠道）——
  { word: '加微信', category: '违规导流', severity: 'high', suggestion: '去掉，平台禁止站外导流', platforms: ['douyin', 'xiaohongshu'] },
  { word: '加好友', category: '违规导流', severity: 'high', suggestion: '去掉，平台禁止站外导流', platforms: ['douyin', 'xiaohongshu'] },
  { word: '扫码', category: '违规导流', severity: 'high', suggestion: '去掉，改用平台购物车/小黄车', platforms: ['douyin', 'xiaohongshu'] },
  { word: '私聊', category: '违规导流', severity: 'medium', suggestion: '改为"评论区聊聊"', platforms: ['douyin', 'xiaohongshu'] },
  { word: '私信我', category: '违规导流', severity: 'medium', suggestion: '改为"评论区告诉我"', platforms: ['douyin', 'xiaohongshu'] },
  { word: '点链接', category: '违规导流', severity: 'high', suggestion: '去掉，用平台内置购物组件', platforms: ['douyin', 'xiaohongshu'] },
  { word: '点头像', category: '违规导流', severity: 'medium', suggestion: '改为"看购物车"', platforms: ['douyin', 'xiaohongshu'] },
  { word: '看我主页', category: '违规导流', severity: 'medium', suggestion: '改为"进我橱窗"', platforms: ['douyin', 'xiaohongshu'] },
  { word: '淘宝', category: '违规导流', severity: 'medium', suggestion: '去掉竞品平台名，避免被判导流', platforms: ['douyin', 'xiaohongshu'] },
  { word: '天猫', category: '违规导流', severity: 'medium', suggestion: '去掉竞品平台名', platforms: ['douyin', 'xiaohongshu'] },
  { word: '拼多多', category: '违规导流', severity: 'medium', suggestion: '去掉竞品平台名', platforms: ['douyin', 'xiaohongshu'] },
  { word: '京东', category: '违规导流', severity: 'medium', suggestion: '去掉竞品平台名（非本平台）', platforms: ['douyin', 'xiaohongshu'] },
  { word: '公众号', category: '违规导流', severity: 'high', suggestion: '去掉，平台禁止站外导流', platforms: ['douyin', 'xiaohongshu'] },

  // —— 夸大 / 迷信（中）——
  { word: '神奇', category: '夸大宣传', severity: 'medium', suggestion: '改为"挺好用"', platforms: ['all'] },
  { word: '祖传', category: '夸大宣传', severity: 'medium', suggestion: '去掉无法证实的来源宣称', platforms: ['all'] },
  { word: '秘方', category: '夸大宣传', severity: 'medium', suggestion: '去掉无法证实的来源宣称', platforms: ['all'] },
  { word: '纯天然', category: '夸大宣传', severity: 'medium', suggestion: '加限定语或去掉绝对化', platforms: ['all'] },
  { word: '立竿见影', category: '夸大宣传', severity: 'medium', suggestion: '改为"用几天能感受到"', platforms: ['all'] },
  { word: '永久', category: '夸大宣传', severity: 'medium', suggestion: '去掉绝对化时效表述', platforms: ['all'] },
  { word: '永不', category: '夸大宣传', severity: 'medium', suggestion: '去掉绝对化表述', platforms: ['all'] },
  { word: '瞬间', category: '夸大宣传', severity: 'low', suggestion: '改为"很快"', platforms: ['all'] },
]

// 渠道 → 适用的平台标签集合（含 'all'）
function platformsForChannel(channelCode) {
  const set = new Set(['all'])
  if (channelCode) set.add(channelCode)
  return set
}

// 返回某渠道需要规避的违禁词列表（去重）
export function getBannedForChannel(channelCode) {
  const plats = platformsForChannel(channelCode)
  const seen = new Set()
  const out = []
  for (const b of BANNED_WORDS) {
    if (!b.platforms.some((p) => plats.has(p))) continue
    if (seen.has(b.word)) continue
    seen.add(b.word)
    out.push(b)
  }
  return out
}

// 从脚本对象抽取待扫描的文本字段（字段名 → 文本）
function scriptTextFields(script) {
  const fields = []
  if (script.title) fields.push({ field: '标题', text: script.title })
  if (script.hook) fields.push({ field: '开场钩子', text: script.hook })
  if (script.cta) fields.push({ field: '结尾CTA', text: script.cta })
  if (script.notes) fields.push({ field: '备注', text: script.notes })
  for (const s of script.shots || []) {
    if (s.dialogue)
      fields.push({ field: `镜头${s.index}·台词`, text: s.dialogue })
    if (s.subtitle)
      fields.push({ field: `镜头${s.index}·字幕`, text: s.subtitle })
  }
  return fields
}

// 扫描脚本，返回命中列表（每个命中含字段、原文片段、词、分类、严重度、建议）
export function scanScript(script, { channelCode } = {}) {
  const banned = getBannedForChannel(channelCode)
  const wordList = banned.map((b) => b.word)
  const metaByWord = new Map(banned.map((b) => [b.word, b]))
  const fields = scriptTextFields(script)
  const hits = []

  for (const { field, text } of fields) {
    for (const w of wordList) {
      let idx = text.indexOf(w)
      while (idx !== -1) {
        const start = Math.max(0, idx - 8)
        const end = Math.min(text.length, idx + w.length + 8)
        const snippet = (idx - 8 > 0 ? '…' : '') +
          text.slice(start, end) +
          (idx + w.length + 8 < text.length ? '…' : '')
        const meta = metaByWord.get(w)
        hits.push({
          field,
          word: w,
          category: meta.category,
          severity: meta.severity,
          suggestion: meta.suggestion,
          snippet,
        })
        idx = text.indexOf(w, idx + w.length)
      }
    }
  }
  return hits
}

// 汇总严重度
export function summarizeHits(hits) {
  const high = hits.filter((h) => h.severity === 'high').length
  const mid = hits.filter((h) => h.severity === 'medium').length
  const low = hits.filter((h) => h.severity === 'low').length
  const level = high > 0 ? 'high' : mid > 0 ? 'mid' : low > 0 ? 'low' : 'clean'
  return { high, mid, low, total: hits.length, level }
}
