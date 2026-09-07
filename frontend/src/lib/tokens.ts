// 토큰/세션 로컬 저장소 — ApiClient와 AuthContext가 공유하는 단일 진실원.
import type { TableLoginResponse } from '../types'

const ADMIN_KEY = 'to.admin_token'
const TABLE_KEY = 'to.table_session'

export interface TableSession {
  table_token: string
  table_id: number
  table_number: string
  store_name: string
}

export const adminToken = {
  get: (): string | null => localStorage.getItem(ADMIN_KEY),
  set: (t: string) => localStorage.setItem(ADMIN_KEY, t),
  clear: () => localStorage.removeItem(ADMIN_KEY),
}

export const tableSession = {
  get: (): TableSession | null => {
    const raw = localStorage.getItem(TABLE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as TableSession
    } catch {
      return null
    }
  },
  set: (s: TableLoginResponse) =>
    localStorage.setItem(
      TABLE_KEY,
      JSON.stringify({
        table_token: s.table_token,
        table_id: s.table_id,
        table_number: s.table_number,
        store_name: s.store_name,
      }),
    ),
  clear: () => localStorage.removeItem(TABLE_KEY),
}
