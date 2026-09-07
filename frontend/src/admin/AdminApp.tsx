import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AdminLogin from './AdminLogin'
import Dashboard from './Dashboard'
import MenuManage from './MenuManage'
import TableSettings from './TableSettings'

// F2 AdminApp: 토큰 없으면 로그인, 있으면 관리 레이아웃(대시보드/메뉴/테이블).
export default function AdminApp() {
  const { isAdmin, adminLogout } = useAuth()
  if (!isAdmin) return <AdminLogin />

  return (
    <div className="mx-auto flex min-h-full max-w-7xl flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-xl font-bold">테이블오더 관리자</h1>
        <button className="btn-secondary" onClick={adminLogout} data-testid="admin-logout">
          로그아웃
        </button>
      </header>

      <nav className="mb-5 flex gap-2 border-b">
        <TabLink to="/admin" label="대시보드" testId="nav-dashboard" end />
        <TabLink to="/admin/menus" label="메뉴 관리" testId="nav-menus" />
        <TabLink to="/admin/tables" label="테이블 설정" testId="nav-tables" />
      </nav>

      <main className="flex-1 pb-8">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="menus" element={<MenuManage />} />
          <Route path="tables" element={<TableSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function TabLink({
  to,
  label,
  testId,
  end,
}: {
  to: string
  label: string
  testId: string
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-testid={testId}
      className={({ isActive }) =>
        `touch-target -mb-px border-b-2 px-4 py-2 font-medium transition ${
          isActive
            ? 'border-brand-500 text-brand-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'
        }`
      }
    >
      {label}
    </NavLink>
  )
}
