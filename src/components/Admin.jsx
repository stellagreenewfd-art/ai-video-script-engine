import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Card, Input, Btn, ErrorBox, Select, Tag } from './ui'

function Stat({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

export default function Admin() {
  const [tab, setTab] = useState('users')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      setStats(await api.adminStats())
    } catch (e) {
      setErr(e.message)
    }
  }, [])

  const loadUsers = useCallback(async (query) => {
    setLoading(true)
    try {
      const r = await api.adminUsers(query)
      setUsers(r.users || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    loadUsers('')
  }, [loadStats, loadUsers])

  // 搜索防抖
  useEffect(() => {
    const t = setTimeout(() => loadUsers(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q, loadUsers])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">管理后台</h2>
        <Btn onClick={() => { loadStats(); loadUsers(q.trim()) }} disabled={loading}>
          {loading ? '刷新中…' : '刷新'}
        </Btn>
      </div>
      <ErrorBox msg={err} />
      {err && (
        <div className="text-xs text-slate-500">
          提示：若显示「需要管理员权限」，请用管理员账户(qaq)登录。
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <button
          onClick={() => setTab('users')}
          className={`px-3 py-1.5 rounded-full border transition ${
            tab === 'users'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : 'border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          注册用户
        </button>
        <button
          onClick={() => setTab('banned')}
          className={`px-3 py-1.5 rounded-full border transition ${
            tab === 'banned'
              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
              : 'border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          违禁词库
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="注册用户" value={stats.total_users} />
          <Stat label="已配 Key" value={stats.with_key} />
          <Stat label="管理员" value={stats.admins} />
          <Stat label="脚本总数" value={stats.total_scripts} />
          <Stat label="商品总数" value={stats.total_products} />
        </div>
      )}

      <Card title="注册用户">
        <Input
          placeholder="按邮箱 / 用户名搜索"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 text-xs">
              <tr className="border-b border-slate-800">
                <th className="py-2 pr-3">邮箱</th>
                <th className="py-2 pr-3">用户名</th>
                <th className="py-2 pr-3">管理员</th>
                <th className="py-2 pr-3">模型</th>
                <th className="py-2 pr-3">已配Key</th>
                <th className="py-2 pr-3">脚本</th>
                <th className="py-2 pr-3">商品</th>
                <th className="py-2 pr-3">注册时间</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-800/60">
                  <td className="py-2 pr-3">{u.email}</td>
                  <td className="py-2 pr-3">{u.username || '—'}</td>
                  <td className="py-2 pr-3">{u.is_admin ? '是' : '否'}</td>
                  <td className="py-2 pr-3">{u.model}</td>
                  <td className="py-2 pr-3">{u.has_key ? '●' : '○'}</td>
                  <td className="py-2 pr-3">{u.scripts_count}</td>
                  <td className="py-2 pr-3">{u.products_count}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    无匹配用户
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {tab === 'banned' && <BannedManager />}
    </div>
  )
}

const SEV_OPTIONS = [
  { value: 'high', label: '高危' },
  { value: 'medium', label: '中危' },
  { value: 'low', label: '低危' },
]
const PLATFORM_OPTIONS = [
  { code: 'douyin', name: '抖音' },
  { code: 'xiaohongshu', name: '小红书' },
  { code: 'tiktok_us', name: 'TikTok' },
  { code: 'youtube_shorts', name: 'YouTube' },
]
const CATEGORY_OPTIONS = [
  '极限词',
  '强诱导',
  '医疗功效',
  '违规导流',
  '夸大宣传',
  '其他',
]

function BannedManager() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    word: '',
    category: '极限词',
    severity: 'high',
    suggestion: '',
    platforms: [],
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.getBannedWords()
      setWords(r.words || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const togglePlatform = (code) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(code)
        ? f.platforms.filter((c) => c !== code)
        : [...f.platforms, code],
    }))

  async function handleAdd() {
    if (!form.word.trim()) return setErr('违禁词不能为空')
    setSaving(true)
    setErr('')
    try {
      const w = await api.addBannedWord({
        word: form.word.trim(),
        category: form.category,
        severity: form.severity,
        suggestion: form.suggestion.trim(),
        platforms: form.platforms.length ? form.platforms : ['all'],
      })
      setWords((prev) => [w, ...prev])
      setForm({ word: '', category: '极限词', severity: 'high', suggestion: '', platforms: [] })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteBannedWord(id)
      setWords((prev) => prev.filter((w) => w.id !== id))
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div className="space-y-4">
      <Card title="新增违禁词">
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="违禁词（如：史上第一）"
            value={form.word}
            onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
          />
          <Select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select
            value={form.severity}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
          >
            {SEV_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Input
            placeholder="合规替换建议（可选）"
            value={form.suggestion}
            onChange={(e) => setForm((f) => ({ ...f, suggestion: e.target.value }))}
          />
        </div>
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">适用渠道（不选则全平台）</div>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_OPTIONS.map((p) => (
              <label
                key={p.code}
                className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={form.platforms.includes(p.code)}
                  onChange={() => togglePlatform(p.code)}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <Btn variant="primary" onClick={handleAdd} disabled={saving}>
            {saving ? '添加中…' : '添加违禁词'}
          </Btn>
        </div>
      </Card>

      <Card title={`违禁词库（${words.length}）`}>
        <ErrorBox msg={err} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-slate-500 text-xs">
              <tr className="border-b border-slate-800">
                <th className="py-2 pr-3">违禁词</th>
                <th className="py-2 pr-3">分类</th>
                <th className="py-2 pr-3">严重度</th>
                <th className="py-2 pr-3">替换建议</th>
                <th className="py-2 pr-3">适用渠道</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {words.map((w) => {
                const plats = w.platforms || ['all']
                const sevColor =
                  w.severity === 'high'
                    ? 'rose'
                    : w.severity === 'medium'
                    ? 'amber'
                    : 'slate'
                return (
                  <tr key={w.id} className="border-b border-slate-800/60 align-top">
                    <td className="py-2 pr-3 font-medium text-rose-300">{w.word}</td>
                    <td className="py-2 pr-3">{w.category}</td>
                    <td className="py-2 pr-3">
                      <Tag color={sevColor}>
                        {w.severity === 'high' ? '高危' : w.severity === 'medium' ? '中危' : '低危'}
                      </Tag>
                    </td>
                    <td className="py-2 pr-3 text-slate-400">{w.suggestion || '—'}</td>
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      {plats.includes('all')
                        ? '全平台'
                        : plats
                            .map(
                              (c) =>
                                PLATFORM_OPTIONS.find((o) => o.code === c)?.name || c
                            )
                            .join('、')}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Btn
                        variant="subtle"
                        className="!px-2 !py-1"
                        onClick={() => handleDelete(w.id)}
                      >
                        删除
                      </Btn>
                    </td>
                  </tr>
                )
              })}
              {!loading && words.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    词库为空
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-slate-500 mt-2">
          修改即时生效：新生成与改写脚本会使用更新后的词库进行审核。
        </div>
      </Card>
    </div>
  )
}
