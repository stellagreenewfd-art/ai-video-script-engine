import React, { createContext, useContext, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const applyToken = useCallback((t) => {
    setToken(t)
    setTokenState(t)
  }, [])

  const logout = useCallback(() => {
    applyToken(null)
    setUser(null)
    setReady(false)
  }, [applyToken])

  const login = useCallback(
    async (email, password) => {
      const r = await api.login(email, password)
      applyToken(r.token)
      setUser(r.user)
      return r.user
    },
    [applyToken]
  )

  const register = useCallback(
    async (email, password) => {
      const r = await api.register(email, password)
      applyToken(r.token)
      setUser(r.user)
      return r.user
    },
    [applyToken]
  )

  const value = {
    token,
    user,
    ready,
    setReady,
    login,
    register,
    logout,
    isAuthed: !!token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
