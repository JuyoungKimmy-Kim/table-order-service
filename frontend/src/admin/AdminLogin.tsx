import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'

// US-A1: 매장 계정 로그인 (JWT 16h). 401 자격오류 / 429 시도제한 처리.
export default function AdminLogin() {
  const { adminLogin } = useAuth()
  const [storeCode, setStoreCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminLogin(storeCode.trim(), username.trim(), password)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError('로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.')
        else setError(err.detail || '로그인에 실패했습니다.')
      } else {
        setError('로그인에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm p-6" data-testid="admin-login-form">
        <h1 className="mb-1 text-xl font-bold">관리자 로그인</h1>
        <p className="mb-5 text-sm text-slate-500">매장 계정으로 로그인하세요.</p>

        <div className="mb-3">
          <label className="label" htmlFor="a_store_code">
            매장 식별자
          </label>
          <input
            id="a_store_code"
            className="input"
            value={storeCode}
            onChange={(e) => setStoreCode(e.target.value)}
            required
            data-testid="admin-login-store-code"
          />
        </div>
        <div className="mb-3">
          <label className="label" htmlFor="a_username">
            사용자명
          </label>
          <input
            id="a_username"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            data-testid="admin-login-username"
          />
        </div>
        <div className="mb-4">
          <label className="label" htmlFor="a_password">
            비밀번호
          </label>
          <input
            id="a_password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="admin-login-password"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-red-600" data-testid="admin-login-error">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="admin-login-submit">
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </div>
  )
}
