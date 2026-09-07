import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../api/client'
import { adminToken, tableSession } from '../lib/tokens'
import type { TableSession } from '../lib/tokens'

interface AuthState {
  // 관리자
  isAdmin: boolean
  adminLogin: (storeCode: string, username: string, password: string) => Promise<void>
  adminLogout: () => void
  // 테이블(고객)
  session: TableSession | null
  tableLogin: (storeCode: string, tableNumber: string, tablePassword: string) => Promise<void>
  tableLogout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [adminReady, setAdminReady] = useState<boolean>(() => !!adminToken.get())
  const [session, setSession] = useState<TableSession | null>(() => tableSession.get())

  // 401 발생 시 해당 스코프 토큰 제거 → 재로그인 화면으로 유도
  useEffect(() => {
    setUnauthorizedHandler((scope) => {
      if (scope === 'admin') {
        adminToken.clear()
        setAdminReady(false)
      } else {
        tableSession.clear()
        setSession(null)
      }
    })
  }, [])

  const adminLogin = useCallback(async (storeCode: string, username: string, password: string) => {
    const res = await api.adminLogin(storeCode, username, password)
    adminToken.set(res.access_token)
    setAdminReady(true)
  }, [])

  const adminLogout = useCallback(() => {
    adminToken.clear()
    setAdminReady(false)
  }, [])

  const tableLogin = useCallback(
    async (storeCode: string, tableNumber: string, tablePassword: string) => {
      const res = await api.tableLogin(storeCode, tableNumber, tablePassword)
      tableSession.set(res)
      setSession(tableSession.get())
    },
    [],
  )

  const tableLogout = useCallback(() => {
    tableSession.clear()
    setSession(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      isAdmin: adminReady,
      adminLogin,
      adminLogout,
      session,
      tableLogin,
      tableLogout,
    }),
    [adminReady, adminLogin, adminLogout, session, tableLogin, tableLogout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
