import { DIMENSION_LABELS, DURATION_STRUCTURES } from './constants'

// 商品事实结构化为可读文本（供 Prompt 喂给模型）
export function productFactsText(p) {
  const lines = []
  lines.push(`商品名称：${p.name || '（未填）'}`)
  lines.push(`类目：${p.category || '（未填）'}`)
  lines.push(`目标人群：${p.targetAudience || '（未填）'}`)
  lines.push(`价格/客单：${p.price || '（未填）'}`)
  lines.push(
    `已知卖点：${
      (p.sellingPoints || []).filter(Boolean).join('；') || '（未填）'
    }`
  )
  lines.push(
    `典型使用场景：${
      (p.scenarios || []).filter(Boolean).join('；') || '（未填）'
    }`
  )
  if (p.extra) lines.push(`补充信息：${p.extra}`)
  return lines.join('\n')
}

// ---------- 模块二：商品深度分析（痛点地图） ----------
export function buildPainMapMessages(p) {
  const system = `你是资深带货短视频内容策略师，擅长把"干巴巴的卖点"翻译成"具体场景下、能引发共鸣的痛点"。
只输出 JSON，不要任何额外解释。JSON 结构：
{
  "pain_points": [
    {
      "pain_id": "p1",
      "type": "功能性|情绪性|场景性|社交性",
      "description": "用户在没有该产品时遇到的具体麻烦（具体到可代入）",
      "intensity": "高|中|低",
      "scenario": "痛点最强的具体场景",
      "matched_capability": "对应到商品哪个具体卖点/功能能直接解决（必须来自已知卖点，禁止编造功效）",
      "emotional_hook": "该痛点触发的情绪体验（烦躁/尴尬/焦虑/自责...）"
    }
  ],
  "differentiation_note": "若用户未提供竞品对比，写明'未提供竞品信息，不主动比较'；若提供则简述差异化"
}
约束：matched_capability 必须能在已知卖点中找到依据，不得虚构功效。至少产出 4 条、至多 8 条痛点，覆盖 2 个以上维度。`

  const user = `${productFactsText(p)}

请基于以上商品事实，构建痛点地图。注意：只使用已知卖点作为 matched_capability 的支撑，绝不编造商品不具备的功效。`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// ---------- 模块四：人物与场景生成器 ----------
export function buildCharacterSceneMessages({ p, region, painMap }) {
  const regionText = region
    ? `地区人设：${region.name} —— ${region.persona}`
    : ''
  const painSummary = painMap?.pain_points
    ? painMap.pain_points
        .slice(0, 4)
        .map((x) => `- ${x.scenario}：${x.description}`)
        .join('\n')
    : '（无）'

  const system = `你是 AI 短视频的人物/场景设定师。基于地区人设、商品类目与痛点场景，产出"跨镜头一致"的人物与场景设定。
只输出 JSON，不要额外解释。结构：
{
  "character_sheet": {
    "gender_age_range": "性别与年龄区间",
    "appearance_desc": "详细外貌描述（供视频模型保持跨镜头一致性，含发型/五官/体型等关键锚点）",
    "wardrobe": "符合地区与场景的着装",
    "personality_cue": "表情/肢体语言倾向（如'略带疲惫的真实感，而非精致摆拍感'）"
  },
  "scene_sheet": {
    "primary_location": "主场景地点",
    "lighting_mood": "光线与氛围",
    "prop_list": ["与痛点场景强相关的道具"]
  }
}
要点：人物要最容易引发目标用户共鸣；外貌描述给足"一致性锚点"，避免每个镜头变脸。`

  const user = `${regionText}
商品类目：${p?.category || '（未填）'}
痛点场景摘要：
${painSummary}

请输出人物与场景设定 JSON。`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// ---------- 模块三：脚本生成（维度组合式） ----------
export function buildScriptMessages({
  p,
  combo,
  region,
  channel,
  durationKey,
  painMap,
  avoidHooks = [],
  charScene,
  bannedWords = [],
}) {
  const ds = DURATION_STRUCTURES[durationKey] || DURATION_STRUCTURES[30]
  const comboText = Object.entries(combo || {})
    .map(([k, v]) => `- ${DIMENSION_LABELS[k] || k}：${v}`)
    .join('\n')

  const channelText = channel
    ? `渠道规范（${channel.name}）：
- 画幅：${channel.aspect_ratio}
- 建议时长：${channel.duration_range}
- 字幕风格：${channel.caption_style}
- 算法偏好：${channel.algorithm_bias}
- 结尾引导惯例：${channel.cta_convention}`
    : '（未指定渠道）'

  const regionText = region
    ? `地区人设：${region.name} —— ${region.persona}`
    : '（未指定地区）'

  const painText = painMap?.pain_points
    ? painMap.pain_points
        .map(
          (x) =>
            `- [${x.type}/${x.intensity}] ${x.scenario}：${x.description} → 卖点回应「${x.matched_capability}」（情绪：${x.emotional_hook}）`
        )
        .join('\n')
    : '（未生成痛点地图，请基于商品事实自行推理痛点）'

  const avoidText =
    avoidHooks && avoidHooks.length
      ? `多样性约束：本次禁止使用最近用过的开场钩子类型【${avoidHooks.join(
          '、'
        )}】，请在维度池其余选项中选择 hook_type。`
      : '（无最近钩子避重约束）'

  const charText = charScene
    ? `人物与场景设定（请把它融入每个 shot 的 visual_desc，保证跨镜头一致）：
${JSON.stringify(charScene, null, 2)}`
    : '（未生成人物场景设定，可自行假定贴合地区人设的人物）'

  const system = `你是顶级带货短视频导演兼编剧。你的任务不是"套模板"，而是基于给定的「维度组合（创作约束）」+「痛点地图」+「商品事实」+「地区/渠道规范」做原创表达。
关键原则：
1. 维度组合只决定"用什么钩子类型、什么弧线、什么情绪节奏"，不决定具体怎么写；具体文案必须原创、口语化、有代入感。
2. 开场 hook 必须直接调用痛点地图里某个具体场景，让用户前 3 秒觉得"在说我"。
3. 每个 shot 的 dialogue（口播台词）要像真人说话，subtitle 是上屏字幕重点。
4. 结尾 CTA 遵循渠道引导惯例，软性促成转化，不硬喊"点击购买"。
5. 严格遵守时长结构与画幅。
6. 平台合规（重要）：以下为本渠道的高风险违禁/限用词，严禁出现在标题、钩子、任何台词或字幕中——${
    bannedWords.length
      ? bannedWords.map((b) => b.word).join('、')
      : '（无）'
  }。若语义上需要表达类似意思，必须使用合规替代说法（如"最好"→"我个人很推荐"），绝不出现任何极限词、绝对化承诺、医疗功效宣称或站外导流话术。${
    bannedWords.length ? '\n命中这些词会导致视频被限流甚至下架，请逐句自查。' : ''
  }

只输出 JSON，不要额外解释。结构：
{
  "title": "视频标题/主题（≤20字）",
  "duration_sec": ${durationKey},
  "dimension_combo": ${JSON.stringify(combo || {})},
  "hook": "开场钩子原文（1-2句）",
  "shots": [
    {
      "index": 1,
      "time": "0-3s",
      "shot_type": "特写/中景/反差登场...",
      "visual_desc": "画面描述（含人物/场景一致性锚点）",
      "dialogue": "口播台词",
      "subtitle": "上屏字幕",
      "camera": "运镜（推近/平移/固定...）"
    }
  ],
  "cta": "结尾引导原文",
  "notes": "给创作者的备注（情绪落点/二次创作建议）"
}
shots 数量与每镜时长需匹配时长结构：${ds.beats.join(' / ')}。`

  const user = `【商品事实】
${productFactsText(p)}

【维度组合（创作约束）】
${comboText}

【时长结构建议】${ds.label}：${ds.beats.join(' / ')}（${ds.note}）

【地区人设】
${regionText}

【渠道规范】
${channelText}

【痛点地图】
${painText}

${avoidText}

【人物与场景设定】
${charText}

请生成完整分镜脚本 JSON。`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// ---------- 模块三附：违禁词规避改写 ----------
// 在不改变原意、结构、时长、人物场景一致性的前提下，把命中违禁词的字段替换成合规表达。
export function buildRewriteMessages({ script, hits, bannedWords }) {
  const hitLines = (hits || [])
    .map(
      (h) =>
        `- 字段【${h.field}】命中"${h.word}"（${h.category}，${h.severity === 'high' ? '高危' : h.severity === 'medium' ? '中危' : '低危'}），建议替换：${h.suggestion}`
    )
    .join('\n')

  const banText = (bannedWords || [])
    .map((b) => b.word)
    .join('、')

  const system = `你是带货短视频合规改写师。任务：在不改变视频主题、结构、时长、人物场景设定与整体表达意图的前提下，将脚本中命中的平台违禁/限用词替换为合规表达，消除限流与下架风险。
规则：
1. 只改命中词所在句子，尽量保留原节奏与口语感；不得为规避而删掉关键信息或卖点。
2. 严禁再出现以下任何词：${banText || '（无）'}。
3. 极限词→主观体验表达；医疗功效→日常护理/使用感受；站外导流→平台内购物组件（购物车/橱窗）；强诱导→软性建议。
4. 输出与输入完全同结构的 JSON（含 title/duration_sec/dimension_combo/hook/shots/cta/notes，shots 数量与 index 不变）。
只输出 JSON，不要额外解释。`

  const user = `【待改写脚本】
${JSON.stringify(script, null, 2)}

【命中清单（必须逐条处理）】
${hitLines || '（无）'}

请返回改写后的完整脚本 JSON。`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}
