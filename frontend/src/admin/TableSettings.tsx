import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import { useToast } from '../components/Toast'
import Spinner from '../components/Spinner'
import type { AdminTable } from '../types'

// US-A7: 테이블 등록(중복 409)/목록.
export default function TableSettings() {
  const toast = useToast()
  const [tables, setTables] = useState<AdminTable[]>([])
  const [loading, setLoading] = useState(true)
  const [tableNumber, setTableNumber] = useState('')
  const [tablePassword, setTablePassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setTables(await api.getTables())
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : '테이블 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!tableNumber.trim()) return setError('테이블 번호를 입력하세요.')
    if (!tablePassword) return setError('테이블 비밀번호를 입력하세요.')
    setSaving(true)
    try {
      const created = await api.createTable(tableNumber.trim(), tablePassword)
      setTables((prev) => [...prev, created])
      setTableNumber('')
      setTablePassword('')
      toast.success('테이블을 등록했습니다.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError('이미 존재하는 테이블 번호입니다.')
      else setError(err instanceof ApiError ? err.detail : '등록에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="테이블 불러오는 중…" />

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-3 text-lg font-bold">테이블 등록</h2>
        <form onSubmit={submit} className="card p-5" data-testid="table-create-form">
          <div className="mb-3">
            <label className="label">테이블 번호</label>
            <input
              className="input"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              data-testid="table-create-number"
            />
          </div>
          <div className="mb-4">
            <label className="label">테이블 비밀번호</label>
            <input
              className="input"
              type="password"
              value={tablePassword}
              onChange={(e) => setTablePassword(e.target.value)}
              data-testid="table-create-password"
            />
          </div>
          {error && (
            <p className="mb-3 text-sm text-red-600" data-testid="table-create-error">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={saving} data-testid="table-create-submit">
            {saving ? '등록 중…' : '테이블 등록'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold">등록된 테이블 ({tables.length})</h2>
        {tables.length === 0 ? (
          <p className="text-sm text-slate-400">등록된 테이블이 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tables.map((t) => (
              <li key={t.id} className="card flex items-center justify-between p-3" data-testid={`table-row-${t.id}`}>
                <span className="font-medium">테이블 {t.table_number}</span>
                <span className="text-sm text-slate-400">#{t.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
