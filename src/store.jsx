import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react'
import { api } from './lib/api'
import { uid } from './lib/storage'
import {
  DEFAULT_DIMENSION_POOL,
  DEFAULT_CHANNELS,
  DEFAULT_REGIONS,
} from './lib/constants'
import { BANNED_WORDS } from './lib/bannedWords'

const AppContext = createContext(null)

// 本地默认值（加载后端数据前的占位，避免首屏崩溃）
const DEFAULTS = {
  settings: { model: 'deepseek-chat', hasKey: false },
  dimensionPool: DEFAULT_DIMENSION_POOL,
  channels: DEFAULT_CHANNELS,
  regions: DEFAULT_REGIONS,
  products: [],
  scripts: [],
  trendSignals: [],
  records: [],
  bannedWords: BANNED_WORDS,
}

export function AppProvider({ children }) {
  const [settings, setSettingsState] = useState(DEFAULTS.settings)
  const [dimensionPool, setDimensionPoolState] = useState(
    DEFAULTS.dimensionPool
  )
  const [channels, setChannelsState] = useState(DEFAULTS.channels)
  const [regions, setRegionsState] = useState(DEFAULTS.regions)
  const [products, setProducts] = useState(DEFAULTS.products)
  const [scripts, setScripts] = useState(DEFAULTS.scripts)
  const [trendSignals, setTrendSignals] = useState(DEFAULTS.trendSignals)
  const [records, setRecords] = useState(DEFAULTS.records)
  const [bannedWords, setBannedWords] = useState(DEFAULTS.bannedWords)
  const [ready, setReady] = useState(false)

  // 登录后拉取全部用户数据
  const bootstrap = useCallback(async () => {
    try {
      const [s, dim, ch, rg, pr, sc, tr, rc, bw] = await Promise.all([
        api.getSettings(),
        api.getCollection('dimensionPool'),
        api.getCollection('channels'),
        api.getCollection('regions'),
        api.getCollection('products'),
        api.getCollection('scripts'),
        api.getCollection('trendSignals'),
        api.getCollection('records'),
        api.getBannedWords(),
      ])
      setSettingsState({
        model: s.model || 'deepseek-chat',
        hasKey: !!s.hasKey,
      })
      setDimensionPoolState(dim.data)
      setChannelsState(ch.data)
      setRegionsState(rg.data)
      setProducts(pr.data || [])
      setScripts(sc.data || [])
      setTrendSignals(tr.data || [])
      setRecords(rc.data || [])
      setBannedWords(bw.words && bw.words.length ? bw.words : BANNED_WORDS)
      setReady(true)
    } catch (e) {
      console.error('数据加载失败：', e.message)
    }
  }, [])

  const reset = useCallback(() => {
    setSettingsState(DEFAULTS.settings)
    setDimensionPoolState(DEFAULTS.dimensionPool)
    setChannelsState(DEFAULTS.channels)
    setRegionsState(DEFAULTS.regions)
    setProducts(DEFAULTS.products)
    setScripts(DEFAULTS.scripts)
    setTrendSignals(DEFAULTS.trendSignals)
    setRecords(DEFAULTS.records)
    setBannedWords(DEFAULTS.bannedWords)
    setReady(false)
  }, [])

  // 通用 setter：更新本地 + 写回后端
  const makeSetter = (setState, kind) => (updater) => {
    setState((prev) => {
      const next =
        typeof updater === 'function' ? updater(prev) : updater
      if (kind) api.putCollection(kind, next).catch((e) => console.error(e))
      else api.putSettings(next).catch((e) => console.error(e))
      return next
    })
  }

  const setSettings = makeSetter(setSettingsState, null)
  const setDimensionPool = makeSetter(setDimensionPoolState, 'dimensionPool')
  const setChannels = makeSetter(setChannelsState, 'channels')
  const setRegions = makeSetter(setRegionsState, 'regions')

  // 集合类增删改（更新本地数组 + 写回整个集合）
  const commitList = (kind, setList) => (nextList) => {
    setList(nextList)
    api.putCollection(kind, nextList).catch((e) => console.error(e))
  }

  const addProduct = useCallback(
    (p) => {
      const np = { id: uid('prod'), createdAt: Date.now(), ...p }
      commitList('products', setProducts)([np, ...products])
      return np
    },
    [products]
  )
  const updateProduct = useCallback(
    (id, patch) =>
      commitList('products', setProducts)(
        products.map((p) => (p.id === id ? { ...p, ...patch } : p))
      ),
    [products]
  )
  const deleteProduct = useCallback(
    (id) =>
      commitList('products', setProducts)(
        products.filter((p) => p.id !== id)
      ),
    [products]
  )

  const saveScript = useCallback(
    (s) => {
      const ns = { id: uid('script'), createdAt: Date.now(), ...s }
      commitList('scripts', setScripts)([ns, ...scripts])
      return ns
    },
    [scripts]
  )
  const updateScript = useCallback(
    (id, patch) =>
      commitList('scripts', setScripts)(
        scripts.map((s) => (s.id === id ? { ...s, ...patch } : s))
      ),
    [scripts]
  )
  const deleteScript = useCallback(
    (id) =>
      commitList('scripts', setScripts)(scripts.filter((s) => s.id !== id)),
    [scripts]
  )

  const addTrend = useCallback(
    (t) => {
      const nt = { id: uid('trend'), collected_at: Date.now(), ...t }
      commitList('trendSignals', setTrendSignals)([nt, ...trendSignals])
      return nt
    },
    [trendSignals]
  )
  const deleteTrend = useCallback(
    (id) =>
      commitList('trendSignals', setTrendSignals)(
        trendSignals.filter((t) => t.id !== id)
      ),
    [trendSignals]
  )

  const addRecord = useCallback(
    (r) => {
      const nr = { id: uid('rec'), updated_at: Date.now(), ...r }
      commitList('records', setRecords)([nr, ...records])
      return nr
    },
    [records]
  )
  const updateRecord = useCallback(
    (id, patch) =>
      commitList('records', setRecords)(
        records.map((r) =>
          r.id === id ? { ...r, ...patch, updated_at: Date.now() } : r
        )
      ),
    [records]
  )
  const deleteRecord = useCallback(
    (id) =>
      commitList('records', setRecords)(records.filter((r) => r.id !== id)),
    [records]
  )

  const value = {
    ready,
    bootstrap,
    reset,
    settings,
    setSettings,
    dimensionPool,
    setDimensionPool,
    channels,
    setChannels,
    regions,
    setRegions,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    scripts,
    saveScript,
    updateScript,
    deleteScript,
    trendSignals,
    addTrend,
    deleteTrend,
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    bannedWords,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
