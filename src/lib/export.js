// 导出适配器（模块六）：把结构化脚本转成不同目标形态。
// 视频模型（Seedance2 / MiniMax H3）的精确输入格式以官方最新文档为准，
// 这里只定义"适配器"抽象与合理的默认转换，避免编造接口细节。

export function formatHumanReadable(script) {
  if (!script) return ''
  const lines = []
  lines.push(`【${script.title || '未命名脚本'}】`)
  lines.push(
    `时长：${script.duration_sec ?? '?'}s ｜ 维度组合：${comboText(
      script.dimension_combo
    )}`
  )
  if (script.hook) lines.push(`\n开场钩子：${script.hook}`)
  lines.push('\n—— 分镜 ——')
  for (const s of script.shots || []) {
    lines.push(
      `\n镜头${s.index}（${s.time || ''}，${s.shot_type || ''}）`
    )
    if (s.visual_desc) lines.push(`画面：${s.visual_desc}`)
    if (s.camera) lines.push(`运镜：${s.camera}`)
    if (s.dialogue) lines.push(`台词：${s.dialogue}`)
    if (s.subtitle) lines.push(`字幕：${s.subtitle}`)
  }
  if (script.cta) lines.push(`\n结尾CTA：${script.cta}`)
  if (script.notes) lines.push(`\n备注：${script.notes}`)
  return lines.join('\n') + charSceneBlock(script)
}

function comboText(combo) {
  if (!combo) return '—'
  return Object.entries(combo)
    .map(([, v]) => v)
    .join(' · ')
}

function charSceneBlock(script) {
  const cs = script && script.characterScene
  if (!cs) return ''
  const lines = ['\n\n—— 人物与场景设定（跨镜头一致性锚点） ——']
  if (cs.character_sheet) {
    const c = cs.character_sheet
    lines.push(`人物：${c.gender_age_range || ''} | ${c.wardrobe || ''}`)
    if (c.appearance_desc) lines.push(`外貌：${c.appearance_desc}`)
    if (c.personality_cue) lines.push(`气质：${c.personality_cue}`)
  }
  if (cs.scene_sheet) {
    const s = cs.scene_sheet
    lines.push(
      `场景：${s.primary_location || ''} | ${s.lighting_mood || ''}`
    )
    if (s.prop_list && s.prop_list.length)
      lines.push(`道具：${s.prop_list.join('、')}`)
  }
  return lines.join('\n')
}

export function formatJSON(script) {
  return JSON.stringify(script, null, 2)
}

export const EXPORTERS = {
  human_readable: { label: '人类可读（分镜文本）', fn: formatHumanReadable },
  json: { label: '结构化 JSON', fn: formatJSON },
}
