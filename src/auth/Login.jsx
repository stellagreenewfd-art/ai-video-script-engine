import React, { useState } from 'react'
import { useAuth } from './AuthContext'
import { Card, Input, Btn, ErrorBox } from '../components/ui'

export default function Login() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-white">短视频脚本引擎</div>
          <div className="text-sm text-slate-500 mt-1">
            数据驱动 · 组合生成式 AI 带货系统
          </div>
        </div>
        <Card>
          <div className="flex gap-2 mb-4">
            {[
              ['login', '登录'],
              ['register', '注册'],
            ].map(([k, label]) => (
              <button
                key={k}
                onClick={() => {
                  setMode(k)
                  setErr('')
                }}
                className={`flex-1 py-2 rounded-lg text-sm ${
                  mode === k
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input
              type="text"
              placeholder="邮箱或用户名"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="密码（至少 6 位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <ErrorBox msg={err} />
            <Btn type="submit" disabled={busy} className="w-full justify-center">
              {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并登录'}
            </Btn>
          </form>
          <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
            {mode === 'register'
              ? '注册即创建独立账号，数据与其他用户隔离。注册后请在「设置」填写你自己的 DeepSeek Key。'
              : '使用邮箱密码登录。'}
          </div>
        </Card>
      </div>
    </div>
  )
}
