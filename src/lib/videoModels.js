// 视频模型「精确导出适配器」。
// 输入格式严格对齐官方 API（已联网核实 2026-08）：
//   - Seedance 2.0 官方/即梦：{ model:"seedance-2.0", input:{ prompt, ratio, duration, resolution } }
//   - MiniMax Hailuo 官方：POST /v1/video_generation { model, prompt, duration, resolution, prompt_optimizer }
// 注意：视频模型一次调用生成「一个片段」，因此提供两种模式——
//   shots   ：逐镜生成，每个 shot 一个请求体（生成后自行剪辑拼接）
//   combined：整片合成，把所有 shot 描述拼成单个 prompt（受模型时长上限约束）
// 端点(url)与 Key 由用户在 UI 填写，本文件只产出精确请求体 + curl 模板，不伪造接口地址。

// 运镜 → MiniMax [command] 指令（官方 15 种，取覆盖常用中文表达的子集）
export const MINIMAX_CAMERA = {
  推近: '[Push in]',
  推进: '[Push in]',
  推: '[Push in]',
  拉远: '[Pull out]',
  拉: '[Pull out]',
  左移: '[Truck left]',
  右移: '[Truck right]',
  左摇: '[Pan left]',
  右摇: '[Pan right]',
  摇: '[Pan right]',
  上摇: '[Tilt up]',
  下摇: '[Tilt down]',
  上升: '[Pedestal up]',
  下降: '[Pedestal down]',
  变焦推近: '[Zoom in]',
  变焦拉远: '[Zoom out]',
  变焦: '[Zoom in]',
  晃动: '[Shake]',
  跟随: '[Tracking shot]',
  固定: '[Static shot]',
  静态: '[Static shot]',
}

// 运镜 → Seedance 自然语描述（Seedance 主要用 camera_fixed / 文案控制）
export const SEEDANCE_CAMERA = {
  推近: '镜头缓慢推近',
  推进: '镜头缓慢推近',
  拉远: '镜头拉远',
  左移: '镜头向左横移',
  右移: '镜头向右横移',
  左摇: '镜头向左摇',
  右摇: '镜头向右摇',
  上摇: '镜头上摇',
  下摇: '镜头下摇',
  上升: '镜头升高',
  下降: '镜头降低',
  变焦推近: '变焦推近',
  变焦拉远: '变焦拉远',
  晃动: '镜头轻微晃动',
  跟随: '镜头跟随主体',
  固定: '固定镜头',
  静态: '固定镜头',
}

export const PROVIDERS = {
  seedance: {
    name: 'Seedance 2.0',
    defaultModel: 'seedance-2.0',
    ratioOptions: ['9:16', '16:9', '4:3', '1:1', '3:4', '21:9'],
    resolutions: ['720p', '1080p', '480p', '4k'],
    defaultResolution: '720p',
    minDuration: 4,
    maxDuration: 15,
    doc: 'https://seedance2.ink/zh/blog/seedance-2.0-api-is-now-live',
  },
  minimax: {
    name: 'MiniMax Hailuo',
    defaultModel: 'MiniMax-Hailuo-2.3',
    ratioOptions: null, // Hailuo 按分辨率，不接收 ratio
    resolutions: ['1080P', '768P', '720P'],
    defaultResolution: '1080P',
    minDuration: 6,
    maxDuration: 10,
    doc: 'https://platform.minimax.io/docs/api-reference/video-generation-t2v',
  },
}

function shotSeconds(time) {
  if (!time) return null
  const nums = (time.match(/\d+(\.\d+)?/g) || []).map(Number)
  if (nums.length === 0) return null
  if (nums.length === 1) return nums[0]
  return (nums[0] + nums[nums.length - 1]) / 2
}

export function clampDuration(sec, min, max) {
  if (sec == null) return min
  return Math.max(min, Math.min(max, Math.round(sec)))
}

function shotPrompt(shot, cameraMap) {
  const parts = []
  if (shot.visual_desc) parts.push(shot.visual_desc)
  if (shot.dialogue) parts.push(`台词：${shot.dialogue}`)
  let text = parts.join('。')
  if (shot.camera) {
    for (const [k, v] of Object.entries(cameraMap)) {
      if (shot.camera.includes(k)) {
        text += ` ${v}`
        break
      }
    }
  }
  return text
}

// ---------- Seedance 2.0 ----------
export function buildSeedance(script, { mode = 'shots', ratio = '9:16', resolution = '720p' } = {}) {
  const cfg = PROVIDERS.seedance
  if (mode === 'combined') {
    const desc = (script.shots || [])
      .map((s) => shotPrompt(s, SEEDANCE_CAMERA))
      .filter(Boolean)
      .join('。接着，')
    return {
      mode,
      payload: {
        model: cfg.defaultModel,
        input: {
          prompt: desc,
          ratio,
          duration: clampDuration(script.duration_sec, cfg.minDuration, cfg.maxDuration),
          resolution,
        },
      },
      note:
        script.duration_sec > cfg.maxDuration
          ? `⚠️ 整片 ${script.duration_sec}s 超过 Seedance 单片段上限 ${cfg.maxDuration}s，建议改用「逐镜生成」或拆分。`
          : '',
    }
  }
  // shots
  const payloads = (script.shots || []).map((s) => ({
    model: cfg.defaultModel,
    input: {
      prompt: shotPrompt(s, SEEDANCE_CAMERA),
      ratio,
      duration: clampDuration(shotSeconds(s.time), cfg.minDuration, cfg.maxDuration),
      resolution,
    },
  }))
  return { mode, payloads }
}

// ---------- MiniMax Hailuo ----------
export function buildMiniMax(script, { mode = 'shots', resolution = '1080P' } = {}) {
  const cfg = PROVIDERS.minimax
  if (mode === 'combined') {
    const desc = (script.shots || [])
      .map((s) => shotPrompt(s, MINIMAX_CAMERA))
      .filter(Boolean)
      .join('。然后，')
    return {
      mode,
      payload: {
        model: cfg.defaultModel,
        prompt: desc,
        duration: clampDuration(script.duration_sec, cfg.minDuration, cfg.maxDuration),
        resolution,
        prompt_optimizer: false,
      },
      note:
        script.duration_sec > cfg.maxDuration
          ? `⚠️ 整片 ${script.duration_sec}s 超过 Hailuo 单片段上限 ${cfg.maxDuration}s，建议改用「逐镜生成」或拆分。`
          : '',
    }
  }
  const payloads = (script.shots || []).map((s) => ({
    model: cfg.defaultModel,
    prompt: shotPrompt(s, MINIMAX_CAMERA),
    duration: clampDuration(shotSeconds(s.time), cfg.minDuration, cfg.maxDuration),
    resolution,
    prompt_optimizer: false,
  }))
  return { mode, payloads }
}

export function buildProvider(provider, script, opts) {
  return provider === 'minimax'
    ? buildMiniMax(script, opts)
    : buildSeedance(script, opts)
}

// 生成可直接运行的 curl 模板（端点与 Key 由用户填）
export function curlTemplate(provider, body, endpoint, apiKey) {
  const url = endpoint || '(你的接入端点，如 https://api.minimax.io/v1/video_generation)'
  const key = apiKey || '<YOUR_API_KEY>'
  return `curl -X POST '${url}' \\
  -H 'Authorization: Bearer ${key}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(body, null, 2)}'`
}
