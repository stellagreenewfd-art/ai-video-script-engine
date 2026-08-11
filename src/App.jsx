import React, { useState, useEffect } from 'react'
import { useApp } from './store'
import { useAuth } from './auth/AuthContext'
import Login from './auth/Login'
import Settings from './components/Settings'
import Studio from './components/Studio'
import Config from './components/Config'
import Trend from './components/Trend'
import Effect from './components/Effect'

const NAV = [
  { key: 'studio', label: '脚本工作台', icon: '🎬' },
  { key: 'config', label: '配置中心', icon: '⚙️' },
  { key: 'trend', label: '趋势情报', icon: '📡' },
  { key: 'effect', label: '效果回流', icon: '📈' },
  { key: 'settings', label: '设置', icon: '🔑' },
]

const ADMIN_NAV = { key: 'admin', label: '管理后台', icon: '🛡️' }

export default function App() {
  const { user, logout } = useAuth()
  const { settings, ready, bootstrap, reset } = useApp()
  const [view, setView] = useState('studio')

  // 登录态变化：拉取/清空用户数据
  useEffect(() => {
    if (user && !ready) bootstrap()
    if (!user) reset()
  }, [user, ready, bootstrap, reset])

  if (!user) return <Login />

  return (
    <div className="flex h-full">
      {/* 侧边栏 */}
      <aside className="w-56 shrink-0 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="text-base font-bold text-white">短视频脚本引擎</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            数据驱动 · 组合生成
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.concat(user?.is_admin ? [ADMIN_NAV] : []).map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                view === n.key
                  ? 'bg-indigo-600/20 text-indigo-200'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 text-[11px] text-slate-600 border-t border-slate-800">
          {settings.hasKey ? '● Key 已配置' : '○ 未配置 Key'}
          <div className="mt-1 truncate" title={user?.email}>
            {user?.email}
          </div>
          <button
            onClick={logout}
            className="mt-2 w-full py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* 主区 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          {!ready ? (
            <div className="text-slate-400 text-sm py-10 text-center">
              正在加载你的数据…
            </div>
          ) : (
            <>
              {view === 'studio' && <Studio />}
              {view === 'config' && <Config />}
              {view === 'trend' && <Trend />}
              {view === 'effect' && <Effect />}
              {view === 'settings' && <Settings />}
              {view === 'admin' && user?.is_admin && <Admin />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
