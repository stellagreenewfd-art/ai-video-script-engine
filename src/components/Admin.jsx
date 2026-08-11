import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Card, Input, Btn, ErrorBox } from './ui'

function Stat({ label, value }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  )
}

export default function Admin() {
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
    </div>
  )
}
