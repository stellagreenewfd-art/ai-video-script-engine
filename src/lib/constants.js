// 维度组合生成系统的"选项池"与"配置库"默认值。
// 这些值都可被用户在「配置中心」编辑，且效果回流会动态改写 weight。

// 五大相互独立的生成维度（模块三 4.2）
export const DIMENSIONS = [
  'hook_type',
  'narrative_arc',
  'emotional_tone',
  'narrative_pov',
  'pacing_style',
]

export const DIMENSION_LABELS = {
  hook_type: '开场钩子类型',
  narrative_arc: '叙事弧线',
  emotional_tone: '情绪基调',
  narrative_pov: '叙事视角',
  pacing_style: '节奏风格',
}

// 维度选项池：weight 为采样权重（0~1+），可由效果数据动态更新。
// category_scope / region_scope 为空表示通用；否则仅在该类目/地区生效。
export const DEFAULT_DIMENSION_POOL = {
  hook_type: [
    { value: '痛点提问式', weight: 1.0 },
    { value: '反差展示式', weight: 1.0 },
    { value: '悬念式', weight: 0.9 },
    { value: '数据震撼式', weight: 0.8 },
    { value: '第一人称吐槽式', weight: 0.9 },
    { value: '场景代入式', weight: 1.0 },
    { value: '争议观点式', weight: 0.7 },
  ],
  narrative_arc: [
    { value: '问题-解决型', weight: 1.0 },
    { value: '使用前后对比型', weight: 1.0 },
    { value: '横向对比测评型', weight: 0.8 },
    { value: '一天生活记录型', weight: 0.8 },
    { value: '意外发现型', weight: 0.9 },
  ],
  emotional_tone: [
    { value: '焦虑共鸣→释然', weight: 1.0 },
    { value: '好奇→惊喜', weight: 0.9 },
    { value: '怀疑→信服', weight: 0.9 },
    { value: '自嘲→翻身', weight: 0.8 },
  ],
  narrative_pov: [
    { value: '第一人称自述', weight: 1.0 },
    { value: '第三人称旁观测评', weight: 0.8 },
    { value: '对话式(双角色互动)', weight: 0.8 },
  ],
  pacing_style: [
    { value: '前3秒强冲击型', weight: 1.0 },
    { value: '渐进式铺垫型', weight: 0.9 },
    { value: '中段反转型', weight: 0.9 },
  ],
}

// 渠道规范库（模块三 4.6）：可维护，定期核实更新。
export const DEFAULT_CHANNELS = {
  douyin: {
    code: 'douyin',
    name: '抖音',
    aspect_ratio: '9:16',
    duration_range: '15-60s',
    caption_style: '大字号，前3秒必须有字幕强调痛点',
    algorithm_bias: '完播率优先，避免开头拖沓',
    cta_convention: '口播+购物车贴纸引导，避免生硬喊"点击购买"',
  },
  tiktok_us: {
    code: 'tiktok_us',
    name: 'TikTok(美区)',
    aspect_ratio: '9:16',
    duration_range: '21-34s',
    caption_style: '字幕更简洁，梗/幽默元素权重更高',
    algorithm_bias: '互动率(评论/分享)权重较高，适合争议性/讨论性开场',
    cta_convention: '更口语化，避免过强销售感，#TikTokMadeMeBuyIt 式软性引导',
  },
  xiaohongshu: {
    code: 'xiaohongshu',
    name: '小红书',
    aspect_ratio: '3:4',
    duration_range: '15-60s',
    caption_style: '精致封面感，痛点用"种草笔记"口吻，强调真实体验',
    algorithm_bias: '搜索+兴趣双分发，标题关键词与封面质感权重高',
    cta_convention: '引导"戳左下/看我主页"，弱化硬广感',
  },
  youtube_shorts: {
    code: 'youtube_shorts',
    name: 'YouTube Shorts',
    aspect_ratio: '9:16',
    duration_range: '15-60s',
    caption_style: '英文为主，钩子更直给，前2秒交代价值',
    algorithm_bias: '观看时长与订阅转化权重高',
    cta_convention: '口播 "link in bio / subscribe"，避免违规外链话术',
  },
}

// 地区人设包（模块三 4.3 地区人设 + 模块四输入）
export const DEFAULT_REGIONS = {
  cn: {
    code: 'cn',
    name: '中国大陆',
    persona: '接地气的普通消费者，关注性价比、实用性与真实体验，反感过度营销',
  },
  us: {
    code: 'us',
    name: '美国',
    persona: '注重个人体验与真实测评，偏好幽默/直给表达，对硬广敏感',
  },
  jp: {
    code: 'jp',
    name: '日本',
    persona: '重视细节、精致感与"悩み解決"，表达含蓄克制，偏好素人真实感',
  },
  sea: {
    code: 'sea',
    name: '东南亚',
    persona: '价格敏感、家庭导向，偏好热闹氛围与明显性价比话术',
  },
}

// 时长自适应结构建议（模块三 4.5），作为生成 Prompt 的显式参数
export const DURATION_STRUCTURES = {
  15: {
    label: '15秒以内',
    beats: ['hook (0-3s)', 'demo (3-10s)', 'cta (10-15s)'],
    note: '极简：只留最强钩子 + 最核心卖点，省略 proof 环节',
  },
  30: {
    label: '30秒',
    beats: ['hook', 'turn', 'demo', 'proof', 'cta'],
    note: '标准结构，默认配置',
  },
  60: {
    label: '60秒',
    beats: ['hook', 'turn', 'demo(多场景)', 'proof', '用户证言/对比', 'cta'],
    note: '有空间做完整小剧情或多场景对比',
  },
  90: {
    label: '90秒以上',
    beats: ['hook', '完整故事线(多转折)', '多重proof', '常见问题答疑', 'cta'],
    note: '深度种草/详细测评向，适合客单价高或决策链路长的商品',
  },
}

export const SCRIPT_MODELS = ['deepseek-chat', 'deepseek-reasoner']

// 痛点地图的分析维度（模块二 3.1），用于前端展示与生成 Prompt 引导
export const PAIN_DIMENSIONS = [
  { key: '功能性', label: '功能性痛点' },
  { key: '情绪性', label: '情绪性痛点' },
  { key: '场景性', label: '场景性痛点' },
  { key: '社交性', label: '社交性痛点' },
]
