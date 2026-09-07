import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

// US-C1: 관리자가 최초 1회 매장/테이블 정보로 로그인하면 세션이 로컬에 저장되어
// 이후 자동 로그인된다. (고객에게는 이 화면이 노출되지 않는 것이 정상 운영 상태)
export default function TableSetup() {
  const { tableLogin } = useAuth()
  const [storeCode, setStoreCode] = useState('')
  const [tableNumber, setTableNumber] = useState('')
  const [tablePassword, setTablePassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await tableLogin(storeCode.trim(), tableNumber.trim(), tablePassword)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="card w-full max-w-sm p-6"
        data-testid="table-setup-form"
      >
        <h1 className="mb-1 text-xl font-bold">테이블 초기 설정</h1>
        <p className="mb-5 text-sm text-slate-500">
          매장 정보와 테이블 번호로 1회 설정하면 이후 자동으로 주문 화면이 열립니다.
        </p>

        <div className="mb-3">
          <label className="label" htmlFor="store_code">
            매장 식별자
          </label>
          <input
            id="store_code"
            className="input"
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            required
            data-testid="table-setup-store-code"
          />
        </div>
        <div className="mb-3">
          <label className="label" htmlFor="table_number">
            테이블 번호
          </label>
          <input
            id="table_number"
            className="input"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            required
            data-testid="table-setup-table-number"
          />
        </div>
        <div className="mb-4">
          <label className="label" htmlFor="table_password">
            테이블 비밀번호
          </label>
          <input
            id="table_password"
            type="password"
            className="input"
            value={tablePassword}
            onChange={(e) => setTablePassword(e.target.value)}
            required
            data-testid="table-setup-password"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600" data-testid="table-setup-error">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="table-setup-submit">
          {loading ? '설정 중…' : '설정 완료'}
        </button>
      </form>
    </div>
  )
}
